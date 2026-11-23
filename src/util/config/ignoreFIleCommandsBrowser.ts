import * as vscode from 'vscode';
import ignore from 'ignore';

const ignoreFileHeader = [
    '# Adding files/directories to this file will prevent the ISG-CNC extension from searching for references/definitions in these files/directories.',
    '# This does not affect other features of the ISG-CNC extension.',
    '# The ignore syntax is equivalent to the .gitignore syntax. See https://git-scm.com/docs/gitignore for more information.',
    '',
].join('\n');

export async function addToIgnoreForWeb(inputUri?: vscode.Uri): Promise<boolean> {
    const uri = inputUri ?? vscode.window.activeTextEditor?.document.uri;
    if (!uri) {
        void vscode.window.showErrorMessage('ISG-CNC: No file/folder selected.');
        return false;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
        void vscode.window.showErrorMessage(`ISG-CNC: No workspace folder found for ${uri.toString()}.`);
        return false;
    }

    const isWorkspaceRoot = uri.toString() === workspaceFolder.uri.toString();
    let isDirectory = false;
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        isDirectory = (stat.type & vscode.FileType.Directory) !== 0;
    } catch (error) {
        void vscode.window.showErrorMessage(`ISG-CNC: Could not inspect selected path: ${String(error)}`);
        return false;
    }

    let relativePath = isWorkspaceRoot
        ? '/*'
        : vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/').replace(/^\/+/, '');
    if (isDirectory && !isWorkspaceRoot) {
        relativePath = `${relativePath}/**`;
    }
    if (!isWorkspaceRoot && !relativePath.startsWith('/')) {
        relativePath = `/${relativePath}`;
    }

    const ignoreUri = vscode.Uri.joinPath(workspaceFolder.uri, '.isg-cnc-ignore');
    const openIgnoreDocument = vscode.workspace.textDocuments.find(
        (document) => document.uri.toString() === ignoreUri.toString()
    );
    let ignoreContent = openIgnoreDocument?.getText();

    if (ignoreContent === undefined) {
        let exists = true;
        try {
            await vscode.workspace.fs.stat(ignoreUri);
        } catch {
            exists = false;
        }

        if (exists) {
            try {
                ignoreContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(ignoreUri));
            } catch (error) {
                void vscode.window.showErrorMessage(`ISG-CNC: Could not read .isg-cnc-ignore: ${String(error)}`);
                return false;
            }
        } else {
            ignoreContent = ignoreFileHeader;
            try {
                await vscode.workspace.fs.writeFile(ignoreUri, new TextEncoder().encode(ignoreContent));
            } catch (error) {
                void vscode.window.showErrorMessage(`ISG-CNC: Could not create .isg-cnc-ignore: ${String(error)}`);
                return false;
            }
        }
    }

    const alreadyIgnored = relativePath === '/*'
        ? ignoreContent.split(/\r?\n/).some((line) => line.trim() === '/*')
        : ignore().add(ignoreContent).ignores(relativePath.replace(/^\//, '').replace(/\/\*\*$/, ''));
    if (alreadyIgnored) {
        void vscode.window.showInformationMessage(`ISG-CNC: Path ${relativePath} is already ignored.`);
        return true;
    }

    const document = openIgnoreDocument ?? await vscode.workspace.openTextDocument(ignoreUri);
    const editor = await vscode.window.showTextDocument(document);
    const endOfLine = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const position = new vscode.Position(document.lineCount, 0);
    const prefix = document.lineCount > 0 && document.lineAt(document.lineCount - 1).text.length > 0
        ? endOfLine
        : '';
    await editor.edit((editBuilder) => editBuilder.insert(position, `${prefix}${relativePath}`));
    return true;
}