import * as vscode from 'vscode';
import { updateCurrentOffsetStatusBarItem } from '../statusbar';
import {
    goToPosition as goToEditorPosition,
    setCursorPosition as setEditorCursorPosition,
    showCursorFileOffsetInfobox as showEditorFileOffsetInfobox,
} from '../editorOffset';
export { getCurrentFileOffset } from '../editorOffset';
import { WorkspaceIgnorer, findFileInRootDir } from '../../shared/languageServer';
import { jumpIntoFileAtOffset as jumpIntoFileAtOffsetCore } from './fileOffsetNavigation';
import * as path from 'path';

/**
 * Jump into the file specified by absolute path or file name within the first selection.
 * If a second selection is found and contains an integer, the cursor will be set to this offset.
 */
export async function jumpIntoFileAtOffset(): Promise<boolean> {
    const jumped = await jumpIntoFileAtOffsetCore(findMatchingDesktopFileUris);
    if (jumped) {
        updateCurrentOffsetStatusBarItem();
    }
    return jumped;
}

async function findMatchingDesktopFileUris(fileNameOrPath: string): Promise<vscode.Uri[]> {
    const normalizedFilePath = path.normalize(fileNameOrPath);
    if (path.isAbsolute(normalizedFilePath)) {
        return [vscode.Uri.file(normalizedFilePath)];
    }

    const fittingFiles = vscode.workspace.workspaceFolders?.flatMap(folder => {
        const ignorer = new WorkspaceIgnorer(folder.uri.fsPath);
        return findFileInRootDir(folder.uri.fsPath, fileNameOrPath, ignorer, true);
    }) ?? [];
    return fittingFiles.map(filePath => vscode.Uri.file(filePath));
}

/**
 * Opens a infobox with current fileoffset and max fileoffset.
 */
export function showCursorFileOffsetInfobox() {
    return showEditorFileOffsetInfobox();
}

/**
 * Get the current fileoffset of the cursor.
 *
 * @returns the fileoffset as number
 */
/**
 * Get position from user and go to position.
 *
 * @returns {Promise<void>}
 */
export async function goToPosition(): Promise<void> {
    if (await goToEditorPosition()) {
        updateCurrentOffsetStatusBarItem();
    }
}

/**
 * Set the cursor to position. Scroll the view to the position.
 *
 * @param {number} pos
 */
export function setCursorPosition(pos: number) {
    if (setEditorCursorPosition(pos)) {
        updateCurrentOffsetStatusBarItem();
    }
}