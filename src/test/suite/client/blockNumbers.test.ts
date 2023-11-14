import * as vscode from "vscode";
import { testApplyingCommandToFile } from "../testHelper";
import { addBlockNumbers, removeAllBlocknumbers } from "../../../util/blockNumbers";
suite("Block Numbers Commands Tests", () => {
    const addedNameIncludingComments = "blockNumbers_test_added_includingComments.nc";
    const addedNameExcludingComments = "blockNumbers_test_added_excludingComments.nc";
    const removedName = "blockNumbers_test_removed.nc";
    test("Add Block Numbers (exluding comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", false);
        await testApplyingCommandToFile(removedName, addedNameExcludingComments, async () => {
            await addBlockNumbers(10, 10);
        });
    });
    test("Add Block Numbers (including comments)", async () => {
        await vscode.workspace.getConfiguration().update("isg-cnc.includeCommentsInNumbering", true);
        await testApplyingCommandToFile(removedName, addedNameIncludingComments, async () => {
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
