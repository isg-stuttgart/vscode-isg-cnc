import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import * as fileContentTree from "./util/fileContentTree";
import * as blowfish from "./util/encryption/encryption";
import * as formatter from "./util/formatter";
import { addToIgnore } from "./util/ignoreFileCommands";
import * as statusbar from "./util/statusbar";
import * as fileoffset from "./util/fileoffset";
import { addBlocknumbersCommand, removeAllBlocknumbers } from "./util/blockNumbers";
import { openDocu, openDocuWithId } from "./util/documentation";
import { disposeOutputchannel, printToOutputchannel } from "./util/outputChannel";
import { findAllToolCalls, findNextTFS } from "./util/findTFS";
import { changeLanguageMode } from "./util/config";
import { alignComments, alignEqualSigns } from "./util/aligning";
import { highlightNonAsciiChars } from "./util/nonAsciiCharacters";
//NC-file sidebar tree provider
export let fileContentProvider: fileContentTree.FileContentProvider;
// package.json information
let packageFile;
let extensionPackage;

let extContext: vscode.ExtensionContext;
let client: LanguageClient;

/**
 * This method is called when the extension is activated
 *
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext): void {
    //save the context for dynamical command registeration
    extContext = context;
    // Get package.json informations
    extensionPackage = path.join(context.extensionPath, "package.json");
    packageFile = JSON.parse(fs.readFileSync(extensionPackage, "utf8"));

    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    let serverModule = context.asAbsolutePath(
        path.join('out', 'server', 'src', 'server.js')
    );

    // defining lsp options
    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: 'isg-cnc' }],
        markdown: { isTrusted: true },
    };

    // start the cnc language server
    try {
        client = new LanguageClient("cnc-client", serverOptions, clientOptions);
        client.start();
    } catch (error) {
        console.error(error);
    }

    // code formatter
    vscode.languages.registerDocumentRangeFormattingEditProvider('isg-cnc', new formatter.DocumentRangeFormattingEditProvider());

    //NC-file sidebar tree provider
    fileContentProvider = new fileContentTree.FileContentProvider(extContext);
    vscode.window.createTreeView('cnc-show-filecontent', {
        treeDataProvider: fileContentProvider
    });

    // commands
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindAllToolCalls", () =>
            findAllToolCalls()
        ),
        vscode.commands.registerCommand("isg-cnc.GoToPosition", () =>
            fileoffset.goToPosition()
        ),
        vscode.commands.registerCommand("isg-cnc.ShowCursorFileOffsetInfobox", () =>
            fileoffset.showCursorFileOffsetInfobox()
        ),
        vscode.commands.registerCommand("isg-cnc.FindNextTFS", () =>
            findNextTFS()
        ),
        vscode.commands.registerCommand("isg-cnc.RemoveAllBlocknumbers", () =>
            removeAllBlocknumbers()
        ),
        vscode.commands.registerCommand("isg-cnc.AddBlocknumbers", () =>
            addBlocknumbersCommand()
        ),
        vscode.commands.registerCommand("isg-cnc.StartDocu", () =>
            openDocu()
        ),
        vscode.commands.registerCommand("isg-cnc.openDocuWithId", (id: string) =>
            openDocuWithId(id)
        ),
        vscode.commands.registerCommand("isg-cnc.FindNonAsciiCharacters", () =>
            highlightNonAsciiChars()
        ),
        vscode.commands.registerCommand("isg-cnc.EncryptAnyFile", () =>
            blowfish.encryptFileFromSystem()
        ),
        vscode.commands.registerCommand("isg-cnc.EncryptThis", (inputUri) =>
            blowfish.encryptThis(inputUri)
        ),
        vscode.commands.registerCommand("isg-cnc.AlignEqualSigns", async () =>
            await alignEqualSigns()
        ),
        vscode.commands.registerCommand("isg-cnc.AlignComments", async () =>
            await alignComments()
        ),
        //command which is executed when sidebar-Matchitem is clicked
        vscode.commands.registerCommand("matchItem.selected", async (item: fileContentTree.MatchItem) =>
            await fileContentTree.jumpToMatch(item)
        ),
        vscode.commands.registerCommand("isg-cnc.addToIgnore", async (inputUri) => {
            await addToIgnore(inputUri);
        }),
        vscode.commands.registerCommand("isg-cnc.changeLanguageMode", (inputUri) =>
            changeLanguageMode(inputUri)
        ),
        // commands to switch between multi-line and single-line cycle snippets
        vscode.commands.registerCommand("isg-cnc.changeCycleSnippetsToSingleLine", async () =>
            await vscode.workspace.getConfiguration("isg-cnc").update("cycleSnippetFormatting", "single-line", vscode.ConfigurationTarget.Workspace)
        ),
        vscode.commands.registerCommand("isg-cnc.changeCycleSnippetsToMultiLine", async () =>
            await vscode.workspace.getConfiguration("isg-cnc").update("cycleSnippetFormatting", "multi-line", vscode.ConfigurationTarget.Workspace)
        ),
    );

    //sorting of sidebar content
    vscode.commands.executeCommand('setContext', "vscode-isg-cnc.sidebarSorting", "lineByLine");
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.sortLineByLineOn", () => {
            vscode.commands.executeCommand('setContext', "vscode-isg-cnc.sidebarSorting", "lineByLine");
            fileContentProvider.sorting = fileContentTree.Sorting.lineByLine;
            fileContentProvider.update();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.sortGroupedOn", () => {
            vscode.commands.executeCommand('setContext', "vscode-isg-cnc.sidebarSorting", "grouped");
            fileContentProvider.sorting = fileContentTree.Sorting.grouped;
            fileContentProvider.update();
        })
    );

    // add status bar items and update once at start
    statusbar.addSelectedLinesStatusBarItem(context);
    statusbar.addCurrentOffsetStatusBarItem(context);

    // Output extension name and version number in console and output window ISG-CNC
    if (packageFile) {
        vscode.window.showInformationMessage(
            "Started: " + packageFile.displayName + " V" + packageFile.version
        );
        printToOutputchannel(
            "Started: " + packageFile.displayName + " V" + packageFile.version
        );
    }
}

/**
 * This method is called when the extension is deactivated
 *
 */
export function deactivate(): void {
    printToOutputchannel("Deactivate vscode-isg-cnc extension");
    disposeOutputchannel();
    if (client) {
        client.stop();
    }
}

