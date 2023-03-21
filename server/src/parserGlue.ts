import { pathToFileURL } from "node:url";
import { Match, Position, FileRange, matchTypes } from "./parserClasses";
import { compareLocation, findFileInRootDir, isMatch, getParseResults } from "./parserUtil";
/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(fileContent: string, position: Position, uri: string, rootPath: string | null): FileRange | null {
    let defMatch: Match | null = null;

    // parse the file content and search for the selected position
    const ast: any[] = getParseResults(fileContent).fileTree;
    const match = findMatch(ast, position);
    let definition: FileRange | null = null;
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
        defMatch = findFirstMatchWithinPrg(ast, defType, match.name);
        if (!defMatch || !defMatch.location) {
            return null;
        }
        const start: Position = new Position(defMatch.location.start.line - 1, defMatch.location.start.column - 1);
        const end: Position = new Position(defMatch.location.end.line - 1, defMatch.location.end.column - 1);
        definition = new FileRange(uri, start, end);
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

function findAllMatchesWithinPrg(tree: any, defTypes: string[], name: string): Match[] {
    let res: Match[] = [];

    // search in each subtree and add its references to the result array
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            const subRes = findAllMatchesWithinPrg(e, defTypes, name);
            res = res.concat(subRes);
        });
    }

    // if element is a Match
    if (tree && isMatch(tree)) {
        const match = tree as Match;
        // if correct defType and name add to found references
        if (defTypes.includes(match.type) && match.name === name) {
            res.push(match);
            // else search within the match-subtree (if existing)
        } else if (match.content) {
            const subRes = findAllMatchesWithinPrg(match.content, defTypes, name);
            res = res.concat(subRes);
        }
    }
    return res;
}
/**
 * Recursively find the definition of the given type and name within the tree
 * @param tree the current subtree to search 
 * @param defType the definition type e.g. localPrgCall
 * @param name the name/identifier of the definition
 * @returns the definition match if existing, otherwise null
 */
function findFirstMatchWithinPrg(tree: any, defType: string, name: string): Match | null {
    let res: Match | null = null;

    // if no match found yet, search in other subtree
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            if (!res) {
                res = findFirstMatchWithinPrg(e, defType, name);
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
            res = findFirstMatchWithinPrg(match.content, defType, name);
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


/**
 * Recursively find all references fitting to the declaration at the given position in the given file.
 * @param fileContent 
 * @param position 
 * @param uri 
 * @param rootPath 
 */
export function getReferences(fileContent: string, position: Position, uri: string, rootPath: string | null): FileRange[] {
    let references: Match[] | null = null;

    // parse the file content and search for the selected position
    const ast: any[] = getParseResults(fileContent).fileTree;
    const defMatch = findMatch(ast, position);
    if (!defMatch || !defMatch.name) {
        return [];
    }
    let refTypes: string[];

    //determine the defType e.g. localSubPrg
    switch (defMatch.type) {
        case matchTypes.localSubPrg:
            refTypes = [matchTypes.localPrgCallName, matchTypes.localCycleCallName];
            break;
        case matchTypes.label:
            refTypes = [matchTypes.gotoLabel];
            break;
        case matchTypes.blockNumberLabel:
            refTypes = [matchTypes.gotoBlocknumber];
            break;
        case matchTypes.varDeclaration:
            refTypes = [matchTypes.variable];
            break;
        default: return [];
    }

    // Find all references in the same file and add their ranges to the result array
    references = findAllMatchesWithinPrg(ast, refTypes, defMatch.name);
    const referenceRanges: FileRange[] = [];
    for (const ref of references) {
        if (!ref.location) {
            continue;
        }
        const start: Position = new Position(ref.location.start.line - 1, ref.location.start.column - 1);
        const end: Position = new Position(ref.location.end.line - 1, ref.location.end.column - 1);
        referenceRanges.push(new FileRange(uri, start, end));
    }


    return referenceRanges;
}



