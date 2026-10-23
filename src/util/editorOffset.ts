import * as vscode from 'vscode';

export function getCurrentFileOffset(): number {
    const editor = vscode.window.activeTextEditor;
    return editor?.document.offsetAt(editor.selection.active) ?? 0;
}

export function showCursorFileOffsetInfobox(): boolean {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!editor || !document) {
        return false;
    }

    const maxOffset = document.getText().length;
    void vscode.window.showInformationMessage(
        `The current fileoffset is ${getCurrentFileOffset()} from ${maxOffset}.`
    );
    return true;
}

export async function goToPosition(offset?: number): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!editor || !document) {
        return false;
    }

    const maxOffset = document.getText().length;
    let targetOffset = offset;
    if (targetOffset === undefined) {
        const input = await vscode.window.showInputBox({
            prompt: `Type an offset number from 0 to ${maxOffset}.`,
            validateInput: (value: string) => {
                if (!/^\d+$/.test(value.trim()) || Number(value.trim()) > maxOffset) {
                    return `Number must be an integer between 0 and ${maxOffset}.`;
                }
                return null;
            },
            value: String(getCurrentFileOffset()),
        });
        if (input === undefined || input.trim() === '') {
            return false;
        }
        targetOffset = Number(input.trim());
    }

    if (!Number.isInteger(targetOffset) || targetOffset < 0 || targetOffset > maxOffset) {
        return false;
    }

    return setCursorPosition(targetOffset);
}

export function setCursorPosition(offset: number): boolean {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!editor || !document || !Number.isInteger(offset) || offset < 0 || offset > document.getText().length) {
        return false;
    }

    const position = document.positionAt(offset);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    return true;
}