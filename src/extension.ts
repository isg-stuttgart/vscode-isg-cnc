// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as Path from "path";
import * as vscode from "vscode";
import * as fileContentTree from "./util/FileContentTree";
import { config } from "./util/config";
import * as blowfish from "./util/encryption/encryption";
import * as parser from "../server/src/parsingResults";
import * as Formatter from "./util/Formatter";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import { includeInIgnore } from "./util/ignoreFileCommands";
import path = require("path");

let language: string;
let docuPath: string;

/** Outputchannel for the extension
 */
const outputChannel = vscode.window.createOutputChannel("ISG-CNC");
/** Decorator/
// create a decorator type that we use to decorate non ascii characters
let timeout: NodeJS.Timer | undefined = undefined;
 */
// create a decorator type that we use to decorate non ascii characters
let timeout: NodeJS.Timer | undefined = undefined;
const nonAsciiCharacterDecorationType = vscode.window.createTextEditorDecorationType(
    {
        borderWidth: "2px",
        borderStyle: "solid",
        overviewRulerColor: "red",
        borderColor: "red",
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            // this color will be used in light color themes
            backgroundColor: "orangered",
        },
        dark: {
            // this color will be used in dark color themes
            backgroundColor: "lightcoral",
        },
    }
);

/**
 * Statusbar items
 */
let selectedLinesStatusBarItem: vscode.StatusBarItem;
let currentOffsetStatusBarItem: vscode.StatusBarItem;

//NC-file sidebar tree provider
let fileContentProvider: fileContentTree.FileContentProvider;

// package.json information
let packageFile;
let extensionPackage;

let extContext: vscode.ExtensionContext;
// Regular expression variables
// Technology regex for too, feed, spindle rpm
const regExTechnology = new RegExp("([TFS])([0-9]+)");
// Blocknumber regex
const regExpLabels = new RegExp(/(\s?)N[0-9]*:{1}(\s?)|\[.*\]:{1}/);

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
    extensionPackage = Path.join(context.extensionPath, "package.json");
    packageFile = JSON.parse(fs.readFileSync(extensionPackage, "utf8"));

    //get config params in module scope lets
    updateConfig();

    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    let serverModule = context.asAbsolutePath(
        Path.join('server', 'out', 'server.js')
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
        documentSelector: [{ language: 'isg-cnc' }]
    };

    // start the cnc language server
    client = new LanguageClient("cnc-client", serverOptions, clientOptions);
    client.start();

    // 👍 formatter implemented using API
    vscode.languages.registerDocumentRangeFormattingEditProvider('isg-cnc', new Formatter.DocumentRangeFormattingEditProvider());

    vscode.workspace.onDidChangeConfiguration(() => {
        updateConfig();
    });

    //NC-file sidebar tree provider
    fileContentProvider = new fileContentTree.FileContentProvider(extContext);


    // commands
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindAllToolCalls", () =>
            findAllToolCalls()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.GoToPosition", () =>
            goToPosition()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.ShowCursorFileOffsetInfobox", () =>
            showCursorFileOffsetInfobox()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindNextTFS", () => findNextTFS())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.RemoveAllBlocknumbers", () =>
            removeAllBlocknumbers()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.AddBlocknumbers", () =>
            addBlocknumbers()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.StartDocu", () => startDocu())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindNonAsciiCharacters", () =>
            findNonAsciiCharacters()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.EncryptAnyFile", () =>
            blowfish.encryptFileFromSystem()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.DecryptAnyFile", () =>
            blowfish.decryptFileFromSystem()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.EncryptThis", (inputUri) =>
            blowfish.encryptThis(inputUri)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.DecryptThis", (inputUri) =>
            blowfish.decryptThis(inputUri)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.AlignEqualSigns", () => alignEqualSign())
    );
    //command which is executed when sidebar-Matchitem is clicked
    context.subscriptions.push(
        vscode.commands.registerCommand("matchItem.selected", (item: fileContentTree.MatchItem) => fileContentTree.jumpToMatch(item))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.addToIgnore", (inputUri) => includeInIgnore(inputUri))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.changeLanguageMode", (inputUri) => changeLanguageMode(inputUri))
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

    // add status bar items
    addSelectedLinesStatusBarItem(context);
    addCurrentOffsetStatusBarItem(context);

    // update status bar items once at start
    updateSelectedLinesStatusBarItem();
    updateCurrentOffsetStatusBarItem();

    /** Decorator
     */
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
        triggerUpdateDecorations();
    }

    // Output extension name and version number in console and output window ISG-CNC
    if (packageFile) {
        vscode.window.showInformationMessage(
            "Started: " + packageFile.displayName + " V" + packageFile.version
        );
        outputChannel.appendLine(
            "Started: " + packageFile.displayName + " V" + packageFile.version
        );
    }
}

