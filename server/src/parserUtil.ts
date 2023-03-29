import * as fs from "fs";
import path = require("path");
import * as ncParser from "./ncParser";
import { ParseResults, Match, Position, matchTypes, FileRange } from "./parserClasses";
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Returns the output of the peggy parser */
export function getParseResults(fileContent: string): ParseResults {
    return ncParser.parse(fileContent) as unknown as ParseResults;
}

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
 * Returns the according definition-type to a given match and if the definition hast * to be searched locally or globally
 * @param match 
 * @returns \{ defType: string | null, local: boolean } an object containing the definition type and a boolean indicating if the definition has to be searched locally or globally
 */
export function getDefType(match: Match): { defType: string | null, local: boolean } {
    let defType: string | null;
    let local = true;
    //determine the defType e.g. localSubPrg
    switch (match.type) {
        // program calls
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
        // goto statements
        case matchTypes.gotoLabel:
            defType = matchTypes.label;
            break;
        case matchTypes.gotoBlocknumber:
            defType = matchTypes.blockNumberLabel;
            break;
        //variables
        case matchTypes.variable:
            defType = matchTypes.varDeclaration;
            break;
        default: defType = null;
    }
    return { defType, local };
}

/**
 * Returns the according reference-types to a given match and if the references have to be searched locally or globally
 * @param match 
 * @returns \{ refTypes: string | null, local: boolean } an object containing the reference types and a boolean indicating if the references have to be searched locally or globally
 */
export function getRefTypes(match: Match): { refTypes: string[], local: boolean } {
    let refTypes: string[];
    let local = true;

    switch (match.type) {
        // global program calls
        case matchTypes.globalCycleCallName:
        case matchTypes.globalPrgCallName:
            local = false;
            refTypes = [matchTypes.globalCycleCallName, matchTypes.globalPrgCallName];
            break;
        // local program calls
        case matchTypes.localPrgCallName:
        case matchTypes.localCycleCallName:
        case matchTypes.localSubPrg:
            refTypes = [matchTypes.localPrgCallName, matchTypes.localCycleCallName];
            break;
        // goto label
        case matchTypes.gotoLabel:
        case matchTypes.label:
            refTypes = [matchTypes.gotoLabel];
            break;
        // goto blocknumber
        case matchTypes.gotoBlocknumber:
        case matchTypes.blockNumberLabel:
            refTypes = [matchTypes.gotoBlocknumber];
            break;
        // variables
        case matchTypes.variable:
        case matchTypes.varDeclaration:
            refTypes = [matchTypes.variable];
            break;
        default: refTypes = [];
    }
    return { refTypes, local };
}

/** Returns if a given object is a Match and so can be converted to such*/
export function isMatch(obj: any): boolean {
    const exampleMatch: Match = new Match("", null, null, null, null);
    return Object.keys(exampleMatch).every(key => obj.hasOwnProperty(key));
}

/**
 * Returns whether pos1 is before,after or equal to pos2
 * @param pos1 
 * @param pos2 
 */
export function compareLocation(pos1: Position, pos2: Position): number {
    let result: number;
    if (pos1.line > pos2.line || (pos1.line === pos2.line && pos1.character > pos2.character)) {
        result = 1;
    } else if (pos1.line < pos2.line || (pos1.line === pos2.line && pos1.character < pos2.character)) {
        result = -1;
    } else {
        result = 0;
    };
    return result;
}

/**
 * Finds a file in a root directory and all subdirectories. Returns the path to the file or null if not found.
 * @param rootPath 
 * @param fileName 
 * @returns 
 */
export function findFileInRootDir(rootPath: string, fileName: string): string | null {
    let res: string | null = null;
    const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            //search in subdirectory
            res = findFileInRootDir(entryPath, fileName);
            //if file found, stop searching
            if (res) {
                break;
            }
        } else if (entry.isFile() && entry.name === fileName) {
            //file found
            res = entryPath;
            break;
        }
    }
    return res ? normalizePath(res) : null;
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
            res = res.concat(subRes);
        });
    }

    // if element is a Match
    if (tree && isMatch(tree)) {
        const match = tree as Match;
        if(!match.name){
            return res;
        }        
        const globalCall = types.includes(matchTypes.globalCycleCallName) || types.includes(matchTypes.globalCycleCallName);       
        let matchName = match.name;
        // if we search for global prg/cycle calls and absolute path is found take filename instead, because we dont know which file exactly is meant
        if (globalCall && path.isAbsolute(matchName)) {
            matchName = path.basename(matchName);
        }

        // if correct defType and name add to found references
        if (types.includes(match.type) && matchName === name) {
            res.push(match);
        }
        // else search within the match-subtree (if existing)
        else if (match.content) {
            const subRes = findMatchesWithinPrgTree(match.content, types, matchName);
            res = res.concat(subRes);
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
 * @returns the found ranges
 */
export function findMatchRangesWithinPath(rootPath: string, types: string[], name: string, uriToOpenFileContent: Map<string, string>): FileRange[] {
    let ranges: FileRange[] = [];

    // convert uri mapping of open files to normalized path mapping
    const pathToOpenFileContent = new Map<string, string>();
    uriToOpenFileContent.forEach((value, key) => {
        const normalizedPath = normalizePath(fileURLToPath(key));
        pathToOpenFileContent.set(normalizedPath, value);
    });

    const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = normalizePath(path.join(rootPath, entry.name));
        if (entry.isDirectory()) {
            // add all matches in subdirectories
            const subMatches = findMatchRangesWithinPath(entryPath, types, name, uriToOpenFileContent);
            ranges = ranges.concat(subMatches);
        } else if (entry.isFile()) {
            // add all matches of the file

            // if file is open, get current file content of editor
            let fileContent: string | undefined = pathToOpenFileContent.get(entryPath);
            // if file is not open, read file content from disk
            if (!fileContent) {
                fileContent = fs.readFileSync(entryPath, 'utf8');
            }

            // if file does not contain the searched match-name skip parsing/searching
            if (!fileContent.includes(name)) {
                continue;
            }

            const ast = getParseResults(fileContent).fileTree;
            const uri = pathToFileURL(entryPath).toString();
            const fileRanges: FileRange[] = findMatchRangesWithinPrgTree(ast, types, name, uri);
            ranges = ranges.concat(fileRanges);
        }
    }
    return ranges;
}


export function normalizePath(filePath: string): string {
    const pathObj = path.parse(filePath);
    // Make the drive letter lowercase
    const lowercaseDrive = pathObj.root.toLowerCase();

    // remove the root from the dir component
    const dirWithoutRoot = pathObj.dir.substring(pathObj.root.length);

    // Combine the lowercase drive with the rest of the path components
    const combinedPath = path.join(lowercaseDrive, dirWithoutRoot, pathObj.base);
    const normalizedPath = path.normalize(combinedPath);
    return normalizedPath;
}

