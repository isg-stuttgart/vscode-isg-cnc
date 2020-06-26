import * as path from 'path';
import * as Mocha from 'mocha';
import { globSync } from 'glob';
import * as vscode from 'vscode';
import { getPathOfWorkspaceFile } from "./testHelper";
import * as fs from "fs";
export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd'
    });
    mocha.timeout(10000);
    const testsRoot = path.resolve(__dirname, '..');
    // Create an empty tmp file which is used to test the extension commands
    const tmpPath = getPathOfWorkspaceFile("tmp.nc");
    fs.writeFileSync(tmpPath, "");
    // open the test workspace and wait for the server to initialize
    const ext = vscode.extensions.getExtension("vscode-isg-cnc");
    await ext?.activate();
    console.log("Extension activated");
    try {
        const doc = await vscode.workspace.openTextDocument(getPathOfWorkspaceFile("test.nc"));
        await vscode.window.showTextDocument(doc);
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
        console.error(e);
    }

    return new Promise((c, e) => {

        const testFiles = globSync('**/**.test.js', { cwd: testsRoot });

        // Add files to the test suite
        testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
            // Run the mocha tests
            mocha.run(failures => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}
