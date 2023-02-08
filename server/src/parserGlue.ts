import { match } from "assert";
import * as fs from "fs";

import * as ncParser from "./ncParser";
import { Match, Position, compareLocation, matchTypes } from "./util";

/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(fileContent: string, position: Position, uri: string) {
    let definition = null;

    // parse the file content and search for the selected position
    const parseResults: { fileTree: Array<any>, numberableLinesUnsorted: Set<number> } = ncParser.parse(fileContent) as unknown as { fileTree: Array<any>, numberableLinesUnsorted: Set<number> };
    const match = findMatch(parseResults.fileTree, position);
    
    if (!match) {
        return null;
    }

    let defType: string;
    switch (match.type) {
        case matchTypes.prgCall:
            defType = matchTypes.trash; // TODO
            /* {
                uri: uri,
                range: {
                    start: { line: match.location.start.line - 1, character: 0 },
                    end: { line: match.location.end.line - 1, character: 0}                
                }
            }; */
    }

    return definition;
}

function findDefinition(tree: any, toSearch: Match, currentDef: Match | null): Match | null {
    let defType: string;
    let res: Match | null = null;
    switch (toSearch.type) {
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

    // if no match found yet, search in other subtree
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            if (!res) {
                res = findMatch(e, position);
            }
        });
    }


    // when element is a Match (Subtree) try to search more precise, if not possible we found our match
    if (tree && tree.type) {
        const match = tree as Match;
        const start = new Position(match.location.start.line - 1, match.location.start.column - 1);
        const end = new Position(match.location.end.line - 1, match.location.end.column - 1);
        if (compareLocation(position, start) >= 0 && compareLocation(position, end) <= 0) {
            res = findMatch(match.content, position);

            //if subtree did not give better result then take this match
            if (!res) {
                res = match;
            }
        }
    }

    if (tree && typeof tree !== "string") {
        console.log("Current tree: " + JSON.stringify(tree) + "\nCurrent result: " + JSON.stringify(res) + "\n");
    }
    return res;
}



