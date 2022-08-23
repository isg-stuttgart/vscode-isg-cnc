import * as vscode from 'vscode';
import * as fs from 'fs';
import * as peggy from "peggy";
import * as Path from "path";
//New line marker, based on operating system
import { EOL as newline } from "node:os";
const parser = require(('./ncParser'));
// the maximum line of the current nc file
let maxLine: number = 0;

/**
 * The Tree Data Provider for the NC-Match-Tree
 */
export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem>{
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    fileItem: FileItem;
    matchCategories: MatchCategories;
    context: vscode.ExtensionContext;
    currentFileWatcher: fs.FSWatcher | undefined;
    file: vscode.Uri | undefined;
    constructor(file: vscode.Uri | undefined, extContext: vscode.ExtensionContext) {
        this.file = file;
        this.matchCategories = {
            toolCalls: new CategoryItem("Tool Calls"),
            prgCalls: new CategoryItem("Program Calls"),
        };
        this.context = extContext;
        this.fileItem = this.createFileItem();
        this.updateFileWatcher();
        this.updateTreeView(this.file);
    }

    private createFileItem(): FileItem {
        let fileItem;
        if (this.file === undefined) {
            fileItem = new FileItem("There is no currently opened file", this.matchCategories, vscode.TreeItemCollapsibleState.None);
        } else if (!isNcFile(this.file.fsPath)) {
            fileItem = new FileItem("The currently opened file is no NC-file", this.matchCategories, vscode.TreeItemCollapsibleState.None);
        } else {
            fileItem = new FileItem(Path.basename(this.file.fsPath), this.matchCategories, vscode.TreeItemCollapsibleState.Expanded);
        }
        return fileItem;
    }

    private updateFileWatcher() {
        if (this.file !== undefined) {
            this.currentFileWatcher?.close();
            this.currentFileWatcher = fs.watch(this.file.fsPath, () => {
                this.updateTreeView(this.file);
            });
        }
    }

    /**
     * Updates the tree so it shows the information concerning the specified file
     * @param file 
     */
    updateTreeView(file: vscode.Uri | undefined): void {
        try {
            this.file = file;
            this.disposeCommands();
            this.fileItem = this.createFileItem();
            if (this.file !== undefined) {
                updateMaxLine(this.file);
                const filecontent = fs.readFileSync(this.file.fsPath, "utf8");
                try {
                    const parseResult = parser.parse(filecontent);
                    this.updateMatchItems(parseResult);
                } catch (error: any) {
                    if (error instanceof parser.SyntaxError) {
                        this.fileItem = new FileItem("The currently opened NC-file has wrong syntax", this.matchCategories, vscode.TreeItemCollapsibleState.None);
                    }
                }
            }
            this.updateFileWatcher();
            this._onDidChangeTreeData.fire();  //triggers updating the graphic
        } catch (error: any) {
            vscode.window.showErrorMessage(error);
        }
    }

    /**
     * Update match tree-items
     * @param parseResult 
     */
    updateMatchItems(parseResult: any): void {
        this.matchCategories.toolCalls.resetMatches(parseResult.toolCalls, this.context);
        this.matchCategories.prgCalls.resetMatches(parseResult.prgCalls, this.context);
    }


    getTreeItem(item: MyItem): MyItem {
        return item;
    }

    getChildren(item?: MyItem): Thenable<MyItem[]> {
        if (item) {
            return Promise.resolve(item.getChildren());
        } else {
            return Promise.resolve([this.fileItem]);
        }
    }

    /**
     * Clear/dispose the commands binded to Tree items
     */
    public disposeCommands(): void {
        this.matchCategories.toolCalls.disposeCommands();
        this.matchCategories.prgCalls.disposeCommands();
    }
}

/**
 * The Tree Item for the shown file
 */
class FileItem extends vscode.TreeItem implements MyItem {
    private _children: Array<MyItem>;
    constructor(label: string, matchCategories: MatchCategories, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this._children = new Array<MyItem>();
        Object.entries(matchCategories).forEach(([key, category]) => {
            this.addChild(category);
        });
    }

    private addChild(category: CategoryItem): void {
        this._children.push(category);
    }

    public getChildren(): MyItem[] {
        return this._children;
    }
}

/**
 * The class for a Category-Tree Item like "Toolcalls", "Program Call" etc.
 */
