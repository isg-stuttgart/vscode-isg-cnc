import * as assert from 'assert';
import { hasMatchProperties } from '../../../../server/src/parserClasses';
suite('LS parserClasses', () => {
    test('isMatch', () => {
        assert.strictEqual(hasMatchProperties({ type: null, content: "null", location: null, text: "fooo", name: 123 }), true);
        assert.strictEqual(hasMatchProperties({ type: null, content: null, location: null, text: null }), false);
        assert.strictEqual(hasMatchProperties({ type: null, content: null, location: null, text: null, name: null, extra: null }), true);
    });
});