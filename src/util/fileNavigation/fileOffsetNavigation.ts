import * as vscode from 'vscode';
import { setCursorPosition } from '../editorOffset';

export type FileUriFinder = (fileNameOrPath: string) => Promise<vscode.Uri[]>;

export async function jumpIntoFileAtOffset(
  findMatchingFileUris: FileUriFinder,
  fileUriOrPath?: string,
  offsetArgument?: number
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  const sourceDocument = editor?.document;
  if (!editor || !sourceDocument) {
    void vscode.window.showErrorMessage('No active document found.');
    return false;
  }

  const selections = editor.selections;
  const fileNameOrPath = fileUriOrPath ?? sourceDocument.getText(selections[0] ?? editor.selection).trim();
  if (!fileNameOrPath) {
    void vscode.window.showErrorMessage('The first selection must contain a file path or name.');
    return false;
  }

  let offset = offsetArgument ?? 0;
  if (offsetArgument === undefined && selections.length > 1) {
    const offsetText = sourceDocument.getText(selections[1]).trim();
    if (/^\d+$/.test(offsetText)) {
      offset = Number(offsetText);
    } else {
      void vscode.window.showWarningMessage('The second selection is not a valid offset. Jumping to the start of the file.');
    }
  }

  const uris = await findMatchingFileUris(fileNameOrPath);
  if (uris.length === 0) {
    void vscode.window.showErrorMessage('No fitting file found.');
    return false;
  }

  let targetUri = uris[0];
  if (uris.length > 1) {
    const selected = await vscode.window.showQuickPick(
      uris.map((uri) => ({ label: vscode.workspace.asRelativePath(uri, false), uri })),
      { placeHolder: 'Select file to jump into.' }
    );
    if (!selected) {
      return false;
    }
    targetUri = selected.uri;
  }

  const document = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(document);
  return setCursorPosition(offset);
}