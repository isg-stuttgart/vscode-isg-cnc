import * as assert from 'assert';
import { getISGCNCOutputChannel } from '../../../util/outputChannel';

// only few tests because vscode API gives no access on reading information from output channel
suite('Output Channel Tests', () => {
    test('printToOutputchannel should append text to the output channel', () => {
        const outputChannel = getISGCNCOutputChannel();
        assert.strictEqual(outputChannel.name, 'ISG-CNC');
    });
});

