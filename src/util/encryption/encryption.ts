import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as ffi from "ffi-napi";
import * as blowfish from "./blowfish";
/* const crypter = ffi.Library("ISGEncrypt_x64", {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "encrypt_file": ['void', ['string', 'string', 'string'] ],
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "decrypt_file": ['void', ['string', 'string', 'string']]
}); */
// CNC filters for file-explorer navigation
const filter = {
    "cnc": [
        "nc",
        "cnc",
        "cyc",
        "ecy",
        "sub",
        "plc"],
    "all": ["*"]
};

/**
 * Let the user enter a key for en/decryption via an InputBox. 
 * The key can only be accepted if it contains no non-ASCII Characters.
 * @returns the key for en/decryption
 */
async function askForKey(): Promise<string | undefined> {
    //Option parameter for asking for encryption/decryption key by InputBox
    let keyInputOptions: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        title: "Key",
        prompt: "Type the key to use for en/decryption",
        placeHolder: "key...",
        password: true,
        validateInput: key => {
            if (testIfContainsNonASCIIChar(key)) {
                return "Key must not contain non-ASCII characters";
            } else {
                return null;
            }
        }
    };
    return await vscode.window.showInputBox(keyInputOptions);;
}

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
        outputName = await askForEncryptedFilename(inputPath);
    } else {
        vscode.window.showInformationMessage("No file to encrypt is currently selected");
    }


    if (inputUri !== undefined && outputName !== undefined) {
        key = await askForKey();
    }

    if (inputUri !== undefined && outputName !== undefined && key !== undefined) {
        const outputPath: string = path.join(path.dirname(inputPath), outputName);
        blowfish.encryptFileToFile(inputPath, outputPath, key);
       // crypter.encrypt_file(inputPath, outputPath, key);

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
    let outputName: string | undefined;
    let key: string | undefined;
    if (inputUri !== undefined && fs.lstatSync(inputUri.fsPath).isFile()) {
        outputName = await askForDecryptedFilename(inputPath);
    } else {
        vscode.window.showInformationMessage("No file to decrypt is currently selected");
    }

    if (inputUri !== undefined && outputName !== undefined) {
        key = await askForKey();
    }

    if (inputUri !== undefined && outputName !== undefined && key !== undefined) {
        const outputPath: string = path.join(path.dirname(inputPath), outputName);
        blowfish.decryptFileToFile(inputPath, outputPath, key);
        //crypter.decrypt_file(inputPath, outputPath, key);
        vscode.window.showInformationMessage(inputName + " was decrypted into " + outputName);
    } else {
        vscode.window.showWarningMessage("Decryption canceled");
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
    let outputName: string | undefined;

    inputUri = await vscode.window.showOpenDialog({
        canSelectMany: true,
        filters: filter,
        openLabel: "Choose",
        title: "Choose the file you want to encrypt",
    });

    if (inputUri !== undefined) {
        outputName = await askForEncryptedFilename(inputUri[0].fsPath);
    }

    if (inputUri !== undefined && outputName !== undefined) {
        key = await askForKey();

    }

    if (inputUri !== undefined && key !== undefined && outputName !== undefined) {
        const outputFolder = path.dirname(inputUri[0].fsPath);
        blowfish.encryptFileToFile(inputUri[0].fsPath, path.join(outputFolder, outputName), key);
        //crypter.encrypt_file(inputUri[0].fsPath, path.join(outputFolder, outputName), key);
        vscode.window.showInformationMessage(path.basename(inputUri[0].fsPath) + " was encrypted into " + outputName);
    } else {
        vscode.window.showWarningMessage("Encryption canceled");
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
    let inputUri: vscode.Uri[] | undefined;
    let outputName: string | undefined;

    inputUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: filter,
        openLabel: "Choose",
        title: "Choose the file you want to decrypt",
    });

    if (inputUri !== undefined) {
        outputName = await askForDecryptedFilename(inputUri[0].fsPath);
    }
    if (inputUri !== undefined && outputName !== undefined) {
        key = await askForKey();

    }

    if (inputUri !== undefined && key !== undefined && outputName !== undefined) {
        blowfish.decryptFileToFile(inputUri[0].fsPath, path.join(path.dirname(inputUri[0].fsPath), outputName), key);
        //crypter.decrypt_file(inputUri[0].fsPath, path.join(path.dirname(inputUri[0].fsPath), outputName), key);
        vscode.window.showInformationMessage(path.basename(inputUri[0].fsPath) + " was decrypted into " + outputName);
    } else {
        vscode.window.showWarningMessage("Decryption canceled");
    }
}


