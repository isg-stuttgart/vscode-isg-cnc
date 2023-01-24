import { match } from "assert";
import * as fs from "fs";
import * as peggy from "peggy";
import * as ncParser from "./peggyParser";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Position } from "vscode-languageserver";
import * as vscode from "vscode";



export function getIdentifierAtPosition(document: TextDocument, position: Position): string | null {
    const text = document.getText();
    const parseResults: { fileTree: Array<any>, numberableLinesUnsorted: Set<number> } = ncParser.parse(text) as unknown as { fileTree: Array<any>, numberableLinesUnsorted: Set<number> };
    return findIdentifier(parseResults.fileTree, new vscode.Position(position.line, position.character));
}

export function findDefinition(identifier: string)/* :Position */ {

}

function findIdentifier(tree: any, position: vscode.Position): string | null {
    let res: string | null = null;
    if (Array.isArray(tree)) {
        let nextTree;
        tree.forEach(e => {
            // when element is a Match (Subtree) try to search more precise, if not possible we found our match
            if (e.type) {
                const match = e as Match;
                const start = new vscode.Position(match.location.start.line - 1, match.location.start.column - 1);
                const end = new vscode.Position(match.location.end.line - 1, match.location.end.column - 1);
                if (position.compareTo(start) >= 0 && position.compareTo(end) <= 0) {
                    res = findIdentifier(match, position);

                    //if subtree did not give better result then take this match
                    if (!res) {
                        res = match.text; // TODO identifier instead text
                    }
                }
            }
            // when element is also array then search in this
            else if (Array.isArray(e)) {
                res = findIdentifier(e, position);
            }
        });
    }

    return res;
}


export interface Match {
    name: Match | null;
    type: string;
    text: string;
    location: peggy.LocationRange;
    content: any[];
}

export const matchTypes = {
    toolCall: "toolCall",
    prgCall: "prgCall",
    controlBlock: "controlBlock",
    multiline: "multiline",
    trash: "trash",
    name: "name",
    skipBlock: "skipBlock",
    blockNumber: "blockNumber"
};
