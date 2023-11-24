import * as vscode from "vscode";
import { testApplyingCommandToFile } from "../testHelper";
import { addBlockNumbers } from "../../../util/blockNumbers";
import * as OS from "os";
suite("Block Numbers Commands Tests", () => {
    const addedNameIncludingComments = "blockNumbers_test_added_includingComments_default.nc";
    const addedNameExcludingComments = "blockNumbers_test_added_excludingComments_default.nc";
    const removedName = "blockNumbers_test_removed.nc";
    const replacedNameIncludingComments = "blockNumbers_test_added_includingComments_replaced.nc";
    const replacedNameExcludingComments = "blockNumbers_test_added_excludingComments_replaced.nc";
    test("Add Block Numbers (exluding comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", false);
        await testApplyingCommandToFile(removedName, addedNameExcludingComments, async () => {
            await addBlockNumbers(10, 10);
        });
        // test if adding twice has the same result
        await testApplyingCommandToFile(removedName, addedNameExcludingComments, async () => {
            await addBlockNumbers(10, 10);
            await addBlockNumbers(10, 10);
        });
    });
    test("Add Block Numbers (including comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", true);
        await testApplyingCommandToFile(removedName, addedNameIncludingComments, async () => {
            await addBlockNumbers(10, 10);
        });
        // test if adding twice has the same result
        await testApplyingCommandToFile(removedName, addedNameIncludingComments, async () => {
            await addBlockNumbers(10, 10);
            await addBlockNumbers(10, 10);
        });
    });
    test("Replace existing Block Numbers (exluding comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", false);
        await testApplyingCommandToFile(addedNameExcludingComments, replacedNameExcludingComments, async () => {
            await insertNewLineInOpenedFile();
            await addBlockNumbers(10, 10);
        });
    });
    test("Replace existing Block Numbers (including comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", true);
        await testApplyingCommandToFile(addedNameIncludingComments, replacedNameIncludingComments, async () => {
            await insertNewLineInOpenedFile();
            await addBlockNumbers(10, 10);
        });
    });
    test("Remove Block Numbers (including comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", true);
        await testApplyingCommandToFile(addedNameIncludingComments, removedName, async () => {
            await vscode.commands.executeCommand("isg-cnc.RemoveAllBlocknumbers");
        });
    });
    test("Remove Block Numbers (excluding comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", false);
        await testApplyingCommandToFile(addedNameExcludingComments, removedName, async () => {
            await vscode.commands.executeCommand("isg-cnc.RemoveAllBlocknumbers");
        });
    });
});

// Helper function to insert a new line with the string "new Line" between the first and second lines of the file
async function insertNewLineInOpenedFile() {
    const editor = vscode.window.activeTextEditor;
    if(editor){
        await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(1,0), "new Line" + OS.EOL);
        });
    }else{
        throw new Error("No opened editor to add a line");
    }
}
