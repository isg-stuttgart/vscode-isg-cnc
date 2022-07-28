import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { match } from 'assert';
import * as peggy from "peggy";
const parser = require(('./ncParser'));


export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem>{
    file!: FileTreeItem;
    matchCategories: {
        toolCalls: FileContentCategory,
        prgCalls: FileContentCategory,
    };
    constructor(file: vscode.Uri) {
        this.file = new FileTreeItem(file, vscode.TreeItemCollapsibleState.Expanded);
        this.matchCategories = {
            toolCalls: new FileContentCategory("Tool Calls", vscode.TreeItemCollapsibleState.Collapsed),
            prgCalls: new FileContentCategory("Program Calls", vscode.TreeItemCollapsibleState.Collapsed),
        };
        this.file.addChild(this.matchCategories.toolCalls);
        this.file.addChild(this.matchCategories.prgCalls);
    }

    refresh(): void {
        try{
            const filepath = this.file.resourceUri?.fsPath;
            if (filepath !== undefined) {
                const filecontent = fs.readFileSync(filepath, "utf8");
                const parseResult = parser.parse(filecontent);
                this.updateFileContent(parseResult);
            } else {
                vscode.window.showWarningMessage("Loading file failed: " + filepath);
            }
        }catch(e: any){
            vscode.window.showWarningMessage("NC file isnt structured correctly.\nFilecontent can not be updated");
        }
       
    }
    updateFileContent(parseResult: any): void {
        this.matchCategories.toolCalls.resetChildren(parseResult.toolCalls);
        this.matchCategories.prgCalls.resetChildren(parseResult.prgCalls);

    }


    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }
    getChildren(element?: FileTreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve(element.getChildren());
        } else {
            return Promise.resolve([this.file]);
        }
    }

}


class FileTreeItem extends vscode.TreeItem {
    private children: vscode.TreeItem[] = [];

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


class FileContentCategory extends vscode.TreeItem {
    private children: Map<string, FileTreeItem> = new Map<string, FileTreeItem>();

    /**
      * Returns all children of this TreeItem as an Array
      * @returns children
      */
    public getChildren(): vscode.TreeItem[] {
        return Array.from(this.children.values());
    }
    /**
     * Add a child to this TreeItem
     * @param child 
     */
    public addChild(name: string, child: FileTreeItem): void {
        this.children.set(name, child);
    }

    /**
     * Overwrites old children with new ones
     * @param newChildren 
     */
    resetChildren(newChildren: Match[]) {
        this.children.clear();
        newChildren.forEach((match: Match) => {
            // e.g. toolCalls will be seperated in subCategories T1, T2 etc.
            let subCategory: FileTreeItem | undefined = this.children.get(match.text);
            //create subCategory when non-existing
            if (subCategory === undefined) {
                this.children.set(match.text, new FileTreeItem(match.text));
            }
            subCategory = this.children.get(match.text);
            //make sure subCategory exists now 
            if (subCategory !== undefined) {
                subCategory.addChild(new vscode.TreeItem(match.text));
            } else {
                vscode.window.showWarningMessage("FAIL");
                throw new Error("subCategory " + match.text + " was not created successfully");
            }


        });

    }
}
class Match {                                           // holds information about a relevant match
    text;                                               // the text that was matched
    location;                                           // the location of the match
    constructor(text: string, location: peggy.Location) {
        this.text = text;
        this.location = location;
    }
}