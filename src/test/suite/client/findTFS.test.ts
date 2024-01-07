import assert = require("assert");
import * as vscode from "vscode";
import { openTestFile } from "../testHelper";

suite("Find TFS Test", () => {
    test("Find next TFS", async () => {
        await openTestFile("fileContentTree_test.nc");
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
            assert.fail("No active text editor");
        }
        activeTextEditor.selection = new vscode.Selection(
            new vscode.Position(0, 2),
            new vscode.Position(0, 2)
        );
        await vscode.commands.executeCommand("isg-cnc.FindNextTFS");
        const selection = activeTextEditor.selection;
        assert.deepStrictEqual(selection?.start, new vscode.Position(3, 10));
        assert.deepStrictEqual(selection?.end, new vscode.Position(3, 13));
        assert.deepStrictEqual(selection?.active, new vscode.Position(3, 13));
    });

    test("Find all TFS", async () => {
        // only calls the command and checks if it throws an error because of simple implementation
        await openTestFile("fileContentTree_test.nc");
        await vscode.commands.executeCommand("isg-cnc.FindAllToolCalls");
    });
});