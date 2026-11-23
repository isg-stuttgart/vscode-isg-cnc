import { ParseResults } from '../shared/languageServerParser';
import type { Match } from '../shared/languageServerParser';
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
 * Aligns assignment equal signs in the selected range, or in the current editor selection.
 */
export async function alignEqualSigns(
    documentUri?: string,
    rangeArgs?: [number, number, number, number]
): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    const document = documentUri
        ? await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))
        : editor?.document;
    const selection = rangeArgs
        ? new vscode.Range(...rangeArgs)
        : editor?.selection;

    if (!document || !selection || selection.isEmpty) {
        return false;
    }

    const lines: Array<EqSignLine> = [];
    for (let lineNumber = selection.start.line; lineNumber <= selection.end.line; lineNumber++) {
        const range = selection.intersection(document.lineAt(lineNumber).range);
        if (!range) {
            continue;
        }

        const text = document.getText(range);
        const equalsIndex = findAssignmentEqualIndex(text);
        if (equalsIndex !== -1) {
            lines.push(new EqSignLine(text, range, equalsIndex));
        }
    }

    if (lines.length < 2) {
        return false;
    }

    const maxBeforeEqualsLength = Math.max(...lines.map((line) => line.beforeEquals.length + line.range.start.character));
    const edits = lines.map((line) => vscode.TextEdit.replace(line.range, line.getAligned(maxBeforeEqualsLength)));
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(document.uri, edits);
    return vscode.workspace.applyEdit(workspaceEdit);
}

function findAssignmentEqualIndex(line: string): number {
    const match = /(?<![=<>!])=(?!=)/.exec(line);
    return match?.index ?? -1;
}

class EqSignLine {
    readonly beforeEquals: string;
    private readonly afterEquals: string;

    constructor(readonly text: string, readonly range: vscode.Range, equalsIndex: number) {
        this.beforeEquals = text.substring(0, equalsIndex).trimEnd();
        this.afterEquals = text.substring(equalsIndex + 1).trimStart();
    }

    getAligned(maxBeforeEqualsLength: number): string {
        const currentLength = this.beforeEquals.length + this.range.start.character;
        const paddingLength = maxBeforeEqualsLength - currentLength;
        return `${this.beforeEquals}${' '.repeat(paddingLength)} = ${this.afterEquals}`;
    }
}

