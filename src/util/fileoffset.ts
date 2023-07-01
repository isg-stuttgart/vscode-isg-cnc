import * as vscode from 'vscode';
import { isNumeric } from './util';
import { updateCurrentOffsetStatusBarItem } from './statusbar';
/**
 * Opens a infobox with current fileoffset and max fileoffset.
 */
export function showCursorFileOffsetInfobox() {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
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
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
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