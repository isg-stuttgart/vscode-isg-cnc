import * as vscode from 'vscode';
import ignore from 'ignore';
import { jumpIntoFileAtOffset } from './fileOffsetNavigation';

export async function jumpIntoFileAtOffsetForWeb(
    fileUriOrPath?: string,
    offsetArgument?: number
): Promise<boolean> {
    return jumpIntoFileAtOffset(findMatchingFileUris, fileUriOrPath, offsetArgument);
}

async function findMatchingFileUris(fileNameOrPath: string): Promise<vscode.Uri[]> {
    if (/^[a-zA-Z]:[\\/]/.test(fileNameOrPath) || fileNameOrPath.startsWith('/')) {
        return [vscode.Uri.file(fileNameOrPath)];
    }
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(fileNameOrPath)) {
        return [vscode.Uri.parse(fileNameOrPath)];
    }

    const folders = vscode.workspace.workspaceFolders ?? [];
    const normalizedName = fileNameOrPath.replace(/\\/g, '/').replace(/^\.\//, '');
    const pattern = `**/${escapeGlob(normalizedName)}`;
    const matches: vscode.Uri[] = [];

    for (const folder of folders) {
        const ignoreUri = vscode.Uri.joinPath(folder.uri, '.isg-cnc-ignore');
        let ignoreContents = '';
        try {
            ignoreContents = new TextDecoder().decode(await vscode.workspace.fs.readFile(ignoreUri));
        } catch {
            // A missing ignore file means no paths are excluded.
        }
        const ignorer = ignore().add(ignoreContents);
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, pattern));
        for (const file of files) {
            const relativePath = vscode.workspace.asRelativePath(file, false).replace(/\\/g, '/');
            if (!ignorer.ignores(relativePath)) {
                matches.push(file);
            }
        }
    }

    return matches;
}

function escapeGlob(value: string): string {
    return value.replace(/[\\*?\[\]{}]/g, '\\$&');
}