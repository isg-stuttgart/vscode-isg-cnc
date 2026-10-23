import * as vscode from "vscode";

export function isValidDocumentationId(id: string): boolean {
    return /^[\w.-]+$/.test(id) && !id.includes('..');
}

export function buildDocumentationUrl(documentationPath: string, locale: string, id?: string): string {
    const base = documentationPath.endsWith('/') ? documentationPath : `${documentationPath}/`;
    return `${base}${locale}/index.html${id ? `#${id}` : ''}`;
}

/**
 * Returns whether comments are included when numbering blocks.
 */
export function getIncludeCommentsInNumbering(): boolean {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.includeCommentsInNumbering");
    return typeof value === "boolean" ? value : false;
}

/**
 * Returns the configured documentation path, falling back to the ISG online documentation.
 */
export function getDocumentationPath(): string {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.documentationPath");
    return typeof value === "string" ? value : "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/";
}

/**
 * Returns the configured documentation locale, falling back to en-GB.
 */
export function getLocale(): string {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.locale");
    return typeof value === "string" ? value : "en-GB";
}

/**
 * Returns whether the CNC formatter is enabled. Defaults to false if the setting is unavailable.
 */
export function getEnableFormatter(): boolean {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.enableFormatter");
    return typeof value === "boolean" ? value : false;
}

/**
 * Returns whether output-channel logging is enabled. Defaults to false if the setting is unavailable.
 */
export function getEnableOutputchannel(): boolean {
    const value = vscode.workspace.getConfiguration().get("isg-cnc.enableOutputchannel");
    return typeof value === "boolean" ? value : false;
} export async function openBrowserDocumentation(id?: string): Promise<boolean> {
    if (id && !isValidDocumentationId(id)) {
        void vscode.window.showWarningMessage(`Invalid documentation id: ${id}`);
        return false;
    }

    const documentationPath = getDocumentationPath();
    if (!documentationPath.startsWith('http')) {
        void vscode.window.showWarningMessage('Local documentation paths are not available in the browser extension.');
        return false;
    }

    return vscode.env.openExternal(vscode.Uri.parse(buildDocumentationUrl(documentationPath, getLocale(), id)));
}

