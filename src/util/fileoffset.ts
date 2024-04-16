import * as vscode from 'vscode';
import { isNumeric } from './util';
import { updateCurrentOffsetStatusBarItem } from './statusbar';
import { findFileInRootDir } from '../../server/src/fileSystem';
import * as path from 'path';

/**
 * Jump into the file specified by absolute path or file name within the first selection.
 * If a second selection is found and contains an integer, the cursor will be set to this offset.
 */
export async function jumpIntoFileAtOffset() {
    // get current selection and validate if there are at least two selections
    const activeTextEditor = vscode.window.activeTextEditor;
    const document = activeTextEditor?.document;
    // no active document found
    if (!activeTextEditor || !document) {
        return vscode.window.showErrorMessage("No active document found.");
    }
    const selections = activeTextEditor.selections;
    // not enough selections
    if (selections.length < 1) {
        return vscode.window.showErrorMessage("The first selection must contain the absolute file path or name.");
    }

    // get uri based on file path/name
    const file = document.getText(selections[0]).trim();
    const normalizedFilePath = path.normalize(file);
    let uri: vscode.Uri | undefined = undefined;
    if (path.isAbsolute(normalizedFilePath)) {
        uri = vscode.Uri.file(normalizedFilePath);
    } else {
        // interpret selection as file name and search for it in the workspace
        const fittingFiles = vscode.workspace.workspaceFolders?.map(folder =>
            findFileInRootDir(folder.uri.fsPath, normalizedFilePath, undefined, false)
        ).flat();
        uri = (fittingFiles?.length && fittingFiles.length > 0) ? vscode.Uri.file(fittingFiles[0]) : undefined;
    }
    if (!uri) {
        return vscode.window.showErrorMessage("No fitting file found.");
    }

    // get offset if valid second selection is found
    const offsetText = document.getText(selections[1]).trim();
    let offset: number = 0;
    // second selection is not a number
    if (isNumeric(parseInt(offsetText))) {
        offset = parseInt(offsetText);
    }

    // open doc with uri and set cursor to offset
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    setCursorPosition(offset);
}
/**
 * Opens a infobox with current fileoffset and max fileoffset.
 */
export function showCursorFileOffsetInfobox() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        const document = activeTextEditor.document;
        if (document) {
            const maxOffset = document.offsetAt(
                new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            );
            const n = getCurrentFileOffset();
            vscode.window.showInformationMessage(
                `The current fileoffset is ${n} from ${maxOffset}.`
            );
        }
    }
}

/**
 * Get the current fileoffset of the cursor.
 *
 * @returns the fileoffset as number
 */
export function getCurrentFileOffset(): number {
    // get current file offset position of the caret
    let offset = 0;
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        const document = activeTextEditor.document;
        if (document) {
            offset = document.offsetAt(activeTextEditor.selection.active);
        }
    }
    return offset;
}

/**
 * Get position from user and go to position.
 *
 * @returns {Promise<void>}
 */
export async function goToPosition(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;

    if (activeTextEditor) {
        const document = activeTextEditor.document;
        if (document) {
            const currentOffset = document.offsetAt(activeTextEditor.selection.active);
            const maxOffset = document.offsetAt(
                new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            );

            await vscode.window
                .showInputBox({
                    prompt: `Type an offset number from 0 to ${maxOffset}.`,
                    validateInput: (input: string) => {
                        if (!isNumeric(parseFloat(String(input))) || parseFloat(String(input)) > maxOffset || parseFloat(String(input)) < 0) {
                            return "Number must be between 0 and " + maxOffset + ".";
                        } else {
                            return null;
                        }
                    },
                    value: String(currentOffset),
                })
                .then((input?: string) => {
                    if (input) {
                        setCursorPosition(parseFloat(String(input)));
                    }
                });
        }
    }
}

/**
 * Set the cursor to position. Scroll the view to the position.
 *
 * @param {number} pos
 */
export function setCursorPosition(pos: number) {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        const document = activeTextEditor.document;
        if (document) {
            const newPosition = document.positionAt(pos);
            activeTextEditor.selection = new vscode.Selection(
                newPosition,
                newPosition
            );
            activeTextEditor.revealRange(activeTextEditor.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            updateCurrentOffsetStatusBarItem();
        }
    }
}