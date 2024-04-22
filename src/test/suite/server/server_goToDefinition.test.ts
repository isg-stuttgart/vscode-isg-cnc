import * as assert from 'assert';
import * as vscode from "vscode";
import path = require('path');
import * as fs from "fs";
import * as OS from "os";
import { getPathOfWorkspaceFile, VSCodeLocationMock, assertSameLocations } from '../testHelper';
const testFilePath = getPathOfWorkspaceFile("testWithEverything.nc");
const testFileUri = vscode.Uri.file(testFilePath);
suite('Go To Definition', () => {
    test('Within Comment', async () => {
        let actualDefinitions: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(0, 83)
        ) as vscode.Location[];
        assert.deepStrictEqual(actualDefinitions, []);

        actualDefinitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(8, 28)
        ) as vscode.Location[];
        assert.deepStrictEqual(actualDefinitions, []);

        actualDefinitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(37, 6)
        ) as vscode.Location[];
        assert.deepStrictEqual(actualDefinitions, []);
    });

    test("Local Prg Call Name", async () => {
        let actualDefinitions: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(28, 11)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions, [
            new VSCodeLocationMock(testFilePath, 2, 0, 10, 0)
        ]);

        actualDefinitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(70, 4)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions, [
            new VSCodeLocationMock(testFilePath, 73, 0, 80, 0),
        ]);
    });

    test("Local Cycle Call Name", async () => {
        const actualDefinitions: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(81, 19)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions, [
            new VSCodeLocationMock(testFilePath, 2, 0, 10, 0)
        ]);
    });

    test("Global Prg/Cycle Call Name (by filename)", async () => {
        const callingProgram1Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot1", "callingProgram1.nc")));
        const callingProgram2Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot2", "callingProgram2.nc")));
        const calledProgram1Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot1", "calledProgram.nc")));
        const calledProgram2Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot2", "calledProgram.nc")));
        const expectedDefinitions = [
            new VSCodeLocationMock(calledProgram1Uri.fsPath, 1, 0, 3, 0),
            new VSCodeLocationMock(calledProgram2Uri.fsPath, 18, 0, 73, 0)
        ];
        const actualDefinitions1: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            callingProgram1Uri,
            new vscode.Position(1, 8)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions1, expectedDefinitions);
        const actualDefinitions2: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            callingProgram2Uri,
            new vscode.Position(3, 20)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions2, expectedDefinitions);
    });

    test("Global Prg/Cycle Call Name (by absolute path)", async () => {
        // create a tmp file which uses the absolute path to the called program within a prg call and a cycle call
        const absolutePathToCalledProgram = getPathOfWorkspaceFile(path.join("multiRoot2", "calledProgram.nc"));
        const callString = "L " + absolutePathToCalledProgram + OS.EOL +
            "L CYCLE [NAME = " + absolutePathToCalledProgram + "]";
        const tmpFilePath = getPathOfWorkspaceFile(path.join("multiRoot1", "tmp.nc"));
        fs.writeFileSync(tmpFilePath, callString);
        try {
            const expectedDefinitions = [new VSCodeLocationMock(absolutePathToCalledProgram, 18, 0, 73, 0)];
            assertSameLocations(
                await vscode.commands.executeCommand(
                    "vscode.executeDefinitionProvider",
                    vscode.Uri.file(tmpFilePath),
                    new vscode.Position(0, 6)
                ) as vscode.Location[],
                expectedDefinitions
            );
            assertSameLocations(
                await vscode.commands.executeCommand(
                    "vscode.executeDefinitionProvider",
                    vscode.Uri.file(tmpFilePath),
                    new vscode.Position(1, 24)
                ) as vscode.Location[],
                expectedDefinitions
            );
        } finally {
            fs.unlinkSync(tmpFilePath);
        }
    });

    test("Goto Label", async () => {
        const actualDefinitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            vscode.Uri.file(testFilePath),
            new vscode.Position(115, 12)
        ) as vscode.Location[];
        const expectedDefinitions = [
            new VSCodeLocationMock(testFilePath, 122, 0, 122, 9)
        ];
        assertSameLocations(actualDefinitions, expectedDefinitions);
    });

    test("Goto Blocknumber", async () => {
        const actualDefinitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            vscode.Uri.file(testFilePath),
            new vscode.Position(111, 29)
        ) as vscode.Location[];
        const expectedDefinitions = [
            new VSCodeLocationMock(testFilePath, 109, 0, 109, 4)
        ];
        assertSameLocations(actualDefinitions, expectedDefinitions);
    });

    test("Variable", async () => {
        let actualDefinitions: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(67, 7)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions, [
            new VSCodeLocationMock(testFilePath, 58, 2, 58, 19)
        ]);

        actualDefinitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            testFileUri,
            new vscode.Position(69, 6)
        ) as vscode.Location[];
        assertSameLocations(actualDefinitions, [
            new VSCodeLocationMock(testFilePath, 60, 2, 61, 10)
        ]);
    });

});


