import * as fs from "fs";
import { findFirstMatchWithinPrg, findMatchRangesWithinPrgTree, findMatchesWithinPrgTree, findPreciseMatchOfTypes } from "../../../../server/src/parserSearching";
import { getPathOfWorkspaceFile } from "../testHelper";
import { ParseResults } from "../../../../server/src/parsingResults";
import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileRange, Match, MatchType, Position } from "../../../../server/src/parserClasses";
const subProgramsNc = fs.readFileSync(getPathOfWorkspaceFile("subPrograms.nc"), "utf8");
const subProgramsNcAst = new ParseResults(subProgramsNc).results.fileTree;
suite('LS parserSearching.findFirstMatchWithinPrg', () => {
    test('Top Level', () => {
        const res1 = findFirstMatchWithinPrg(subProgramsNcAst, MatchType.localSubPrg, "UP1");
        assertIsPrgUP1(res1);

        const res2 = findFirstMatchWithinPrg(subProgramsNcAst, MatchType.blockNumber, "12");
        assertIsBlockNumber12(res2);
    });

    test('Nested Level', () => {
        const res1 = findFirstMatchWithinPrg(subProgramsNcAst, MatchType.localPrgCallName, "UP1");
        assertIsPrgCallNameUP1(res1);
    });

    test('Not Found', () => {
        const res1 = findFirstMatchWithinPrg(subProgramsNcAst, MatchType.localSubPrg, "FOO");
        assert.strictEqual(res1, null);
    });
});

suite('LS parserSearching.findPreciseMatch', () => {
    test('Top Level', () => {
        const res1AllTypes = findPreciseMatchOfTypes(subProgramsNcAst, new Position(0, 0));
        assertIsPrgUP1(res1AllTypes);
        const res1CorrectType = findPreciseMatchOfTypes(subProgramsNcAst, new Position(0, 0), [MatchType.localSubPrg]);
        assertIsPrgUP1(res1CorrectType);
        const res1WrongType = findPreciseMatchOfTypes(subProgramsNcAst, new Position(0, 0), [MatchType.blockNumber]);
        assert.strictEqual(res1WrongType, null);

        const res2AllTypes = findPreciseMatchOfTypes(subProgramsNcAst, new Position(12, 0));
        assertIsBlockNumber12(res2AllTypes);
        const res2CorrectType = findPreciseMatchOfTypes(subProgramsNcAst, new Position(12, 0), [MatchType.blockNumber]);
        assertIsBlockNumber12(res2CorrectType);

        const resWrongType = findPreciseMatchOfTypes(subProgramsNcAst, new Position(6, 0), [MatchType.localSubPrg]);
        assertIsPrgUP1(resWrongType);
    });

    test('Nested Level', () => {
        const res1 = findPreciseMatchOfTypes(subProgramsNcAst, new Position(23, 10));
        assertIsPrgCallNameUP1(res1);

        const res2 = findPreciseMatchOfTypes(subProgramsNcAst, new Position(10, 5), [MatchType.localSubPrg]);
        assert.strictEqual(res2?.name, "UP2");
        assert.strictEqual(res2?.type, MatchType.localSubPrg);
        assert.deepStrictEqual(res2?.location.start, {
            offset: res2.location.start.offset, // different offset in different environments
            line: 9,
            column: 1
        });
        assert.deepStrictEqual(res2?.location.end, {
            offset: res2.location.end.offset, // different offset in different environments
            line: 17,
            column: 1
        });
    });

    test('Not Found', () => {
        const res1 = findPreciseMatchOfTypes(subProgramsNcAst, new Position(100, 100));
        assert.strictEqual(res1, null);
    });
});

suite("LS parserSearching.findMatchesWithinPrgTree", () => {
    test("Normal Case", () => {
        const onlySubPrgUP1 = findMatchesWithinPrgTree(subProgramsNcAst, [MatchType.localSubPrg], "UP1");
        assert.strictEqual(onlySubPrgUP1.length, 1);
        assertIsPrgUP1(onlySubPrgUP1[0]);

        const allUP1 = findMatchesWithinPrgTree(subProgramsNcAst, [MatchType.localSubPrg, MatchType.localPrgCallName], "UP1");
        assert.strictEqual(allUP1.length, 2);
        assertIsPrgUP1(allUP1[0]);
        assertIsPrgCallNameUP1(allUP1[1]);
    });

    test("Global Call with absolute path", () => {
        const globalCalls = findMatchesWithinPrgTree(subProgramsNcAst, [MatchType.globalPrgCallName], "test.nc");
        assert.strictEqual(globalCalls.length, 1);
        assert.strictEqual(globalCalls[0].name, "C:\\ISG\\vscode-isg-cnc\\src\\test\\res\\test.nc");
        assert.strictEqual(globalCalls[0].type, MatchType.globalPrgCallName);
        assert.deepStrictEqual(globalCalls[0].location.start, {
            offset: globalCalls[0].location.start.offset, // different offset in different environments
            line: 27,
            column: 3
        });
        assert.deepStrictEqual(globalCalls[0].location.end, {
            offset: globalCalls[0].location.end.offset, // different offset in different environments
            line: 27,
            column: 45
        });
    });

    test("Not Found", () => {
        const notFound = findMatchesWithinPrgTree(subProgramsNcAst, [MatchType.localSubPrg], "FOO");
        assert.strictEqual(notFound.length, 0);
    });
});

suite("LS parserSearching.findMatchRangesWithinPrgTree", () => {
    test("Normal Case", () => {
        const uri = vscode.Uri.file(getPathOfWorkspaceFile("subPrograms.nc")).fsPath;
        const allUp1Ranges = findMatchRangesWithinPrgTree(subProgramsNcAst, [MatchType.localSubPrg, MatchType.localPrgCallName], "UP1", uri);
        assert.strictEqual(allUp1Ranges.length, 2);
        assert.deepStrictEqual(allUp1Ranges[0], new FileRange(uri, new Position(0, 0), new Position(8, 0)));
        assert.deepStrictEqual(allUp1Ranges[1], new FileRange(uri, new Position(23, 10), new Position(23, 13)));

    });
});


function assertIsPrgCallNameUP1(res1: Match | null) {
    assert.strictEqual(res1?.name, "UP1");
    assert.strictEqual(res1?.type, MatchType.localPrgCallName);
    assert.deepStrictEqual(res1?.location.start, {
        offset: res1.location.start.offset,
        line: 24,
        column: 11
    });
    assert.deepStrictEqual(res1?.location.end, {
        offset: res1.location.end.offset,
        line: 24,
        column: 14
    });
}

function assertIsBlockNumber12(res2: Match | null) {
    assert.strictEqual(res2?.name, "12");
    assert.strictEqual(res2?.type, MatchType.blockNumber);
    assert.deepStrictEqual(res2?.location.start, {
        offset: res2.location.start.offset,
        line: 13,
        column: 1
    });
    assert.deepStrictEqual(res2?.location.end, {
        offset: res2.location.end.offset,
        line: 13,
        column: 4
    });
}

function assertIsPrgUP1(match: Match | null) {
    assert.strictEqual(match?.name, "UP1");
    assert.strictEqual(match?.type, MatchType.localSubPrg);
    assert.deepStrictEqual(match?.location.start, {
        offset: match?.location.start.offset,
        line: 1,
        column: 1
    });
    assert.deepStrictEqual(match?.location.end, {
        offset: match?.location.end.offset,
        line: 9,
        column: 1
    });
}



