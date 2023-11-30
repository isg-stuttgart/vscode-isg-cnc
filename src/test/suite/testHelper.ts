import assert = require('assert');
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Match } from '../../../server/src/parserClasses';
import * as peggy from 'peggy';
import { MatchType } from '../../../server/src/parserClasses';

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
    let newContent;

    //execute
    try {
        await command();
        newContent = doc.getText();
    } finally {
        //undo changes by applying old text
        await editor.edit(editBuilder => {
            editBuilder.replace(new vscode.Range(0, 0, doc.lineCount, 0), oldText);
        });
        await doc.save();
    }

    //compare result
    const expectedContent = fs.readFileSync(expectedPath, 'utf8');
    assert.strictEqual(newContent, expectedContent);
}

/**
 * A Mock object for a Match object. The type must be specified, the other parameters default to null when not specified.
 */
export class MatchMock implements Match {
    type: MatchType;
    content: any;
    location: peggy.LocationRange;
    text: string;
    name: string | null;

    constructor(type: MatchType, content: any = null, location: peggy.LocationRange = new LocationRangeMock(), text: string = "", name: string | null = null) {
        this.type = type;
        this.content = content;
        this.location = location;
        this.text = text;
        this.name = name;
    }
}

/** A peggy.LocationRange Mock object which defaults to a default object when not specified. */
export class LocationRangeMock implements peggy.LocationRange {
    source: any;
    start: peggy.Location;
    end: peggy.Location;

    constructor(
        source: any = null,
        start: peggy.Location = new LocationMock(),
        end: peggy.Location = new LocationMock()
    ) {
        this.source = source;
        this.start = start;
        this.end = end;
    }
}

/**
 * A peggy.Location Mock object which defaults to a default object when not specified.
 */
export class LocationMock implements peggy.Location {
    line: number;
    column: number;
    offset: number;
    constructor(line: number = 0, column: number = 0, offset: number = 0) {
        this.line = line;
        this.column = column;
        this.offset = offset;
    }
}

/**
 * Asserts that the passed locations are equal, ignoring the order of the locations.
 * @param actual the actual locations
 * @param expected the expected locations
 */
export function assertSameLocations(actual: vscode.Location[], expected: VSCodeLocationMock[]) {
    assert.strictEqual(actual.length, expected.length);
    // sort locations by JSON.stringify to ignore the order
    actual.sort((a, b) => JSON.stringify(a) > JSON.stringify(b) ? 1 : -1);
    expected.sort((a, b) => JSON.stringify(a) > JSON.stringify(b) ? 1 : -1);
    // compare locations
    for (let i = 0; i < actual.length; i++) {
        assert.strictEqual(actual[i].uri.fsPath, expected[i].path);
        assert.deepStrictEqual(actual[i].range, expected[i].range);
    }
}
export class VSCodeLocationMock {
    path: string;
    range: vscode.Range;
    constructor(path: string, startLine: number, startColumn: number, endLine: number, endColumn: number) {
        this.path = path;
        this.range = new vscode.Range(startLine, startColumn, endLine, endColumn);
    }
}

