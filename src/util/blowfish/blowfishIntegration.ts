/* eslint-disable @typescript-eslint/naming-convention */
import * as blowfish from "./blowfish";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Possible filters for file-explorer navigation
const filters = {
    "cnc": ["nc", "ecy", "cyc"],
    "all": ["*"]
};


export class CrypterPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cnc-view-crypter';
    private view?: vscode.WebviewView;

    constructor(private readonly extensionUri: vscode.Uri) {

    }
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): void{
        this.view=webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.extensionUri
            ]
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
            }
        });
        console.log("test");

    }



    private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'util', 'blowfish', 'crypterViewScript'));
    const mainStyleUri =  webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css'));
    const vscodeStyleUri =  webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vscode.css'));
    vscode.window.showInformationMessage(mainStyleUri.toString());
        return `
        <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <!-- only load local files -->
                    <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${webview.cspSource}; script-src ${webview.cspSource}; style-src ${webview.cspSource};"
                    />                    
                    
                    <title>Example</title>
                    <link href="${mainStyleUri}" rel="stylesheet">
                    <link href="${vscodeStyleUri}" rel="stylesheet">

                </head>
                <body>
                    <h1>ISG Crypter</h1>

                    <vscode-text-field id="password">Password</vscode-text-field>

                    <button class="vsButton">Execute</button>
                    <script src="${scriptUri}"></script>
                </body>
            </html>
    `;
    }
}
/**
 * Let the user pick inputFile, outputFile and key. 
 * The inputFile will be encrypted by the key and written in the outputFile.
 */
export async function encryptFile(): Promise<void> {
    let key: string | undefined;
    let inputURI: vscode.Uri[] | undefined;
    let outputURI: vscode.Uri[] | undefined;

    inputURI = await vscode.window.showOpenDialog({
        canSelectMany: true,
        filters,
        openLabel: "Choose",
        title: "Choose the file you want to encrypt",
    });

    if (inputURI !== undefined) {
        outputURI = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters,
            openLabel: "Choose",
            title: "Choose the destination of the encrypted file",
        });
    }

    if (inputURI !== undefined && outputURI !== undefined) {
        key = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "KEY",
            prompt: "Type your key to use for encryption",
        });
    }

    if (inputURI !== undefined && outputURI !== undefined && key !== undefined) {
        blowfish.encryptFileToFileByKey(inputURI[0].fsPath, outputURI[0].fsPath, key);
    }
}
/**
 * Let the user pick inputFile, outputFile and key. 
 * The inputFile will be decrypted by the key and written in the outputFile.
 */
export async function decryptFile(): Promise<void> {
    let key: string | undefined;
    let inputURI: vscode.Uri[] | undefined;
    let outputURI: vscode.Uri[] | undefined;

    inputURI = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters,
        openLabel: "Choose",
        title: "Choose the file you want to decrypt",
    });

    if (inputURI !== undefined) {
        outputURI = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters,
            openLabel: "Choose",
            title: "Choose the destination of the decrypted file",
        });
    }

    if (inputURI !== undefined && outputURI !== undefined) {
        key = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "KEY",
            prompt: "Type your key to use for decryption",
        });
    }

    if (inputURI !== undefined && outputURI !== undefined && key !== undefined) {
        blowfish.decryptFileToFileByKey(inputURI[0].fsPath, outputURI[0].fsPath, key);
    }
}

/**
 * Let the user pick inputFolder, outputFolder and key. 
 * The inputFolder-files will be encrypted by the key and written in the outputFolder.
 */
export async function encryptFolder(): Promise<void> {
    let key: string | undefined;
    let inputURI: vscode.Uri[] | undefined;
    let outputURI: vscode.Uri[] | undefined;

    inputURI = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters,
        openLabel: "Choose",
        title: "Choose the folder you want to encrypt",
        canSelectFiles: false,
        canSelectFolders: true
    });

    if (inputURI !== undefined) {
        outputURI = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters,
            openLabel: "Choose",
            title: "Choose the destination of the encrypted files",
            canSelectFiles: false,
            canSelectFolders: true
        });
    }

    if (inputURI !== undefined && outputURI !== undefined) {
        key = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "KEY",
            prompt: "Type your key to use for encryption",
        });

    }

    if (inputURI !== undefined && outputURI !== undefined && key !== undefined) {
        const inputFolder: string = inputURI[0].fsPath;
        const outputFolder: string = outputURI[0].fsPath;
        const definedKey: string = key;
        fs.readdirSync(inputURI[0].fsPath).forEach(filename => {
            blowfish.encryptFileToFileByKey(path.join(inputFolder, filename), path.join(outputFolder, filename), definedKey);
        });
    }
}
/**
 * Let the user pick inputFolder, outputFolder and key. 
 * The inputFolder-files will be decrypted by the key and written in the outputFolder.
 */
export async function decryptFolder(): Promise<void> {
    let key: string | undefined;
    let inputURI: vscode.Uri[] | undefined;
    let outputURI: vscode.Uri[] | undefined;

    inputURI = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters,
        openLabel: "Choose",
        title: "Choose the folder you want to decrypt",
        canSelectFiles: false,
        canSelectFolders: true
    });

    if (inputURI !== undefined) {
        outputURI = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters,
            openLabel: "Choose",
            title: "Choose the destination of the decrypted files",
            canSelectFiles: false,
            canSelectFolders: true
        });
    }

    if (inputURI !== undefined && outputURI !== undefined) {
        key = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "KEY",
            prompt: "Type your key to use for decryption",
        });

    }

    if (inputURI !== undefined && outputURI !== undefined && key !== undefined) {
        const inputFolder: string = inputURI[0].fsPath;
        const outputFolder: string = outputURI[0].fsPath;
        const definedKey: string = key;
        fs.readdirSync(inputURI[0].fsPath).forEach(filename => {
            blowfish.decryptFileToFileByKey(path.join(inputFolder, filename), path.join(outputFolder, filename), definedKey);
        });
    }
}

