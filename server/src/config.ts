import { WorkspaceIgnorer, findMostSpecificGlobPattern, normalizePath, HEAVY_DIRS } from "./fileSystem";
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

/**
 * @returns the base path to the documentation website without locale or index.html, e.g. https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/
 */
export function getDocumentationPathBase(): string {
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
*/
export function updateSettings(workspaceConfig: any) {
    const failedSettings: string[] = [];
    // guard against a missing isg-cnc config section so a malformed config cannot crash the server
    const isgCncConfig = workspaceConfig?.['isg-cnc'] ?? {};

    // update documentation path (keep previous value if not provided)
    if (typeof isgCncConfig['documentationPath'] === "string") {
        documentationPath = isgCncConfig['documentationPath'];
    } else {
        failedSettings.push("documentationPath");
    }

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
    if (typeof isgCncConfig['extensionForCycles'] === "string") {
        extensionForCycles = isgCncConfig['extensionForCycles'];
    } else {
        failedSettings.push("extensionForCycles");
    }

    // update locale
    switch (isgCncConfig['locale']) {
        case "en-GB":
            locale = Locale.en;
            break;
        case "de-DE":
            locale = Locale.de;
            break;
        default:
            failedSettings.push("locale");
    }

    // update cycle snippet formatting
    switch (isgCncConfig['cycleSnippetFormatting']) {
        case "multi-line":
            cycleSnippetFormatting = CycleSnippetFormatting.multiLine;
            break;
        case "single-line":
            cycleSnippetFormatting = CycleSnippetFormatting.singleLine;
            break;
        default:
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
export function getAllNotIgnoredCncFilePathsInRoot(root: string, dir: string = root, ignorer: WorkspaceIgnorer = new WorkspaceIgnorer(root)): string[] {
    const paths: string[] = [];
    const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = path.join(dir, entry.name);
        // skip ignored files/folders
        if (ignorer.ignores(entryPath)) {
            continue;
        }
        if (entry.isDirectory()) {
            // skip large directories that never contain relevant NC files
            if (HEAVY_DIRS.has(entry.name)) {
                continue;
            }
            //search in subdirectory, reusing the ignorer created for this root
            paths.push(...getAllNotIgnoredCncFilePathsInRoot(root, entryPath, ignorer));
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


