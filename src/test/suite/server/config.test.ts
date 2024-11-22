import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import { cloneFileAssociations, CycleSnippetFormatting, getAllNotIgnoredCncFilePathsInRoot, getCycleSnippetFormatting, getDocumentationPathWithLocale, getExtensionForCycles, isCncFile, updateSettings } from "../../../../server/src/config";
import * as path from "path";
import { getPathOfWorkspaceFile, openTestFile } from "../testHelper";
suite("LS Config Tests", async () => {
    test("Updating file associations in Single Workspace", async function () {
        // open nc file to trigger language server
        await openTestFile("test.nc");
        // save current config to restore it later
        const oldWorkspaceConfigAssociations = vscode.workspace.getConfiguration("files.associations");
        await vscode.workspace.getConfiguration().update("files.associations", undefined, vscode.ConfigurationTarget.Workspace);
        const oldGlobalConfigAssociations = vscode.workspace.getConfiguration("files.associations");
        await vscode.workspace.getConfiguration().update("files.associations", undefined, vscode.ConfigurationTarget.Global);
        try {
            const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
            // default config
            let currentExpectedAssociations = getFilesWithEndings(root, [".nc", ".cnc", ".cyc", ".ecy", ".sub", ".plc"]);
            await waitForReset();
            assert.deepStrictEqual(getAllNotIgnoredCncFilePathsInRoot(root).sort(), currentExpectedAssociations.sort());
            // remove .cyc (global)
            await vscode.workspace.getConfiguration().update("files.associations", { "*.cyc": "java" }, vscode.ConfigurationTarget.Workspace);
            updateSettings(vscode.workspace.getConfiguration());
            await waitForLanguageIdUpdate("*.cyc", "java");
            currentExpectedAssociations = currentExpectedAssociations.filter((value) => !value.endsWith(".cyc"));
            assert.deepStrictEqual(getAllNotIgnoredCncFilePathsInRoot(root).sort(), currentExpectedAssociations.sort());
            assert.strictEqual(isCncFile(getPathOfWorkspaceFile("test.cyc")), false);
            assert.strictEqual(isCncFile(getPathOfWorkspaceFile("test.nc")), true);
        } finally {
            // restore config
            await vscode.workspace.getConfiguration().update("files.associations", oldWorkspaceConfigAssociations, vscode.ConfigurationTarget.Workspace);
            await vscode.workspace.getConfiguration().update("files.associations", oldGlobalConfigAssociations, vscode.ConfigurationTarget.Global);
        }
    });

    test("Updating locale and documentation path", async function () {
        // clear all settings
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", undefined, vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", undefined, vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", undefined, vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", undefined, vscode.ConfigurationTarget.Global);
        // update locale and documentation path
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", "de-DE", vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getDocumentationPathWithLocale, "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/de-DE/index.html");

        // change to en-GB
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", "en-GB", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getDocumentationPathWithLocale, "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/en-GB/index.html");

        // change to de-DE and remove last slash
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", "de-DE", vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getDocumentationPathWithLocale, "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/de-DE/index.html");

        // change to complete different path
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", "https://website.com/", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getDocumentationPathWithLocale, "https://website.com/de-DE/index.html");
    });

    test("Updating cycle snippet formatting", async function () {
        // clear all settings 
        await vscode.workspace.getConfiguration().update("isg-cnc.cycleSnippetFormatting", undefined, vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.cycleSnippetFormatting", undefined, vscode.ConfigurationTarget.Global);

        // update cycle snippet formatting
        await vscode.workspace.getConfiguration().update("isg-cnc.cycleSnippetFormatting", "single-line", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getCycleSnippetFormatting, CycleSnippetFormatting.singleLine);
        await vscode.workspace.getConfiguration().update("isg-cnc.cycleSnippetFormatting", "multi-line", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getCycleSnippetFormatting, CycleSnippetFormatting.multiLine);
        await vscode.workspace.getConfiguration().update("isg-cnc.cycleSnippetFormatting", "single-line", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getCycleSnippetFormatting, CycleSnippetFormatting.singleLine);
    });

    test("Updating extension for cycles", async function () {
        // clear all settings
        await vscode.workspace.getConfiguration().update("isg-cnc.extensionForCycles", undefined, vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.extensionForCycles", undefined, vscode.ConfigurationTarget.Global);
        // update extension for cycles
        await vscode.workspace.getConfiguration().update("isg-cnc.extensionForCycles", ".cyc", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getExtensionForCycles, ".cyc");
        await vscode.workspace.getConfiguration().update("isg-cnc.extensionForCycles", ".ecy", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getExtensionForCycles, ".ecy");
        await vscode.workspace.getConfiguration().update("isg-cnc.extensionForCycles", ".cyc", vscode.ConfigurationTarget.Workspace);
        await waitForFunctionUpdate(getExtensionForCycles, ".cyc");
    });
});

async function waitForReset(): Promise<void> {
    const startTime = Date.now();
    while (Object.keys(cloneFileAssociations()).length !== 6 || Object.values(cloneFileAssociations()).some((value) => value !== "isg-cnc")) {
        if (Date.now() - startTime > 1000) {
            throw new Error(`Timeout while waiting for file associations to be reset \nCurrent value: "${JSON.stringify(cloneFileAssociations())}"`);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

async function waitForLanguageIdUpdate(pattern: string, expectedLanguageId: string | undefined): Promise<void> {
    const startTime = Date.now();
    while (cloneFileAssociations()[pattern] !== expectedLanguageId) {
        console.log(JSON.stringify(cloneFileAssociations()));
        if (Date.now() - startTime > 1000) {
            throw new Error(`Timeout while waiting for pattern "${pattern}" to be updated to "${expectedLanguageId}" \nCurrent value: "${cloneFileAssociations()[pattern]}"`);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

async function waitForFunctionUpdate(func: () => any, expectedValue: any): Promise<void> {
    // update settings manually (TODO: shouldnt be necessary, reason for this must be found)
    updateSettings(vscode.workspace.getConfiguration());
    const startTime = Date.now();
    while (func() !== expectedValue) {
        if (Date.now() - startTime > 5000) {
            throw new Error(`Timeout while waiting for function ${func.name} to return ${expectedValue} but returned ${func()}`);
        }
    }
}

function getFilesWithEndings(root: string, endings: string[]): string[] {
    const files: string[] = [];
    const dirEntries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of dirEntries) {
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...getFilesWithEndings(entryPath, endings));
        } else if (entry.isFile() && endings.includes(path.extname(entryPath))) {
            files.push(entryPath);
        }
    }
    return files;
}


