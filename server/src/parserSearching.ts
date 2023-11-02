import * as fs from "fs";
import path = require("path");
import { Match, Position, FileRange, IncrementableProgress, hasMatchProperties } from "./parserClasses";
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizePath } from "./fileSystem";
import { compareLocations as compareLocations } from "./stringSearching";
import { MatchType } from "./parserClasses";
import { ParseResults } from "./parsingResults";

/**
* Recursively find the first match of the given type and name within the tree
* @param tree the current subtree to search 
* @param defType the match type e.g. localPrgCall
* @param name the name/identifier of the match
* @returns the match if existing, otherwise null
*/
export function findFirstMatchWithinPrg(tree: any, defType: MatchType, name: string): Match | null {
    let res: Match | null = null;

    // if no match found yet, search in other subtree
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            if (!res) {
                res = findFirstMatchWithinPrg(e, defType, name);
            }
        });
    }

    // when element is a Match (Subtree)
    if (tree && hasMatchProperties(tree)) {
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
export function findPreciseMatch(tree: any, position: Position): Match | null {
    let res: Match | null = null;

    // if no match found yet, search in other subtree
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            if (!res) {
                res = findPreciseMatch(e, position);
            }
        });
    }

    // when element is a Match (Subtree) try to search more precise, if not possible we found our match
    if (tree && hasMatchProperties(tree)) {
        const match = tree as Match;
        if (!match.location) {
            return null;
        }
        const start = new Position(match.location.start.line - 1, match.location.start.column - 1);
        const end = new Position(match.location.end.line - 1, match.location.end.column - 1);
        if (compareLocations(position, start) >= 0 && compareLocations(position, end) <= 0) {
            res = findPreciseMatch(match.content, position);

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
 * @param tree the current subtree to search in
 * @param types the possible types of matches to search for
 * @param name the name/identifier of the matches to search for
 * @returns the found matches
 */
export function findMatchesWithinPrgTree(tree: any, types: string[], name: string): Match[] {
    let res: Match[] = [];

    // search in each subtree and add its matches to the result array
    if (Array.isArray(tree)) {
        tree.forEach(e => {
            const subRes = findMatchesWithinPrgTree(e, types, name);
            res.push(...subRes);
        });
    }

    // if element is a Match
    if (tree && hasMatchProperties(tree)) {
        const match = tree as Match;

        const globalCall = types.includes(MatchType.globalCycleCallName) || types.includes(MatchType.globalPrgCallName);
        let matchName = match.name;
        // if we search for global prg/cycle calls and absolute path is found take filename instead, because we dont know which file exactly is meant
        if (globalCall && matchName && path.isAbsolute(matchName)) {
            matchName = path.basename(matchName);
        }

        // if correct defType and name add to found matches
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
 * @param tree the current subtree to search in
 * @param types the possible types of matches to search for 
 * @param name the name/identifier of the matches to search for 
 * @param uri the uri of the file the tree is from 
 * @returns the found ranges
 */
export function findMatchRangesWithinPrgTree(tree: any, types: string[], name: string, uri: string): FileRange[] {
    let ranges: FileRange[] = [];
    const matches: Match[] = findMatchesWithinPrgTree(tree, types, name);
    for (const ref of matches) {
        if (!ref.location) {
            continue;
        }
        const start: Position = new Position(ref.location.start.line - 1, ref.location.start.column - 1);
        const end: Position = new Position(ref.location.end.line - 1, ref.location.end.column - 1);
        ranges.push(new FileRange(uri, start, end));
    }
    return ranges;
}

/**
 * Finds all match-ranges of a given name and types within a given root directory and all subdirectories
 * @param filePaths paths of files to search in
 * @param types possible types of matches to search for
 * @param name name/identifier of the matches to search for
 * @param uriToOpenFileContent mapping of file-uris to file-contents
 * @param progressHandler progress reporter
 * @returns the found ranges
 */
export function findMatchRangesWithinPath(filePaths: string[], types: string[], name: string, uriToOpenFileContent: Map<string, string>, progressHandler: IncrementableProgress): FileRange[] {
    let ranges: FileRange[] = [];

    // convert uri mapping of open files to normalized path mapping
    const pathToOpenFileContent = new Map<string, string>();
    uriToOpenFileContent.forEach((value, key) => {
        const normalizedPath = normalizePath(fileURLToPath(key));
        pathToOpenFileContent.set(normalizedPath, value);
    });

    for (const filePath of filePaths) {
        // leave loop if progress is cancelled
        if (progressHandler.isCancelled()) {
            break;
        }
        // report progress
        progressHandler.changeMessage(filePath);
        // if file is open, get current file content of editor
        let fileContent: string | undefined = pathToOpenFileContent.get(filePath);
        // if file is not open, read file content from disk
        if (!fileContent) {
            fileContent = fs.readFileSync(filePath, 'utf8');
        }
        // if file does not contain the searched match-name skip parsing/searching
        if (!fileContent.includes(name)) {
            progressHandler.increment();
            continue;
        }
        try {
            const ast = new ParseResults(fileContent).results.fileTree;
            const uri = pathToFileURL(filePath).toString();
            const fileRanges: FileRange[] = findMatchRangesWithinPrgTree(ast, types, name, uri);
            ranges.push(...fileRanges);
        } catch (error) {
            const errorMessage = `Error while parsing ${filePath}: ${error} \nThis file is not included in the found references.`;
            throw new Error(errorMessage);
        }

        progressHandler.increment(filePath);
    }

    return ranges;
}

