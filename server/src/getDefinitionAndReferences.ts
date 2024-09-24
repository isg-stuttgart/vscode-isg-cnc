import { pathToFileURL } from "node:url";
import { Match, Position, FileRange, IncrementableProgress } from "./parserClasses";
import {
    findPreciseMatchOfTypes,
    findFirstMatchWithinPrg,
    findMatchRangesWithinPrgTree,
    findMatchRangesWithinPath,
} from "./parserSearching";
import * as fs from "fs";
import path = require("node:path");
import { Connection } from "vscode-languageserver";
import { getSurroundingVar, findLocalStringRanges, isWithinMatches } from "./stringSearching";
import { WorkspaceIgnorer, findFileInRootDir, normalizePath } from "./fileSystem";
import { getDefType, getRefTypes } from "./matchTypes";
import { MatchType } from "./parserClasses";
import { getAllNotIgnoredCncFilePathsInRoot } from "./config";
import { ParseResults } from "./parsingResults";
import { LocationRange } from "peggy";
import { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Returns the definition ranges of the selected position. Currently supports variables, local/global prg/cycle calls and GOTO-Jumps.
 * @param parseResults The file as String 
 * @param position The selected position
 * @param uri The file uri
 * @param rootPaths The root paths of the workspace
 * @returns An object containing uri and range of the definition or null when no definition found
 */
export function getDefinition(parseResults: ParseResults, position: Position, uri: string, rootPaths: string[] | null, openDocs: Map<string, TextDocument>): { definitionRanges: FileRange[], uriToParsedDocs: Map<string, ParseResults> } {
    let defMatch: Match | null = null;
    const definitions: FileRange[] = [];
    const parsedDocs: Map<string, ParseResults> = new Map();
    parsedDocs.set(uri, parseResults);

    const ast: any[] = parseResults.results.fileTree;
    // if the location is within comments, return empty array
    if (isWithinMatches(parseResults.syntaxArray.comments, position)) {
        return { definitionRanges: [], uriToParsedDocs: parsedDocs };
    }

    /*If the location is on a variable, search for it's definition via the parser. 
    This is an extra case because of an incomplete parser which doesn't recognize all variable-references properly. */
    const surroundingVar = getSurroundingVar(parseResults.plainText, position);
    if (surroundingVar) {
        const varMatch = findFirstMatchWithinPrg(ast, MatchType.varDeclaration, surroundingVar);
        if (varMatch && varMatch.location) {
            const start: Position = new Position(varMatch.location.start.line - 1, varMatch.location.start.column - 1);
            const end: Position = new Position(varMatch.location.end.line - 1, varMatch.location.end.column - 1);
            definitions.push(new FileRange(uri, start, end));
        }
        return { definitionRanges: definitions, uriToParsedDocs: parsedDocs };
    }

    const match = findPreciseMatchOfTypes(ast, position);
    if (!match || !match.name) {
        return { definitionRanges: [], uriToParsedDocs: parsedDocs };
    }

    const { defType, local } = getDefType(match);
    if (defType === null) {
        return { definitionRanges: [], uriToParsedDocs: parsedDocs };
    }

    if (local) {
        defMatch = findFirstMatchWithinPrg(ast, defType, match.name);
        if (!defMatch || !defMatch.location) {
            return { definitionRanges: [], uriToParsedDocs: parsedDocs };
        }
        const start: Position = new Position(defMatch.location.start.line - 1, defMatch.location.start.column - 1);
        const end: Position = new Position(defMatch.location.end.line - 1, defMatch.location.end.column - 1);
        definitions.push(new FileRange(uri, start, end));
    } else if (rootPaths && [MatchType.globalPrgCall, MatchType.globalCycleCall].includes(defType)) {
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
                defPaths.push(...findFileInRootDir(rootPath, match.name, new WorkspaceIgnorer(rootPath), true));
            }
        }
        // find the mainPrg range in the found files and jump to file beginning if no mainPrg found
        for (const path of defPaths) {
            const uri = pathToFileURL(path).toString();
            const defFileContent = openDocs.get(uri)?.getText() ?? fs.readFileSync(path, "utf8");
            let mainPrgLoc: LocationRange | null = null;
            try {
                const parseResults = new ParseResults(defFileContent);
                parsedDocs.set(uri, parseResults);
                mainPrgLoc = parseResults.results.mainPrgLoc;
            } catch (error) {
                throw new Error(`Error parsing file ${uri}: ${error}`);
            }
            let range = {
                start: new Position(0, 0),
                end: new Position(0, 0)
            };
            if (mainPrgLoc) {
                range = {
                    start: new Position(mainPrgLoc.start.line - 1, mainPrgLoc.start.column - 1),
                    end: new Position(mainPrgLoc.end.line - 1, mainPrgLoc.end.column - 1)
                };
            }
            definitions.push(new FileRange(uri, range.start, range.end));
        }
    }
    return { definitionRanges: definitions, uriToParsedDocs: parsedDocs };
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

    const match = findPreciseMatchOfTypes(parseResult.results.fileTree, position);
    if (!match || !match.name) {
        return [];
    }

    // get the reference types fitting to the type of the found match, also if we are in a local or global context
    const { refTypes, local } = getRefTypes(match);
    let name: string = match.name;

    // if the match is a global program name or cycle call name and absolute path is given, add the filename to the search names
    if (rootPaths && [MatchType.globalPrgCallName, MatchType.globalCycleCallName].includes(match.type) && path.isAbsolute(match.name)) {
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