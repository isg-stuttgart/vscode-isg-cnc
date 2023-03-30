import { pathToFileURL } from "node:url";
import { Match, Position, FileRange, matchTypes } from "./parserClasses";
import {
    findFileInRootDir as findFilesInRootDir,
    getParseResults,
    getDefType,
    findMatch,
    findFirstMatchWithinPrg,
    getRefTypes,
    findMatchRangesWithinPrgTree,
    findMatchRangesWithinPath,
    normalizePath
} from "./parserUtil";
import * as fs from "fs";
import path = require("node:path");

/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @param rootPath The root path of the workspace
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(fileContent: string, position: Position, uri: string, rootPath: string | null): FileRange[] {
    let defMatch: Match | null = null;
    let definitions: FileRange[] = [];
    // parse the file content and search for the selected position
    const ast: any[] = getParseResults(fileContent).fileTree;
    const match = findMatch(ast, position);
    if (!match || !match.name) {
        return [];
    }
    const { defType, local } = getDefType(match);

    if (defType === null) {
        return [];
    }

    if (local) {
        defMatch = findFirstMatchWithinPrg(ast, defType, match.name);
        if (!defMatch || !defMatch.location) {
            return [];
        }
        const start: Position = new Position(defMatch.location.start.line - 1, defMatch.location.start.column - 1);
        const end: Position = new Position(defMatch.location.end.line - 1, defMatch.location.end.column - 1);
        definitions.push(new FileRange(uri, start, end));
    } else if (rootPath && [matchTypes.globalPrgCall, matchTypes.globalCycleCall].includes(defType)) {
        let defPaths: string[] = [];
        // if the call contains a valid absolute path, use it
        if (path.isAbsolute(match.name)) {
            const normPath = normalizePath(match.name);
            if (fs.existsSync(normPath)) {
                defPaths.push(normalizePath(match.name));
            }
        } else {
            defPaths = findFilesInRootDir(rootPath, match.name);
        }
        const defUris = defPaths.map(defPath => pathToFileURL(defPath).toString());
        // beginnings of the found files (global prgs)
        definitions = defUris.map(defUri => {
            return {
                uri: defUri,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 }
                }
            };
        });
    }
    return definitions;
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

    // get the reference types fitting to the type of the found match, also if we are in a local or global context
    const { refTypes, local } = getRefTypes(match);
    let name: string = match.name;

    // if the match is a global program name or cycle call name and absolute path is given, add the filename to the search names
    if (rootPath && [matchTypes.globalPrgCallName, matchTypes.globalCycleCallName].includes(match.type) && path.isAbsolute(match.name)) {
        name = path.basename(match.name);
    }

    // if local find all references in the same file and add their ranges to the result array
    if (local) {
        referenceRanges = findMatchRangesWithinPrgTree(ast, refTypes, name, uri);
    }
    // if global find all references in all files of workspace and add their ranges to the result array
    else if (rootPath) {
        referenceRanges = findMatchRangesWithinPath(rootPath, refTypes, name, openFiles);
    }

    return referenceRanges;
}



