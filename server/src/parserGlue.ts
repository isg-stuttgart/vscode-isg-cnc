import { match } from "assert";
import * as fs from "fs";
import * as peggy from "peggy";
import * as ncParser from "./peggyParser";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Definition, Position } from "vscode";

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

export function getMatchAtPosition(text: string, position: Position): Match | null {
    const parseResults: { fileTree: Array<any>, numberableLinesUnsorted: Set<number> } = ncParser.parse(text) as unknown as { fileTree: Array<any>, numberableLinesUnsorted: Set<number> };
    return findMatch(parseResults.fileTree, new Position(position.line, position.character));
}

export function getDefinition(identifier: string, match: Match) {

}

function findDefinition(tree: any, toSearch: Match, currentDef: Match | null): Match | null{
    let defType: string;
    let res: Match | null = null;
    switch(toSearch.type){
        case matchTypes.prgCall:
            defType = ""; // TODO prg def
    }
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            // when element is a Match (Subtree) try to search more precise, if not possible we found our match
            if (e.type) {
                const match = e as Match;
                // correct
                if (match.type === defType && match.name === toSearch.name && currentDef) {
                    res = currentDef;
                } else {
                    res = findDefinition(match, toSearch, null);
                }
            }
            // when element is also array then search in this
            else if (Array.isArray(e)) {
                res = findDefinition(match, toSearch, null);
            }
        });
    }

    return res;
}
function findMatch(tree: any, position: Position): Match | null {
    let res: Match | null = null;
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            // when element is a Match (Subtree) try to search more precise, if not possible we found our match
            if (e.type) {
                const match = e as Match;
                const start = new Position(match.location.start.line - 1, match.location.start.column - 1);
                const end = new Position(match.location.end.line - 1, match.location.end.column - 1);
                if (position.compareTo(start) >= 0 && position.compareTo(end) <= 0) {
                    res = findMatch(match, position);

                    //if subtree did not give better result then take this match
                    if (!res) {
                        res = match;
                    }
                }
            }
            // when element is also array then search in this
            else if (Array.isArray(e)) {
                res = findMatch(e, position);
            }
        });
    }

    return res;
}



