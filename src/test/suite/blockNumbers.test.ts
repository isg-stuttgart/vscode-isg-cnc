import * as vscode from "vscode";
import { testApplyingCommandToFile } from "./testHelper";
import { addBlockNumbers } from "../../util/blockNumbers";
suite("Block Numbers Commands Tests", () => {
    const addedName = "blockNumbers_test_added.nc";
    const removedName = "blockNumbers_test_removed.nc";
    test("Add Block Numbers", async () => {
        await testApplyingCommandToFile(removedName, addedName, async () => {
            await addBlockNumbers(10, 10);
        });
    });
    test("Remove Block Numbers", async () => {
        await testApplyingCommandToFile(addedName, removedName, async () => {
            await vscode.commands.executeCommand("isg-cnc.RemoveAllBlocknumbers");
        });
    });
});
