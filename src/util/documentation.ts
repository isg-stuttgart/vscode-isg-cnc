import { printToOutputchannel } from "./outputChannel";
import * as vscode from "vscode";
import { getDocumentationPath, getLocale } from "./config";
import path = require("path");
/**
 *Load the ISG-CNC Kernel html documentation in default webbrowser.
 The address is combined from the settings "isg-cnc.documentationPath" and "isg-cnc.locale".
 */
export function openDocu(): void {
    let docuAddress: string = createFullAddress();
    const parsedDocuPath = vscode.Uri.parse(docuAddress);
    vscode.env.openExternal(parsedDocuPath);
}

/**
 * Opens the ISG-CNC Kernel html documentation in default webbrowser with the given id.
 * If the documentation path is not the default, interpret it as local file path and open it in browser.
 * @param id the id of the documentation to open
 */
export function openDocuWithId(id: string): void {
    // if the documentation does not start with http, interpret it as local file path and open it in browser
    if (!getDocumentationPath().startsWith("http")) {
        const filePath = path.join(getDocumentationPath(), getLocale(), `${id}.html`);
        const parsedDocuPath = vscode.Uri.file(filePath);
        vscode.env.openExternal(parsedDocuPath);
    } else {
        // if the documentation path starts with http interpret it as web address and open it in browser
        let docuAddress: string = createFullAddress();
        const parsedDocuPath = vscode.Uri.parse(docuAddress + "#" + id);
        vscode.env.openExternal(parsedDocuPath);
    }
}

export function createFullAddress(): string {
    const docuPath = getDocumentationPath();
    let localeDocuPath: string = docuPath;
    const locale: string = getLocale();
    let docuAddress: string = "";
    const document: vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
    if (document) {
        if (!localeDocuPath.endsWith('/')) {
            localeDocuPath += "/" + `${locale}/`;
        } else {
            localeDocuPath += `${locale}/`;
        }
        //IMPORTANT: THE FOLLOWING BLOCK IS FOR OPEN DOCU WITH SELECTED SEARCHING KEYWORD
        //THE WEBSITE IS BROKEN AT THE MOMENT SO IT WILL JUST LOAD THE GENERAL DOCU WEBSITE
        //UNCOMMENT IF THE WEBSITE WAS FIXES AND DELETE THE ASSIGNMENT UNDER THE COMMENT:
        //  "docuAddress = localeDocuPath + "index.html";"
        /*  if (!activeTextEditor.selection.isEmpty) {
             searchContext = activeTextEditor.document.getText(
                 activeTextEditor.selection
             );
             const query = new URLSearchParams();
             query.append("q", searchContext);
             docuAddress = localeDocuPath + `search.html?${query.toString()}`;
         } else {
              docuAddress = localeDocuPath + "index.html";
         } */
        docuAddress = localeDocuPath + "index.html";
    }
    printToOutputchannel(docuAddress);
    printToOutputchannel(`Path to the documentation: ${docuPath}`);
    printToOutputchannel(`Address to the website: ${docuAddress}`);
    return docuAddress;
}
