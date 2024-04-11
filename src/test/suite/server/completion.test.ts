import * as assert from 'assert';
import * as vscode from "vscode";
import { getPathOfWorkspaceFile } from '../testHelper';
import { getCompletions } from '../../../../server/src/completion';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem } from 'vscode-languageserver';
// open test file
const testFilePath = getPathOfWorkspaceFile("isgCycles_test.nc");
const testFileUri = vscode.Uri.file(testFilePath);
suite('LS Snippet Completion', () => {
    test('Cycle Completion outside of cycle call and no prefix', async () => {
        // cycle with some non-required parameters
        const completions = (await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            testFileUri,
            new vscode.Position(0, 0)
        ) as vscode.CompletionList).items;
        assert.ok(completions.length > 0);
        // should have 2 completions (one for required and one for all parameters)
        const sysCalibBacklash1Completions = completions.filter(c => c.label.toString().includes("SysCalibBacklash1"));
        assert.strictEqual(sysCalibBacklash1Completions.length, 2);
        // test Completion for required parameters
        const sysCalibBacklash1Required = sysCalibBacklash1Completions.find(c => c.label.toString().includes("required"));
        assertAllStringsIncludeAndNotIncludes(
            getStringsOfAttributes([sysCalibBacklash1Required?.detail, sysCalibBacklash1Required?.filterText, sysCalibBacklash1Required?.insertText]),
            ["L CYCLE [NAME=SysCalibBacklash1"],
            ["@P2", "@P33", "@P64"]
        );
        // test Completion for all parameters
        const sysCalibBacklash1All = sysCalibBacklash1Completions.find(c => c.label.toString().includes("all"));
        assertAllStringsIncludeAndNotIncludes(
            getStringsOfAttributes([sysCalibBacklash1All?.detail, sysCalibBacklash1All?.filterText, sysCalibBacklash1All?.insertText]),
            ["L CYCLE [NAME=SysCalibBacklash1", "@P2", "@P33", "@P64"],
            []
        );


    });
    test('Cycle Completion inside of cycle call and no prefix', async () => {
        const vscodeDoc = await vscode.workspace.openTextDocument(testFileUri);
        const doc = TextDocument.create(vscodeDoc.uri.toString(), "nc", 0, vscodeDoc.getText());
        // completion request inside but before parameters would come should return no completions
        const completionsExpectedEmptyMultiLine = getCompletions(new vscode.Position(1, 13), doc);
        assert.strictEqual(completionsExpectedEmptyMultiLine.length, 0);
        const completionsExpectedEmptySingleLine = getCompletions(new vscode.Position(8, 13), doc);
        assert.strictEqual(completionsExpectedEmptySingleLine.length, 0);
        // completion request inside and after cycle name should return completions for missing parameters (this should work for single-line and multi-line snippets)
        const completionsMulti = getCompletions(new vscode.Position(6, 1), doc);
        const completionsSingle = getCompletions(new vscode.Position(8, 43), doc);
        testParamCompletions(completionsMulti);
        testParamCompletions(completionsSingle);

        function testParamCompletions(completions: CompletionItem[]) {
            assert.strictEqual(completions.length, 4);
            // should contain 4 completions (P16, P17, P18, P20)
            assert.ok(completions.some(c => c.label.toString().includes("P16")));
            assert.ok(completions.some(c => c.label.toString().includes("P17")));
            assert.ok(completions.some(c => c.label.toString().includes("P18")));
            assert.ok(completions.some(c => c.label.toString().includes("P20")));
            // should not contain P14 because it is already in the cycle call
            assert.ok(!completions.some(c => c.label.toString().includes("P14")));
        }
    });

    test('Cycle Completion outside of cycle call and with prefix', async () => {

    });
});

function getStringsOfAttributes(att: (string | undefined | vscode.SnippetString)[]): string[] {
    return att.map(a => {
        if (typeof a === "string") {
            return a;
        } else if (a instanceof vscode.SnippetString) {
            return a.value;
        } else {
            throw new Error("Unexpected type of attribute");
        }
    });
}

function assertAllStringsIncludeAndNotIncludes(strings: string[], includes: string[], notIncludes: string[]) {
    for (const s of strings) {
        for (const i of includes) {
            assert.ok(s.includes(i), `Assertion failed: ${s} does not include ${i}`);
        }
        for (const n of notIncludes) {
            assert.ok(!s.includes(n), `Assertion failed: ${s} includes ${n}`);
        }
    }
}