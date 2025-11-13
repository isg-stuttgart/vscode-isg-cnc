import * as assert from 'assert';
import * as vscode from "vscode";
import { getPathOfWorkspaceFile } from '../testHelper';
import { getHoverInformation } from '../../../../server/src/hover';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Hover, MarkupContent } from 'vscode-languageserver';
const commands = vscode.commands;
// open test file
const testFilePath = getPathOfWorkspaceFile("isgCycles_test.nc");
const testFileUri = vscode.Uri.file(testFilePath);
const docHover1Path = getPathOfWorkspaceFile("docHover1.nc");
const docHover1Uri = vscode.Uri.file(docHover1Path);
const docHover2Path = getPathOfWorkspaceFile("docHover2.nc");
const docHover2Uri = vscode.Uri.file(docHover2Path);
// update language to english
vscode.workspace.getConfiguration("isg-cnc").update("locale", "en-GB");
suite('LS Cycle Hover Information', () => {
    test('Hover Information for cycle call name', async () => {
        const doc = await vscode.workspace.openTextDocument(testFileUri);
        const hover = getHoverInformation({ line: 1, character: 17 }, TextDocument.create(testFileUri.toString(), "isg-cnc", 0, doc.getText()), null, new Map<string, TextDocument>());
        assert.ok(hover !== undefined && hover !== null);
        assert.ok(getHoverContent(hover).includes("SysCalibToolSettingProbe"));
    });

    test('Hover Information for cycle parameter (both single-line and multi-line)', async () => {
        const hoverMulti = getHoverInformation({ line: 2, character: 4 }, TextDocument.create(testFileUri.toString(), "isg-cnc", 0, (await vscode.workspace.openTextDocument(testFileUri)).getText()), null, new Map<string, TextDocument>());
        const hoverSingle = getHoverInformation({ line: 8, character: 45 }, TextDocument.create(testFileUri.toString(), "isg-cnc", 0, (await vscode.workspace.openTextDocument(testFileUri)).getText()), null, new Map<string, TextDocument>());
        assert.ok(hoverMulti !== undefined && hoverMulti !== null);
        assert.ok(hoverSingle !== undefined && hoverSingle !== null);
        assert.ok(getHoverContent(hoverMulti).includes("P6"));
        assert.ok(getHoverContent(hoverSingle).includes("P6"));
    });
});

