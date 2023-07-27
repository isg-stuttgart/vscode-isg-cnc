import path = require('path');
import * as vscode from 'vscode';
export function getPathOfWorkspaceFile(filename: string): string {
    const workSpaceFolders = vscode.workspace.workspaceFolders;
    if (!workSpaceFolders) {
        throw new Error('No workspace is opened.');
    }
    return path.join(workSpaceFolders[0].uri.fsPath, filename);
}