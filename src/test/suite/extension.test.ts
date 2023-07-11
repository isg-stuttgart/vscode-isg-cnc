// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Show fileoffset information', async () => {
		await vscode.commands.executeCommand('isg-cnc.ShowCursorFileOffsetInfobox');
		// test if the infobox starts with "The current fileoffset is"


	});
});