class CategoryItem extends vscode.TreeItem implements MyItem {
    // one children section for the matches listed line by line, one sorted in matchSubcategory
    private children: {
        matchMap: Map<number, MatchItem>,
        matchSubCategoryMap: Map<string, SubCategoryTreeItem>
    };

    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.children = {
            matchMap: new Map<number, MatchItem>(),
            matchSubCategoryMap: new Map<string, SubCategoryTreeItem>()
        };
    }
    getChildren(): MyItem[] {
        const matches: Array<MatchItem> = Array.from(this.children.matchMap.values());
        const matchSubCategories: Array<SubCategoryTreeItem> = Array.from(this.children.matchSubCategoryMap.values());
        return [...matches, ...matchSubCategories];
    }

    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(child: SubCategoryTreeItem | MatchItem): void {
        if (child instanceof MatchItem) {
            this.children.matchMap.set(child.match.location.start.line, child);
        } else if (child instanceof SubCategoryTreeItem) {
            this.children.matchSubCategoryMap.set(child.name, child);
        }
    }

    /**
     * Clears all children
     */
    private clearChildren(): void {
        this.children = {
            matchMap: new Map<number, MatchItem>(),
            matchSubCategoryMap: new Map<string, SubCategoryTreeItem>()
        };
    }
    /**
     * Overwrites old children with new ones
     * @param newMatches 
     */
    resetMatches(newMatches: Match[], context: vscode.ExtensionContext) {
        // unregister old match-commands used to jump to file-position
        this.disposeCommands();
        this.clearChildren();

        newMatches.forEach((match: Match) => {
            addMatchToMatchLine(this.children.matchMap, ItemPosition.category);
            // e.g. toolCalls will be seperated in subCategories T1, T2 etc.
            let subCategory: SubCategoryTreeItem | undefined = this.children.matchSubCategoryMap.get(match.text);

            //create subCategory when non-existing
            if (subCategory === undefined) {
                this.children.matchSubCategoryMap.set(match.text, new SubCategoryTreeItem(match.text));
            }

            subCategory = this.children.matchSubCategoryMap.get(match.text);
            //make sure subCategory exists now and add match to it
            if (subCategory !== undefined) {
                addMatchToMatchLine(subCategory.children, ItemPosition.subCategory);
            } else {
                throw new Error("subCategory " + match.text + " was not created successfully");
            }

            function addMatchToMatchLine(map: Map<number, MatchItem>, itemPosition: ItemPosition) {
                // create item for the match-line if it doesn't already exist
                let matchLineItem: MatchItem | undefined = map.get(match.location.start.line);
                if (matchLineItem === undefined) {
                    map.set(match.location.start.line, new MatchItem(match, context, itemPosition));
                }
                //or additionally highlight new match if line already exists
                else {
                    matchLineItem.addHighlightingForLineMatch(match);
                }
            }

        });

    }

    /**
     * Removes the match-specific vscode commands to prevent command-duplicates 
     */
    disposeCommands(): void {
        this.children.matchSubCategoryMap.forEach(subCategory => {
            subCategory.getChildren().forEach(match => {
                match.commandHandler.dispose();
            });
        });
        this.children.matchMap.forEach(match => {
            match.commandHandler.dispose();
        });
    }
}
/**
 * The tree item of a subcategory (e.g. collection of all T31 of the same number)
 */
class SubCategoryTreeItem extends vscode.TreeItem implements MyItem {
    private _name: string;
    children: Map<number, MatchItem>; //one item for each line containing one or more matches
    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
    }

    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this._name = label;
        this.children = new Map<number, MatchItem>();
    }

    getChildren(): MatchItem[] {
        return Array.from(this.children.values());
    }
}
/**
 * The tree item of a concrete match like "T31"
 */
class MatchItem extends vscode.TreeItem implements MyItem {
    commandHandler: vscode.Disposable;
    private _match: Match;
    private _label: MatchLineLabel;
    public getMatch(): Match {
        return this._match;
    }
    public set match(value: Match) {
        this._match = value;
    }

