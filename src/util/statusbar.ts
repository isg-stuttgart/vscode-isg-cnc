import * as vscode from "vscode";
import { getCurrentFileOffset } from "./fileoffset";

/**
 * Statusbar items
 */
let selectedLinesStatusBarItem: vscode.StatusBarItem;
let currentOffsetStatusBarItem: vscode.StatusBarItem;

/**
 * Update statusbar item for selected lines.
 * Hide item when no lines are selected.
 *
 */
export function updateSelectedLinesStatusBarItem(): void {
    const n = getNumberOfSelectedLines();
    if (n > 0) {
        selectedLinesStatusBarItem.text = `$(megaphone) ${n} line(s) selected`;
        selectedLinesStatusBarItem.show();
    } else {
        selectedLinesStatusBarItem.hide();
    }
}

/**
 * Add statusbar item for selected lines to the statusbar.
 *
 * @param {vscode.ExtensionContext} context
 */
export function addSelectedLinesStatusBarItem(context: vscode.ExtensionContext) {
    // register a command that is invoked when the status bar
    // item is selected
    const myCommandId = "isg-cnc.ShowSelectedLinesCount";

    context.subscriptions.push(
        vscode.commands.registerCommand(myCommandId, () => {
            const n = getNumberOfSelectedLines();
            vscode.window.showInformationMessage(`${n} line(s) are selected.`);
        })
    );

    // create a new status bar item that we can now manage
    selectedLinesStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    selectedLinesStatusBarItem.command = myCommandId;
    context.subscriptions.push(selectedLinesStatusBarItem);

    // register some listener to update the status bar item with the current fileoffset
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateSelectedLinesStatusBarItem)
    );
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            updateSelectedLinesStatusBarItem
        )
    );
    updateSelectedLinesStatusBarItem();
}

/**
 * Add a statusbar item for fileoffset to the statusbar
 *
 * @param {vscode.ExtensionContext} context
 */
export function addCurrentOffsetStatusBarItem(context: vscode.ExtensionContext) {
    // register a command that is invoked when the status bar
    // fileoffset of the cursor

    // create a new status bar item that we can now manage
    currentOffsetStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    currentOffsetStatusBarItem.command = "isg-cnc.GoToPosition";
    context.subscriptions.push(currentOffsetStatusBarItem);

    // register some listener that make sure the status bar
    // item always up-to-date
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateCurrentOffsetStatusBarItem)
    );
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            updateCurrentOffsetStatusBarItem
        )
    );
    updateCurrentOffsetStatusBarItem();
}

/**
 * Update the status bar item for fileoffset.
 */
export function updateCurrentOffsetStatusBarItem(): void {
    const n = getCurrentFileOffset();
    currentOffsetStatusBarItem.text = `$(arrow-right) Fileoffset: ${n}`;
    currentOffsetStatusBarItem.show();
}

/**
 * Get number of selected lines and returns the count.
 *
 * @returns {number}
 */
function getNumberOfSelectedLines(): number {
    // get number of selected lines
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        return activeTextEditor.selections.reduce(
            (prev: number, curr: { end: { line: number; }; start: { line: number; }; }) => prev + (curr.end.line - curr.start.line),
            0
        );
    }
    return 0;
}