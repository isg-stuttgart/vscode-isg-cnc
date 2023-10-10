import path = require("path");
import * as fs from "fs";
import ignore, { Ignore } from "ignore";
import { isCncFile } from "./config";
import minimatch = require("minimatch");

/**
 * Finds the most specific glob pattern which matches the given path. "Most specific" is estimated by the depth (count of /) of the pattern.
 * @param path the path to find the most specific glob pattern for. 
 * @param patterns the glob patterns in which the most specific pattern should be found.
 * @returns  the most specific glob pattern which matches the given path.
 */
export function findMostSpecificGlobPattern(path: string, patterns: string[]): string | undefined {
    path = normalizePath(path);
    // replace backslashes with forward slashes
    if (!path.includes("git")) {
        path = path.replace(/\\/g, "/");
    }
    let mostSpecificPattern: string | undefined;
    let mostSpecificPatternDepth = -1;
    for (const pattern of patterns) {
        let adaptedPattern = pattern;
        // if pattern only specifies file ending (e.g. '*.nc') add **/ to work with absolute paths
        if (pattern.startsWith("*.") && !pattern.includes("/")) {
            adaptedPattern = "**/" + pattern;
        }
        // if the pattern matches the path
        if (minimatch(path, adaptedPattern)) {
            // get the depth of the pattern
            const patternDepth = pattern.split("/").length;
            // if the pattern is more specific than the current most specific pattern
            if (patternDepth > mostSpecificPatternDepth) {
                // set the pattern as the most specific pattern
                mostSpecificPattern = pattern;
                mostSpecificPatternDepth = patternDepth;
            }
        }
    }
    return mostSpecificPattern;
}

/**
 * Finds all files with the given name in a root directory and all subdirectories. Returns the paths to the files.
 * @param rootPath the root directory to start searching in
 * @param fileName the name of the file to search for
 * @param ignorer optional ignorer to ignore files/directories, defaults to empty ignorer which ignores nothing
 * @returns 
 */
export function findFileInRootDir(rootPath: string, fileName: string, ignorer: WorkspaceIgnorer = new WorkspaceIgnorer("")): string[] {
    let paths: string[] = [];
    const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = path.join(rootPath, entry.name);
        // skip ignored files/directories
        if (ignorer.ignores(entryPath)) {
            continue;
        }
        if (entry.isDirectory()) {
            //search in subdirectory
            paths.push(...findFileInRootDir(entryPath, fileName, ignorer));
        } else if (entry.isFile() && entry.name === fileName && isCncFile(entryPath)) {
            //file found
            const normPath = normalizePath(entryPath);
            paths.push(normPath);
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

/**
 * A ignorer specific to a workspace. It ignores files/directories which are specified in a .isg-cnc-ignore file in the workspace root directory.
 */
export class WorkspaceIgnorer {
    private workspacePath: string;
    private ignorer: Ignore;

    constructor(workspacePath: string) {
        const ig = ignore();
        const ignoreFilePath = path.join(workspacePath, ".isg-cnc-ignore");
        if (fs.existsSync(ignoreFilePath)) {
            ig.add(fs.readFileSync(ignoreFilePath, "utf-8"));
        }
        this.ignorer = ig;
        this.workspacePath = workspacePath;
    }

    /**
     * Checks if the given file path is ignored by the ignorer.
     * @param filePath 
     * @returns 
     */
    public ignores(filePath: string): boolean {
        const relativePath = path.relative(this.workspacePath, filePath);
        return this.ignorer.ignores(relativePath);
    }
}