/**
 * Find next technology in cnc file.
 * T, F, S commands will be detected.
 *
 * @returns {boolean}
 */
function findNextTFS(): boolean {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const startposition = activeTextEditor.selection.active;
            const endposition = document.positionAt(
                document.offsetAt(
                    new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
                )
            );
            const textToMatch = document.getText(
                new vscode.Range(startposition, endposition)
            );

            const match = regExTechnology.exec(textToMatch);
            if (match !== null) {
                const startoffset = match.index + document.offsetAt(startposition);
                setCursorPosition(startoffset);
                const startPos = document.positionAt(startoffset);
                const endPos = document.positionAt(startoffset + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                activeTextEditor.selection = new vscode.Selection(
                    range.start,
                    range.end
                );
                activeTextEditor.revealRange(
                    range,
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport
                );
                return true;
            }
        }
    }
    return false;
}

/**
 * Add statusbar item for selected lines to the statusbar.
 *
 * @param {vscode.ExtensionContext} context
 */
function addSelectedLinesStatusBarItem(context: vscode.ExtensionContext) {
    // register a command that is invoked when the status bar
    // item is selected
    const myCommandId = "isg-cnc.ShowSelectedLinesCount";

    context.subscriptions.push(
        vscode.commands.registerCommand(myCommandId, () => {
            const n = getNumberOfSelectedLines();
            vscode.window.showInformationMessage(`${n} line(s) are selected.`);
        })
    );

    // create a new status bar item that we can now manage
    selectedLinesStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    selectedLinesStatusBarItem.command = myCommandId;
    context.subscriptions.push(selectedLinesStatusBarItem);

    // register some listener that make sure the status bar 
    // item and the sidebar always up-to-date

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(activeTextEditorChanged)
    );
    // refresh status bar and current open file once at start
    activeTextEditorChanged();

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            updateSelectedLinesStatusBarItem
        )
    );
}

/**
 * Updates the config parameters saved in the module-scoped lets and settings.
 */
function updateConfig() {
    language = config.getParam("locale");
    docuPath = config.getParam("documentation").split('"').join("").split('\\').join('/');


    // enable/disable outputchannel
    if (config.getParam("outputchannel")) {
        outputChannel.show();
    } else {
        outputChannel.hide();
    }
}

/**
 * Will be called by onDidChangeActiveTextEditor-Listener.
 * Updates the file-content-treeview and the selected
 * status bar lines.
 */
function activeTextEditorChanged() {
    //Tree view
    try {
        fileContentProvider.update();
    } catch (e: any) {
        vscode.window.showErrorMessage(e);
    }

    //Status Bar
    updateSelectedLinesStatusBarItem();
}

/**
 * Update statusbar item for selected lines.
 * Hide item when no lines are selected.
 *
 */
function updateSelectedLinesStatusBarItem(): void {
    const n = getNumberOfSelectedLines();
    if (n > 0) {
        selectedLinesStatusBarItem.text = `$(megaphone) ${n} line(s) selected`;
        selectedLinesStatusBarItem.show();
    } else {
        selectedLinesStatusBarItem.hide();
    }
}

/**
 * Add a statusbar item for fileoffset to the statusbar
 *
 * @param {vscode.ExtensionContext} context
 */
function addCurrentOffsetStatusBarItem(context: vscode.ExtensionContext) {
    // register a command that is invoked when the status bar
    // fileoffset of the cursor

    // create a new status bar item that we can now manage
    currentOffsetStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    currentOffsetStatusBarItem.command = "isg-cnc.GoToPosition";
    context.subscriptions.push(currentOffsetStatusBarItem);

    // register some listener that make sure the status bar
    // item always up-to-date
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateCurrentOffsetStatusBarItem)
    );
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            updateCurrentOffsetStatusBarItem
        )
    );
}

