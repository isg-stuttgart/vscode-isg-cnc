import * as vscode from "vscode";
import { getPathOfWorkspaceFile, assertApplyingCommandToFile } from "../testHelper";

suite("Formatter Test", () => {
    const unformattedName = "formatter_test_unformatted.nc";
    const formattedName = "formatter_test_formatted.nc";
    const unformattedPath = getPathOfWorkspaceFile(unformattedName);
    const formattedPath = getPathOfWorkspaceFile(formattedName);
    test("Formatting file with different indentings", async () => {
        await assertApplyingCommandToFile(unformattedName, formattedName, async () => {
            await formatDocument(unformattedPath);
        });
    });

    test("Formatting already formatted file changes nothing", async () => {
        await assertApplyingCommandToFile(formattedName, formattedName, async () => {
            await formatDocument(formattedPath);
        });
    });
});

async function formatDocument(path: string) {
    const formattingOptions = {
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false
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