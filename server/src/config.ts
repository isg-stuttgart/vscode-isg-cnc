import { WorkspaceIgnorer, findMostSpecificGlobPattern, normalizePath } from "./fileSystem";
import * as fs from "fs";
import * as path from "path";

// locale for the language server documentation features
export enum Locale {
    en = "en-GB",
    de = "de-DE"
}
let locale: Locale = Locale.en;
/** 
 * @returns the current {@link Locale} to use for the language server documentation features.
 */
export function getLocale(): Locale {
    return locale;
}

// path to the documentation website
let documentationPath = "";
export function getDocumentationPath(): string {
    return documentationPath;
}
/**
 * @returns the localed path to the documentation website
 */
export function getDocumentationPathWithLocale(): string {
    const leadingSlash = documentationPath.endsWith("/") ? "" : "/";
    return documentationPath + leadingSlash + getLocale() + "/index.html";
}

// formatting of cycle snippets
export enum CycleSnippetFormatting {
    multiLine = "multi-line",
    singleLine = "single-line"
}
let cycleSnippetFormatting: CycleSnippetFormatting = CycleSnippetFormatting.multiLine;
/**
 * @returns the current {@link CycleSnippetFormatting} to use for cycle snippets.
 */
export function getCycleSnippetFormatting(): CycleSnippetFormatting {
    return cycleSnippetFormatting;
}

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

let extensionForCycles: string = ".ecy";
/**
 * @returns the file extension for cycle calls
 */
export function getExtensionForCycles(): string {
    return extensionForCycles;
}

export function cloneFileAssociations(): { [key: string]: string } {
    const clone: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(fileAssociations)) {
        clone[key] = value;
    }
    return clone;
}

/**
 * Updates the important settings with the setting of the IDE, namely:
 * - {@link documentationPath}
 * - {@link fileAssociations}
 * - {@link locale}
 * - {@link extensionForCycles}
 * - {@link cycleSnippetFormatting}
 *
*/
export function updateSettings(workspaceConfig: any) {
    const failedSettings: string[] = [];
    // update documentation path
    documentationPath = workspaceConfig['isg-cnc']['documentationPath'];
    // update file associations
    try {
        const newFileAssociations: { [key: string]: string } = workspaceConfig['files']['associations'];
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
    } catch (error) {
        failedSettings.push("fileAssociations");
    }

    // update extension for cycles
    extensionForCycles = workspaceConfig['isg-cnc']['extensionForCycles'];

    // update locale
    try {
        switch (workspaceConfig['isg-cnc']['locale']) {
            case "en-GB":
                locale = Locale.en;
                break;
            case "de-DE":
                locale = Locale.de;
                break;
            default:
                throw new Error("Invalid locale");
        }
    } catch (error) {
        failedSettings.push("locale");
    }

    // update cycle snippet formatting
    try {
        switch (workspaceConfig['isg-cnc']['cycleSnippetFormatting']) {
            case "multi-line":
                cycleSnippetFormatting = CycleSnippetFormatting.multiLine;
                break;
            case "single-line":
                cycleSnippetFormatting = CycleSnippetFormatting.singleLine;
                break;
            default:
                throw new Error("Invalid cycleSnippetFormatting");
        }
    } catch (error) {
        failedSettings.push("cycleSnippetFormatting");
    }

    if (failedSettings.length > 0) {
        throw new Error("Failed to update settings: " + failedSettings.join(", "));
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

