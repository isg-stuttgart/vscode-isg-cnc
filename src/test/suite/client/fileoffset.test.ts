import assert = require("assert");
import { getPathOfWorkspaceFile, openTestFile } from "../testHelper";
import { getCurrentFileOffset, setCursorPosition, showCursorFileOffsetInfobox } from "../../../util/fileoffset";
import * as vscode from "vscode";
// get the absolute path of testWithEverything.nc
const testWithEverythingPath = getPathOfWorkspaceFile("testWithEverything.nc");

suite("File Offset Test", () => {
    test("Set/get fileoffset", async () => {
        await openTestFile("test.nc");
        setCursorPosition(100);
        assert.strictEqual(getCurrentFileOffset(), 100);
        showCursorFileOffsetInfobox();
    });

    test("jumpIntoFileAtOffset", async () => {
        // open tmp file to execute the command within it
        const testFileDoc = await openTestFile("tmp.nc");
        // write some test-text to the file after clearing it
        await vscode.window.activeTextEditor?.edit((editBuilder) => {
            editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(testFileDoc.lineCount, 0)));
        });
        // spaces are added to test trimming
        await vscode.window.activeTextEditor?.edit((editBuilder) => {
            editBuilder.insert(new vscode.Position(0, 0),
                ` testWithEverything.nc \n ` +
                ` ${testWithEverythingPath} \n ` +
                ` 100 `
            );
        });

        // select filename
        await assertOffsetAfterJumpIntoFile([
            new vscode.Selection(0, 0, 1, 0)
        ], 0);
        // select filename and offset
        await assertOffsetAfterJumpIntoFile([
            new vscode.Selection(0, 0, 1, 0),
            new vscode.Selection(2, 1, 2, 6)
        ], 100);
        // select absolute path
        await assertOffsetAfterJumpIntoFile([
            new vscode.Selection(1, 0, 2, 0)
        ], 0);
        // select absolute path and offset
        await assertOffsetAfterJumpIntoFile([
            new vscode.Selection(1, 0, 2, 0),
            new vscode.Selection(2, 1, 2, 6)
        ], 100);
    });
});

async function assertOffsetAfterJumpIntoFile(selections: vscode.Selection[], expectedOffset: number) {
    // open tmp.nc file
    await openTestFile("tmp.nc");
    // set the selections
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        throw new Error("No active text editor found");
    }
    editor.selections = selections;
    // execute the command
    await vscode.commands.executeCommand("isg-cnc.jumpIntoFileAtOffset");
    // assert that we jumped into testWithEverything.nc and the cursor is at the expected offset
    assert.strictEqual(vscode.window.activeTextEditor?.document.uri.fsPath, testWithEverythingPath);
    assert.strictEqual(getCurrentFileOffset(), expectedOffset);
}