suite('LS Doc Comment Hover Content', () => {
    test('Hover Content for local suprogram/cycle', async () => {
        await vscode.workspace.openTextDocument(docHover1Uri);
        const nameHover = await executeHover(docHover1Uri, new vscode.Position(8, 5));
        const prgCallHover = await executeHover(docHover1Uri, new vscode.Position(14, 5));
        const cycleCallHover = await executeHover(docHover1Uri, new vscode.Position(15, 16));
        const declarationHoverShouldNotContainName = await executeHover(docHover1Uri, new vscode.Position(8, 1));
        const callHoverShouldNotContainName = await executeHover(docHover1Uri, new vscode.Position(14, 1));
        const cycleHoverShouldNotContainName = await executeHover(docHover1Uri, new vscode.Position(15, 4));

        checkHoverContentCorrect(nameHover, "**UP1** (Local Subprogram)");
        checkHoverContentCorrect(prgCallHover, "**UP1** (Local Subprogram Call)");
        checkHoverContentCorrect(cycleCallHover, "**UP1** (Local Cycle Call)");
        assert.ok(declarationHoverShouldNotContainName?.includes("UP1") === false);
        assert.ok(!callHoverShouldNotContainName?.includes("UP1"));
        assert.ok(!cycleHoverShouldNotContainName?.includes("UP1"));

        function checkHoverContentCorrect(hover: string | null, specialIncludes: string) {
            assert.ok(hover !== null);
            const expectedIncludes = [
                "Some description",
                "*@param* ```parameterOne```  — Description of parameterOne",
                "*@throws* ```ErrorName```  — Description of ErrorName"
            ];
            expectedIncludes.push(specialIncludes);
            expectedIncludes.forEach(expected => {
                assert.ok(hover.includes(expected));
            });
        }
    });

    test('Hover Content for global suprogram/cycle', async () => {
        // open file with main program to be called
        await vscode.workspace.openTextDocument(docHover1Uri);
        const nameHover = await executeHover(docHover1Uri, new vscode.Position(13, 5));
        assert.ok(nameHover?.includes("**MAINPROGRAM** (Main Program)"));
        assert.ok(nameHover?.includes("Doc for Main Program"));

        // open file with global calls
        await vscode.workspace.openTextDocument(docHover2Uri);
        const prgCallHover = await executeHover(docHover2Uri, new vscode.Position(0, 5));
        assert.ok(prgCallHover?.includes("**docHover1.nc** (Global Subprogram Call)"));
        assert.ok(prgCallHover?.includes("Doc for Main Program"));
        assert.ok(prgCallHover?.includes("File Location:"));

        const cycleCallHover = await executeHover(docHover2Uri, new vscode.Position(1, 16));
        assert.ok(cycleCallHover?.includes("**docHover1.nc** (Global Cycle Call)"));
        assert.ok(cycleCallHover?.includes("Doc for Main Program"));
        assert.ok(cycleCallHover?.includes("File Location:"));
    });

    test("Hover Content for Goto Blocknumber/Label", async () => {
        await vscode.workspace.openTextDocument(docHover1Uri);
        // blocknumber label
        const blockNumHover = await executeHover(docHover1Uri, new vscode.Position(21, 2));
        assert.ok(blockNumHover?.includes("**N10** (Blocknumber Label)"));
        assert.ok(blockNumHover?.includes("Doc for N10"));

        // goto blocknumber label
        const gotoBlocknumHover = await executeHover(docHover1Uri, new vscode.Position(22, 8));
        assert.ok(gotoBlocknumHover?.includes("**N10** (GOTO Blocknumber)"));
        assert.ok(gotoBlocknumHover?.includes("Doc for N10"));

        // label
        const labelHover = await executeHover(docHover1Uri, new vscode.Position(26, 5));
        assert.ok(labelHover?.includes("**testlabel** (Label)"));
        assert.ok(labelHover?.includes("Doc for testLabel"));

        // goto label
        const gotoLabelHover = await executeHover(docHover1Uri, new vscode.Position(27, 9));
        assert.ok(gotoLabelHover?.includes("**testlabel** (GOTO Label)"));
        assert.ok(gotoLabelHover?.includes("Doc for testLabel"));
    });

    test("Hover Content for Variable", async () => {
        await vscode.workspace.openTextDocument(docHover1Uri);

        const varDecHover1 = await executeHover(docHover1Uri, new vscode.Position(35, 5));
        assert.ok(varDecHover1?.includes("**V.P.VAR_1** (Variable Declaration)"));
        assert.ok(varDecHover1?.includes("First Prio Doc for V.P.VAR_1"));

        const varDecHover2 = await executeHover(docHover1Uri, new vscode.Position(36, 5));
        assert.ok(varDecHover2?.includes("**V.P.VAR_2** (Variable Declaration)"));
        assert.ok(varDecHover2?.includes("Doc for V.P.VAR_2"));

        const varUseHover = await executeHover(docHover1Uri, new vscode.Position(39, 5));
        assert.ok(varUseHover?.includes("**V.P.VAR_1** (Variable)"));
        assert.ok(varUseHover?.includes("First Prio Doc for V.P.VAR_1"));
    });
});
async function executeHover(uri: vscode.Uri, position: vscode.Position): Promise<string | null> {
    const hoverArr = await commands.executeCommand("vscode.executeHoverProvider", uri, position) as Hover[];
    if (hoverArr.length === 0) {
        return null;
    }
    const hover = hoverArr[0];
    const hoverContents = hover.contents as unknown as MarkupContent[];
    const string = hoverContents[0].value;
    return string;
}

function getHoverContent(hover: Hover) {
    return (hover.contents as MarkupContent).value;
}