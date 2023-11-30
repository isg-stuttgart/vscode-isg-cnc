import * as assert from "assert";
import { getDefType, getRefTypes } from "../../../../server/src/matchTypes";
import { MatchType } from "../../../../server/src/parserClasses";
import { MatchMock } from "../testHelper";

suite("LS matchTypes", () => {
    test("getDefTypes", () => {
        // program calls
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.localPrgCallName)), { defType: MatchType.localSubPrg, local: true });
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.localCycleCallName)), { defType: MatchType.localSubPrg, local: true });
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.globalCycleCallName)), { defType: MatchType.globalCycleCall, local: false });
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.globalPrgCallName)), { defType: MatchType.globalPrgCall, local: false });
        // goto statements
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.gotoLabel)), { defType: MatchType.label, local: true });
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.gotoBlocknumber)), { defType: MatchType.blockNumberLabel, local: true });
        //variables
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.variable)), { defType: MatchType.varDeclaration, local: true });
        // default
        assert.deepStrictEqual(getDefType(new MatchMock(MatchType.comment)), { defType: null, local: true });
    });

    test("getRefTypes", () => {
        // global program calls
        const expectedGlobalPrgRefTypes = { refTypes: [MatchType.globalCycleCallName, MatchType.globalPrgCallName].sort(), local: false };
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.globalCycleCallName)), expectedGlobalPrgRefTypes);
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.globalPrgCallName)), expectedGlobalPrgRefTypes);
        // local program calls
        const expectedLocalPrgRefTypes = { refTypes: [MatchType.localCycleCallName, MatchType.localPrgCallName].sort(), local: true };
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.localPrgCallName)), expectedLocalPrgRefTypes);
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.localCycleCallName)), expectedLocalPrgRefTypes);
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.localPrgDefinitionName)), expectedLocalPrgRefTypes);
        // goto label
        const expectedGotoLabelRefTypes = { refTypes: [MatchType.gotoLabel].sort(), local: true };
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.gotoLabel)), expectedGotoLabelRefTypes);
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.label)), expectedGotoLabelRefTypes);
        // goto blocknumber
        const expectedGotoBlocknumberRefTypes = { refTypes: [MatchType.gotoBlocknumber].sort(), local: true };
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.gotoBlocknumber)), expectedGotoBlocknumberRefTypes);
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.blockNumberLabel)), expectedGotoBlocknumberRefTypes);
        // variables
        const expectedVariableRefTypes = { refTypes: [MatchType.variable].sort(), local: true };
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.variable)), expectedVariableRefTypes);
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.varDeclaration)), expectedVariableRefTypes);
        // default
        const expectedDefaultRefTypes = { refTypes: [], local: true };
        assert.deepStrictEqual(getRefTypesSorted(new MatchMock(MatchType.comment)), expectedDefaultRefTypes);
    });
});


function getRefTypesSorted(match: MatchMock): { refTypes: MatchType[], local: boolean } {
    const result = getRefTypes(match);
    result.refTypes.sort();
    return result;
}

