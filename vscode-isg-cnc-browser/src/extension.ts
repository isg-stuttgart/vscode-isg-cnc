import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'isg-cnc-browser.alignEqualSigns',
      async (documentUri?: string, rangeArgs?: [number, number, number, number]) => {
        const activeEditor = vscode.window.activeTextEditor;
        const document = documentUri
          ? await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))
          : activeEditor?.document;
        const selection = rangeArgs
          ? new vscode.Range(...rangeArgs)
          : activeEditor?.selection;

        if (!document || !selection || selection.isEmpty) {
          void vscode.window.showInformationMessage('Select multiple CNC lines first.');
          return false;
        }

        const lines: Array<{ range: vscode.Range; before: string; after: string }> = [];
        for (let lineNumber = selection.start.line; lineNumber <= selection.end.line; lineNumber++) {
          const range = selection.intersection(document.lineAt(lineNumber).range);
          if (!range) {
            continue;
          }

          const selectedText = document.getText(range);
          const equalsIndex = findAssignmentEqualIndex(selectedText);
          if (equalsIndex < 0) {
            continue;
          }

          lines.push({
            range,
            before: selectedText.substring(0, equalsIndex).trimEnd(),
            after: selectedText.substring(equalsIndex + 1).trimStart(),
          });
        }

        if (lines.length < 2) {
          void vscode.window.showInformationMessage('Select at least two assignment lines to align.');
          return false;
        }

        const targetColumn = Math.max(...lines.map(({ before, range }) => before.length + range.start.character));
        const edits = lines.map(({ range, before, after }) => {
          const padding = targetColumn - (before.length + range.start.character);
          return vscode.TextEdit.replace(range, `${before}${' '.repeat(padding)} = ${after}`);
        });

        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, edits);
        return vscode.workspace.applyEdit(workspaceEdit);
      }
    )
  );
}

function findAssignmentEqualIndex(line: string): number {
  const match = /(?<![=<>!])=(?!=)/.exec(line);
  return match?.index ?? -1;
}

export function deactivate(): void {
  // Registered command disposables are owned by the extension context.
}
