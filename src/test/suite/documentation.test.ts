import assert = require("assert");
import { createFullAddress, startDocu } from "../../util/documentation";
import * as vscode from "vscode";
suite("Open Documentation Test Suite", () => {


    test("Open Documentation default values", async () => {
        // set path and locale to default
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/", vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", "en-GB", vscode.ConfigurationTarget.Workspace);

        const docuAddress = createFullAddress();
        assert.strictEqual(docuAddress, "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/en-GB/index.html");
        startDocu();
    });

    test("Open Documentation with custom values", async () => {
        // set path and locale to default
        await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", "customPathToWebsite", vscode.ConfigurationTarget.Workspace);
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", "de-DE", vscode.ConfigurationTarget.Workspace);

        const docuAddress = createFullAddress();
        assert.strictEqual(docuAddress, "customPathToWebsite/de-DE/index.html");
        startDocu();
    });
});