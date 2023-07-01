import * as vscode from 'vscode';
import * as fileoffset from './fileoffset';

/**
 * Find next technology in cnc file.
 * T, F, S commands will be detected.
 *
 * @returns {boolean}
 */
export function findNextTFS(): boolean {
    // Regular expression variables
    // Technology regex for tool, feed, spindle rpm
    const regExTechnology = new RegExp("([TFS])([0-9]+)");
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        const document = activeTextEditor.document;
        if (document) {
            const startposition = activeTextEditor.selection.active;
            const endposition = document.positionAt(
                document.offsetAt(
                    new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
                )
            );
            const textToMatch = document.getText(
                new vscode.Range(startposition, endposition)
            );

            const match = regExTechnology.exec(textToMatch);
            if (match !== null) {
                const startoffset = match.index + document.offsetAt(startposition);
                fileoffset.setCursorPosition(startoffset);
                const startPos = document.positionAt(startoffset);
                const endPos = document.positionAt(startoffset + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                activeTextEditor.selection = new vscode.Selection(
                    range.start,
                    range.end
                );
                activeTextEditor.revealRange(
                    range,
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport
                );
                return true;
            }
        }
    }
    return false;
}

export function findAllToolCalls(): any {
    let params = {
        query: "[^a-zA-Z0-9](T[0-9]+)",
        triggerSearch: true,
        isRegex: true,
        isCaseSensitive: true,
    };
    vscode.commands.executeCommand('workbench.action.findInFiles', params);
}