/**
 * Opens a infobox with current fileoffset and max fileoffset.
 *
 */
function showCursorFileOffsetInfobox() {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const maxOffset = document.offsetAt(
                new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            );
            const n = getCurrentFileOffset();
            vscode.window.showInformationMessage(
                `The current fileoffset is ${n} from ${maxOffset}.`
            );
        }
    }
}

/**
 * Update the status bar item for fileoffset.
 *
 */
function updateCurrentOffsetStatusBarItem(): void {
    const n = getCurrentFileOffset();
    currentOffsetStatusBarItem.text = `$(arrow-right) Fileoffset: ${n}`;
    currentOffsetStatusBarItem.show();
}

/**
 * Get the current fileoffset of the cursor.
 *
 * @returns {number}
 */
function getCurrentFileOffset(): number {
    // get current file offset position of the caret
    let offset = 0;
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            offset = document.offsetAt(activeTextEditor.selection.active);
        }
    }
    return offset;
}

/**
 * Get position from user and go to position.
 *
 * @returns {Promise<void>}
 */
async function goToPosition(): Promise<void> {
    // move cursor to file offset
    let maxOffset = 0;
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const cursorOffset = document.offsetAt(activeTextEditor.selection.active);
            maxOffset = document.offsetAt(
                new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            );

            await vscode.window
                .showInputBox({
                    prompt: `Type an offset number from 0 to ${maxOffset}.`,
                    validateInput: (input: string) => {
                        if (!isNumeric(parseFloat(String(input)))) {
                            return undefined;
                        }
                    },
                    value: String(cursorOffset),
                })
                .then((input?: string) => {
                    if (input) {
                        setCursorPosition(parseFloat(String(input)));
                    } else {
                        setCursorPosition(cursorOffset);
                    }
                });
        }
    }
}

/**
 * Set the cursor to position. Scroll the view to the position.
 *
 * @param {number} pos
 */
export function setCursorPosition(pos: number) {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const newPosition = document.positionAt(pos);
            activeTextEditor.selection = new vscode.Selection(
                newPosition,
                newPosition
            );
            reveal();
            updateCurrentOffsetStatusBarItem();
        }
    }
}

/**
 * Get number of selected lines and returns the count.
 *
 * @returns {number}
 */
function getNumberOfSelectedLines(): number {
    // get number of selected lines
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        return activeTextEditor.selections.reduce(
            (prev: number, curr: { end: { line: number; }; start: { line: number; }; }) => prev + (curr.end.line - curr.start.line),
            0
        );
    }
    return 0;
}

/**
 * Check if selection is in view. Scroll selection to view.
 *
 * @param {vscode.TextEditorRevealType} [revealType]
 */
function reveal(revealType?: vscode.TextEditorRevealType): void {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        revealType =
            revealType || vscode.TextEditorRevealType.InCenterIfOutsideViewport;
        activeTextEditor.revealRange(activeTextEditor.selection, revealType);
    }
}

/**
 * Check the value is numeric
 * Returns true or false.
 *
 * @param {*} n
 * @returns
 */
function isNumeric(n: number) {
    return !isNaN(n) && isFinite(n);
}

/**
 * Remove all block numbers
 *
 */
function removeAllBlocknumbers() {
    const textEdits: vscode.TextEdit[] = [];
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            let linesToBlocknumberMap;
            try {
                linesToBlocknumberMap = parser.getLineToBlockNumberMap(document.getText());
            } catch (error) {
                vscode.window.showErrorMessage("Canceled removing blocknumbers: " + JSON.stringify(error));
                return;
            }

            // edit document line by line
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);
                const matchLabel = regExpLabels.exec(line.text);
                const blockNumber: parser.Match | undefined = linesToBlocknumberMap.get(ln);
                if (blockNumber !== undefined) {
                    let gotoPos = line.text.indexOf("$GOTO");
                    const startPos = document.offsetAt(
                        new vscode.Position(ln, blockNumber.location.start.column - 1)
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, blockNumber.location.end.column - 1)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    // if label found and blocknumber are the same -> skip deleting
                    if (matchLabel !== null && ((gotoPos === -1) || (line.text.indexOf(matchLabel[0]) < gotoPos)) && line.text.indexOf(matchLabel[0].trim()) === blockNumber.location.start.column - 1) {
                        continue;
                    }

                    textEdits.push(vscode.TextEdit.replace(range, ""));
                }
            }
        }
        const workEdits = new vscode.WorkspaceEdit();
        workEdits.set(document.uri, textEdits); // give the edits
        vscode.workspace.applyEdit(workEdits); // apply the edits
    }
}


