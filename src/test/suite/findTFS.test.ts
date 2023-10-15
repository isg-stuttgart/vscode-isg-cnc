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
        console.log("Expected start: " + JSON.stringify(document?.positionAt(37)));
        console.log("Actual start: " + JSON.stringify(selection?.start));
        console.log("Expected end: " + JSON.stringify(document?.positionAt(40)));
        console.log("Actual end: " + JSON.stringify(selection?.end));
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