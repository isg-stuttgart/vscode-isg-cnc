import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileContentProvider implements vscode.TreeDataProvider<vscode.TreeItem>{
    file!: Category;
    matchCategories: {
        toolCalls: Category,
        prgCalls: Category,
    };
    constructor(file: vscode.Uri) {
        this.file = new Category(file, vscode.TreeItemCollapsibleState.Expanded);
        this.matchCategories = {
            toolCalls: new Category("Tool Calls", vscode.TreeItemCollapsibleState.Collapsed),
            prgCalls: new Category("Program Calls", vscode.TreeItemCollapsibleState.Collapsed),
        };
        this.file.addChild(this.matchCategories.toolCalls);
        this.file.addChild(this.matchCategories.prgCalls);
    }

    refresh(): void {
        vscode.window.showInformationMessage(this.file.resourceUri + "changed");
    }


    getTreeItem(element: Category): vscode.TreeItem {
        return element;
    }
    getChildren(element?: Category): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve(element.getChildren());
        } else {
            return Promise.resolve([this.file]);
        }
    }

}

class Category extends vscode.TreeItem {
    iconPath = {
        light: "Test in hell",
        dark: "Test in dunkel"
    };
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
    public addChild(child: Category): void {
        this.children.push(child);
    }
}