    constructor(match: Match, context: vscode.ExtensionContext, itemPos: ItemPosition) {
        super(new MatchLineLabel(match).label);
        this._label = new MatchLineLabel(match);
        this._match = match;
        const commandID: string = match.text + "_" + match.location.start.offset.toString() + "_" + itemPos;
        this.command = {
            title: commandID,
            command: commandID
        };

        //if clicked the cursor should jump to match start
        this.commandHandler = vscode.commands.registerTextEditorCommand(this.command.command, () => {
            const file = vscode.window.activeTextEditor?.document.uri;
            if (file !== undefined) {
                //open the text document
                vscode.workspace.openTextDocument(file).then(async (doc) => {
                    let pos1 = new vscode.Position(0, 0);
                    let pos2 = new vscode.Position(0, 0);
                    let sel = new vscode.Selection(pos1, pos2);
                    //set cursor at top left corner
                    vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then((editor) => {
                        editor.selection = sel;
                        //move down
                        vscode.commands.executeCommand("cursorMove", {
                            to: "down",
                            by: "line",
                            value: this._match.location.start.line - 1
                        }).then(() => {
                            //move right
                            vscode.commands.executeCommand("cursorMove", {
                                to: "right",
                                by: "character",
                                value: this._match.location.start.column - 1
                            });
                        });
                    });
                }
                );
            }
        });
        context.subscriptions.push(this.commandHandler);
    }

    /**
     * Additionally highlight the specified match in the match-line-label
     * @param match 
     */
    addHighlightingForLineMatch(match: Match) {
        this._label.addHighlightingForLineMatch(match);
        this.label = this._label.label;
    }

    /**
     * Returns empty array because MatchItems don't have children
     * @returns 
     */
    getChildren(): MyItem[] {
        return [];
    }
}

/**
 * Class for a match-line-label
 */
class MatchLineLabel {
    private _file;
    private _label: { label: string; highlights: [number, number][]; };
    public get label(): { label: string; highlights: [number, number][]; } {
        return this._label;
    }

    private _textoffset: number;
    constructor(match: Match) {
        this._file = vscode.window.activeTextEditor?.document.uri.fsPath;
        let labelString: string;
        let textoffset: number;

        if (this._file !== undefined) {
            const paddingGoal = maxLine.toString().length;
            const lineNumber = match.location.start.line;
            const column = match.location.start.column;
            labelString = lineNumber.toString().padStart(paddingGoal, '0') + ": ";
            let line: string = getLine(this._file, lineNumber);
            textoffset = paddingGoal + 2/* ': ' */ - 1 /*different counting between match and label*/;

            //label shall contain a maximum of 15 characters left from the match
            if (column > 15) {
                line = "..." + line.substring(column - 15);
                textoffset = textoffset + 3 - (column - 15);
            }

            labelString = labelString + line;

        } else {
            labelString = "!!! no file found !!!";
            textoffset = 0;
        }

        this._textoffset = textoffset;
        this._label = { label: labelString, highlights: [] };
        this.addHighlightingForLineMatch(match);
    }

    /**
     * Additionally highlight the specified match in the match-line-label
     * @param match 
     */
    public addHighlightingForLineMatch(match: Match) {
        this._label.highlights.push([match.location.start.column + this._textoffset, match.location.end.column + this._textoffset]);
    }
}

/**
 * Type which is returned within the arrays of the parse result
 */
interface Match {
    text: string;
    location: peggy.LocationRange;
}

/**
 * Type which forces to contain all match-categories
 */
interface MatchCategories {
    toolCalls: CategoryItem,
    prgCalls: CategoryItem,
};

/**
 * Indicates on which tree-level a tree item is
 */
enum ItemPosition {
    category,
    subCategory
}

/**
 * Forces my item classes to have a getChildren method, which returns their children as an array
 */
interface MyItem extends vscode.TreeItem {
    getChildren(): MyItem[];
}

/**
 * Updates the maxLine-Variable of this module indicating the max amount of lines in the current file
 * @param file 
 */
function updateMaxLine(file: vscode.Uri) {
    const filecontent: string = fs.readFileSync(file.fsPath, "utf8");
    const lineArray = filecontent.split(newline);
    maxLine = lineArray.length;
}

/**
 * Returns the the specified line of a file, empty String when not found
 * @param file 
 * @param lineNumber 1-based
 * @returns the line as a string
 */
function getLine(file: string, lineNumber: number): string {
    let result = "";
    const filecontent: string | undefined = fs.readFileSync(file, "utf8");
    const lineArray = filecontent.split(newline);
    result = lineArray[lineNumber - 1];
    return result;
}

/**
 * Checks if given uri refers to a .nc-file
 * @param path 
 * @returns true if given uri ends with.nc, false otherwise
 */
function isNcFile(path: string): boolean {
    return Path.extname(path) === ".nc";
}