/**
 * Add new block numbers. You can input start block number and the stepsize in a input box.
 * Returns undefinded when somethings wrong.
 *
 * @returns
 */
async function addBlocknumbers() {
    let start = 10;
    let step = 10;
    let blocknumber = start;
    const textEdits: vscode.TextEdit[] = [];
    const { activeTextEditor } = vscode.window;

    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            // get start number
            let inputOptions: vscode.InputBoxOptions = {
                prompt: `Type an start number.`,
                validateInput: (input: string) => {
                    if (!isNumeric(parseInt(input, 10))) {
                        return undefined;
                    }
                },
                value: start.toString(),
            };
            await vscode.window.showInputBox(inputOptions).then((input?: string) => {
                if (input !== undefined) {
                    start = parseInt(input, 10);
                    blocknumber = start;
                } else {
                    start = -1;
                }
            });

            // check operation is canceled with esc then return
            if (start === -1) {
                return undefined;
            }

            // get step size
            inputOptions = {
                prompt: `Type an step size.`,
                validateInput: (input: string) => {
                    if (!isNumeric(parseInt(input, 10))) {
                        return undefined;
                    }
                    return;
                },
                value: step.toString(),
            };
            await vscode.window.showInputBox(inputOptions).then((input?: string) => {
                if (input !== undefined) {
                    step = parseInt(input, 10);
                } else {
                    step = -1;
                }
            });

            // check operation is canceled with esc then return
            if (step === -1) {
                return undefined;
            }

            const linesToNumber: Array<number> = parser.getNumberableLines(document.getText());

            const skipLineBeginIndexes: Map<number, number> = new Map();
            let skipBlocks;
            try {
                skipBlocks = parser.getSyntaxArray(document.getText()).skipBlocks;
            } catch (error) {
                vscode.window.showErrorMessage("Canceled adding blocknumbers: " + JSON.stringify(error));
                return;
            }
            skipBlocks.forEach((match) => {
                skipLineBeginIndexes.set(match.location.start.line, match.location.start.column);
            });

            let linesToBlocknumberMap;
            try {
                linesToBlocknumberMap = parser.getLineToBlockNumberMap(document.getText());
            } catch (error) {
                vscode.window.showErrorMessage("Canceled adding blocknumbers: " + JSON.stringify(error));
                return;
            }
            // add new blocknumbers
            const maximalLeadingZeros = digitCount(start + linesToNumber.length * step);

            for (let ln of linesToNumber) {
                const line = document.lineAt(ln);
                // generate blocknumber
                const block =
                    "N" + blocknumber.toString().padStart(maximalLeadingZeros, "0");
                let oldBlockNumber: undefined | parser.Match = linesToBlocknumberMap.get(line.lineNumber);
                let insert: boolean = false;
                // add or replace blocknumber
                const matchLabel = regExpLabels.exec(line.text);
                if (oldBlockNumber !== undefined) {
                    let gotoPos = line.text.indexOf("$GOTO");
                    const startPos = document.offsetAt(
                        new vscode.Position(oldBlockNumber.location.start.line - 1, oldBlockNumber.location.start.column - 1)
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(oldBlockNumber.location.end.line - 1, oldBlockNumber.location.end.column - 1)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    if (matchLabel !== null
                        && ((gotoPos === -1) || (line.text.indexOf(matchLabel[0]) < gotoPos))
                        && (line.text.indexOf(matchLabel[0].trim()) === (oldBlockNumber.location.start.column - 1))) {
                        // if blocknumber and label the same insert a new blocknumber
                        insert = true;
                    } else {
                        // jump to label found
                        textEdits.push(vscode.TextEdit.replace(range, block));
                    }
                } else {
                    insert = true;
                }
                if (insert) {
                    let insertIndex: number;
                    const skipLineBegin: number | undefined = skipLineBeginIndexes.get(line.lineNumber + 1);
                    if (skipLineBegin !== undefined) { //parser is 1 based
                        insertIndex = skipLineBegin;
                    } else {
                        insertIndex = line.range.start.character;
                    }
                    textEdits.push(
                        vscode.TextEdit.insert(
                            new vscode.Position(line.lineNumber, insertIndex),
                            block + " "
                        )
                    );
                }
                blocknumber += step;
            }
        }
        const workEdits = new vscode.WorkspaceEdit();
        workEdits.set(document.uri, textEdits); // give the edits
        vscode.workspace.applyEdit(workEdits); // apply the edits
    }
}

