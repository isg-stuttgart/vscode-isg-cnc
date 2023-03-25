import { pathToFileURL } from "node:url";
import { Match, Position, FileRange, matchTypes } from "./parserClasses";
import { findFileInRootDir, getParseResults, getDefType, findMatch, findFirstMatchWithinPrg, getRefTypes, findMatchRangesWithinPrgTree, findMatchRangesWithinPath } from "./parserUtil";
/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @param rootPath The root path of the workspace
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

/**
 * Find all references fitting to the declaration at the given position in the given file.
 * @param fileContent the file content of the currently focused file
 * @param position the position of the reference event
 * @param uri the uri of the currently focused file
 * @param rootPath the root path of the workspace
 * @param openFiles a map of open files with their uri as key and the file content as value
 */
export function getReferences(fileContent: string, position: Position, uri: string, rootPath: string | null, openFiles: Map<string, string>): FileRange[] {
    let referenceRanges: FileRange[] = [];

    // parse the file content and search for the selected position
    const ast: any[] = getParseResults(fileContent).fileTree;
    const match = findMatch(ast, position);
    if (!match || !match.name) {
        return [];
    }

    // get the reference types fitting to the type of the found match
    const { refTypes, local } = getRefTypes(match);

    // if local find all references in the same file and add their ranges to the result array
    if (local) {
        referenceRanges = findMatchRangesWithinPrgTree(ast, refTypes, match.name, uri);
    }
    // if global find all references in all files of workspace and add their ranges to the result array
    else if (rootPath) {
        referenceRanges = findMatchRangesWithinPath(rootPath, refTypes, match.name, openFiles);
    }

    return referenceRanges;
}



