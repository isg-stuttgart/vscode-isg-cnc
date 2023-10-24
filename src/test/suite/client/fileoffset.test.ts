import assert = require("assert");
import { openTestFile } from "../testHelper";
import { getCurrentFileOffset, setCursorPosition, showCursorFileOffsetInfobox } from "../../../util/fileoffset";

suite("File Offset Test", () => {
    test("Set/get fileoffset", async () => {
        await openTestFile("test.nc");
        setCursorPosition(100);
        assert.strictEqual(getCurrentFileOffset(), 100);
        showCursorFileOffsetInfobox();
    });
});