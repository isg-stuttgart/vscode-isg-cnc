import * as fs from "fs";
import path = require("path");
import { Match, Position, FileRange, IncrementableProgress, isMatch } from "./parserClasses";
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as config from "./config";
import { getConnection } from "./connection";
import { normalizePath } from "./fileSystem";
import { compareLocations as compareLocations } from "./stringSearching";
import { matchTypes } from "./matchTypes";
import { getParseResults, getSyntaxArray } from "./parsingResults";

/**
* Recursively find the definition of the given type and name within the tree
* @param tree the current subtree to search 
* @param defType the definition type e.g. localPrgCall
* @param name the name/identifier of the definition
* @returns the definition match if existing, otherwise null
*/
export function findFirstMatchWithinPrg(tree: any, defType: string, name: string): Match | null {
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
export function findMatch(tree: any, position: Position): Match | null {
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
        if (compareLocations(position, start) >= 0 && compareLocations(position, end) <= 0) {
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
 * Finds all matches of a given name and types within a given program-tree
 * @param tree 
 * @param types 
 * @param name 
 * @returns the found matches
 */
export function findMatchesWithinPrgTree(tree: any, types: string[], name: string): Match[] {
    let res: Match[] = [];

    // search in each subtree and add its references to the result array
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            const subRes = findMatchesWithinPrgTree(e, types, name);
            res.push(...subRes);
        });
    }

    // if element is a Match
    if (tree && isMatch(tree)) {
        const match = tree as Match;

        const globalCall = types.includes(matchTypes.globalCycleCallName) || types.includes(matchTypes.globalPrgCallName);
        let matchName = match.name;
        // if we search for global prg/cycle calls and absolute path is found take filename instead, because we dont know which file exactly is meant
        if (globalCall && matchName && path.isAbsolute(matchName)) {
            matchName = path.basename(matchName);
        }

        // if correct defType and name add to found references
        if (types.includes(match.type) && matchName === name) {
            res.push(match);
        }
        // else search within the match-subtree (if existing)
        else if (match.content) {
            const subRes = findMatchesWithinPrgTree(match.content, types, name);
            res.push(...subRes);
        }
    }
    return res;
}

/**
 * Finds all matches of a given name and types within a given program-tree and returns the according ranges
 * @param tree 
 * @param types 
 * @param name 
 * @param uri 
 * @returns the found ranges
 */
export function findMatchRangesWithinPrgTree(tree: any, types: string[], name: string, uri: string): FileRange[] {
    let ranges: FileRange[] = [];
    const references: Match[] = findMatchesWithinPrgTree(tree, types, name);
    for (const ref of references) {
        if (!ref.location) {
            continue;
        }
        const start: Position = new Position(ref.location.start.line - 1, ref.location.start.column - 1);
        const end: Position = new Position(ref.location.end.line - 1, ref.location.end.column - 1);
        // convert path to vscode uri 
        ranges.push(new FileRange(uri, start, end));
    }
    return ranges;
}

/**
 * Finds all match-ranges of a given name and types within a given root directory and all subdirectories
 * @param rootPath root directory to search in
 * @param types possible types of matches to search for
 * @param name name/identifier of the matches to search for
 * @param uriToOpenFileContent mapping of file-uris to file-contents
 * @param progress progress reporter
 * @param totalFiles total number of files to search in
 * @returns the found ranges
 */
export function findMatchRangesWithinPath(rootPath: string, types: string[], name: string, uriToOpenFileContent: Map<string, string>, progressHandler: IncrementableProgress): FileRange[] {
    let ranges: FileRange[] = [];

    // convert uri mapping of open files to normalized path mapping
    const pathToOpenFileContent = new Map<string, string>();
    uriToOpenFileContent.forEach((value, key) => {
        const normalizedPath = normalizePath(fileURLToPath(key));
        pathToOpenFileContent.set(normalizedPath, value);
    });

    const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of dirEntries) {
        // leave loop if progress is cancelled
        if (progressHandler.isCancelled()) {
            break;
        }
        const entryPath = normalizePath(path.join(rootPath, entry.name));
        if (entry.isDirectory()) {
            // add all matches in subdirectories
            const subMatches = findMatchRangesWithinPath(entryPath, types, name, uriToOpenFileContent, progressHandler);
            ranges.push(...subMatches);
        } else if (entry.isFile()) {
            // report progress
            progressHandler.changeMessage(entryPath);

            // if file is not a cnc-file skip parsing/searching
            if (!config.isCncFile(entryPath)) {
                progressHandler.increment();
                continue;
            }
            // if file is open, get current file content of editor
            let fileContent: string | undefined = pathToOpenFileContent.get(entryPath);

            // if file is not open, read file content from disk
            if (!fileContent) {
                fileContent = fs.readFileSync(entryPath, 'utf8');
            }
            // print number of lines in file
            const lines = fileContent.split(/\r?\n/).length;
            // if file does not contain the searched match-name skip parsing/searching
            if (!fileContent.includes(name)) {
                progressHandler.increment();
                continue;
            }
            let startTime;
            let ast;
            try {
                startTime = Date.now();
                ast = getParseResults(fileContent).fileTree;
                console.log(`File ${entryPath} with ${lines} lines: Parsing took ${Date.now() - startTime}ms.`);
            } catch (error) {
                const errorMessage = `Error while parsing ${entryPath}: ${error} \n This file is not included in the found references.`;
                getConnection()?.window.showErrorMessage(errorMessage);
                console.error(errorMessage);
            }
            const uri = pathToFileURL(entryPath).toString();
            const fileRanges: FileRange[] = findMatchRangesWithinPrgTree(ast, types, name, uri);
            ranges.push(...fileRanges);
            progressHandler.increment(entryPath);
        }
    }
    return ranges;
}



