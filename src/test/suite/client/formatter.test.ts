import * as vscode from "vscode";
import { getPathOfWorkspaceFile, testApplyingCommandToFile } from "../testHelper";
import { } from "../../../util/formatter";

suite("Formatter Test", () => {
    const unformattedName = "formatter_test_unformatted.nc";
    const formattedName = "formatter_test_formatted.nc";
    const unformattedPath = getPathOfWorkspaceFile(unformattedName);
    const formattedPath = getPathOfWorkspaceFile(formattedName);
    test("Formatting file with different indentings", async () => {
        await testApplyingCommandToFile(unformattedName, formattedName, async () => {
            await formatDocument(unformattedPath);
        });
    });

    test("Formatting already formatted file changes nothing", async () => {
        await testApplyingCommandToFile(formattedName, formattedName, async () => {
            await formatDocument(formattedPath);
        });
    });
});

async function formatDocument(path: string) {
    const formattingOptions = {
        tabSize: 2,
        insertSpaces: true,
    };

    const textEdits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        "vscode.executeFormatDocumentProvider",
        vscode.Uri.file(path),
        formattingOptions
    );

    const editor = vscode.window.activeTextEditor;
    if (!editor || !textEdits) {
        throw new Error("Could not format document");
    }

    await editor.edit(editBuilder => {
        textEdits.forEach(textEdit => {
            editBuilder.replace(textEdit.range, textEdit.newText);
        });
    });
}