import * as vscode from "vscode";
import { printToOutputchannel } from "./outputChannel";
// create a decorator type that we use to decorate non ascii characters
const nonAsciiCharacterDecorationType = vscode.window.createTextEditorDecorationType(
    {
        borderWidth: "2px",
        borderStyle: "solid",
        overviewRulerColor: "red",
        borderColor: "red",
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            // this color will be used in light color themes
            backgroundColor: "orangered",
        },
        dark: {
            // this color will be used in dark color themes
            backgroundColor: "lightcoral",
        },
    }
);

export function updateDecorations() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    // eslint-disable-next-line no-control-regex
    const regEx = /[^\x00-\x7F]+/gm;
    const text = activeEditor.document.getText();
    const nonAsciiCharacters: vscode.DecorationOptions[] = [];
    let message: string;
    let match;
    while ((match = regEx.exec(text))) {
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(
            match.index + match[0].length
        );
        const decoration = {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: "non ASCII Character **" + match[0] + "**",
        };
        nonAsciiCharacters.push(decoration);
    }
    activeEditor.setDecorations(
        nonAsciiCharacterDecorationType,
        nonAsciiCharacters
    );
    for (const nonAsciiChar of nonAsciiCharacters) {
        const ln = nonAsciiChar.range.end.line + 1;
        message = "Line: " + ln + " " + nonAsciiChar.hoverMessage;
        printToOutputchannel(message);
    }
}