import * as vscode from 'vscode';

const nonAsciiCharacterDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: '2px',
    borderStyle: 'solid',
    overviewRulerColor: 'red',
    borderColor: 'red',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        backgroundColor: 'orangered',
    },
    dark: {
        backgroundColor: 'lightcoral',
    },
});

export function findNonAsciiRanges(editor: vscode.TextEditor): vscode.DecorationOptions[] {
    const expression = /[^\x00-\x7F]+/gm;
    const text = editor.document.getText();
    const ranges: vscode.DecorationOptions[] = [];
    let match: RegExpExecArray | null;
    while ((match = expression.exec(text))) {
        const start = editor.document.positionAt(match.index);
        const end = editor.document.positionAt(match.index + match[0].length);
        ranges.push({
            range: new vscode.Range(start, end),
            hoverMessage: `non ASCII Character **${match[0]}**`,
        });
    }
    return ranges;
}

export function highlightNonAsciiCharacters(editor: vscode.TextEditor): vscode.DecorationOptions[] {
    const ranges = findNonAsciiRanges(editor);
    editor.setDecorations(nonAsciiCharacterDecorationType, ranges);
    return ranges;
}