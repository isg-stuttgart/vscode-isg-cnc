// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as Path from "path";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { FileContentProvider } from "./cncView/FileContentTree";
import { config } from "./util/config";


const language = config.getParam("locale");
const docuPath = config.getParam("documentation");

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

let fileContentProvider: FileContentProvider;
let fileContentTreeView: vscode.TreeView<vscode.TreeItem> | undefined;


// package.json information
let packageFile;
let extensionPackage;

let extContext: vscode.ExtensionContext;
// Regular expression variables
// Technology regex for too, feed, spindle rpm
const regExTechnology = new RegExp("([TFS])([0-9]+)");
// Blocknumber regex
const regExpBlocknumbers = new RegExp(/^((\s?)((\/)|(\/[1-9]{0,2}))*?(\s*?)N[0-9]*(\s?))/);
const regExpLabels = new RegExp(/(\s?)N[0-9]*:{1}(\s?)|\[.*\]:{1}/);

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

    // enable/disable outputchannel
    if (config.getParam("outputchannel")) {
        outputChannel.show();
    } else {
        outputChannel.hide();
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

    // 👍 formatter implemented using API
    vscode.languages.registerDocumentFormattingEditProvider('isg-cnc', {
        provideDocumentFormattingEdits(): vscode.TextEdit[] { //document: vscode.TextDocument
            // const firstLine = document.lineAt(0);
            // if (firstLine.text !== '42') {
            //     return [vscode.TextEdit.insert(firstLine.range.start, '42\n')];
            // }
            return [];
        }
    });

    //NC-file sidebar tree provider
    const currentFile = vscode.window.activeTextEditor?.document.uri;
    fileContentProvider = new FileContentProvider(currentFile, extContext);


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
        vscode.commands.registerCommand("isg-cnc.Beautify", () => beautify())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindNonAsciiCharacters", () =>
            findNonAsciiCharacters()
        )
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

    // vscode.window.onDidChangeActiveTextEditor((editor) => {
    //     activeEditor = editor;
    //     if (editor) {
    //         triggerUpdateDecorations();
    //     }
    // }, null);

    // vscode.workspace.onDidChangeTextDocument((event) => {
    //     if (activeEditor && event.document === activeEditor.document) {
    //         triggerUpdateDecorations();
    //     }
    // }, null);
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
    // item and the currently opened file always up-to-date

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
 * Will be called by onDidChangeActiveTextEditor-Listener.
 * Updates the file-content-treeview and the selected
 * status bar lines.
 */
