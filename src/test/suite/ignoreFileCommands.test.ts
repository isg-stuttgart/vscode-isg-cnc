import * as vscode from "vscode";
import { getPathOfWorkspaceFile } from "./testHelper";
import * as fs from "fs";
import * as os from "os";
import assert = require("assert");
import path = require("path");

suite("Command to add file/folder to ignore file", function () {
    test("Command to add file/folder to ignore file", async () => {
        const ignorePath = getPathOfWorkspaceFile(".isg-cnc-ignore");
        // delete ignore file if it exists
        if (fs.existsSync(ignorePath)) {
            fs.unlinkSync(ignorePath);
        }
        const testUri = vscode.Uri.file(getPathOfWorkspaceFile("test.nc"));
        await vscode.commands.executeCommand("isg-cnc.addToIgnore", testUri);

        let currentExpectedText = "# Adding files/directories to this file will prevent the ISG-CNC extension from searching for references/definitions in these files/directories." + os.EOL +
        "# This does not affect other features of the ISG-CNC extension." + os.EOL +
        "# The ignore syntax is equivalent to the .gitignore syntax. See https://git-scm.com/docs/gitignore for more information." + os.EOL + os.EOL + "test.nc";
        // read ignore file with vscode api
        let currentActualText = (await vscode.workspace.openTextDocument(ignorePath)).getText();

        assert.strictEqual(currentActualText, currentExpectedText);
        
        // add the same file again (should not change anything)
        await vscode.commands.executeCommand("isg-cnc.addToIgnore", testUri);
        currentActualText = (await vscode.workspace.openTextDocument(ignorePath)).getText();
        assert.strictEqual(currentActualText, currentExpectedText);

        // add folder to ignore file
        const folderUri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("languageFolder", "nestedFolder")));
        await vscode.commands.executeCommand("isg-cnc.addToIgnore", folderUri);
        currentExpectedText += os.EOL + "languageFolder/nestedFolder";
        currentActualText = (await vscode.workspace.openTextDocument(ignorePath)).getText();
        assert.strictEqual(currentActualText, currentExpectedText);

        // add an included file of the folder (should not change anything)
        const includedFileUri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("languageFolder", "nestedFolder", "nestedFile.nc")));
        await vscode.commands.executeCommand("isg-cnc.addToIgnore", includedFileUri);
        currentActualText = (await vscode.workspace.openTextDocument(ignorePath)).getText();
        assert.strictEqual(currentActualText, currentExpectedText);

        // add the whole workspace folder to ignore file
        const workspaceFolderUri = vscode.Uri.file(getPathOfWorkspaceFile(""));
        await vscode.commands.executeCommand("isg-cnc.addToIgnore", workspaceFolderUri);
        currentExpectedText += os.EOL + "/*";
        currentActualText = (await vscode.workspace.openTextDocument(ignorePath)).getText();
        assert.strictEqual(currentActualText, currentExpectedText);
    });
});