import { printToOutputchannel } from "./outputChannel";
import * as vscode from "vscode";
import { getDocumentationPath, getLocale } from "./config";
/**
 *Load the ISG-CNC Kernel html documentation in default webbrowser.
 The address is combined from the settings "isg-cnc.documentationPath" and "isg-cnc.locale".
 */
export function startDocu(): void {
    let docuAddress: string = createFullAddress();
    vscode.env.openExternal(vscode.Uri.parse(docuAddress));
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
