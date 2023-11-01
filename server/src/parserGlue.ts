import { pathToFileURL } from "node:url";
import { Match, Position, FileRange, IncrementableProgress } from "./parserClasses";
import {
    findPreciseMatch,
    findFirstMatchWithinPrg,
    findMatchRangesWithinPrgTree,
    findMatchRangesWithinPath,
} from "./parserSearching";
import * as fs from "fs";
import path = require("node:path");
import { Connection } from "vscode-languageserver";
import { getSurroundingVar, findLocalStringRanges, isWithinMatches } from "./stringSearching";
import { WorkspaceIgnorer, findFileInRootDir, normalizePath } from "./fileSystem";
import { getDefType, getRefTypes, matchTypes } from "./matchTypes";
import { getAllNotIgnoredCncFilePathsInRoot } from "./config";
import { ParseResults } from "./parsingResults";

/**
 * Returns the definition location of the selected position
 * @param fileContent The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @param rootPaths The root paths of the workspace
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(fileContent: string, position: Position, uri: string, rootPaths: string[] | null): FileRange[] {
    let defMatch: Match | null = null;
    let definitions: FileRange[] = [];

    // parse the file content and search for the selected position
    let parseResult: ParseResults;
    try {
        parseResult = new ParseResults(fileContent);
    } catch (error) {
        throw new Error(`Error parsing file ${uri}: ${error}`);
    }
    const ast: any[] = parseResult.results.fileTree;

    // if the location is within comments, return empty array
    if (isWithinMatches(parseResult.syntaxArray.comments, position)) {
        return [];
    }

    /**If the location is on a variable, search for it's definition via the parser. This is an extra case because of an incomplete parser which doesn't recognize all variable-references properly. */
    const surroundingVar = getSurroundingVar(fileContent, position);
    if (surroundingVar) {
        const varMatch = findFirstMatchWithinPrg(ast, matchTypes.varDeclaration, surroundingVar);
        if (varMatch && varMatch.location) {
            const start: Position = new Position(varMatch.location.start.line - 1, varMatch.location.start.column - 1);
            const end: Position = new Position(varMatch.location.end.line - 1, varMatch.location.end.column - 1);
            definitions.push(new FileRange(uri, start, end));
        }
        return definitions;
    }

    const match = findPreciseMatch(ast, position);
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
    } else if (rootPaths && [matchTypes.globalPrgCall, matchTypes.globalCycleCall].includes(defType)) {
        let defPaths: string[] = [];
        // if the call contains a valid absolute path, use it
        if (path.isAbsolute(match.name)) {
            const normPath = normalizePath(match.name);
            if (fs.existsSync(normPath)) {
                defPaths.push(normalizePath(match.name));
            }
        } else {
            defPaths = [];
            for (const rootPath of rootPaths) {
                defPaths.push(...findFileInRootDir(rootPath, match.name, new WorkspaceIgnorer(rootPath)));
            }
        }
        // find the mainPrg range in the found files and jump to file beginning if no mainPrg found
        for (const path of defPaths) {
            const uri = pathToFileURL(path).toString();
            const defFileContent = fs.readFileSync(path, "utf8");
            let mainPrg;
            try {
                mainPrg = new ParseResults(defFileContent).results.mainPrg;
            } catch (error) {
                throw new Error(`Error parsing file ${uri}: ${error}`);
                console.error(`Error parsing file ${path}: ${error}`);
            }
            let range = {
                start: new Position(0, 0),
                end: new Position(0, 0)
            };
            if (mainPrg && mainPrg.location) {
                range = {
                    start: new Position(mainPrg.location.start.line - 1, mainPrg.location.start.column - 1),
                    end: new Position(mainPrg.location.end.line - 1, mainPrg.location.end.column - 1)
                };
            }
            definitions.push(new FileRange(uri, range.start, range.end));
        }
    }
    return definitions;
}

/**
 * Find all references fitting to the declaration at the given position in the given file.
 * @param fileContent the file content of the currently focused file
 * @param position the position of the reference event
 * @param uri the uri of the currently focused file
 * @param rootPaths the root paths of the workspace
 * @param openFiles a map of open files with their uri as key and the file content as value
 */
export async function getReferences(fileContent: string, position: Position, uri: string, rootPaths: string[] | null, openFiles: Map<string, string>, connection: Connection): Promise<FileRange[]> {
    let referenceRanges: FileRange[] = [];

    // parse the file content and search for the selected position
    let parseResult: ParseResults;
    try {
        parseResult = new ParseResults(fileContent);
    } catch (error) {
        throw new Error(`Error parsing file ${uri}: ${error}`);
    }

    // if the location is within comments, return empty array
    if (isWithinMatches(parseResult.syntaxArray.comments, position)) {
        return [];
    }

    // if the selected position is a variable use string search to find all references and return the result
    const surroundingVar = getSurroundingVar(fileContent, position);
    if (surroundingVar) {
        const stringRanges = findLocalStringRanges(fileContent, surroundingVar, uri);
        return stringRanges;
    }

    const match = findPreciseMatch(parseResult.results.fileTree, position);
    if (!match || !match.name) {
        return [];
    }

    // get the reference types fitting to the type of the found match, also if we are in a local or global context
    const { refTypes, local } = getRefTypes(match);
    let name: string = match.name;

    // if the match is a global program name or cycle call name and absolute path is given, add the filename to the search names
    if (rootPaths && [matchTypes.globalPrgCallName, matchTypes.globalCycleCallName].includes(match.type) && path.isAbsolute(match.name)) {
        name = path.basename(match.name);
    }

    // if local find all references in the same file and add their ranges to the result array
    if (local) {
        referenceRanges = findMatchRangesWithinPrgTree(parseResult.results.fileTree, refTypes, name, uri);
    }
    // if global find all references in all isg-cnc associated and not ignored files within all workspace roots and add their ranges to the result array
    else if (rootPaths) {
        // collect all isg-cnc files in the rootpaths which aren't ignored
        const isgCncFiles: string[] = [];
        for (const rootPath of rootPaths) {
            isgCncFiles.push(...getAllNotIgnoredCncFilePathsInRoot(rootPath));
        }

        // create a progress bar and search for references in all isg-cnc files
        const progress = await connection.window.createWorkDoneProgress();
        const progressHandler = new IncrementableProgress(progress, isgCncFiles.length, "Searching references");
        referenceRanges.push(...findMatchRangesWithinPath(isgCncFiles, refTypes, name, openFiles, progressHandler));
        progressHandler.done();
    }

    return referenceRanges;
}