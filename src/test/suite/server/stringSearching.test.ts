import * as assert from 'assert';
import * as fs from "fs";
import { MatchType, Position } from "../../../../server/src/parserClasses";
import { compareLocations, findLocalStringRanges, getSurroundingVar, isWithinMatches } from "../../../../server/src/stringSearching";
import { LocationMock, LocationRangeMock, MatchMock, getPathOfWorkspaceFile } from "../testHelper";

suite('LS stringSearching', () => {
    test('findLocalStringRanges', () => {
        const fileContent = fs.readFileSync(getPathOfWorkspaceFile("ignoreCommentedText_test.nc"), "utf8");
        const string = "test";
        const uri = getPathOfWorkspaceFile("ignoreCommentedText.nc");
        const ranges = findLocalStringRanges(fileContent, string, uri);
        assert.strictEqual(ranges.length, 3);

        assert.strictEqual(ranges[0].range.start.line, 0);
        assert.strictEqual(ranges[0].range.start.character, 0);
        assert.strictEqual(ranges[0].range.end.line, 0);
        assert.strictEqual(ranges[0].range.end.character, 4);

        assert.strictEqual(ranges[1].range.start.line, 0);
        assert.strictEqual(ranges[1].range.start.character, 22);
        assert.strictEqual(ranges[1].range.end.line, 0);
        assert.strictEqual(ranges[1].range.end.character, 26);

        assert.strictEqual(ranges[2].range.start.line, 5);
        assert.strictEqual(ranges[2].range.start.character, 0);
        assert.strictEqual(ranges[2].range.end.line, 5);
        assert.strictEqual(ranges[2].range.end.character, 4);

        assert.strictEqual(findLocalStringRanges(fileContent, "", uri).length, 0);
    });

    test('isWithinMatches', () => {
        const matchMocks = [
            new MatchMock(MatchType.comment, "comment1", new LocationRangeMock(null, new LocationMock(1, 1), new LocationMock(1, 10))),
            new MatchMock(MatchType.comment, "comment2", new LocationRangeMock(null, new LocationMock(4, 23), new LocationMock(4, 30))),
            new MatchMock(MatchType.comment, "comment3", new LocationRangeMock(null, new LocationMock(13, 24), new LocationMock(13, 12))),
            new MatchMock(MatchType.blockNumber, "comment4", new LocationRangeMock(null, new LocationMock(15, 1), new LocationMock(15, 10))),
        ];
        assert.strictEqual(isWithinMatches(matchMocks, new Position(0, 0)), true);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(0, 3)), true);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(0, 9)), true);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(0, 10)), false);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(1, 3)), false);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(3, 22)), true);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(4, 22)), false);
        assert.strictEqual(isWithinMatches(matchMocks, new Position(14, 4)), true);
    });

    test("getSurroundingVar", () => {
        const text = fs.readFileSync(getPathOfWorkspaceFile("variables_test.nc"), "utf8");
        assert.strictEqual(getSurroundingVar(text, new Position(0, 0)), null);
        assert.strictEqual(getSurroundingVar(text, new Position(2, 4)), null);
        assert.strictEqual(getSurroundingVar(text, new Position(8, 1)), null);
        assert.strictEqual(getSurroundingVar(text, new Position(8, 12)), null);
        assert.strictEqual(getSurroundingVar(text, new Position(8, 2)), "V.P.VAR_1");
        assert.strictEqual(getSurroundingVar(text, new Position(10, 3)), "V.P.VAR_2");
        assert.strictEqual(getSurroundingVar(text, new Position(12, 11)), "V.P.VAR_3");
        assert.strictEqual(getSurroundingVar(text, new Position(30, 2)), "V.P.ARRAY_1");
        assert.strictEqual(getSurroundingVar(text, new Position(42, 14)), "V.S.EXAMPLE");
        assert.strictEqual(getSurroundingVar(text, new Position(62, 9)), "V.L.LOC_VAR2");
        assert.strictEqual(getSurroundingVar(text, new Position(86, 11)), "V.CYC.TEST_A");
    });

    test("getSurroundingVar with comments", () => {
        assert.strictEqual(compareLocations(new Position(0, 0), new Position(0, 0)), 0);
        assert.strictEqual(compareLocations(new Position(0, 0), new Position(0, 1)), -1);
        assert.strictEqual(compareLocations(new Position(0, 1), new Position(0, 0)), 1);
        assert.strictEqual(compareLocations(new Position(0, 0), new Position(1, 0)), -1);
        assert.strictEqual(compareLocations(new Position(1, 0), new Position(0, 0)), 1);
        assert.strictEqual(compareLocations(new Position(0, 1), new Position(1, 0)), -1);
        assert.strictEqual(compareLocations(new Position(1, 0), new Position(0, 1)), 1);
    });
});