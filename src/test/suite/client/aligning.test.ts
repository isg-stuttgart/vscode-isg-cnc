import * as vscode from "vscode";
import { assertApplyingCommandToFile } from "../testHelper";

suite("Align Commands Test", () => {
    test("Align Comments Test Default", async () => {
        assertApplyingCommandToFile("alignComments_test.nc", "alignComments_test_expected.nc", alignCommentsTesting);
    });
    test("Align Comments Test Twice With Same Result", async () => {
        assertApplyingCommandToFile("alignComments_test.nc", "alignComments_test_expected.nc", async () => {
            await alignCommentsTesting();
            await alignCommentsTesting();
        });
    });
    test("Align Equal Sign Test", async () => {
        assertApplyingCommandToFile("alignEqualSign_test.nc", "alignEqualSign_test_expected.nc", alignEqualSignTesting);
    });
    test("Align Equal Sign Test Twice With Same Result", async () => {
        assertApplyingCommandToFile("alignEqualSign_test.nc", "alignEqualSign_test_expected.nc", async () => {
            await alignEqualSignTesting();
            await alignEqualSignTesting();
        });
    });
});

async function alignCommentsTesting() {
    // select some lines to execute command on
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        throw new Error("No active editor");
    }
    editor.selection = new vscode.Selection(0, 14, 16, 0);
    await vscode.commands.executeCommand("isg-cnc.AlignComments");
    editor.selection = new vscode.Selection(18, 13, 26, 16);
    await vscode.commands.executeCommand("isg-cnc.AlignComments");
}

async function alignEqualSignTesting() {
    // select some lines to execute command on
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        throw new Error("No active editor");
    }
    editor.selection = new vscode.Selection(5, 21, 24, 32);
    await vscode.commands.executeCommand("isg-cnc.AlignEqualSigns");
}