import * as vscode from 'vscode';
/**
 * Aligns the first equal signs in the current editor selection below each other.
 */
export async function alignEqualSigns(): Promise<void> {
    const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    if (editor && editor.document) {
        const selection: vscode.Selection = editor.selection;
        if (!selection.isEmpty) {
            const lines: Array<EqSignLine> = new Array();
            // collect all selected lines with "="
            for (let ln = selection.start.line; ln <= selection.end.line; ln++) {
                //get intersection of selection and current line to only handle selected part when in first or last line
                const range = selection.intersection(editor.document.lineAt(ln).range);
                if (range && editor.document.getText(range).includes("=")) {
                    lines.push(new EqSignLine(editor.document.getText(range), range));
                }
            }

            // align equal signs
            const maxBeforeEqLength = Math.max(...lines.map(line => line.beforeEq.length + line.range.start.character));
            const textEdits: vscode.TextEdit[] = [];
            lines.forEach(line => textEdits.push(vscode.TextEdit.replace(line.range, line.getAligned(maxBeforeEqLength))));

            // write back edits
            const workEdits = new vscode.WorkspaceEdit();
            workEdits.set(editor.document.uri, textEdits); // give the edits
            await vscode.workspace.applyEdit(workEdits); // apply the edits
        }
    }
}

/**
 * Helper class to save the information about the equal sign lines.
 */
class EqSignLine {
    beforeEq: string;
    afterEq: string;
    range: vscode.Range;
    constructor(line: string, range: vscode.Range) {
        const eqIndex = line.indexOf("=");
        this.beforeEq = line.substring(0, eqIndex).trimEnd();
        this.afterEq = line.substring(eqIndex + 1).trimStart();
        this.range = range;
    }

    getAligned(maxBeforeEqLength: number): string {
        const lengthBefore = this.beforeEq.length + this.range.start.character;
        const paddingLength = maxBeforeEqLength - lengthBefore;
        return this.beforeEq + ' '.repeat(paddingLength) + " = " + this.afterEq;
    }
}