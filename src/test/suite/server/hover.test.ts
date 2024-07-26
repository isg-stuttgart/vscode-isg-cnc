import * as assert from 'assert';
import * as vscode from "vscode";
import { getPathOfWorkspaceFile } from '../testHelper';
import { getHoverInformation } from '../../../../server/src/hover';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Hover, MarkupContent } from 'vscode-languageserver';
// open test file
const testFilePath = getPathOfWorkspaceFile("isgCycles_test.nc");
const testFileUri = vscode.Uri.file(testFilePath);
suite('LS Hover Information', () => {
    test('Hover Information for cycle call name', async () => {
        const doc = await vscode.workspace.openTextDocument(testFileUri);
        const hover = getHoverInformation({ line: 1, character: 17 }, TextDocument.create(testFileUri.toString(), "isg-cnc", 0, doc.getText()), null, new Map<string, TextDocument>());
        assert.ok(hover !== undefined && hover !== null);
        assert.ok(getHoverContent(hover).includes("SysCalibToolSettingProbe"));
    });

    test('Hover Information for cycle parameter (both single-line and multi-line)', async () => {
        const hoverMulti = getHoverInformation({ line: 2, character: 4 }, TextDocument.create(testFileUri.toString(), "isg-cnc", 0, (await vscode.workspace.openTextDocument(testFileUri)).getText()), null, new Map<string, TextDocument>());
        const hoverSingle = getHoverInformation({ line: 8, character: 45 }, TextDocument.create(testFileUri.toString(), "isg-cnc", 0, (await vscode.workspace.openTextDocument(testFileUri)).getText()), null, new Map<string, TextDocument>());
        assert.ok(hoverMulti !== undefined && hoverMulti !== null);
        assert.ok(hoverSingle !== undefined && hoverSingle !== null);
        assert.ok(getHoverContent(hoverMulti).includes("P6"));
        assert.ok(getHoverContent(hoverSingle).includes("P6"));
    });
});

function getHoverContent(hover: Hover) {
    return (hover.contents as MarkupContent).value;
}