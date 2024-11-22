import { Match } from '../../server/src/parserClasses';
import { ParseResults } from '../../server/src/parsingResults';
import * as vscode from 'vscode';

/**
 * Aligns the line comments in the current editor selection below each other.
 * Line comments are semicolon comments and parentheses comments.
 * Parentheses comments are only aligned if they are at the end of the line.
 */
export async function alignComments(): Promise<void> {
    const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    if (editor && editor.document) {
        const selection: vscode.Selection = editor.selection;
        if (!selection.isEmpty) {
            // parse all selected lines to get line comments
            const comments: Array<Match> = new ParseResults(editor.document.getText(selection)).syntaxArray.comments;

            const commentsToAlign: Array<Match> = new Array();
            comments.forEach(comment => {
                // semicolon comments should always be aligned
                if (comment.text.startsWith(";")) {
                    commentsToAlign.push(comment);
                }
                // parentheses comments should only be aligned if they are at the end of the line
                else if (comment.text.startsWith("(")) {
                    const line = editor.document.lineAt(selection.start.line + comment.location.start.line - 1);
                    if (line.text.trim().endsWith(comment.text)) {
                        commentsToAlign.push(comment);
                    }
                }
            });

            // find the most right start position of the comments
            let maxStartCol = 0;
            commentsToAlign.forEach(comment => {
                // in the first line we have to add the start column of the selection to get the start column of the comment
                const startCol = comment.location.start.line === 1 ? comment.location.start.column + selection.start.character : comment.location.start.column;
                if (startCol > maxStartCol) {
                    maxStartCol = startCol;
                }
            });

            // align comments
            const textEdits: vscode.TextEdit[] = [];
            commentsToAlign.forEach(comment => {
                const line = editor.document.lineAt(selection.start.line + comment.location.start.line - 1);
                const startCol = comment.location.start.line === 1 ? comment.location.start.column + selection.start.character : comment.location.start.column;
                const paddingLength = maxStartCol - startCol;
                // add the padding at the startColumn of the comment
                textEdits.push(vscode.TextEdit.insert(new vscode.Position(line.lineNumber, startCol - 1), ' '.repeat(paddingLength)));
            });

            // write back edits
            const workEdits = new vscode.WorkspaceEdit();
            workEdits.set(editor.document.uri, textEdits);
            await vscode.workspace.applyEdit(workEdits);
        }
    }
}

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
            workEdits.set(editor.document.uri, textEdits);
            await vscode.workspace.applyEdit(workEdits);
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