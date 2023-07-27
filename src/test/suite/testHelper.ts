import assert = require('assert');
import path = require('path');
import * as vscode from 'vscode';
export function getPathOfWorkspaceFile(filename: string): string {
    const workSpaceFolders = vscode.workspace.workspaceFolders;
    if (!workSpaceFolders) {
        throw new Error('No workspace is opened.');
    }
    return path.join(workSpaceFolders[0].uri.fsPath, filename);
}

export async function testApplyingCommandToFile(fileName: string, expectedPath: string, command: () => void | Promise<void>) {
    //open test file
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
    const expectedContent = vscode.workspace.fs.readFile(vscode.Uri.file(expectedPath));
    assert.strictEqual(newContent, expectedContent);
}