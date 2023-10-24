import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import { cloneFileAssociations, getAllNotIgnoredCncFilePathsInRoot, isCncFile, updateSettings } from "../../../../server/src/config";
import path = require("path");
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


