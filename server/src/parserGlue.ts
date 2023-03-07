import { pathToFileURL } from "node:url";
import * as ncParser from "./ncParser";
import { Match, Position, compareLocation, findFileInRootDir, matchTypes, isMatch } from "./util";
/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(fileContent: string, position: Position, uri: string, rootPath: string | null) {
    let defMatch: Match | null = null;
    // parse the file content and search for the selected position
    const parseResults: { fileTree: Array<any>, numberableLinesUnsorted: Set<number> } = ncParser.parse(fileContent) as unknown as { fileTree: Array<any>, numberableLinesUnsorted: Set<number> };
    const match = findMatch(parseResults.fileTree, position);
    let definition = null;
    if (!match || !match.name) {
        return null;
    }
    let local: boolean = true;
    let defType: string;

    //determine the defType e.g. localSubPrg
    switch (match.type) {
        case matchTypes.localPrgCallName:
            defType = matchTypes.localSubPrg;
            break;
        case matchTypes.localCycleCallName:
            defType = matchTypes.localSubPrg;
            break;
        case matchTypes.globalCycleCallName:
            defType = matchTypes.globalCycleCall;
            local = false;
            break;
        case matchTypes.globalPrgCallName:
            defType = matchTypes.globalPrgCall;
            local = false;
            break;
        case matchTypes.gotoLabel:
            defType = matchTypes.label;
            break;
        case matchTypes.gotoBlocknumber:
            defType = matchTypes.blockNumberLabel;
            break;
        case matchTypes.variable:
            defType = matchTypes.varDeclaration;
            break;
        default: return null;
    }

    if (local) {
        defMatch = findDefinitionWithinPrg(parseResults.fileTree, defType, match.name);
        if (!defMatch || !defMatch.location) {
            return null;
        }
        definition = {
            uri: uri,
            range: {
                start: { line: defMatch.location.start.line - 1, character: defMatch.location.start.column - 1 },
                end: { line: defMatch.location.end.line - 1, character: defMatch.location.end.column - 1 }
            }
        };

    } else if (rootPath && [matchTypes.globalPrgCall, matchTypes.globalCycleCall].includes(defType)) {
        // jump at the beginning of the global program
        const defPath = findFileInRootDir(rootPath, match.name);
        if (!defPath) {
            return null;
        }
        const defUri: string = pathToFileURL(defPath).toString();
        definition = {
            uri: defUri, range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 }
            }
        };
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
function findDefinitionWithinPrg(tree: any, defType: string, name: string): Match | null {
    let res: Match | null = null;

    // if no match found yet, search in other subtree
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            if (!res) {
                res = findDefinitionWithinPrg(e, defType, name);
            }
        });
    }


    // when element is a Match (Subtree) , otherwise 
    if (tree && isMatch(tree)) {
        const match = tree as Match;
        // if correct defType and name we found the definition
        if (match.type === defType && match.name === name) {
            res = match;
            // else search within the match-subtree
        } else {
            res = findDefinitionWithinPrg(match.content, defType, name);
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
    if (tree && isMatch(tree)) {
        const match = tree as Match;
        if (!match.location) {
            return null;
        }
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