/**
 * Counts the number of digits of a number and return the count.
 *
 * @param {number} nr
 * @returns {number}
 */
function digitCount(nr: number): number {
    let digitCount = 0;
    do {
        nr /= 10;
        digitCount++;
    } while (nr >= 1);
    return digitCount;
}

/**
 *Load the ISG-CNC Kernel html documentation in default webbrowser.
 */
function startDocu() {
    const docuAddress = getContextbasedSite();
    outputChannel.appendLine(docuAddress);

    outputChannel.appendLine(`Path to the documentation: ${docuPath}`);
    outputChannel.appendLine(`Address to the website: ${docuAddress}`);

    vscode.env.openExternal(vscode.Uri.parse(docuAddress));
}

/**
 * Function to build the Address to the documentation.
 * Standard web Address is: https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/de-DE/index.html
 * Additional read the language from extension settings and the documentation path (local or web)
 * Returns the combined Address string.
 *
 * @returns {string}
 */
function getContextbasedSite(): string {
    let localeDocuPath: string = docuPath;
    let docuAddress: string = "";
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            if (localeDocuPath !== undefined && localeDocuPath !== "") {
                if (!localeDocuPath.endsWith('/')) {
                    localeDocuPath += "/" + `${language}/`;
                } else {
                    localeDocuPath += `${language}/`;
                }
            } else {
                localeDocuPath = `https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/${language}/`;
            }
            //IMPORTANT: THE FOLLOWING BLOCK IS FOR OPEN DOCU WITH SELECTED SEARCHING KEYWORD
            //THE WEBSITE IS BROKEN AT THE MOMENT SO IT WILL JUST LOAD THE GENERAL DOCU WEBSITE
            //UNCOMMENT IF THE WEBSITE WAS FIXES AND DELETE THE ASSIGNMENT UNDER THE COMMENT:
            //  "docuAddress = localeDocuPath + "index.html";"
            /*  if (!activeTextEditor.selection.isEmpty) {
                 searchContext = activeTextEditor.document.getText(
                     activeTextEditor.selection
                 );
                 const query = new URLSearchParams();
                 query.append("q", searchContext);
                 docuAddress = localeDocuPath + `search.html?${query.toString()}`;
             } else {
                  docuAddress = localeDocuPath + "index.html";
             } */
            docuAddress = localeDocuPath + "index.html";

        }
    }
    return docuAddress;
}

/**
 * This method is called when the extension is deactivated
 *
 */
export function deactivate(): void {
    outputChannel.appendLine("Close vscode-isg-cnc");
    outputChannel.dispose();

    if (client) {
        client.stop();
    }
}

export function findNonAsciiCharacters(): void {
    updateDecorations();
}

function updateDecorations() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    // eslint-disable-next-line no-control-regex
    const regEx = /[^\x00-\x7F]+/gm;
    const text = activeEditor.document.getText();
    const nonAsciiCharacters: vscode.DecorationOptions[] = [];
    let message: string;
    let match;
    while ((match = regEx.exec(text))) {
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(
            match.index + match[0].length
        );
        const decoration = {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: "non ASCII Character **" + match[0] + "**",
        };
        nonAsciiCharacters.push(decoration);
    }
    activeEditor.setDecorations(
        nonAsciiCharacterDecorationType,
        nonAsciiCharacters
    );
    for (const nonAsciiChar of nonAsciiCharacters) {
        const ln = nonAsciiChar.range.end.line + 1;
        message = "Line: " + ln + " " + nonAsciiChar.hoverMessage;
        outputChannel.appendLine(message);
    }
}

