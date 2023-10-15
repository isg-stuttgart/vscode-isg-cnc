import assert = require("assert");
import * as vscode from "vscode";
import { openTestFile } from "./testHelper";
import { getCurrentFileOffset, setCursorPosition } from "../../util/fileoffset";

suite("Find TFS Test", () => {
    test("Find next TFS", async () => {
        await openTestFile("fileContentTree_test.nc");
        setCursorPosition(20);
        await vscode.commands.executeCommand("isg-cnc.FindNextTFS");
        const activeTextEditor = vscode.window.activeTextEditor;
        const document = activeTextEditor?.document;
        const selection = activeTextEditor?.selection;
        console.log("selection: " + JSON.stringify(selection));
        assert.deepStrictEqual(selection?.start, document?.positionAt(37));
        assert.deepStrictEqual(selection?.end, document?.positionAt(40));
        assert.strictEqual(getCurrentFileOffset(), 40);
    });

    test("Find all TFS", async () => {
        // only calls the command and checks if it throws an error because of simple implementation
        await openTestFile("fileContentTree_test.nc");
        await vscode.commands.executeCommand("isg-cnc.FindAllToolCalls");
    });
});