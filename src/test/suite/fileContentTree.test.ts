import * as vscode from "vscode";
import { fileContentProvider } from "../../extension";
import { getPathOfWorkspaceFile } from "./testHelper";
import assert = require("assert");
import { MatchItem, MatchLineLabel, MyItem } from "src/util/fileContentTree";
suite("File Content Tree Provider Test", () => {
    test("Correct items sorted by line", async () => {
        // set to line by line sorting
        await vscode.commands.executeCommand("isg-cnc.sortLineByLineOn");

        // open test file
        let root = await openTreeTestFile();

        // check if root is correct
        assert.strictEqual(root.label, "fileContentTree_test.nc");
        assert.strictEqual(root.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        // check if match categories are correct
        const matchCategories = await fileContentProvider.getChildren(root);
        assert.strictEqual(matchCategories.length, 2);
        const toolCallItem = matchCategories[0];
        assert.strictEqual(toolCallItem.label, "Tool Calls");
        assert.strictEqual(toolCallItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        const programCallItem = matchCategories[1];
        assert.strictEqual(programCallItem.label, "Program Calls");
        assert.strictEqual(programCallItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);

        // check if tool call items are correct
        const toolCallItems = await fileContentProvider.getChildren(toolCallItem);
        assert.strictEqual(toolCallItems.length, 3);

        const toolCallItem1: MatchItem = toolCallItems[0] as MatchItem;
        assert.deepStrictEqual(toolCallItem1.matchLineLabel.label, {
            label: "1: T24",
            highlights: [[3, 6]]
        });
        assert.strictEqual(toolCallItem1.collapsibleState, vscode.TreeItemCollapsibleState.None);

        const toolCallItem2: MatchItem = toolCallItems[1] as MatchItem;
        assert.deepStrictEqual(toolCallItem2.matchLineLabel.label, {
            label: "4: foofoofoo T55",
            highlights: [[13, 16]]
        });
        assert.strictEqual(toolCallItem2.collapsibleState, vscode.TreeItemCollapsibleState.None);

        const toolCallItem3: MatchItem = toolCallItems[2] as MatchItem;
        assert.deepStrictEqual(toolCallItem3.matchLineLabel.label, {
            label: "5: T24",
            highlights: [[3, 6]]
        });
        assert.strictEqual(toolCallItem3.collapsibleState, vscode.TreeItemCollapsibleState.None);

        // check if program call items are correct
        const programCallItems = await fileContentProvider.getChildren(programCallItem);
        assert.strictEqual(programCallItems.length, 3);

        const programCallItem1: MatchItem = programCallItems[0] as MatchItem;
        assert.deepStrictEqual(programCallItem1.matchLineLabel.label, {
            label: "7: LL test",
            highlights: [[6, 10]]
        });
        assert.strictEqual(programCallItem1.collapsibleState, vscode.TreeItemCollapsibleState.None);

        const programCallItem2: MatchItem = programCallItems[1] as MatchItem;
        assert.deepStrictEqual(programCallItem2.matchLineLabel.label, {
            label: "8: N55 L test.nc",
            highlights: [[9, 16]]
        });
        assert.strictEqual(programCallItem2.collapsibleState, vscode.TreeItemCollapsibleState.None);

        const programCallItem3: MatchItem = programCallItems[2] as MatchItem;
        assert.deepStrictEqual(programCallItem3.matchLineLabel.label, {
            label: "9: L test.nc",
            highlights: [[5, 12]]
        });
        assert.strictEqual(programCallItem3.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test("Correct items sorted by group", async () => {
        // set to line by line sorting
        await vscode.commands.executeCommand("isg-cnc.sortGroupedOn");

        // open test file
        let root = await openTreeTestFile();

        // check if root is correct
        assert.strictEqual(root.label, "fileContentTree_test.nc");
        assert.strictEqual(root.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        // check if match categories are correct
        const matchCategories = await fileContentProvider.getChildren(root);
        assert.strictEqual(matchCategories.length, 2);
        const toolCallItem = matchCategories[0];
        assert.strictEqual(toolCallItem.label, "Tool Calls");
        assert.strictEqual(toolCallItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        const programCallItem = matchCategories[1];
        assert.strictEqual(programCallItem.label, "Program Calls");
        assert.strictEqual(programCallItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);

        // check if tool call items are correct
        const toolCallGroups = await fileContentProvider.getChildren(toolCallItem);
        assert.strictEqual(toolCallGroups.length, 2);
        // t24 group
        const t24Group = toolCallGroups[0];
        assert.strictEqual(t24Group.label, "T24");
        assert.strictEqual(t24Group.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        const t24GroupItems = await fileContentProvider.getChildren(t24Group);
        assert.strictEqual(t24GroupItems.length, 2);
        const t24GroupItem1: MatchItem = t24GroupItems[0] as MatchItem;
        assert.deepStrictEqual(t24GroupItem1.matchLineLabel.label, {
            label: "1: T24",
            highlights: [[3, 6]]
        });
        assert.strictEqual(t24GroupItem1.collapsibleState, vscode.TreeItemCollapsibleState.None);
        const t24GroupItem2: MatchItem = t24GroupItems[1] as MatchItem;
        assert.deepStrictEqual(t24GroupItem2.matchLineLabel.label, {
            label: "5: T24",
            highlights: [[3, 6]]
        });
        assert.strictEqual(t24GroupItem2.collapsibleState, vscode.TreeItemCollapsibleState.None);
        // t55 group
        const t55Group = toolCallGroups[1];
        assert.strictEqual(t55Group.label, "T55");
        assert.strictEqual(t55Group.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        const t55GroupItems = await fileContentProvider.getChildren(t55Group);
        assert.strictEqual(t55GroupItems.length, 1);
        const t55GroupItem1: MatchItem = t55GroupItems[0] as MatchItem;
        assert.deepStrictEqual(t55GroupItem1.matchLineLabel.label, {
            label: "4: foofoofoo T55",
            highlights: [[13, 16]]
        });
        assert.strictEqual(t55GroupItem1.collapsibleState, vscode.TreeItemCollapsibleState.None);

        // check if program call items are correct
        const programCallGroups = await fileContentProvider.getChildren(programCallItem);
        assert.strictEqual(programCallGroups.length, 2);
        // test group
        const testGroup = programCallGroups[0];
        assert.strictEqual(testGroup.label, "test");
        assert.strictEqual(testGroup.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        const testGroupItems = await fileContentProvider.getChildren(testGroup);
        assert.strictEqual(testGroupItems.length, 1);
        const testGroupItem1: MatchItem = testGroupItems[0] as MatchItem;
        assert.deepStrictEqual(testGroupItem1.matchLineLabel.label, {
            label: "7: LL test",
            highlights: [[6, 10]]
        });
        assert.strictEqual(testGroupItem1.collapsibleState, vscode.TreeItemCollapsibleState.None);
        // test.nc group
        const testncGroup = programCallGroups[1];
        assert.strictEqual(testncGroup.label, "test.nc");
        assert.strictEqual(testncGroup.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        const testncGroupItems = await fileContentProvider.getChildren(testncGroup);
        assert.strictEqual(testncGroupItems.length, 2);
        const testncGroupItem1: MatchItem = testncGroupItems[0] as MatchItem;
        assert.deepStrictEqual(testncGroupItem1.matchLineLabel.label, {
            label: "8: N55 L test.nc",
            highlights: [[9, 16]]
        });
        assert.strictEqual(testncGroupItem1.collapsibleState, vscode.TreeItemCollapsibleState.None);
        const testncGroupItem2: MatchItem = testncGroupItems[1] as MatchItem;
        assert.deepStrictEqual(testncGroupItem2.matchLineLabel.label, {
            label: "9: L test.nc",
            highlights: [[5, 12]]
        });
        assert.strictEqual(testncGroupItem2.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test("Correct command execution when clicking on item", async () => {
        // set to line by line sorting
        await vscode.commands.executeCommand("isg-cnc.sortLineByLineOn");

        // open test file
        let root = await openTreeTestFile();

        // get test tool item
        const matchCategories = await fileContentProvider.getChildren(root);
        const toolCalls = await fileContentProvider.getChildren(matchCategories[0]);
        const testToolCallItems = toolCalls[1] as vscode.TreeItem;

        // execute command of item
        await vscode.commands.executeCommand(testToolCallItems?.command?.command as string, testToolCallItems?.command?.arguments);
        // check if cursor is at correct position
        //assert.deepStrictEqual(vscode.window.activeTextEditor?.selection, new vscode.Selection(4, 11, 4, 11));

        // get test program item
        const programCalls = await fileContentProvider.getChildren(matchCategories[1]);
        const testProgramCallItems = programCalls[1] as vscode.TreeItem;

        // execute command of item
        await vscode.commands.executeCommand(testProgramCallItems?.command?.command as string, testProgramCallItems?.command?.arguments);
        // check if cursor is at correct position
        //assert.deepStrictEqual(vscode.window.activeTextEditor?.selection, new vscode.Selection(8, 7, 8, 7));
    });
});

async function openTreeTestFile() {
    const testFile = vscode.Uri.file(getPathOfWorkspaceFile("fileContentTree_test.nc"));
    await vscode.workspace.openTextDocument(testFile);
    await vscode.window.showTextDocument(testFile);
    // wait until tree is loaded
    let root = (await fileContentProvider.getChildren())[0];
    while (root.label === "Loading..." || root.label === "There is no currently opened file" || root.label === "The currently opened file is no NC-file") {
        await new Promise((resolve) => setTimeout(resolve, 100));
        root = (await fileContentProvider.getChildren())[0];
    }
    return root;
}
