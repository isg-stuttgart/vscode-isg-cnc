import * as vscode from "vscode";
import { printToOutputchannel } from "../outputChannel";
import { findNonAsciiRanges, highlightNonAsciiCharacters } from "./nonAscii";
export { findNonAsciiRanges };

/**
 *  Highlights all non ASCII characters in the active editor and prints them to the output channel.
 */
export function highlightNonAsciiChars(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const nonAsciiCharacters = highlightNonAsciiCharacters(activeEditor);
    for (const nonAsciiChar of nonAsciiCharacters) {
        const ln = nonAsciiChar.range.end.line + 1;
        printToOutputchannel("Line: " + ln + " " + nonAsciiChar.hoverMessage);
    }
}

