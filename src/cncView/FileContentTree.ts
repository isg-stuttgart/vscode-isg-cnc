import * as vscode from 'vscode';
import * as fs from 'fs';
import * as peggy from "peggy";
import LineReader = require("n-readlines");
const parser = require(('./ncParser'));
// the maximum line of the current nc file
let maxLine: number = 0;



export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem>{
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    fileItem: FileItem;
    matchCategories: MatchCategories;
    context: vscode.ExtensionContext;
    currentFileWatcher: fs.FSWatcher;
    file: vscode.Uri;
    constructor(file: vscode.Uri, extContext: vscode.ExtensionContext) {
        this.file = file;
        this.matchCategories = {
            toolCalls: new CategoryItem("Tool Calls"),
            prgCalls: new CategoryItem("Program Calls"),
        };
        this.context = extContext;
        this.fileItem = new FileItem(file, this.matchCategories);
        this.currentFileWatcher = fs.watch(file.fsPath, () => {
            this.update();
        });
        this.changeFile(file);
    }

    /**
     * Binds the tree to the given file
     * @param file 
     */
    changeFile(file: vscode.Uri): void {
        this.file = file;
        this.disposeCommands();
        this.fileItem = new FileItem(file, this.matchCategories);
        this.currentFileWatcher = fs.watch(file.fsPath, () => {
            this.update();
        });
        this.update();
    }

    /**
     * Update the tree
     */
    update() {
        updateMaxLine(this.file);
        try {
            const filepath = this.fileItem.resourceUri?.fsPath;
            if (filepath !== undefined) {
                const filecontent = fs.readFileSync(filepath, "utf8");
                const parseResult = parser.parse(filecontent);
                this.updateMatchItems(parseResult);
                this._onDidChangeTreeData.fire();
            } else {
                vscode.window.showWarningMessage("Loading file failed: " + filepath);
            }
        } catch (e: any) {
            // vscode.window.showWarningMessage("NC file isn't structured correctly.\nFilecontent can not be updated");
            vscode.window.showErrorMessage("Error:" + e);
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
    constructor(resourceUri: vscode.Uri, matchCategories: MatchCategories) {
        super(resourceUri, vscode.TreeItemCollapsibleState.Expanded);
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
        matchList: Map<number, MatchItem>,
        matchSubCategoryList: Map<string, SubCategoryTreeItem>
    };

    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.children = {
            matchList: new Map<number, MatchItem>(),
            matchSubCategoryList: new Map<string, SubCategoryTreeItem>()
        };
    }
    getChildren(): MyItem[] {
        const matches: Array<MatchItem> = Array.from(this.children.matchList.values());
        const matchSubCategories: Array<SubCategoryTreeItem> = Array.from(this.children.matchSubCategoryList.values());
        return [...matches, ...matchSubCategories];
    }

    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(child: SubCategoryTreeItem | MatchItem): void {
        if (child instanceof MatchItem) {
            this.children.matchList.set(child.match.location.start.line, child);
        } else if (child instanceof SubCategoryTreeItem) {
            this.children.matchSubCategoryList.set(child.name, child);
        }
    }

    /**
     * Clears all children
     */
    private clearChildren(): void {
        this.children = {
            matchList: new Map<number, MatchItem>(),
            matchSubCategoryList: new Map<string, SubCategoryTreeItem>()
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
            // e.g. toolCalls will be seperated in subCategories T1, T2 etc.
            let subCategory: SubCategoryTreeItem | undefined = this.children.matchSubCategoryList.get(match.text);
            // create item for the match-line if it doesn't already exist
            if (this.children.matchList.get(match.location.start.line) === undefined) {
                this.children.matchList.set(match.location.start.line, new MatchItem(match, context, ItemPosition.category));
            }


            //create subCategory when non-existing
            if (subCategory === undefined) {
                this.children.matchSubCategoryList.set(match.text, new SubCategoryTreeItem(match.text));
            }

            subCategory = this.children.matchSubCategoryList.get(match.text);
            //make sure subCategory exists now and add match to
            if (subCategory !== undefined) {
                const matchItem = new MatchItem(match, context, ItemPosition.subCategory);
                subCategory.addChild(matchItem);
            } else {
                throw new Error("subCategory " + match.text + " was not created successfully");
            }


        });

    }

    /**
     * Removes the match-specific vscode commands to prevent command-duplicates 
     */
    disposeCommands(): void {
        this.children.matchSubCategoryList.forEach(subCategory => {
            subCategory.getChildren().forEach(match => {
                match.commandHandler.dispose();
            });
        });
        this.children.matchList.forEach(match => {
            match.commandHandler.dispose();
        });
    }
}
/**
 * The tree item of a subcategory (e.g. collection of all T31 of the same number)
 */
class SubCategoryTreeItem extends vscode.TreeItem implements MyItem {
    private _name: string;
    private _children: Array<MatchItem>;//children array but typed as MatchItem
    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
    }

    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this._name = label;
        this._children = new Array<MatchItem>();
    }
    getChildren(): MatchItem[] {
        return this._children;
    }

    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(child: MatchItem): void {
        this._children.push(child);
    }
}
/**
 * The tree item of a concrete match like "T31"
 */
class MatchItem extends vscode.TreeItem implements MyItem {
    commandHandler: vscode.Disposable;
    private _match: Match;


    public getMatch(): Match {
        return this._match;
    }
    public set match(value: Match) {
        this._match = value;
    }


    constructor(match: Match, context: vscode.ExtensionContext, itemPos: ItemPosition) {
        super(getLabel(match));

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
                            value: this._match.location.start.line-1
                        }).then(() => {
                            //move right
                            vscode.commands.executeCommand("cursorMove", {
                                to: "right",
                                by: "character",
                                value: this._match.location.start.column-1
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
     * Returns empty array because MatchItems don't have children
     * @returns 
     */
    getChildren(): MyItem[] {
        return [];
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
async function updateMaxLine(file: vscode.Uri) {
    maxLine = 0;
    const reader = new LineReader(file.fsPath);
    let line = reader.next();
    while (line) {
        maxLine++;
        line = reader.next();
    }
}

/**
* Returns a String representing the Match and it's surroundings. This String will be shown as label of the Match Items
*/
function getLabel(match: Match): vscode.TreeItemLabel {
    const file = vscode.window.activeTextEditor?.document.uri.fsPath;
    let result;
    let matchHighlighting: [number, number][];
    if (file !== undefined) {
        const paddingGoal = maxLine.toString().length;
        const lineNumber = match.location.start.line;
        const column = match.location.start.column;
        result = lineNumber.toString().padStart(paddingGoal, '0') + ": ";
        let line: string = getLine(file, lineNumber);
        let textoffset: number = paddingGoal + 2;
         //label shall contain a maximum of 15 characters left from the match
        if (column > 15) {
            line = "..." + line.substring(column - 15);
            textoffset = textoffset + 3 - (column - 15);
        }
        result = result + line;
        matchHighlighting = [[match.location.start.column-1+textoffset, match.location.end.column-1+textoffset]];
    } else {
        result = "!!! no file found !!!";
        matchHighlighting = [];
    }
   
    const label = { label: result, highlights: matchHighlighting };
    return label;
}

/**
 * Returns the the specified line of a file, empty String when not found
 */
function getLine(file: string, lineNumber: number): string {
    let result: string = "";
    let currentLine: number = 0;
    const reader: LineReader = new LineReader(file);
    let line: Buffer | false = reader.next();
    while (line && currentLine <= lineNumber) {
        currentLine++;
        if (currentLine === lineNumber) {
            result = line.toString('utf-8');
        }
        line = reader.next();
    }
    return result;
}

