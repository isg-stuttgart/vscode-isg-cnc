import * as fs from "fs";
import path = require("path");
import * as ncParser from "./ncParser";
import { ParseResults, Match, Document, Position } from "./parserClasses";

/** Returns the output of the peggy parser */
export function getParseResults(fileContent: string): ParseResults {
    return ncParser.parse(fileContent) as unknown as ParseResults;
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
        if (entry.isDirectory()) { //search in subdirectory
            res = findFileInRootDir(entryPath, fileName);
            //if file found, stop searching
            if (res) {
                break;
            }
        } else if (entry.isFile() && entry.name === fileName) { //file found
            res = entryPath;
            break;
        }
    }
    return res;
}