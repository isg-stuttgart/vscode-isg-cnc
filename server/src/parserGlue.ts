import * as ncParser from "./ncParser";
import { Document, Match, Position, compareLocation, matchTypes, getAllDocsRecursively } from "./util";
/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(fileContent: string, position: Position, uri: string, rootPath: string | null) {
    let defMatch: Match | null = null;
    let defUri = uri;
    // parse the file content and search for the selected position
    const parseResults: { fileTree: Array<any>, numberableLinesUnsorted: Set<number> } = ncParser.parse(fileContent) as unknown as { fileTree: Array<any>, numberableLinesUnsorted: Set<number> };
    const match = findMatch(parseResults.fileTree, position);
    let definition=null;
    if (!match || !match.name) {
        return null;
    }
    let local: boolean = true;
    let defType: string;

    //determine the defType e.g. localSubPrg
    switch (match.type) {
        case matchTypes.localPrgCall:
            defType = matchTypes.localSubPrg;
            break;
        case matchTypes.globalPrgCall:
            defType = matchTypes.globalPrgCall;
            break;
        default: return null;
    }

    if (local) {
        defMatch = findDefinition(parseResults.fileTree, defType, match.name);
        if (!defMatch) {
            return null;
        }
        definition = {
            uri: uri,
            range: {
                start: { line: defMatch.location.start.line - 1, character: defMatch.location.start.column - 1 },
                end: { line: defMatch.location.end.line - 1, character: defMatch.location.end.column - 1 }
            }
        };
    } else if (rootPath && defType === matchTypes.globalPrgCall) {
        definition = {uri: match.name, range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
        }};
        /* getAllDocsRecursively(rootPath).forEach(doc => {
            if (defMatch === null && match.name) {
                const fileContent = doc.text;
                const parsedDoc: { fileTree: Array<any>, numberableLinesUnsorted: Set<number> } = ncParser.parse(fileContent) as unknown as { fileTree: Array<any>, numberableLinesUnsorted: Set<number> };
                defMatch = findDefinition(parsedDoc, defType, match.name);
                if (defMatch !== null) {
                    defUri = doc.uri;
                }
            };
        }); */
    }
    
    return definition;
}

/**
 * Recursively find the definition of the given type and name within the tree
 * @param tree the current subtree to search 
 * @param defType the definition type e.g. localPrgCall
 * @param name the name/identifier of the definition
 * @returns the definition match if existing, otherwise null
 */
function findDefinition(tree: any, defType: string, name: string): Match | null {
    let res: Match | null = null;

    // if no match found yet, search in other subtree
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            if (!res) {
                res = findDefinition(e, defType, name);
            }
        });
    }


    // when element is a Match (Subtree) , otherwise 
    if (tree && tree.type) {
        const match = tree as Match;
        // if correct defType and name we found the definition
        if (match.type === defType && match.name === name) {
            res = match;
            // else search within the match-subtree
        } else {
            res = findDefinition(match.content, defType, name);
        }
    }
    return res;
}

/**
 * Recursively find the most precise match at the given Position
 * @param tree the current subtree to search in
 * @param position the position where the match should be found
 * @returns the most precise match if existing, otherwise null
 */
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
    return res;
}



