import * as path from 'path';

import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');
		// Download VS Code, unzip it and run the integration test
		const workspacePath = path.resolve(__dirname, "../../../src/test/res");
		console.log("Starting Download of vscode.............");
		const vscodeExecutablePath = await downloadAndUnzipVSCode();
		console.log("Download of vscode completed.............");
		console.log("Starting tests.............");
		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				workspacePath,
				'--skip-welcome',
				'--disable-extensions',
				'--skip-release-notes'
			]
		});
		console.log("Tests completed.............");
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

main();
