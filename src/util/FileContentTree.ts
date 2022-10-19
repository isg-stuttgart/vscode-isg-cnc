import * as vscode from 'vscode';
import * as fs from 'fs';
import * as peggy from "peggy";
import * as Path from "path";
//New line marker, based on operating system
import { EOL as newline } from "node:os";
import { stringify } from 'querystring';

//peggy parser to parse nc files
const parser = require(('./ncParser'));

/**
 * The Tree Data Provider for the NC-Match-Tree
 */
export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem>{
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    fileItem: FileItem = new FileItem("", vscode.TreeItemCollapsibleState.None);
    matchCategories: MatchCategories;
    context: vscode.ExtensionContext;
    currentFileWatcher: fs.FSWatcher | undefined;
    file: vscode.Uri | undefined;
    constructor(extContext: vscode.ExtensionContext) {
        this.matchCategories = {
            toolCalls: new CategoryItem("Tool Calls"),
            prgCalls: new CategoryItem("Program Calls"),
        };
        this.context = extContext;
        this.update();
        this.updateFileWatcher();
    }

    private async updateFileTree(): Promise<void> {
        this.fileItem = new FileItem("Loading...", vscode.TreeItemCollapsibleState.None);
        await new Promise(r => setTimeout(r, 50)); //to prevent reading in between "file cleared" and "new content saved"
        if (this.file === undefined) {
            this.fileItem = new FileItem("There is no currently opened file", vscode.TreeItemCollapsibleState.None);
        } else if (!isNcFile(this.file.fsPath)) {
            this.fileItem = new FileItem("The currently opened file is no NC-file", vscode.TreeItemCollapsibleState.None);
        } else {
            const filecontent = fs.readFileSync(this.file.fsPath, "utf8");
            let parsed: boolean = true;
            let parseResult;
            try {
                parseResult = parser.parse(filecontent);
            } catch (error: any) {
                if (error instanceof parser.SyntaxError) {
                    this.fileItem = new FileItem("The currently opened NC-file has wrong syntax", vscode.TreeItemCollapsibleState.None);
                    parsed = false;
                }
            }
            if (parsed) {
                this.updateMatchItems(parseResult);
                this.fileItem = new FileItem(Path.basename(this.file.fsPath), vscode.TreeItemCollapsibleState.Expanded, this.matchCategories);
            }
        }
    }

    private updateFileWatcher() {
        if (this.file !== undefined) {
            this.currentFileWatcher?.close();
            this.currentFileWatcher = fs.watch(this.file.fsPath, () => {
                this.update();
            });
        }
    }

    /**
     * Updates the tree so it shows the information concerning the specified file
     */
    async update(): Promise<void> {
        new Promise(() => {
            try {
                this.file = vscode.window.activeTextEditor?.document.uri;;
                this.updateFileTree();
                this.updateFileWatcher();
                this._onDidChangeTreeData.fire();  //triggers updating the graphic
            } catch (error: any) {
                vscode.window.showErrorMessage(error);
            }
        });
    }

    /**
     * Update match tree-items
     * @param parseResult 
     */
    async updateMatchItems(parseResult: any): Promise<void> {
        await Promise.all([
            new Promise(() => this.matchCategories.toolCalls.resetMatches(parseResult.toolCalls, this.context)),
            new Promise(() => this.matchCategories.prgCalls.resetMatches(parseResult.prgCalls, this.context))
        ]);
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
}

/**
 * The Tree Item for the shown file
 */
class FileItem extends vscode.TreeItem implements MyItem {
    private _children: Array<MyItem>;
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, matchCategories?: MatchCategories) {
        super(label, collapsibleState);
        this._children = new Array<MyItem>();
        if (matchCategories !== undefined) {
            Object.entries(matchCategories).forEach(([key, category]) => {
                this.addChild(category);
            });
        }
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
        matchSubCategoryMap: Map<string, SubCategoryTreeItem>,
        messages: Array<MyItem>
    };

    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.children = {
            matchMap: new Map<number, MatchItem>(),
            matchSubCategoryMap: new Map<string, SubCategoryTreeItem>(),
            messages: new Array<MyItem>()
        };
    }
    getChildren(): MyItem[] {
        const matches: Array<MatchItem> = Array.from(this.children.matchMap.values());
        const matchSubCategories: Array<SubCategoryTreeItem> = Array.from(this.children.matchSubCategoryMap.values());
        return [...matches, ...matchSubCategories, ...this.children.messages];
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
            matchSubCategoryMap: new Map<string, SubCategoryTreeItem>(),
            messages: new Array<MyItem>()
        };
    }
    /**
     * Overwrites old children with new ones
     * @param newMatches 
     */
    resetMatches(newMatches: Match[], context: vscode.ExtensionContext) {

        /**
         * Inner function to add a match to its match-line or create a new one if non-existing
         * @param match 
         * @param matchMap 
         * @param itemPosition 
         */
        function addMatchToMatchLine(match: Match, matchMap: Map<number, MatchItem>, itemPosition: ItemPosition) {
            // create item for the match-line if it doesn't already exist
            let matchLineItem: MatchItem | undefined = matchMap.get(match.location.start.line);
            if (matchLineItem === undefined) {
                matchMap.set(match.location.start.line, new MatchItem(match, context, itemPosition));
            }
            //or additionally highlight new match if line already exists
            else {
                matchLineItem.addHighlightingForLineMatch(match);
            }
        }

        this.clearChildren();
        let matchCounter = 0;
        try {
            newMatches.forEach(match => {
                matchCounter++;
                if (matchCounter > 500) {
                    const tooManyMatchesException = {};
                    throw tooManyMatchesException;
                }
                match.text = match.text.replaceAll(/[\r\n]+[\t ]*/g, "");
                addMatchToMatchLine(match, this.children.matchMap, ItemPosition.category);
                // e.g. toolCalls will be seperated in subCategories T1, T2 etc.
                let subCategory: SubCategoryTreeItem | undefined = this.children.matchSubCategoryMap.get(match.text);

                //create subCategory when non-existing
                if (subCategory === undefined) {
                    this.children.matchSubCategoryMap.set(match.text, new SubCategoryTreeItem(match.text));
                }

                subCategory = this.children.matchSubCategoryMap.get(match.text);
                //make sure subCategory exists now and add match to it
                if (subCategory !== undefined) {
                    addMatchToMatchLine(match, subCategory.children, ItemPosition.subCategory);
                } else {
                    throw new Error("subCategory " + match.text + " was not created successfully");
                }
            });
        } catch (error) {
            let messageItem: MessageItem = new MessageItem("There are " + (newMatches.length - 500) + " more matches, which aren't shown due to performance");
            this.children.messages.push(messageItem);
        }

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
export class MatchItem extends vscode.TreeItem implements MyItem {
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
            command: "matchItem.selected",
            arguments: [this]
        };
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
            const paddingGoal = getMaxLine(this._file).toString().length;
            const lineNumber = match.location.start.line;
            const column = match.location.start.column;
            labelString = lineNumber.toString().padStart(paddingGoal, '0') + ": ";
            let text: string = match.text;
            textoffset = paddingGoal + 2/* ': ' */ - 1 /*different counting between match and label*/;

            //label shall contain a maximum of 15 characters left from the match
            if (column > 15) {
                text = "..." + text.substring(column - 15);
                textoffset = textoffset + 3 - (column - 15);
            }

            labelString = labelString + text;

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
 * An item to show some text to the user
 */
class MessageItem extends vscode.TreeItem implements MyItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
    getChildren(): MyItem[] {
        return [];
    }
}
/**
 * Updates the maxLine-Variable of this module indicating the max amount of lines in the current file
 * @param file 
 */
function getMaxLine(file: string): number {
    const filecontent: string = fs.readFileSync(file, "utf8");
    const lineArray = filecontent.split(newline);
    return lineArray.length;
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
    return [".nc", ".cnc", ".cyc", ".ecy", ".sub", ".plc"].includes(Path.extname(path.toLowerCase()));
}

export function jumpToMatch(item: MatchItem) {
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
                    value: item.getMatch().location.start.line - 1
                }).then(() => {
                    //move right
                    vscode.commands.executeCommand("cursorMove", {
                        to: "right",
                        by: "character",
                        value: item.getMatch().location.start.column - 1
                    });
                });
            });
        }
        );
    }
}