function activeTextEditorChanged() {
    //Tree view
    try {
        const currentFile = vscode.window.activeTextEditor?.document.uri;
        fileContentProvider.updateTreeView(currentFile);
        fileContentTreeView = vscode.window.createTreeView('cnc-show-filecontent', {
            treeDataProvider: fileContentProvider
        });
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
                    input !== undefined
                        ? setCursorPosition(parseFloat(String(input)))
                        : setCursorPosition(cursorOffset);
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
            // edit document line by line
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);
                const matchLabel = regExpLabels.exec(line.text);
                const matchBlocknumber = regExpBlocknumbers.exec(line.text);
                if (matchBlocknumber !== null && matchBlocknumber.index !== undefined) {
                    let gotoPos = line.text.indexOf("$GOTO");
                    const startPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, line.text.indexOf(matchBlocknumber[0]))
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, line.text.indexOf(matchBlocknumber[0]) + matchBlocknumber[0].length)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    if (matchLabel !== null && matchBlocknumber.index !== undefined) {
                        if ((gotoPos === -1) || (line.text.indexOf(matchLabel[0]) < gotoPos)) {
                            // label found
                            if (line.text.indexOf(matchLabel[0].trim()) === line.text.indexOf(matchBlocknumber[0].trim())) {
                                continue;
                            }
                            textEdits.push(vscode.TextEdit.replace(range, ""));
                        } else {
                            // jump to label found
                            textEdits.push(vscode.TextEdit.replace(range, ""));
                        }
                    } else {
                        textEdits.push(vscode.TextEdit.replace(range, ""));
                    }
                }
            }
            const workEdits = new vscode.WorkspaceEdit();
            workEdits.set(document.uri, textEdits); // give the edits
            vscode.workspace.applyEdit(workEdits); // apply the edits
        }
    }
    return;
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
    let blocknumbertext: string;
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

            // add new blocknumbers
            const maximalLeadingZeros = digitCount(start + document.lineCount * step);

            // edit document line by line
            let isCommentBlock = false;
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);

                if (line.text.startsWith("#COMMENT BEGIN")) {
                    isCommentBlock = true;
                }
                if (line.text.startsWith("#COMMENT END")) {
                    isCommentBlock = false;
                    continue;
                }
                // skip program name, comment lines and empty lines
                if (
                    line.text.startsWith("%", 0) ||
                    line.isEmptyOrWhitespace ||
                    line.text.startsWith(";") ||
                    line.text.startsWith("(") ||
                    isCommentBlock
                ) {
                    continue;
                }

                // generate blocknumber
                const block =
                    "N" + blocknumber.toString().padStart(maximalLeadingZeros, "0") + " ";

                // add or replace blocknumber
                const matchLabel = regExpLabels.exec(line.text);
                const matchBlocknumber = regExpBlocknumbers.exec(line.text);
                if (matchBlocknumber !== null && matchBlocknumber.index !== undefined) {
                    let gotoPos = line.text.indexOf("$GOTO");
                    const startPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, line.text.indexOf(matchBlocknumber[0]))
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, line.text.indexOf(matchBlocknumber[0]) + matchBlocknumber[0].length)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    blocknumbertext = document.getText(range);
                    if (matchLabel !== null && matchBlocknumber.index !== undefined) {
                        if ((gotoPos === -1) || (line.text.indexOf(matchLabel[0]) < gotoPos)) {
                            // label found
                            if (line.text.indexOf(matchLabel[0].trim()) === line.text.indexOf(matchBlocknumber[0].trim())) {
                                // if blocknumber and label the same insert a new blocknumber
                                textEdits.push(
                                    vscode.TextEdit.insert(
                                        new vscode.Position(line.lineNumber, line.range.start.character),
                                        block
                                    )
                                );
                            } else {
                                textEdits.push(vscode.TextEdit.replace(range, block));
                            }
                        } else {
                            // jump to label found
                            textEdits.push(vscode.TextEdit.replace(range, block));
                        }
                    } else {
                        textEdits.push(vscode.TextEdit.replace(range, block));
                    }
                } else {
                    textEdits.push(
                        vscode.TextEdit.insert(
                            new vscode.Position(line.lineNumber, line.range.start.character),
                            block
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
 * Generate an terminal and load the html documentation in webbrowser.
 * Webbrowser location reading from extension setting browser.
 *
 */
function startDocu() {
    const docuAddress = getContextbasedSite();
    outputChannel.appendLine(docuAddress);

    const terminal = vscode.window.createTerminal({
        name: "ISG-CNC",
        hideFromUser: false
    });
    let args;
    let browserPath;

    if (process.platform === "linux") {
        browserPath = `${config.getParam("browser-linux")}`;
    } else if (process.platform === "win32") {
        browserPath = `${config.getParam("browser-windows")}`.replace("\"", "");
    }

    if (docuAddress !== "" && docuAddress.startsWith("http")) {
        args = docuAddress;
    } else {
        args = `"file://${docuAddress}"`;
    }

    // example that works:
    // "C:\Program Files\Mozilla Firefox\firefox.exe"
    // "file://c:/Users/Andre/Documents/%21%21%21ISG/ISG-Doku/de-DE/search.html?q=G54"

    if (terminal.name !== "PowerShell") {
        browserPath = `"${browserPath}"`;
    } else {
        browserPath = `& "${browserPath}"`;
    }

    outputChannel.appendLine(`Path to the documentation: ${docuPath}`);
    outputChannel.appendLine(`Address to the website: ${docuAddress}`);
    outputChannel.appendLine(`Commandpart: ${browserPath} and Argumentpart: ${args}`);

    terminal.sendText(browserPath + " " + args);
}

/**
 * Function to build the Address to the documentation.
 * Standard web Address is: https://www.isg-stuttgart.de/kernel-html5/
 * Additional read the language from extension settings and the documentation path (local or web)
 * Returns the combined Address string.
 *
 * @returns {string}
 */
function getContextbasedSite(): string {
    let searchContext: string;
    let docuPath: string = "";
    let docuAddress: string = "";
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            if (docuPath !== undefined && docuPath !== "") {
                docuPath = docuPath as string;
                docuPath = docuPath.split('"').join("").split('\\').join('/');
                if (!docuPath.endsWith('/')) {
                    docuPath += "/" + `${language}/`;
                } else {
                    docuPath += `${language}/`;
                }
            } else {
                docuPath = `https://www.isg-stuttgart.de/kernel-html5/${language}/`;
            }
            if (activeTextEditor.selection.isEmpty !== true) {
                searchContext = activeTextEditor.document.getText(
                    activeTextEditor.selection
                );
                const query = new URLSearchParams();
                query.append("q", searchContext);
                docuAddress = docuPath + `search.html?${query.toString()}`;
            } else {
                docuAddress = docuPath + "index.html";
            }
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
}

export function beautify(): void {
    let currentLine: string = "";
    let newLine: string = "";
    let saveBlockNumber: string = "";
    let whiteSpaces: number = 2;
    let currentPos = 0;
    let isCommentBlock = false;
    const textEdits: vscode.TextEdit[] = [];
    const { activeTextEditor } = vscode.window;

    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            // edit document line by line
            if (activeTextEditor.options.tabSize !== undefined && typeof activeTextEditor.options.tabSize === 'number') {
                whiteSpaces = activeTextEditor.options.tabSize;
            }
            if (activeTextEditor.options.tabSize !== undefined && typeof activeTextEditor.options.tabSize !== 'number') {
                whiteSpaces = parseInt(activeTextEditor.options.tabSize);
            }
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);
                saveBlockNumber = "";
                newLine = "";
                if (line.text.startsWith("#COMMENT BEGIN")) {
                    isCommentBlock = true;
                    continue;
                }
                if (line.text.startsWith("#COMMENT END")) {
                    isCommentBlock = false;
                    continue;
                }
                // skip program name, comment lines and empty lines
                if (
                    line.text.startsWith("%", 0) ||
                    line.text.startsWith(";") ||
                    line.text.startsWith("(") ||
                    isCommentBlock
                ) {
                    continue;
                }

                // Get blocknumber and line text
                const matchLabel = regExpLabels.exec(line.text);
                const matchBlocknumber = regExpBlocknumbers.exec(line.text);
                const gotoPos = line.text.indexOf("$GOTO");

                if (matchBlocknumber !== null && matchBlocknumber.index !== undefined) {
                    const startPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, line.text.indexOf(matchBlocknumber[0]))
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, line.text.indexOf(matchBlocknumber[0]) + matchBlocknumber[0].length)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    if (matchLabel !== null && matchBlocknumber.index !== undefined) {
                        if ((gotoPos === -1) || (line.text.indexOf(matchLabel[0]) < gotoPos)) {
                            // label found
                            if (line.text.indexOf(matchLabel[0].trim()) === line.text.indexOf(matchBlocknumber[0].trim())) {
                                // if blocknumber and label the same
                                currentLine = line.text.trim();
                            } else {
                                saveBlockNumber = activeTextEditor.document.getText(range).trim();
                                currentLine = activeTextEditor.document.getText(
                                    new vscode.Range(document.positionAt(endPos), line.range.end)
                                ).trim();
                            }
                        } else {
                            // jump to label found
                            saveBlockNumber = activeTextEditor.document.getText(range).trim();
                            currentLine = activeTextEditor.document.getText(
                                new vscode.Range(document.positionAt(endPos), line.range.end)
                            ).trim();
                        }
                    } else {
                        saveBlockNumber = activeTextEditor.document.getText(range).trim();
                        currentLine = activeTextEditor.document.getText(
                            new vscode.Range(document.positionAt(endPos), line.range.end)
                        ).trim();
                    }
                } else {
                    currentLine = activeTextEditor.document.getText(line.range).trim();
                }

                // empty line trim whitespaces and write to edits buffer
                if (currentLine.length === 0 && saveBlockNumber.length === 0) {
                    textEdits.push(vscode.TextEdit.replace(line.range, currentLine));
                    continue;
                }

                if (
                    currentLine.indexOf("$DO") === 0 ||
                    currentLine.indexOf("$REPEAT") === 0 ||
                    currentLine.indexOf("$FOR") === 0 ||
                    (currentLine.indexOf("$IF") === 0 && currentLine.indexOf("$GOTO") === -1) ||
                    currentLine.indexOf("$WHILE") === 0 ||
                    currentLine.indexOf("#VAR") === 0
                ) {
                    // Einfügen der Zeile an aktueller Position, danach wird die aktuelle Position um die TabSize erhöht
                    newLine = newLineForBeautifier(currentLine, currentPos);
                    currentPos = currentPos + whiteSpaces;
                } else if (currentLine.indexOf("$SWITCH") === 0) {
                    // Einfügen der Zeile an aktueller Position, danach wird die aktuelle Position um die TabSize erhöht
                    newLine = newLineForBeautifier(currentLine, currentPos);
                    currentPos = currentPos + whiteSpaces * 2;
                } else if (
                    currentLine.indexOf("$ENDDO") === 0 ||
                    currentLine.indexOf("$UNTIL") === 0 ||
                    currentLine.indexOf("$ENDFOR") === 0 ||
                    currentLine.indexOf("$ENDIF") === 0 ||
                    currentLine.indexOf("$ENDWHILE") === 0 ||
                    currentLine.indexOf("#ENDVAR") === 0
                ) {
                    // Aktuelle Position wird um TabSize verringert, danach wird die Zeile an der neuen Position eingefügt
                    currentPos = currentPos - whiteSpaces;
                    if (currentPos < 0) {
                        currentPos = 0;
                    }
                    newLine = newLineForBeautifier(currentLine, currentPos);
                } else if (currentLine.indexOf("$ENDSWITCH") === 0) {
                    // Aktuelle Position wird um TabSize verringert, danach wird die Zeile an der neuen Position eingefügt
                    currentPos = currentPos - whiteSpaces * 2;
                    if (currentPos < 0) {
                        currentPos = 0;
                    }
                    newLine = newLineForBeautifier(currentLine, currentPos);
                } else if (
                    currentLine.indexOf("$ELSEIF") === 0 ||
                    currentLine.indexOf("$ELSE") === 0 ||
                    currentLine.indexOf("$CASE") === 0 ||
                    currentLine.indexOf("$DEFAULT") === 0
                ) {
                    // insert line at actual position - TabSize inserted
                    currentPos = currentPos - whiteSpaces;
                    if (currentPos < 0) {
                        currentPos = 0;
                    }
                    newLine = newLineForBeautifier(currentLine, currentPos);
                    currentPos = currentPos + whiteSpaces;
                } else {
                    // insert line at actual position
                    newLine = newLineForBeautifier(currentLine, currentPos);
                }
                if (saveBlockNumber.length !== 0) {
                    newLine = " " + newLine;
                    if (saveBlockNumber.endsWith(":")) {
                        newLine = saveBlockNumber + newLine.trimEnd().substring(1);
                    }
                    else {
                        newLine = saveBlockNumber + newLine.trimEnd();
                    }
                } else {
                    newLine = newLine.trimEnd();
                }
                outputChannel.appendLine(newLine);
                textEdits.push(vscode.TextEdit.replace(line.range, newLine));
            }
        }

        // write back edits
        const workEdits = new vscode.WorkspaceEdit();
        workEdits.set(document.uri, textEdits); // give the edits
        vscode.workspace.applyEdit(workEdits); // apply the edits
        return;
    }
}

function newLineForBeautifier(line: string, whiteSpaces: number) {
    let newLine = "";
    let count: number = 0;
    while (count !== whiteSpaces) {
        count++;
        newLine = newLine + " ";
    }
    newLine = newLine + line;
    return newLine;
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
    outputChannel.show.apply;
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