import assert = require('assert');
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
export function getPathOfWorkspaceFile(filename: string): string {
    const workSpaceFolders = vscode.workspace.workspaceFolders;
    if (!workSpaceFolders) {
        throw new Error('No workspace is opened.');
    }
    return path.join(workSpaceFolders[0].uri.fsPath, filename);
}

export async function openTestFile(fileName: string): Promise<vscode.TextDocument> {
    const filePath = getPathOfWorkspaceFile(fileName);
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
    return doc;
}

export async function testApplyingCommandToFile(fileName: string, expectedName: string, command: () => void | Promise<void>) {
    //open test file
    const expectedPath = getPathOfWorkspaceFile(expectedName);
    const filePath = getPathOfWorkspaceFile(fileName);
    const doc = await vscode.workspace.openTextDocument(filePath);
    const oldText = doc.getText();
    const editor = await vscode.window.showTextDocument(doc);

    //execute
    await command();
    const newContent = doc.getText();
    //undo changes by applying old text
    await editor.edit(editBuilder => {
        editBuilder.replace(new vscode.Range(0, 0, doc.lineCount, 0), oldText);
    });
    await doc.save();

    //compare result
    const expectedContent = fs.readFileSync(expectedPath, 'utf8');
    assert.strictEqual(newContent, expectedContent);
}