/**
 * Asks the user via InputBox which name the result-file of an decryption-process should have. 
 * 
 * @param inputPath - path of the file to decrypt 
 * @returns Promise of the name-String chosen by the user, or if Promise<undefined> if the input was canceled
 */
async function askForDecryptedFilename(inputPath: string): Promise<string | undefined> {
    let currentOutputName: string | undefined;
    let currentOutputPath: string | undefined = undefined;
    let finalOutputName: string | undefined = undefined;
    let endSelection = false;
    do {
        currentOutputName === undefined;
        currentOutputName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Decrypted File",
            prompt: "Type the name of the decrypted file",
            value: path.basename(inputPath).replace(/(.ecy)$/, ""),
            valueSelection: undefined
        });
        if (currentOutputName !== undefined) {
            currentOutputPath = path.join(path.dirname(inputPath), currentOutputName);
            endSelection = (await isFinalDestinationFound(currentOutputPath)).valueOf();
            finalOutputName = endSelection ? currentOutputName : undefined;
        } else {
            endSelection = true;
        }


    } while (!endSelection);


    return finalOutputName;
}
/**
 * Asks the user via InputBox which name the result-file of an encryption-process should have. 
 * 
 * @param inputPath - path of the file to decrypt 
 * @returns Promise of the name-String chosen by the user, or if Promise<undefined> if the input was canceled
 */
async function askForEncryptedFilename(inputPath: string): Promise<string | undefined> {
    let currentOutputName: string | undefined;
    let currentOutputPath: string | undefined = undefined;
    let finalOutputName: string | undefined = undefined;
    let endSelection = false;
    do {
        currentOutputName === undefined;
        currentOutputName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Encrypted File",
            prompt: "Type the name of the encrypted file",
            value: path.basename(inputPath) + ".ecy",
            valueSelection: undefined

        });
        if (currentOutputName !== undefined) {
            currentOutputPath = path.join(path.dirname(inputPath), currentOutputName);
            endSelection = (await isFinalDestinationFound(currentOutputPath)).valueOf();
            finalOutputName = endSelection ? currentOutputName : undefined;
        } else {
            endSelection = true;
        }


    } while (!endSelection);


    return finalOutputName;
}

/**
 * Checks if the specifed file-destination already exists. If that's the case, the user will be asked,
 * if he wants to overwrite the file or rename the new file. 
 * @param destination - path to the file which shall be created
 * @returns Returns true if the files-destination exists or the user wants to overwrite the already existing file.
 * Returns false if the file alreadx exists and the user wants to rename his new file
 */
async function isFinalDestinationFound(destination: string): Promise<boolean> {
    let found: boolean = true;

    //if file already exists
    if (fs.existsSync(destination)) {
        await vscode.window.showQuickPick(
            ["Overwrite", "Rename"],
            {
                "title": "File already exists in workspace"
            }
        ).then(selection => {
            if (selection === "Overwrite") {
                found = true;
            } else if (selection === "Rename") {
                found = false;
            }
        });
    }

    return found;
}

/**
 * Tests if string contains non-ASCII Character
 * @param text 
 * @returns true if the string contains at least one non-ASCII Character, false otherwise.
 */
function testIfContainsNonASCIIChar(text: string) {
    return !/^[\u0000-\u007f]*$/.test(text);
}

