import path = require("path");
import * as fs from "fs";

/**
 * Finds a file in a root directory and all subdirectories. Returns the path to the file or null if not found.
 * @param rootPath 
 * @param fileName 
 * @returns 
 */
export function findFileInRootDir(rootPath: string, fileName: string): string[] {
    let paths: string[] = [];
    const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            //search in subdirectory
            paths.push(...findFileInRootDir(entryPath, fileName));
        } else if (entry.isFile() && entry.name === fileName) {
            //file found
            const normPath = normalizePath(entryPath);
            paths.push(normPath);
            break;
        }
    }
    return paths;
}

/**
 * Normalizes a given path to a lowercase drive letter and a normalized (by path module) path
 * @param filePath 
 * @returns 
 */
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

/**
 * Counts all files in a given path
 * @param rootPath 
 * @returns 
 */
export function countFilesInPath(rootPath: string): number {
    let count = 0;
    const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            count += countFilesInPath(entryPath);
        } else if (entry.isFile()) {
            count++;
        }
    }
    return count;
}
