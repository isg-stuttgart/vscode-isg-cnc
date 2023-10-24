import * as path from 'path';
import * as Mocha from 'mocha';
import { globSync } from 'glob';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd'
    });

    const testsRoot = path.resolve(__dirname, '..');


    return new Promise((c, e) => {

        const testFiles = globSync('**/**.test.js', { cwd: testsRoot });

        // Add files to the test suite
        testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
            // Run the mocha testm
            mocha.run(failures => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}
