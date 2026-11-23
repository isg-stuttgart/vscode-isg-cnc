import * as fs from "fs";
import * as vscode from "vscode";
import path = require("path");
import * as os from "os";
import ignore, { Ignore } from "ignore";

/**
 * Adds the given file/folder to the ignore file of the workspace folder of the file/folder.
 * If the ignore file does not exist, it will be created.
 * If the file/folder is already ignored, a message will be shown and the ignore file will not be changed.
 * @param inputUri  file/folder to ignore
 */
export async function addToIgnore(inputUri: vscode.Uri): Promise<void> {
    const pathToIgnore: string = inputUri.fsPath;
    const workspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(inputUri);
    if (workspaceFolder === undefined) {
        vscode.window.showErrorMessage("ISG-CNC: No workspace folder found for file " + pathToIgnore);
        return;
    }
    let relativeFilePathToIgnore: string = path.posix.normalize(path.relative(workspaceFolder.uri.fsPath, pathToIgnore)).replaceAll("\\", "/");

    // if the whole workspace folder is selected, ignore all files by the correct pattern
    if (relativeFilePathToIgnore === ".") {
        relativeFilePathToIgnore = "/*";
    }

    const ignoreFilePath: string = path.join(workspaceFolder.uri.fsPath, ".isg-cnc-ignore");
    const ignoreFileDoc: vscode.TextDocument | undefined = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === ignoreFilePath);
    // create ignore file if it not exists
    if (!fs.existsSync(ignoreFilePath) && ignoreFileDoc === undefined) {
        const explanationText: string = "# Adding files/directories to this file will prevent the ISG-CNC extension from searching for references/definitions in these files/directories." + os.EOL +
            "# This does not affect other features of the ISG-CNC extension." + os.EOL +
            "# The ignore syntax is equivalent to the .gitignore syntax. See https://git-scm.com/docs/gitignore for more information." + os.EOL;
        fs.writeFileSync(ignoreFilePath, explanationText);
    }
    // check if ignored file has unsaved changes and read ignore file 
    let ignoreFileContent: string | undefined = ignoreFileDoc?.getText();
    if (ignoreFileContent === undefined) {
        ignoreFileContent = fs.readFileSync(ignoreFilePath, "utf-8");
    }

    // create ignorer to check if file/folder is already ignored
    const ignorer: Ignore = ignore().add(ignoreFileContent);
    // if the new relative path is the folder itself /* dont check with the ignorer because it can't handle an empty relative path
    let isAlreadyIgnored: boolean = false;
    if (relativeFilePathToIgnore === "/*") {
        // check if any line of the ignore files contains the pattern /* (ignore all files)
        isAlreadyIgnored = ignoreFileContent.split("\n").some(line => line.trim() === "/*");
    } else {
        isAlreadyIgnored = ignorer.ignores(relativeFilePathToIgnore);
        // add leading slash to the relative path if it is not already there to match the ignore file syntax
        if (!relativeFilePathToIgnore.startsWith("/")) {
            relativeFilePathToIgnore = "/" + relativeFilePathToIgnore;
        }
    }
    if (isAlreadyIgnored) {
        vscode.window.showInformationMessage("ISG-CNC: Path " + relativeFilePathToIgnore + " is already ignored.");
    } else {
        // edit ignore file by vscode editing
        const ignoreDoc = await vscode.workspace.openTextDocument(ignoreFilePath);
        const editor = await vscode.window.showTextDocument(ignoreDoc);
        const pos = new vscode.Position(editor.document.lineCount, 0);
        await editor.edit((editBuilder) => {
            editBuilder.insert(pos, os.EOL + relativeFilePathToIgnore);
        });
    }
}