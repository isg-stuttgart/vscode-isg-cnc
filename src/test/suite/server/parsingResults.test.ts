import { ParseResults } from "../../../../server/src/parsingResults";
import * as assert from 'assert';
import { getPathOfWorkspaceFile } from "../testHelper";
import * as fs from "fs";
import { MatchType } from "../../../../server/src/parserClasses";
const usedFilePath = getPathOfWorkspaceFile("parsingResults_test.nc");
const fileContent = fs.readFileSync(usedFilePath, "utf8");
const results = new ParseResults(fileContent);

suite('LS ParseResults', () => {
    test('getLineToBlockNumberMap', () => {
        const map = results.getLineToBlockNumberMap();

        // test if all lines without blocknumbers are not in the map
        const linesWithoutBlocknumbers = [0, 1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 25, 27, 30, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44];
        linesWithoutBlocknumbers.forEach(line => assert.strictEqual(map.has(line), false));

        // test if all lines with blocknumbers are in the map and the correct match is returned
        assert.strictEqual(map.get(4)?.name, "0");
        assert.strictEqual(map.get(4)?.type, MatchType.blockNumber);
        assert.strictEqual(map.get(4)?.text, "N0");
        assert.deepStrictEqual(map.get(4)?.location.start, {
            offset: map.get(4)?.location.start.offset, // offset differs depending on OS
            line: 5,
            column: 1
        });
        assert.deepStrictEqual(map.get(4)?.location.end, {
            offset: map.get(4)?.location.end.offset, // offset differs depending on OS
            line: 5,
            column: 3
        });

        assert.strictEqual(map.get(6)?.name, "2");
        assert.strictEqual(map.get(6)?.type, MatchType.blockNumberLabel);

        assert.strictEqual(map.get(8)?.name, "9");
        assert.strictEqual(map.get(12)?.name, "11");
        assert.strictEqual(map.get(14)?.name, "12");
        assert.strictEqual(map.get(16)?.name, "19");
        assert.strictEqual(map.get(24)?.name, "100");
        assert.strictEqual(map.get(26)?.name, "105");
        assert.strictEqual(map.get(28)?.name, "200");
        assert.strictEqual(map.get(29)?.name, "200");
        assert.strictEqual(map.get(31)?.name, "210");
        assert.strictEqual(map.get(41)?.name, "250");
        assert.strictEqual(map.get(45)?.name, "300");
    });

    test('getNumberableLines', () => {
        const numberableLines = results.getNumberableLines();
        assert.deepStrictEqual(numberableLines, [
            4, 6, 8, 12, 14, 16, 20, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 41, 43, 45
        ]);
    });

    test("SyntaxArray", () => {
        const syntaxArray = results.syntaxArray;
        assert.strictEqual(syntaxArray.toolCalls.length, 3);
        assert.strictEqual(syntaxArray.prgCallNames.length, 5);
        assert.strictEqual(syntaxArray.controlBlocks.length, 2);
        assert.strictEqual(syntaxArray.multilines.length, 1);
        assert.strictEqual(syntaxArray.skipBlocks.length, 1);
        assert.strictEqual(syntaxArray.blockNumbers.length, 13);
        assert.strictEqual(syntaxArray.comments.length, 11);

        // example for toolCall
        assert.strictEqual(syntaxArray.toolCalls[2].name, "T23");
        assert.strictEqual(syntaxArray.toolCalls[2].type, MatchType.toolCall);
        assert.strictEqual(syntaxArray.toolCalls[2].location.start.line, 30);
        assert.strictEqual(syntaxArray.toolCalls[2].location.start.column, 8);
        assert.strictEqual(syntaxArray.toolCalls[2].location.end.line, 30);
        assert.strictEqual(syntaxArray.toolCalls[2].location.end.column, 11);

        // example for prgCallName
        assert.strictEqual(syntaxArray.prgCallNames[1].name, "UP1");
        assert.strictEqual(syntaxArray.prgCallNames[1].type, MatchType.localPrgCallName);
        assert.strictEqual(syntaxArray.prgCallNames[1].location.start.line, 29);
        assert.strictEqual(syntaxArray.prgCallNames[1].location.start.column, 11);
        assert.strictEqual(syntaxArray.prgCallNames[1].location.end.line, 29);
        assert.strictEqual(syntaxArray.prgCallNames[1].location.end.column, 14);

        // example for controlBlock
        assert.strictEqual(syntaxArray.controlBlocks[1].type, MatchType.controlBlock);
        assert.strictEqual(syntaxArray.controlBlocks[1].location.start.line, 28);
        assert.strictEqual(syntaxArray.controlBlocks[1].location.start.column, 1);
        assert.strictEqual(syntaxArray.controlBlocks[1].location.end.line, 34);
        assert.strictEqual(syntaxArray.controlBlocks[1].location.end.column, 1);

        // example for multiline
        assert.strictEqual(syntaxArray.multilines[0].type, MatchType.multiline);
        assert.strictEqual(syntaxArray.multilines[0].location.start.line, 21);
        assert.strictEqual(syntaxArray.multilines[0].location.start.column, 1);
        assert.strictEqual(syntaxArray.multilines[0].location.end.line, 24);
        assert.strictEqual(syntaxArray.multilines[0].location.end.column, 10);

        // example for skipBlock
        assert.strictEqual(syntaxArray.skipBlocks[0].type, MatchType.skipBlock);
        assert.strictEqual(syntaxArray.skipBlocks[0].location.start.line, 35);
        assert.strictEqual(syntaxArray.skipBlocks[0].location.start.column, 1);
        assert.strictEqual(syntaxArray.skipBlocks[0].location.end.line, 36);
        assert.strictEqual(syntaxArray.skipBlocks[0].location.end.column, 1);

        // example for blockNumber
        assert.strictEqual(syntaxArray.blockNumbers[0].name, "0");
        assert.strictEqual(syntaxArray.blockNumbers[0].type, MatchType.blockNumber);
        assert.strictEqual(syntaxArray.blockNumbers[0].location.start.line, 5);
        assert.strictEqual(syntaxArray.blockNumbers[0].location.start.column, 1);
        assert.strictEqual(syntaxArray.blockNumbers[0].location.end.line, 5);
        assert.strictEqual(syntaxArray.blockNumbers[0].location.end.column, 3);

        // example for comment (semicolon)
        assert.strictEqual(syntaxArray.comments[0].type, MatchType.comment);
        assert.strictEqual(syntaxArray.comments[0].location.start.line, 1);
        assert.strictEqual(syntaxArray.comments[0].location.start.column, 1);
        assert.strictEqual(syntaxArray.comments[0].location.end.line, 1);
        assert.strictEqual(syntaxArray.comments[0].location.end.column, 97);

        // example for comment (bracket)
        assert.strictEqual(syntaxArray.comments[1].type, MatchType.comment);
        assert.strictEqual(syntaxArray.comments[1].location.start.line, 3);
        assert.strictEqual(syntaxArray.comments[1].location.start.column, 18);
        assert.strictEqual(syntaxArray.comments[1].location.end.line, 3);
        assert.strictEqual(syntaxArray.comments[1].location.end.column, 44);

        // example for comment (block)
        assert.strictEqual(syntaxArray.comments[8].type, MatchType.comment);
        assert.strictEqual(syntaxArray.comments[8].location.start.line, 38);
        assert.strictEqual(syntaxArray.comments[8].location.start.column, 1);
        assert.strictEqual(syntaxArray.comments[8].location.end.line, 41);
        assert.strictEqual(syntaxArray.comments[8].location.end.column, 13);
    });
});