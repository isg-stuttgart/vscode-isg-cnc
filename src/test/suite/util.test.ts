import assert = require("assert");
import { digitCount, isNumeric } from "../../util/util";

suite("Util Tests", async () => {
    test("Test isNumeric", async function () {
        assert.strictEqual(isNumeric(1), true);
        assert.strictEqual(isNumeric(0), true);
        assert.strictEqual(isNumeric(-1), true);
        assert.strictEqual(isNumeric(1.1), true);
        assert.strictEqual(isNumeric(NaN), false);
        assert.strictEqual(isNumeric(Infinity), false);
        assert.strictEqual(isNumeric(-Infinity), false);
    });

    test("Test digitCount", async function () {
        assert.strictEqual(digitCount(1), 1);
        assert.strictEqual(digitCount(0), 1);
        assert.strictEqual(digitCount(-1), 1);
        assert.strictEqual(digitCount(1.1), 1);
        assert.strictEqual(digitCount(10), 2);
        assert.strictEqual(digitCount(100), 3);
        assert.strictEqual(digitCount(3244), 4);
        assert.strictEqual(digitCount(3244.2), 4);
        assert.strictEqual(digitCount(3244.2), 4);
        assert.strictEqual(digitCount(-3244.2), 4);
    });
});