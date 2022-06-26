/* eslint-disable @typescript-eslint/naming-convention */
import * as blowfish from "./blowfish";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";


// Possible filters for file-explorer navigation
const filters = {
    "cnc": [
        ".nc",
        ".cnc",
        ".cyc",
        ".ecy",
        ".sub",
        ".plc"],
    "all": ["*"]
};

//Option parameter for asking for encryption/decryption key
const keyInputOptions: vscode.InputBoxOptions = {
    ignoreFocusOut: true,
    title: "KEY",
    prompt: "Type your key to use for encryption",
    placeHolder: "key",
    password: true,
};
/**
 * Encrypts the file at the specified inputUri. The outputName and key will be specified by InputBox-prompts.
 * The encrypted file will be at the same directory as the input file and will have the specified outputName.

 * If inputUri doesn't describe a file location or an InputBox-prompt didn't resolve, 
 * the process will be canceled and an information message will be shown.
 * @param inputUri - URI representaion of the location of the fiel to encrypt
 */
export async function encryptThis(inputUri: vscode.Uri): Promise<void> {
    const inputPath: string = inputUri.fsPath;
    const inputName: string = path.basename(inputPath);
    let outputName: string | undefined;
    let key: string | undefined;

    if (inputUri !== undefined && fs.lstatSync(inputUri.fsPath).isFile()) {
        outputName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Encrypted File",
            prompt: "Type the name of the encrypted file",
            value: path.basename(inputPath) + ".ecy",
            valueSelection: undefined
        });
    } else {
        vscode.window.showInformationMessage("No file to encrypt is currently selected");
    }

    if (inputUri !== undefined && outputName !== undefined) {
        key = await vscode.window.showInputBox(keyInputOptions);
    }

    if (inputUri !== undefined && outputName !== undefined && key !== undefined) {
        const outputPath: string = path.join(path.dirname(inputPath), outputName);
        blowfish.encryptFileToFileByKey(inputPath, outputPath, key);
        vscode.window.showInformationMessage(inputName + " was encrypted into " + outputName);
    } else {
        vscode.window.showInformationMessage("Encryption canceled");
    }

}

/**
 * Decrypts the file at the specified inputUri. The outputName and key will be specified by InputBox-prompts.
 * The decrypted file will be at the same directory as the input file and will have the specified outputName.
 * 
 * If inputUri doesn't describe a file location or an InputBox-prompt didn't resolve, 
 * the process will be canceled and an information message will be shown.
 * @param inputUri - URI representaion of the location of the fiel to decrypt
 */
export async function decryptThis(inputUri: vscode.Uri): Promise<void> {
    const inputPath: string = inputUri.fsPath;
    const inputName: string = path.basename(inputPath);
    let outputName: string | undefined = path.basename(inputUri.fsPath).replace(/(.ecy)$/, "");
    let key: string | undefined;
    if (inputUri !== undefined && fs.lstatSync(inputUri.fsPath).isFile()) {
        outputName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Decrypted File",
            prompt: "Type the name of the decrypted file",
            value: outputName,
            valueSelection: undefined
        });
    } else {
        vscode.window.showInformationMessage("No file to decrypt is currently selected");
    }
    if (inputUri !== undefined && outputName !== undefined) {
        key = await vscode.window.showInputBox(keyInputOptions);
    }

    if (inputUri !== undefined && outputName !== undefined && key !== undefined) {
        const outputPath: string = path.join(path.dirname(inputPath), outputName);
        blowfish.decryptFileToFileByKey(inputPath, outputPath, key);
        vscode.window.showInformationMessage(inputName + " was decrypted into " + outputName);
    } else {
        vscode.window.showInformationMessage("Decryption canceled");
    }

}



/**
 * Encrypts a file which is chosen by user input.
 * 
 * Let the user pick inputUri, outputName and key by input-prompts. 
 * The encrypted output file will be in the same directory as the file at inputUri and will have the specified outputName. 
 */
export async function encryptFileFromSystem(): Promise<void> {
    let key: string | undefined;
    let inputUri: vscode.Uri[] | undefined;
    let filename: string | undefined;

    inputUri = await vscode.window.showOpenDialog({
        canSelectMany: true,
        filters,
        openLabel: "Choose",
        title: "Choose the file you want to encrypt",
    });

    if (inputUri !== undefined) {
        filename = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Encrypted File",
            prompt: "Type the name of the encrypted file",
            value: path.basename(inputUri[0].fsPath) + ".ecy",
            valueSelection: undefined
        });
    }

    if (inputUri !== undefined && filename !== undefined) {
        key = await vscode.window.showInputBox(keyInputOptions);

    }

    if (inputUri !== undefined && key !== undefined && filename !== undefined) {
        const outputFolder = path.dirname(inputUri[0].fsPath);
        blowfish.encryptFileToFileByKey(inputUri[0].fsPath, path.join(outputFolder, filename), key);
        vscode.window.showInformationMessage(path.basename(inputUri[0].fsPath) + " was encrypted into " + filename);

    }
}
/**
 * Decrypts a file which is chosen by user input.
 * 
 * Let the user pick inputUri, outputName and key by input-prompts. 
 * The decrypted output file will be in the same directory as the file at inputUri and will have the specified outputName. 
 */
export async function decryptFileFromSystem(): Promise<void> {
    let key: string | undefined;
    let inputURI: vscode.Uri[] | undefined;
    let outputName: string | undefined;

    inputURI = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters,
        openLabel: "Choose",
        title: "Choose the file you want to decrypt",
    });

    if (inputURI !== undefined) {
        outputName = path.basename(inputURI[0].fsPath).replace(/(.ecy)$/, "");
        outputName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Decrypted File",
            prompt: "Type the name of the decrypted file",
            value: outputName,
            valueSelection: undefined
        });
    }
    if (inputURI !== undefined && outputName !== undefined) {
        key = await vscode.window.showInputBox(keyInputOptions);

    }

    if (inputURI !== undefined && key !== undefined && outputName !== undefined) {
        blowfish.decryptFileToFileByKey(inputURI[0].fsPath, path.join(path.dirname(inputURI[0].fsPath), outputName), key);
        vscode.window.showInformationMessage(path.basename(inputURI[0].fsPath) + " was decrypted into " + outputName);
    }
}



