import * as assert from 'assert';
import { VSCodeLocationMock, assertSameLocations, getPathOfWorkspaceFile } from "../testHelper";
import * as vscode from "vscode";
import path = require('path');
import * as fs from "fs";
import * as OS from "os";
const testFilePath = getPathOfWorkspaceFile("testWithEverything.nc");
const testFileUri = vscode.Uri.file(testFilePath);

suite('Go To References', () => {
    test('Within Comment', async () => {
        let actualReferences: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(0, 83)
        ) as vscode.Location[];
        assert.deepStrictEqual(actualReferences, []);

        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(8, 28)
        ) as vscode.Location[];
        assert.deepStrictEqual(actualReferences, []);

        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(37, 6)
        ) as vscode.Location[];
        assert.deepStrictEqual(actualReferences, []);
    });

    test("Local Prg Call Name", async () => {
        // References executed on one of the references
        let actualReferences: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(28, 11)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 28, 10, 28, 13),
            new VSCodeLocationMock(testFilePath, 81, 17, 81, 20)
        ]);

        // References executed on the definition
        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(2, 4)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 28, 10, 28, 13),
            new VSCodeLocationMock(testFilePath, 81, 17, 81, 20)
        ]);

        // References executed on the only reference
        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(70, 4)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 70, 3, 70, 6)
        ]);
    });

    test("Local Cycle Call Name", async () => {
        // References executed on one of the references
        let actualReferences: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(81, 19)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 81, 17, 81, 20),
            new VSCodeLocationMock(testFilePath, 28, 10, 28, 13)
        ]);

        // References executed on the definition
        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(2, 4)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 81, 17, 81, 20),
            new VSCodeLocationMock(testFilePath, 28, 10, 28, 13)
        ]);

        // References executed on the only reference
        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(166, 18)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 166, 17, 166, 20)
        ]);
    });

    test("Global Prg/Cycle Call Name (by filename)", async () => {
        const callingProgram1Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot1", "callingProgram1.nc")));
        const callingProgram2Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot2", "callingProgram2.nc")));
        const expectedReferences = [
            new VSCodeLocationMock(callingProgram1Uri.fsPath, 1, 2, 1, 18),
            new VSCodeLocationMock(callingProgram1Uri.fsPath, 3, 2, 3, 18),
            new VSCodeLocationMock(callingProgram2Uri.fsPath, 1, 2, 1, 18),
            new VSCodeLocationMock(callingProgram2Uri.fsPath, 3, 16, 3, 32)
        ];
        const actualReferences1: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            callingProgram1Uri,
            new vscode.Position(1, 8)
        ) as vscode.Location[];
        assertSameLocations(actualReferences1, expectedReferences);

        const actualReferences3: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            callingProgram2Uri,
            new vscode.Position(3, 20)
        ) as vscode.Location[];
        assertSameLocations(actualReferences3, expectedReferences);
    });

    test("Global Prg/Cycle Call Name (by absolute path)", async () => {
        const callingProgram1Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot1", "callingProgram1.nc")));
        const callingProgram2Uri = vscode.Uri.file(getPathOfWorkspaceFile(path.join("multiRoot2", "callingProgram2.nc")));

        // create a tmp file which uses the absolute path to the called program within a prg call and a cycle call
        const absolutePathToCalledProgram = getPathOfWorkspaceFile(path.join("multiRoot2", "calledProgram.nc"));
        const callString = "L " + absolutePathToCalledProgram + OS.EOL +
            "L CYCLE [NAME = " + absolutePathToCalledProgram + "]";
        const tmpFilePath = getPathOfWorkspaceFile(path.join("multiRoot1", "tmp.nc"));

        fs.writeFileSync(tmpFilePath, callString);
        try {
            const expectedDefinitions = [
                new VSCodeLocationMock(callingProgram1Uri.fsPath, 1, 2, 1, 18),
                new VSCodeLocationMock(callingProgram1Uri.fsPath, 3, 2, 3, 18),
                new VSCodeLocationMock(callingProgram2Uri.fsPath, 1, 2, 1, 18),
                new VSCodeLocationMock(callingProgram2Uri.fsPath, 3, 16, 3, 32),
                new VSCodeLocationMock(tmpFilePath, 0, 2, 0, 2+absolutePathToCalledProgram.length),
                new VSCodeLocationMock(tmpFilePath, 1, 16, 1, 16+absolutePathToCalledProgram.length)
            ];
           
            // execute references on a relative call
            assertSameLocations(
                await vscode.commands.executeCommand(
                    "vscode.executeReferenceProvider",
                    callingProgram1Uri,
                    new vscode.Position(1, 8)
                ) as vscode.Location[],
                expectedDefinitions
            );

            // execute references on an absolute call
            assertSameLocations(
                await vscode.commands.executeCommand(
                    "vscode.executeReferenceProvider",
                    vscode.Uri.file(tmpFilePath),
                    new vscode.Position(0, 6)
                ) as vscode.Location[],
                expectedDefinitions
            );
        } finally {
            fs.unlinkSync(tmpFilePath);
        }
    });

    test("Goto Label", async () => {
        // References executed on one of the references
        let actualReferences: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(115, 12)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 115, 8, 115, 17),
            new VSCodeLocationMock(testFilePath, 136, 12, 136, 21)
        ]);

        // References executed on the definition
        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(122, 4)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 115, 8, 115, 17),
            new VSCodeLocationMock(testFilePath, 136, 12, 136, 21)
        ]);
    });

    test("Goto Blocknumber", async () => {
        // References executed on one of the references
        let actualReferences: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(111, 29)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 111, 27, 111, 30),
            new VSCodeLocationMock(testFilePath, 116, 8 , 116, 11)
        ]);

        // References executed on the definition
        actualReferences = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(109, 4)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 111, 27, 111, 30),
            new VSCodeLocationMock(testFilePath, 116, 8 , 116, 11)
        ]);
    });

    test("Variable", async () => {
        let actualReferences: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            testFileUri,
            new vscode.Position(67, 7)
        ) as vscode.Location[];
        assertSameLocations(actualReferences, [
            new VSCodeLocationMock(testFilePath, 58, 2, 58, 14),
            new VSCodeLocationMock(testFilePath, 67, 1, 67, 13)
        ]);
    });
});