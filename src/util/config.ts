import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
/**
 * Returns the value of the setting "isg-cnc.enableFormatter". If the value cannot be found correctly, false is returned.
 * @returns isg-cnc.enableFormatter
 */
export function getEnableFormatter(): boolean {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.enableFormatter");
    // if value is boolean return value else return false
    return typeof value === "boolean" ? value : false;
}

/**
 *  Returns the value of the setting isg-cnc.documentationPath. If the value cannot be found correctly, "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/" is returned.
 * @returns isg-cnc.documentationPath
 */
export function getDocumentationPath(): string {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.documentationPath");
    // if value is string return value else return 
    return typeof value === "string" ? value : "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/";
}

/**
 *  eturns the value of the setting isg-cnc.locale. If the value cannot be found correctly, "en-GB" is returned.
 * @returns isg-cnc.locale
 */
export function getLocale(): string {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.locale");
    // if value is string return value else return "en-GB"
    return typeof value === "string" ? value : "en-GB";
}

/**
 * Returns the value of the setting isg-cnc.enableOutputchannel. If the value cannot be found correctly, false is returned.
 * @returns isg-cnc.enableOutputchannel
 */
export function getEnableOutputchannel(): boolean {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.enableOutputchannel");
    // if value is boolean return value else return false
    return typeof value === "boolean" ? value : false;
}

/**
 * Change the language mode of the specified file/folder to a new one
 * The new language mode is selected by the user in a quick pick menu.
 * @param inputUri The file/folder to change the language mode of
 */
export async function changeLanguageMode(inputUri: any): Promise<void> {
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

        // convert uri to glob pattern
        let globPattern: string = path.normalize(inputUri.fsPath).replace(/\\/g, "/");

        //if uri is folder add ** to glob pattern and add it to the current associations
        if (fs.lstatSync(inputUri.fsPath).isDirectory()) {
            globPattern = globPattern.concat("/**");
        }

        // ask user for language mode by quickselect
        const allLanguages: string[] = await vscode.languages.getLanguages();
        const languageMode: string | undefined = await vscode.window.showQuickPick(allLanguages, { placeHolder: "Select language mode" });
        if (!languageMode) {
            vscode.window.showWarningMessage("No language mode selected. Aborting changing language mode.");
            return;
        }

        // update settings with new association
        currentAssociationsObject[globPattern] = languageMode;
        vscode.workspace.getConfiguration("files").update("associations", currentAssociationsObject, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
        vscode.window.showErrorMessage("Error while changing language mode: " + error);
    }
}