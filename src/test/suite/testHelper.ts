import assert = require('assert');
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';

export async function openTestFileForLS(fileName: string): Promise<vscode.TextDocument> {
    const doc = await openTestFile(fileName);
    // wait 2 seconds for the language server to be ready
    await sleep(2000);
    return doc;
}
/**
 * Waits for the specified time. To use this function to pause an async function, you have to use the await keyword when calling it.
 * @param ms The time to wait in milliseconds.
 * @returns  A promise which resolves after the specified time.
 */
export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Returns the path of the file in the workspace which is the combination of the workspace folder and passed the filename.
 * @param filename The name of the file in the workspace.
 * @returns The path of the file in the workspace.
 */
export function getPathOfWorkspaceFile(filename: string): string {
    const workSpaceFolders = vscode.workspace.workspaceFolders;
    if (!workSpaceFolders) {
        throw new Error('No workspace is opened.');
    }
    return path.join(workSpaceFolders[0].uri.fsPath, filename);
}

/**
 * Opens the file in the workspace with the passed filename.
 * @param fileName The name of the file in the workspace.
 * @returns The opened document as a promise.
 */
export async function openTestFile(fileName: string): Promise<vscode.TextDocument> {
    const filePath = getPathOfWorkspaceFile(fileName);
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
    return doc;
}

/**
 * Applies the specified command to the file with the passed filename and compares the result with the file with the expected-filename.
 * After the command is applied the changes are undone by applying the old text.
 * @param fileName The name of the file the command should be applied to.
 * @param expectedName The name of the file which contains the expected result.
 * @param command The command which should be applied to the file.
 */
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