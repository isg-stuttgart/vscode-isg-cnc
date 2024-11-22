import * as assert from 'assert';
import { isMatch } from '../../../../server/src/parserClasses';
suite('LS parserClasses', () => {
    test('isMatch', () => {
        assert.strictEqual(isMatch({ type: null, content: "null", location: null, text: "fooo", name: 123 }), true);
        assert.strictEqual(isMatch({ type: null, content: null, location: null, text: null }), false);
        assert.strictEqual(isMatch({ type: null, content: null, location: null, text: null, name: null, extra: null }), true);
    });
});