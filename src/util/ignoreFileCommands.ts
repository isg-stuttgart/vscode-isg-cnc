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
export function includeInIgnore(inputUri: vscode.Uri): void {
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

    // create ignore file if it not exists
    if (!fs.existsSync(ignoreFilePath)) {
        const explanationText: string = "# Adding files/directories to this file will prevent the ISG-CNC extension from searching for references/definitions in these files/directories." + os.EOL +
            "# This does not affect other features of the ISG-CNC extension." + os.EOL +
            "# The ignore syntax is equivalent to the .gitignore syntax. See https://git-scm.com/docs/gitignore for more information." + os.EOL;
        fs.writeFileSync(ignoreFilePath, explanationText);
    }

    // check if ignored file has unsaved changes and read ignore file 
    let ignoreFileContent: string | undefined = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === ignoreFilePath)?.getText();
    if (ignoreFileContent === undefined) {
        ignoreFileContent = fs.readFileSync(ignoreFilePath, "utf-8");
    }

    // create ignorer to check if file/folder is already ignored
    const ignorer: Ignore = ignore().add(ignoreFileContent);
    const isAlreadyIgnored: boolean = ignorer.ignores(relativeFilePathToIgnore);
    if (isAlreadyIgnored) {
        vscode.window.showInformationMessage("ISG-CNC: Path " + relativeFilePathToIgnore + " is already ignored.");
    } else {
        // edit ignore file by vscode editing
        vscode.workspace.openTextDocument(ignoreFilePath).then((doc) => {
            vscode.window.showTextDocument(doc).then((editor) => {
                const pos = new vscode.Position(editor.document.lineCount, 0);
                editor.edit((editBuilder) => {
                    editBuilder.insert(pos, os.EOL + relativeFilePathToIgnore);
                });
            });
        });
    }
}