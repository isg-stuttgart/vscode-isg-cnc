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

/**
 *  Highlights all non ASCII characters in the active editor and prints them to the output channel.
 */
export function highlightNonAsciiChars(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const nonAsciiCharacters = findNonAsciiRanges(activeEditor);
    activeEditor.setDecorations(
        nonAsciiCharacterDecorationType,
        nonAsciiCharacters
    );
    for (const nonAsciiChar of nonAsciiCharacters) {
        const ln = nonAsciiChar.range.end.line + 1;
        printToOutputchannel("Line: " + ln + " " + nonAsciiChar.hoverMessage);
    }
}

/**
 *  Finds all non ASCII characters in the active editor and returns them as decoration options including range and hover message.
 * @param activeEditor active editor
 * @returns decoration options for all non ASCII characters
 */
export function findNonAsciiRanges(activeEditor: vscode.TextEditor): vscode.DecorationOptions[] {
    const regEx = /[^\x00-\x7F]+/gm;
    const text = activeEditor.document.getText();
    const nonAsciiCharacters: vscode.DecorationOptions[] = [];
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
    return nonAsciiCharacters;
}
