import * as vscode from "vscode";
import * as statusbar from "../../util/statusbar";
import { openTestFile } from "./testHelper";

suite("Statusbar Tests", async () => {
    test("Test Current Offset Status Bar Item", async function () {
        await openTestFile("test.nc");
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error("No active editor");
        }
        // check if status bar item updates to the same offset as editor api
        const statusBarOffsetItem = statusbar.getCurrentOffsetStatusBarItem();
        await loopUntilTextIsEqual(statusBarOffsetItem, `$(arrow-right) Fileoffset: ${editor?.document.offsetAt(editor.selection.active)}`);
        // set editor cursor to offset 80 and check if status bar updates correctly
        editor.selection = new vscode.Selection(editor.document.positionAt(80), editor.document.positionAt(80));
        await loopUntilTextIsEqual(statusBarOffsetItem, `$(arrow-right) Fileoffset: 80`);
    });

    test("Test Selected Lines Status Bar Item", async function () {
        await openTestFile("test.nc");
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error("No active editor");
        }
        // check if status bar item updates to the same selection as editor api
        const statusBarSelectedLinesItem = statusbar.getSelectedLinesStatusBarItem();
        editor.selection = new vscode.Selection(new vscode.Position(4, 4), new vscode.Position(4, 4));
        await loopUntilTextIsEqual(statusBarSelectedLinesItem, `$(megaphone) ${0} line(s) selected`);
        // set editor selection to 4 lines and check if status bar updates correctly
        editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(3, 1));
        await loopUntilTextIsEqual(statusBarSelectedLinesItem, `$(megaphone) ${4} line(s) selected`);
        // set selection to 0 lines again and check if status bar updates correctly
        editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
        await loopUntilTextIsEqual(statusBarSelectedLinesItem, `$(megaphone) ${0} line(s) selected`);
    });
});


async function loopUntilTextIsEqual(statusBarItem: vscode.StatusBarItem, text: string, timeout: number = 1000) {
    const startTime = Date.now();
    while (statusBarItem.text !== text) {
        if (Date.now() - startTime > timeout) {
            throw new Error(`Status bar item did not update to "${text}" after ${timeout} milliseconds and was "${statusBarItem.text}" instead.`);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}
