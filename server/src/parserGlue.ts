import { pathToFileURL } from "node:url";
import { Match, Position, FileRange, matchTypes } from "./parserClasses";
import { compareLocation, findFileInRootDir, isMatch, getParseResults, getDefType, findMatch, findFirstMatchWithinPrg, getRefTypes } from "./parserUtil";
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
    const { defType, local } = getDefType(match);

    if (defType === null) {
        return null;
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
    const match = findMatch(ast, position);
    if (!match || !match.name) {
        return [];
    }

    // get the reference types fitting to the type of the found match
    const { refTypes, local } = getRefTypes(match);
    
    // Find all references in the same file and add their ranges to the result array
    references = findAllMatchesWithinPrg(ast, refTypes, match.name);
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



