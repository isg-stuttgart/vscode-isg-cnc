import * as assert from 'assert';
import * as vscode from 'vscode';
import { openTestFile } from '../testHelper';
import { findNonAsciiRanges } from '../../../util/nonAsciiCharacters';

suite('Non-ASCII Characters Tests', () => {
    test('Test non-ASCII characters decoration', async function () {
        // Open a file with non-ASCII characters
        const doc = await openTestFile('non_Ascii_Characters_test.nc');
        await vscode.commands.executeCommand('isg-cnc.FindNonAsciiCharacters');
        const editor = await vscode.window.showTextDocument(doc);
        const nonAsciiCharacters = findNonAsciiRanges(editor);
        // first occurence
        assert.strictEqual(nonAsciiCharacters.length, 2);
        assert.strictEqual(nonAsciiCharacters[0].range.start.line, 3);
        assert.strictEqual(nonAsciiCharacters[0].range.start.character, 23);
        assert.strictEqual(nonAsciiCharacters[0].range.end.line, 3);
        assert.strictEqual(nonAsciiCharacters[0].range.end.character, 24);

        // second occurence
        assert.strictEqual(nonAsciiCharacters[1].range.start.line, 5);
        assert.strictEqual(nonAsciiCharacters[1].range.start.character, 24);
        assert.strictEqual(nonAsciiCharacters[1].range.end.line, 5);
        assert.strictEqual(nonAsciiCharacters[1].range.end.character, 29);
    });
});
