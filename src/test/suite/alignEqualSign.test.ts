import assert = require("assert");
import * as vscode from "vscode";
import * as testHelper from "./testHelper";
import * as fs from "fs";
suite("Align Equal Sign Command Test", () => {
    test("Default case", async () => {
        // open test file
        const testFilePath = testHelper.getPathOfWorkspaceFile("alignEqualSign_test.nc");
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const oldText = doc.getText();

        // select some lines to execute command on
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(5, 21, 24, 32);

        // execute command
        await vscode.commands.executeCommand("isg-cnc.AlignEqualSigns");
        const newContent = doc.getText();

        // undo changes by applying old text
        await editor.edit(editBuilder => {
            editBuilder.replace(new vscode.Range(0, 0, doc.lineCount, 0), oldText);
        });
        await doc.save();

        // compare result
        const expectedPath = testHelper.getPathOfWorkspaceFile("alignEqualSign_test_expected.nc");
        const expectedContent = fs.readFileSync(expectedPath, "utf8");
        assert.strictEqual(newContent, expectedContent);
    });
});