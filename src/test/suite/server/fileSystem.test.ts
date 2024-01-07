import assert = require("assert");
import { WorkspaceIgnorer, findFileInRootDir, findMostSpecificGlobPattern, normalizePath } from "../../../../server/src/fileSystem";
import * as vscode from "vscode";
import { getPathOfWorkspaceFile } from "../testHelper";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";

const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
const ignoreFilePath = path.join(workspacePath, ".isg-cnc-ignore");
const exampleIgnoreFile =
    "languageFolder/nestedFolder/test.nc" + os.EOL +
    "languageFolder/test.nc" + os.EOL;
const oldIgnoreContent: string | undefined = fs.existsSync(ignoreFilePath) ? fs.readFileSync(ignoreFilePath, "utf-8") : undefined;
suite("LS fileSystem", () => {
    // findMostSpecificGlobPattern
    test("Find most specific glob pattern for path (relative)", function () {
        assertCorrectGlobPatterns(false);
    });
    test("Find most specific glob pattern for path (absolute)", function () {
        assertCorrectGlobPatterns(true);
    });

    // findFileInRootDir
    test("Find files in root dir without ignorer", () => {
        assert.deepStrictEqual(findFileInRootDir(workspacePath, "test.nc").sort(), [
            getPathOfWorkspaceFile("test.nc"),
            getPathOfWorkspaceFile("languageFolder/test.nc"),
            getPathOfWorkspaceFile("languageFolder/nestedFolder/test.nc/test.nc"),
        ].sort());

    });
    test("Find files in root dir with ignorer", () => {
        try {
            assert.deepStrictEqual(findFileInRootDir(workspacePath, "test.nc", createWorkspaceIgnorer(exampleIgnoreFile)).sort(), [
                getPathOfWorkspaceFile("test.nc"),
            ].sort());
        } finally {
            resetIgnoreFile();
        }
    });

    // normalizePath
    test('Normalizepath', () => {
        // root will be lower cased on windows
        // check if on windows by using os.platform()
        const root = os.platform() === "win32" ? "c:" : "C:";
        assert.strictEqual(normalizePath('C:/MyFolder/MyFile.txt'), root + path.sep + 'MyFolder' + path.sep + 'MyFile.txt');
        assert.strictEqual(normalizePath('/myfolder/nestedFolder//myfile.txt'), path.sep + 'myfolder' + path.sep + 'nestedFolder' + path.sep + 'myfile.txt');
        assert.strictEqual(normalizePath(''), '.');
    });

    // WorkspaceIgnorer
    test("WorkspaceIgnorer ignores files", () => {
        try {
            const ignorer = createWorkspaceIgnorer(exampleIgnoreFile);
            assert.strictEqual(ignorer.ignores(getPathOfWorkspaceFile("languageFolder/nestedFolder/test.nc")), true);
            assert.strictEqual(ignorer.ignores(getPathOfWorkspaceFile("languageFolder/nestedFolder/test.nc/test.nc")), true);
            assert.strictEqual(ignorer.ignores(getPathOfWorkspaceFile("languageFolder/test.nc")), true);
            assert.strictEqual(ignorer.ignores(getPathOfWorkspaceFile("test.nc")), false);

            resetIgnoreFile();

            const ignorer2 = createWorkspaceIgnorer("languageFolder/nestedFolder/test.nc" + os.EOL + "languageFolder/test.nc" + os.EOL
                + "/*");
            assert.strictEqual(ignorer2.ignores(getPathOfWorkspaceFile("languageFolder/nestedFolder/test.nc")), true);
            assert.strictEqual(ignorer2.ignores(getPathOfWorkspaceFile("languageFolder/nestedFolder/test.nc/test.nc")), true);
            assert.strictEqual(ignorer2.ignores(getPathOfWorkspaceFile("subPrograms.nc")), true);
        } finally {
            resetIgnoreFile();
        }
    });
});

function createWorkspaceIgnorer(ignoreFileContent: string): WorkspaceIgnorer {
    const ignoreFilePath = path.join(workspacePath, ".isg-cnc-ignore");
    fs.writeFileSync(ignoreFilePath, ignoreFileContent);
    return new WorkspaceIgnorer(workspacePath);
}

function assertCorrectGlobPatterns(useAbsolutePath: boolean): void {
    const path = useAbsolutePath ? "C:/path/to/some/file.txt" : "path/to/some/file.txt";
    let patterns = ['**/*.txt', '*.txt', '**/*.csv', 'C:/path/to/some/file.txt', "**/to/some/file.txt", "a/a/a/a/a/a"];
    if (useAbsolutePath) {
        assert.strictEqual(findMostSpecificGlobPattern(path, patterns), "C:/path/to/some/file.txt");
        patterns = patterns.filter((value) => value !== "C:/path/to/some/file.txt");
    }

    assert.strictEqual(findMostSpecificGlobPattern(path, patterns), "**/to/some/file.txt");

    patterns = patterns.filter((value) => value !== "**/to/some/file.txt");
    assert.strictEqual(findMostSpecificGlobPattern(path, patterns), "**/*.txt");

    patterns = patterns.filter((value) => value !== "**/*.txt");
    assert.strictEqual(findMostSpecificGlobPattern(path, patterns), "*.txt");

    patterns = patterns.filter((value) => value !== "*.txt");
    assert.strictEqual(findMostSpecificGlobPattern(path, patterns), undefined);
}

function resetIgnoreFile(): void {
    const ignoreFilePath = path.join(workspacePath, ".isg-cnc-ignore");
    if (oldIgnoreContent) {
        fs.writeFileSync(ignoreFilePath, oldIgnoreContent);
    } else {
        fs.unlinkSync(ignoreFilePath);
    }
}

