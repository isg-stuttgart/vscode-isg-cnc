import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { match } from 'assert';
import * as peggy from "peggy";
import * as extension from "../extension";
const parser = require(('./ncParser'));
export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem>{
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    file!: TreeItemWithChildrenArray;
    matchCategories: {
        toolCalls: Category,
        prgCalls: Category,
    };
    context: vscode.ExtensionContext;
    constructor(file: vscode.Uri, extContext: vscode.ExtensionContext) {
        this.file = new TreeItemWithChildrenArray(file, vscode.TreeItemCollapsibleState.Expanded);
        this.matchCategories = {
            toolCalls: new Category("Tool Calls"),
            prgCalls: new Category("Program Calls"),
        };
        this.context = extContext;
        this.file.addChild(this.matchCategories.toolCalls);
        this.file.addChild(this.matchCategories.prgCalls);
    }

    refresh(): void {
        try {
            const filepath = this.file.resourceUri?.fsPath;
            if (filepath !== undefined) {
                const filecontent = fs.readFileSync(filepath, "utf8");
                const parseResult = parser.parse(filecontent);
                this.updateFileContent(parseResult);
                this._onDidChangeTreeData.fire();
            } else {
                vscode.window.showWarningMessage("Loading file failed: " + filepath);
            }
        } catch (e: any) {
            // vscode.window.showWarningMessage("NC file isn't structured correctly.\nFilecontent can not be updated");
            vscode.window.showErrorMessage("Error:" + e);
        }

    }
    updateFileContent(parseResult: any): void {
        this.matchCategories.toolCalls.resetMatches(parseResult.toolCalls, this.context);
        this.matchCategories.prgCalls.resetMatches(parseResult.prgCalls, this.context);
    }


    getTreeItem(element: TreeItemWithChildrenArray): vscode.TreeItem {
        return element;
    }
    getChildren(element?: TreeItemWithChildrenArray): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve(element.getChildren());
        } else {
            return Promise.resolve([this.file]);
        }
    }

    public disposeCommands():void{
        this.matchCategories.toolCalls.disposeCommands();
        this.matchCategories.prgCalls.disposeCommands();
    }

   
}


class TreeItemWithChildrenArray extends vscode.TreeItem {
    children: vscode.TreeItem[] = [];
    /**
     * Returns all children of this TreeItem as an Array
     * @returns children
     */
    public getChildren(): vscode.TreeItem[] {
        return this.children;
    }

    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(child: vscode.TreeItem): void {
        this.children.push(child);
    }
}

class Category extends vscode.TreeItem {
    private children: Map<string, SubCategoryTreeItem> = new Map<string, SubCategoryTreeItem>();
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
    }
    /**
      * Returns all children of this TreeItem as an Array
      * @returns children
      */
    public getChildren(): SubCategoryTreeItem[] {
        return Array.from(this.children.values());
    }
    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(name: string, child: SubCategoryTreeItem): void {
        this.children.set(name, child);
    }

    /**
     * Overwrites old children with new ones
     * @param newMatches 
     */
    resetMatches(newMatches: Match[], context: vscode.ExtensionContext) {
        // unregister old match-commands used to jump to file-position
        this.disposeCommands();
        this.children.clear();

        newMatches.forEach((match: Match) => {
            // e.g. toolCalls will be seperated in subCategories T1, T2 etc.
            let subCategory: SubCategoryTreeItem | undefined = this.children.get(match.text);
            //create subCategory when non-existing
            if (subCategory === undefined) {
                this.children.set(match.text, new SubCategoryTreeItem(match.text, vscode.TreeItemCollapsibleState.Collapsed));
            }

            subCategory = this.children.get(match.text);
            //make sure subCategory exists now 
            if (subCategory !== undefined) {
                const matchItem = new MatchTreeItem(match, context);
                subCategory.addChild(matchItem);
            } else {
                throw new Error("subCategory " + match.text + " was not created successfully");
            }


        });

    }

    disposeCommands():void{
        this.children.forEach(subCategory => {
            subCategory.getChildren().forEach(match =>{
                match.commandHandler.dispose();
            });
        });
    }
}

class SubCategoryTreeItem extends TreeItemWithChildrenArray {
    children: MatchTreeItem[] = [];
    /**
     * Returns all children of this TreeItem as an Array
     * @returns children
     */
    public getChildren(): MatchTreeItem[] {
        return this.children;
    }

    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(child: MatchTreeItem): void {
        this.children.push(child);
    }
}
class MatchTreeItem extends TreeItemWithChildrenArray {
    commandHandler: vscode.Disposable;
    match: Match;
    constructor(match: Match, context: vscode.ExtensionContext) {
        super("Line: " + match.location.start.line);
        this.match = match;
        this.command = {
            title: match.text + "_" + match.location.start.offset.toString(),
            command: match.text + "_" + match.location.start.offset.toString()
        };
        this.commandHandler = vscode.commands.registerTextEditorCommand(this.command.command, () =>{
           /*  vscode.window.showWarningMessage("HellO " + match.text);
            extension.setCursorPosition(this.match.location.start.offset); */
        });
        context.subscriptions.push(this.commandHandler);
    }

    public disposeCommandHandler(): void {
        this.commandHandler.dispose();
    }
}


/**
 * Type which is returned within the arrays of the parse result
 */
interface Match {
    text: string;
    location: peggy.LocationRange;
}