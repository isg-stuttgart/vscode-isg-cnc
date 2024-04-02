import assert = require("assert");
import { getCycles, getMarkUpDocUri } from "../../../../server/src/cycles";
import * as vscode from "vscode";

suite("LS cycles", () => {
    test("getCycles()", function () {
        const cycles = getCycles(); // if json file can't be found or correctly converted, this will throw an error
        assert(cycles.length > 0);
    });

    test("getMarkUpDocUri()", async function () {
        assert.strictEqual(getMarkUpDocUri(undefined), "");
        // update locale to de
        await vscode.workspace.getConfiguration().update("isg-cnc.locale", "de-DE", vscode.ConfigurationTarget.Workspace);
        // update documentation path to http uri
        await updateDokuPath("https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/");
        assert.strictEqual(getMarkUpDocUri("12345"), `[More information](command:isg-cnc.openDocuWithId?${encodeURIComponent(JSON.stringify(["12345"]))})`);
    });
});



async function updateDokuPath(dokupath: string) {
    await vscode.workspace.getConfiguration().update("isg-cnc.documentationPath", dokupath, vscode.ConfigurationTarget.Workspace);
}