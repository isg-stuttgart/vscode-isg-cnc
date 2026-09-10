import * as vscode from 'vscode';
import * as fs from 'fs';
import * as Path from "path";
import { ParseResults, SyntaxArray, Match } from "../shared/languageServer";

export enum Sorting {
    lineByLine,
    grouped
}

/** Maximum number of matches shown per category before a "more matches" hint is added. */
const MAX_SHOWN_MATCHES = 500;

/**
 * The Tree Data Provider for the NC-Match-Tree
 */
export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    fileItem: FileItem = new FileItem("", vscode.TreeItemCollapsibleState.None);
    matchCategories: MatchCategories;
    context: vscode.ExtensionContext;
    currentFileWatcher: fs.FSWatcher | undefined;
    private watchDebounce: ReturnType<typeof setTimeout> | undefined;
    file: vscode.Uri | undefined;

    sorting: Sorting = Sorting.lineByLine;
    constructor(extContext: vscode.ExtensionContext) {
        this.matchCategories = {
            toolCalls: new CategoryItem("Tool Calls"),
            prgCallNames: new CategoryItem("Program Calls"),
        };
        this.context = extContext;
        // update on editor change
        this.context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(() =>
                this.update())
        );
        this.update();
        this.updateFileWatcher();
    }

    private async updateFileTree(): Promise<void> {
        this.fileItem = new FileItem("Loading...", vscode.TreeItemCollapsibleState.None);
        this._onDidChangeTreeData.fire();  //triggers updating the graphic
        await new Promise(r => setTimeout(r, 50)); //to prevent reading in between "file cleared" and "new content saved"
        if (this.file === undefined) {
            this.fileItem = new FileItem("There is no currently opened file", vscode.TreeItemCollapsibleState.None);
        } else if (!ncFileOpened()) {
            this.fileItem = new FileItem("The currently opened file is no NC-file", vscode.TreeItemCollapsibleState.None);
        } else {
            let fileContent: string;
            try {
                fileContent = fs.readFileSync(this.file.fsPath, "utf-8");
            } catch (error) {
                this.fileItem = new FileItem("Error while reading file: " + getErrorMessage(error), vscode.TreeItemCollapsibleState.None);
                return;
            }
            let syntaxArray: SyntaxArray;
            try {
                syntaxArray = new ParseResults(fileContent).syntaxArray;
            } catch (error) {
                this.fileItem = new FileItem("Error while parsing: " + error, vscode.TreeItemCollapsibleState.None);
                return;
            }
            // split the file once (EOL-agnostic) and reuse the line array for every match label
            const lines = fileContent.split(/\r?\n/);
            this.updateMatchItems(syntaxArray, lines);
            this.fileItem = new FileItem(Path.basename(this.file.fsPath), vscode.TreeItemCollapsibleState.Expanded, this.matchCategories);
        }
    }

    private updateFileWatcher() {
        if (this.file !== undefined) {
            this.currentFileWatcher?.close();
            this.currentFileWatcher = fs.watch(this.file.fsPath, () => {
                // fs.watch can fire several times per save; debounce to a single refresh
                if (this.watchDebounce) {
                    clearTimeout(this.watchDebounce);
                }
                this.watchDebounce = setTimeout(() => this.update(), 200);
            });
        }
    }

    /**
     * Updates the tree so it shows the information concerning the specified file
     */
    async update(): Promise<void> {
        try {
            this.file = vscode.window.activeTextEditor?.document.uri;
            await this.updateFileTree();
            this.updateFileWatcher();
        } catch (error: any) {
            this.fileItem = new FileItem("Error: " + getErrorMessage(error), vscode.TreeItemCollapsibleState.None);
        }
        this._onDidChangeTreeData.fire();  //triggers updating the graphic
    }

    /**
     * Update match tree-items
     * @param syntaxArray
     * @param lines the lines of the current file, reused for all match labels
     */
    updateMatchItems(syntaxArray: SyntaxArray, lines: string[]): void {
        this.matchCategories.toolCalls.resetMatches(syntaxArray.toolCalls, this.sorting, lines);
        this.matchCategories.prgCallNames.resetMatches(syntaxArray.prgCallNames, this.sorting, lines);
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
            // eslint-disable-next-line no-unused-vars
            Object.entries(matchCategories).forEach(([, category]) => {
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
    resetMatches(newMatches: Match[], sorting: Sorting, lines: string[]) {

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
                matchMap.set(match.location.start.line, new MatchItem(match, itemPosition, lines));
            }
            //or additionally highlight new match if line already exists
            else {
                matchLineItem.addHighlightingForLineMatch(match);
            }
        }

        this.clearChildren();
        // only show the first MAX_SHOWN_MATCHES matches for performance
        const shownCount = Math.min(newMatches.length, MAX_SHOWN_MATCHES);
        for (let i = 0; i < shownCount; i++) {
            const match = newMatches[i];
            if (sorting === Sorting.lineByLine) {
                addMatchToMatchLine(match, this.children.matchMap, ItemPosition.category);
            } else if (sorting === Sorting.grouped) {
                // e.g. toolCalls will be seperated in subCategories T1, T2 etc.
                let subCategory: SubCategoryTreeItem | undefined = this.children.matchSubCategoryMap.get(match.text);
                //create subCategory when non-existing
                if (subCategory === undefined) {
                    subCategory = new SubCategoryTreeItem(match.text);
                    this.children.matchSubCategoryMap.set(match.text, subCategory);
                }
                addMatchToMatchLine(match, subCategory.children, ItemPosition.subCategory);
            }
        }
        if (newMatches.length > MAX_SHOWN_MATCHES) {
            this.children.messages.push(new MessageItem("There are " + (newMatches.length - MAX_SHOWN_MATCHES) + " more matches, which aren't shown due to performance"));
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
    match: Match;
    matchLineLabel: MatchLineLabel;

    constructor(match: Match, itemPos: ItemPosition, lines: string[]) {
        const matchLineLabel = new MatchLineLabel(match, lines);
        super(matchLineLabel.label);
        this.matchLineLabel = matchLineLabel;
        this.match = match;
        const commandID: string = match.name + "_" + match.location.start.offset.toString() + "_" + itemPos;
        this.command = {
            title: commandID,
            command: "matchItem.selected",
            arguments: [this],
        };
    }

    /**
     * Additionally highlight the specified match in the match-line-label
     * @param match 
     */
    addHighlightingForLineMatch(match: Match) {
        this.matchLineLabel.addHighlightingForLineMatch(match);
        this.label = this.matchLineLabel.label;
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
export class MatchLineLabel {
    private _label: { label: string; highlights: [number, number][]; };
    public get label(): { label: string; highlights: [number, number][]; } {
        return this._label;
    }

    private _textoffset: number;
    constructor(match: Match, lines: string[]) {
        let labelString: string;
        let textoffset: number;

        if (lines.length > 0) {
            const paddingGoal = lines.length.toString().length;
            const lineNumber = match.location.start.line;
            const column = match.location.start.column;
            labelString = lineNumber.toString().padStart(paddingGoal, '0') + ": ";
            let text: string = lines[lineNumber - 1] ?? "";
            textoffset = paddingGoal + 2/* skip ': ' */ - 1 /*different counting between match and label*/;

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
        const highlightStart = match.location.start.column + this._textoffset;
        let highlightEnd = highlightStart + (match.location.end.offset - match.location.start.offset);
        if (highlightEnd > this._label.label.length) {
            highlightEnd = this._label.label.length;
        }
        this._label.highlights.push([highlightStart, highlightEnd]);
    }
}
//#region Helper Classes

/**
 * Type which forces to contain all match-categories
 */
interface MatchCategories {
    toolCalls: CategoryItem,
    prgCallNames: CategoryItem,
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
export interface MyItem extends vscode.TreeItem {
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
//#endregion

//#region Helper functions
/**
 * Returns a readable message for an unknown error value.
 */
function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Checks if given uri refers to a .nc-file
 * @param path 
 * @returns true if given uri ends with.nc, false otherwise
 */
function ncFileOpened(): boolean {
    const editor = vscode.window.activeTextEditor;
    let isIsgCnc: boolean = false;
    if (editor) {
        if (editor.document) {
            const isIsgCncNumber = vscode.languages.match("isg-cnc", editor.document);
            if (isIsgCncNumber > 0) {
                isIsgCnc = true;
            }
        }
    }
    return isIsgCnc;
}

/**
 * Lets the editor cursor jump to the specified match within the currently opened file
 * @param item the match to jump to as a MatchItem within the file content tree
 */
export async function jumpToMatch(item: MatchItem) {
    const file = vscode.window.activeTextEditor?.document.uri;
    if (file !== undefined) {
        //open the text document
        const doc = await vscode.workspace.openTextDocument(file);
        let pos1 = new vscode.Position(0, 0);
        let pos2 = new vscode.Position(0, 0);
        let sel = new vscode.Selection(pos1, pos2);
        //set cursor at top left corner
        const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        editor.selection = sel;
        //move down
        const itemMatch: Match = item.match;
        await vscode.commands.executeCommand("cursorMove", {
            to: "down",
            by: "line",
            value: itemMatch.location.start.line - 1
        });
        //move right
        await vscode.commands.executeCommand("cursorMove", {
            to: "right",
            by: "character",
            value: itemMatch.location.start.column - 1
        });
    }
}
//#endregion