function triggerUpdateDecorations() {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    timeout = setTimeout(updateDecorations, 50);
}

function findAllToolCalls(): any {
    let params = {
        query: "[^a-zA-Z0-9](T[0-9]+)",
        triggerSearch: true,
        isRegex: true,
        isCaseSensitive: true,
    };
    vscode.commands.executeCommand('workbench.action.findInFiles', params);
}

/**
 * Aligns the first equal signs in the current editor selection below each other.
 */
function alignEqualSign(): void {
    const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    if (editor && editor.document) {
        const selection: vscode.Selection = editor.selection;
        if (!selection.isEmpty) {
            const lines: Array<EqSignLine> = new Array();
            // collect all selected lignes with "="
            for (let ln = selection.start.line; ln <= selection.end.line; ln++) {
                //get intersection of selection and current line to only handle selected part when in first or last line
                const range = selection.intersection(editor.document.lineAt(ln).range);
                if (range && editor.document.getText(range).includes("=")) {
                    lines.push(new EqSignLine(editor.document.getText(range), range));
                }
            }

            // align equal signs
            const maxBeforeEqLength = Math.max(...lines.map(line => line.beforeEq.length + line.range.start.character));
            const textEdits: vscode.TextEdit[] = [];
            lines.forEach(line => textEdits.push(vscode.TextEdit.replace(line.range, line.getAligned(maxBeforeEqLength))));

            // write back edits
            const workEdits = new vscode.WorkspaceEdit();
            workEdits.set(editor.document.uri, textEdits); // give the edits
            vscode.workspace.applyEdit(workEdits); // apply the edits
        }
    }
}

/**
 * Helper class to save the information about the equal sign lines.
 */
class EqSignLine {
    beforeEq: string;
    afterEq: string;
    range: vscode.Range;
    constructor(line: string, range: vscode.Range) {
        const eqIndex = line.indexOf("=");
        this.beforeEq = line.substring(0, eqIndex).trimEnd();
        this.afterEq = line.substring(eqIndex + 1).trimStart();
        this.range = range;
    }

    getAligned(maxBeforeEqLength: number): string {
        const lengthBefore = this.beforeEq.length + this.range.start.character;
        const paddingLength = maxBeforeEqLength - lengthBefore;
        return this.beforeEq + ' '.repeat(paddingLength) + " = " + this.afterEq;
    }
}

/**
 * Change the language mode of the specified file/folder to a new one
 * The new language mode is selected by the user in a quick pick menu.
 * @param inputUri The file/folder to change the language mode of
 */
async function changeLanguageMode(inputUri: any): Promise<void> {
    try {
        if (!inputUri || !inputUri.fsPath || !fs.existsSync(inputUri.fsPath)) {
            vscode.window.showErrorMessage("File/folder to change language mode does not exist: " + inputUri.fsPath);
            return;
        }
        const currentAssociationsEntryArray = Object.entries(vscode.workspace.getConfiguration("files").get("associations") as Map<string, string>);
        const currentAssociationsObject: { [k: string]: any } = {};
        currentAssociationsEntryArray.forEach((entry) => {
            currentAssociationsObject[entry[0]] = entry[1];
        });

        if (!currentAssociationsEntryArray) {
            vscode.window.showErrorMessage("Could not get current file associations");
            return;
        }

        // convert uri to glob pattern
        let globPattern: string = path.normalize(inputUri.fsPath).replace(/\\/g, "/");

        //if uri is folder add ** to glob pattern and add it to the current associations
        if (fs.lstatSync(inputUri.fsPath).isDirectory()) {
            globPattern = globPattern.concat("/**");
        }

        // ask user for language mode by quickselect
        const allLanguages: string[] = await vscode.languages.getLanguages();
        const languageMode: string | undefined = await vscode.window.showQuickPick(allLanguages, { placeHolder: "Select language mode" });
        if (!languageMode) {
            vscode.window.showWarningMessage("No language mode selected. Aborting changing language mode.");
            return;
        }

        // update settings with new association
        currentAssociationsObject[globPattern] = languageMode;
        vscode.workspace.getConfiguration("files").update("associations", currentAssociationsObject, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
        vscode.window.showErrorMessage("Error while changing language mode: " + error);
    }
}

