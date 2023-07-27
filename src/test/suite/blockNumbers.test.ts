import * as vscode from "vscode";
import { testApplyingCommandToFile } from "./testHelper";
suite("Block Numbers Commands Tests", () => {
    const addedName = "blockNumbers_test_added.nc";
    const removedName = "blockNumbers_test_removed.nc";
    test("Add Block Numbers", async () => {
        testApplyingCommandToFile(removedName, addedName, async () => {
            await vscode.commands.executeCommand("isg-cnc.AddBlockNumbers");
        });
    });
    test("Remove Block Numbers", async () => {
        testApplyingCommandToFile(addedName, removedName, async () => {
            await vscode.commands.executeCommand("isg-cnc.RemoveBlockNumbers");
        });
    });
});
