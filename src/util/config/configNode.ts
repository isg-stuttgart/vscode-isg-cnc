import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Change the language mode of the specified file or folder.
 * If languageId is omitted, the user selects a language mode.
 * @param inputUri The file or folder to change the language mode of.
 * @param languageId The language mode to apply, if specified.
 */
export async function changeLanguageMode(inputUri: any, languageId?: string): Promise<void> {
    try {
        if (!inputUri || !inputUri.fsPath) {
            vscode.window.showErrorMessage("No file/folder selected");
            return;
        }
        if (!fs.existsSync(inputUri.fsPath)) {
            vscode.window.showErrorMessage("File/folder to change language mode does not exist: " + inputUri.fsPath);
            return;
        }
        const currentAssociationsEntryArray = Object.entries(vscode.workspace.getConfiguration("files").get("associations") as Map<string, string>);
        const currentAssociationsObject: { [k: string]: any } = {};
        currentAssociationsEntryArray.forEach((entry) => {
            currentAssociationsObject[entry[0]] = entry[1];
        });

        if (!currentAssociationsEntryArray) {
            vscode.window.showErrorMessage("Could not get current file associations");
            return;
        }

        // Convert the URI to a glob pattern.
        let globPattern: string = path.normalize(inputUri.fsPath).replace(/\\/g, "/");

        // Match every file under a selected folder.
        if (fs.lstatSync(inputUri.fsPath).isDirectory()) {
            globPattern = globPattern.concat("/**");
        }

        // Ask the user to choose a language mode when none was provided.
        const allLanguages: string[] = await vscode.languages.getLanguages();
        const languageMode: string | undefined = languageId ? languageId : await vscode.window.showQuickPick(allLanguages, { placeHolder: "Select language mode" });
        if (!languageMode) {
            vscode.window.showWarningMessage("No language mode selected. Aborting changing language mode.");
            return;
        }

        // Save the association in workspace settings.
        currentAssociationsObject[globPattern] = languageMode;
        await vscode.workspace.getConfiguration("files").update("associations", currentAssociationsObject, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
        vscode.window.showErrorMessage("Error while changing language mode: " + error);
    }
}