import assert = require("assert");
import * as vscode from "vscode";
import * as testHelper from "./testHelper";
import path = require("path");
import { changeLanguageMode } from "../../../util/config";
suite("Config test", () => {
    test("Change language mode in config", async () => {
        const folderPath = testHelper.getPathOfWorkspaceFile("languageFolder");
        const folderUri = vscode.Uri.file(folderPath);
        const ncPath = testHelper.getPathOfWorkspaceFile(path.join("languageFolder", "test.nc"));
        const ncDoc = await vscode.workspace.openTextDocument(ncPath);
        const txtPath = testHelper.getPathOfWorkspaceFile(path.join("languageFolder", "test.txt"));
        const txtDoc = await vscode.workspace.openTextDocument(txtPath);
        const javaPath = testHelper.getPathOfWorkspaceFile(path.join("languageFolder", "test.java"));
        const javaDoc = await vscode.workspace.openTextDocument(javaPath);
        const nestedFolderPath = testHelper.getPathOfWorkspaceFile(path.join("languageFolder", "nestedFolder"));
        const nestedFolderUri = vscode.Uri.file(nestedFolderPath);
        const nestedNcPath = testHelper.getPathOfWorkspaceFile(path.join("languageFolder", "nestedFolder", "nestedFile.nc"));
        const nestedNcDoc = await vscode.workspace.openTextDocument(nestedNcPath);

        await reset();
        // check that initial language modes are correct
        assert.strictEqual(ncDoc.languageId, "isg-cnc");
        assert.strictEqual(txtDoc.languageId, "plaintext");
        assert.strictEqual(javaDoc.languageId, "java");
        assert.strictEqual(nestedNcDoc.languageId, "isg-cnc");
        // change file language mode in config
        await changeLanguageMode(ncDoc.uri, "plaintext");
        assert.strictEqual(ncDoc.languageId, "plaintext");
        assert.strictEqual(txtDoc.languageId, "plaintext");
        assert.strictEqual(javaDoc.languageId, "java");
        assert.strictEqual(nestedNcDoc.languageId, "isg-cnc");
        await reset();

        // change folder language mode in config
        await changeLanguageMode(folderUri, "plaintext");
        assert.strictEqual(ncDoc.languageId, "plaintext");
        assert.strictEqual(txtDoc.languageId, "plaintext");
        assert.strictEqual(javaDoc.languageId, "plaintext");
        assert.strictEqual(nestedNcDoc.languageId, "plaintext");

        // override file language mode in config
        await changeLanguageMode(ncDoc.uri, "isg-cnc");
        assert.strictEqual(ncDoc.languageId, "isg-cnc");
        assert.strictEqual(txtDoc.languageId, "plaintext");
        assert.strictEqual(javaDoc.languageId, "plaintext");
        assert.strictEqual(nestedNcDoc.languageId, "plaintext");
        await reset();

        // override language mode in nested folder
        await changeLanguageMode(folderUri, "plaintext");
        assert.strictEqual(nestedNcDoc.languageId, "plaintext");
        await changeLanguageMode(nestedFolderUri, "isg-cnc");
        assert.strictEqual(nestedNcDoc.languageId, "isg-cnc");
        await reset();

        async function reset() {
            await vscode.workspace.getConfiguration("files").update("associations", {}, vscode.ConfigurationTarget.Workspace);
        }
    });
});