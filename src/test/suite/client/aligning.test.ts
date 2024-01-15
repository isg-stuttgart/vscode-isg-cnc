import * as vscode from "vscode";
import { assertApplyingCommandToFile } from "../testHelper";

suite("Align Commands Test", () => {
    test("Align Comments Test", async () => {
        assertApplyingCommandToFile("alignComments_test.nc", "alignComments_test_expected.nc", async () => {
            // select some lines to execute command on
            const editor = vscode.window.activeTextEditor;
            if(!editor) {
                throw new Error("No active editor");
            }
            editor.selection = new vscode.Selection(0, 14, 16, 0);
            await vscode.commands.executeCommand("isg-cnc.AlignComments");
            editor.selection = new vscode.Selection(18, 13, 26, 16);
            await vscode.commands.executeCommand("isg-cnc.AlignComments");
        });
    });
    test("Align Equal Sign Test", async () => {
        assertApplyingCommandToFile("alignEqualSign_test.nc", "alignEqualSign_test_expected.nc", async () => {
            // select some lines to execute command on
            const editor = vscode.window.activeTextEditor;
            if(!editor) {
                throw new Error("No active editor");
            }
            editor.selection = new vscode.Selection(5, 21, 24, 32);
            await vscode.commands.executeCommand("isg-cnc.AlignEqualSigns");
        });
    });
});