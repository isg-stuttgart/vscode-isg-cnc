import { WorkspaceIgnorer, findMostSpecificGlobPattern, normalizePath } from "./fileSystem";
import * as fs from "fs";
import * as path from "path";
// declare object mapping strings to strings
/**
 * Object mapping file extensions to languages. Used to determine if a file is a cnc file.
 */
let fileAssociations: { [key: string]: string } = {
    "*.nc": "isg-cnc",
    "*.cnc": "isg-cnc",
    "*.cyc": "isg-cnc",
    "*.ecy": "isg-cnc",
    "*.sub": "isg-cnc",
    "*.plc": "isg-cnc"
};

export function cloneFileAssociations(): { [key: string]: string } {
    const clone: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(fileAssociations)) {
        clone[key] = value;
    }
    return clone;
}

/**
 * Updates the important settings with the setting of the IDE. Currently only the file associations are updated and saved in the fileAssociations variable.
*/
export function updateSettings(workspaceConfig: any) {
    try {
        const newFileAssociations: { [key: string]: string } = workspaceConfig['files']['associations'];
        //reset file associations to default and overwrite with new ones
        fileAssociations = {
            "*.nc": "isg-cnc",
            "*.cnc": "isg-cnc",
            "*.cyc": "isg-cnc",
            "*.ecy": "isg-cnc",
            "*.sub": "isg-cnc",
            "*.plc": "isg-cnc"
        };
        for (const [key, value] of Object.entries(newFileAssociations)) {
            fileAssociations[key] = value;
        }
    } catch (e) {
        throw new Error("Error while updating settings. " + e);
    }
}

/**
 * Returns a list of all normalized paths to nc files in the specified root directory.
 * This includes all files which the client considers to be isg-cnc files and exludes the one ignored by the .isg-cnc-ignore file within the root path (if existing).
 * @param root the root directory to start searching in (most likely a workspace root)
 */
export function getAllNotIgnoredCncFilePathsInRoot(root: string): string[] {
    const paths: string[] = [];
    const dirEntries = fs.readdirSync(root, { withFileTypes: true });
    const ignorer = new WorkspaceIgnorer(root);
    for (const entry of dirEntries) {
        const entryPath = path.join(root, entry.name);
        // skip ignored files/folders
        if (ignorer.ignores(entryPath)) {
            continue;
        }
        if (entry.isDirectory()) {
            //search in subdirectory
            paths.push(...getAllNotIgnoredCncFilePathsInRoot(entryPath));
        } else if (entry.isFile() && isCncFile(entryPath)) {
            //file found
            const normPath = normalizePath(entryPath);
            paths.push(normPath);
        }
    }
    return paths;
}

/**
 * Checks if the given path is currently associated with the isg-cnc language.
 * @param path path to check
 * @returns whether the path is associated with the isg-cnc language
 */
export function isCncFile(path: string): boolean {
    const mostSpecificPattern = findMostSpecificGlobPattern(path, Object.keys(fileAssociations));
    if (mostSpecificPattern) {
        const language = fileAssociations[mostSpecificPattern];
        return language === "isg-cnc";
    } else {
        return false;
    }
}
