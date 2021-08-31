"use strict";
// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as Path from "path";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { config } from "./util/config";

/**
 * Get vscode config data and extension config
 * Terminals must be configured in vscode (example: "terminal.integrated.shell.linux": "/usr/bin/bash" in user settings)
 */
 let Terminal : unknown;
 if (process.platform === "linux") {
    Terminal = config.getVscodeParam("terminal.integrated.defaultProfile.linux");
} else if (process.platform === "win32") {
    Terminal = config.getVscodeParam("terminal.integrated.defaultProfile.windows");
}


const Language = config.getParam("locale");
const DocuPath = config.getParam("documentation");

/** Outputchannel for the extension
 */
const OutputChannel = vscode.window.createOutputChannel("ISG-CNC");
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
let SelectedLinesStatusBarItem: vscode.StatusBarItem;
let CurrentOffsetStatusBarItem: vscode.StatusBarItem;

// package.json information
let PackageFile;
let ExtensionPackage;

// Regular expression variables
// Technology regex for too, feed, spindle rpm
const regExTechnology = new RegExp("([TFS])([0-9]+)");
// Blocknumber regex
const regExpBlocknumbers = new RegExp(
    /^((\s?)((\/)|(\/[1-9]{0,2}))*?(\s*?)N[0-9]*(\s?))/
);

/**
 * This method is called when the extension is activated
 *
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext): void {
    // Get package.json informations
    ExtensionPackage = Path.join(context.extensionPath, "package.json");
    PackageFile = JSON.parse(fs.readFileSync(ExtensionPackage, "utf8"));

    // enable/disable outputchannel
    if (config.getParam("outputchannel")) {
        OutputChannel.show();
    } else {
        OutputChannel.hide();
    }

    // Output extension name and version number in console and output window ISG-CNC
    if (PackageFile) {
        vscode.window.showInformationMessage(
            "Started: " + PackageFile.displayName + " V" + PackageFile.version
        );
        OutputChannel.appendLine(
            "Started: " + PackageFile.displayName + " V" + PackageFile.version
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

    // commands
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.GoToPosition", () =>
            GoToPosition()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.ShowCursorFileOffsetInfobox", () =>
            ShowCursorFileOffsetInfobox()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindNextTFS", () => FindNextTFS())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.RemoveAllBlocknumbers", () =>
            RemoveAllBlocknumbers()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.AddBlocknumbers", () =>
            AddBlocknumbers()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.StartDocu", () => StartDocu())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.Beautify", () => Beautify())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("isg-cnc.FindNonAsciiCharacters", () =>
            FindNonAsciiCharacters()
        )
    );

    // add status bar items
    AddSelectedLinesStatusBarItem(context);
    AddCurrentOffsetStatusBarItem(context);

    // update status bar items once at start
    UpdateSelectedLinesStatusBarItem();
    UpdateCurrentOffsetStatusBarItem();

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
function FindNextTFS(): boolean {
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
                SetCursorPosition(startoffset);
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
function AddSelectedLinesStatusBarItem(context: vscode.ExtensionContext) {
    // register a command that is invoked when the status bar
    // item is selected
    const MyCommandId = "isg-cnc.showSelectedLinesCount";

    context.subscriptions.push(
        vscode.commands.registerCommand(MyCommandId, () => {
            const n = GetNumberOfSelectedLines();
            vscode.window.showInformationMessage(`${n} line(s) are selected.`);
        })
    );

    // create a new status bar item that we can now manage
    SelectedLinesStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    SelectedLinesStatusBarItem.command = MyCommandId;
    context.subscriptions.push(SelectedLinesStatusBarItem);

    // register some listener that make sure the status bar
    // item always up-to-date
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(UpdateSelectedLinesStatusBarItem)
    );
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            UpdateSelectedLinesStatusBarItem
        )
    );
}

/**
 * Update statusbar item for selected lines.
 * Hide item when no lines are selected.
 *
 */
function UpdateSelectedLinesStatusBarItem(): void {
    const n = GetNumberOfSelectedLines();
    if (n > 0) {
        SelectedLinesStatusBarItem.text = `$(megaphone) ${n} line(s) selected`;
        SelectedLinesStatusBarItem.show();
    } else {
        SelectedLinesStatusBarItem.hide();
    }
}

/**
 * Add a statusbar item for fileoffset to the statusbar
 *
 * @param {vscode.ExtensionContext} context
 */
function AddCurrentOffsetStatusBarItem(context: vscode.ExtensionContext) {
    // register a command that is invoked when the status bar
    // fileoffset of the cursor

    // create a new status bar item that we can now manage
    CurrentOffsetStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    CurrentOffsetStatusBarItem.command = "isg-cnc.GoToPosition";
    context.subscriptions.push(CurrentOffsetStatusBarItem);

    // register some listener that make sure the status bar
    // item always up-to-date
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(UpdateCurrentOffsetStatusBarItem)
    );
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            UpdateCurrentOffsetStatusBarItem
        )
    );
}

/**
 * Opens a infobox with current fileoffset and max fileoffset.
 *
 */
function ShowCursorFileOffsetInfobox() {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const maxOffset = document.offsetAt(
                new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            );
            const n = GetCurrentFileOffset();
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
function UpdateCurrentOffsetStatusBarItem(): void {
    const n = GetCurrentFileOffset();
    CurrentOffsetStatusBarItem.text = `$(arrow-right) Fileoffset: ${n}`;
    CurrentOffsetStatusBarItem.show();
}

/**
 * Get the current fileoffset of the cursor.
 *
 * @returns {number}
 */
function GetCurrentFileOffset(): number {
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
async function GoToPosition(): Promise<void> {
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
                        if (!IsNumeric(parseFloat(String(input)))) {
                            return undefined;
                        }
                    },
                    value: String(cursorOffset),
                })
                .then((input?: string) => {
                    input !== undefined
                        ? SetCursorPosition(parseFloat(String(input)))
                        : SetCursorPosition(cursorOffset);
                });
        }
    }
}

/**
 * Set the cursor to position. Scroll the view to the position.
 *
 * @param {number} pos
 */
function SetCursorPosition(pos: number) {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const newPosition = document.positionAt(pos);
            activeTextEditor.selection = new vscode.Selection(
                newPosition,
                newPosition
            );
            Reveal();
            UpdateCurrentOffsetStatusBarItem();
        }
    }
}

/**
 * Get number of selected lines and returns the count.
 *
 * @returns {number}
 */
function GetNumberOfSelectedLines(): number {
    // get number of selected lines
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        return activeTextEditor.selections.reduce(
            (prev, curr) => prev + (curr.end.line - curr.start.line),
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
function Reveal(revealType?: vscode.TextEditorRevealType): void {
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
function IsNumeric(n: number) {
    return !isNaN(n) && isFinite(n);
}

/**
 * Remove all block numbers
 *
 */
function RemoveAllBlocknumbers() {
    const textEdits: vscode.TextEdit[] = [];
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            // edit document line by line
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);
                const match = regExpBlocknumbers.exec(line.text);
                if (match !== null && match.index !== undefined) {
                    const startPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, match.index)
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, match.index + match[0].length)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    textEdits.push(vscode.TextEdit.replace(range, ""));
                    // textEdits.push(vscode.TextEdit.insert(...));
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
async function AddBlocknumbers() {
    let start = 10;
    let step = 10;
    const textEdits: vscode.TextEdit[] = [];
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            // get start number
            let inputOptions: vscode.InputBoxOptions = {
                prompt: `Type an start number.`,
                validateInput: (input: string) => {
                    if (!IsNumeric(parseInt(input, 10))) {
                        return undefined;
                    }
                },
                value: start.toString(),
            };
            await vscode.window.showInputBox(inputOptions).then((input?: string) => {
                if (input !== undefined) {
                    start = parseInt(input, 10);
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
                    if (!IsNumeric(parseInt(input, 10))) {
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
            let blocknumber = start;
            const maximalLeadingZeros = DigitCount(start + document.lineCount * step);

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
                const match = regExpBlocknumbers.exec(line.text);
                if (match !== null && match.index !== undefined) {
                    const startPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, match.index)
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, match.index + match[0].length)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    textEdits.push(vscode.TextEdit.replace(range, block));
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
function DigitCount(nr: number): number {
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
function StartDocu() {
    const docuAddress = GetContextbasedSite();
    OutputChannel.appendLine(docuAddress);

    const terminal = vscode.window.createTerminal({
        name: "ISG-CNC",
        hideFromUser: false
    });
    let args;
    let browserPath;

    if (process.platform === "linux") {
        browserPath = `${config.getParam("browser-linux")}`;
    } else if (process.platform === "win32") {
        browserPath = `${config.getParam("browser-windows")}`.replaceAll("\"", "");
    }

    if (docuAddress !== "" && docuAddress.startsWith("http")) {
        args = docuAddress;
    } else {
        args = `"file://${docuAddress}"`;
    }

    // example that works:
    // "C:\Program Files\Mozilla Firefox\firefox.exe"
    // "file://c:/Users/Andre/Documents/%21%21%21ISG/ISG-Doku/de-DE/search.html?q=G54"

    if (Terminal !== "PowerShell") {
        browserPath = `"${browserPath}"`;
    } else {
        browserPath = `& "${browserPath}"`;
    }

    OutputChannel.appendLine(`Path to the documentation: ${DocuPath}`);
    OutputChannel.appendLine(`Address to the website: ${docuAddress}`);
    OutputChannel.appendLine(`Commandpart: ${browserPath} and Argumentpart: ${args}`);

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
function GetContextbasedSite(): string {
    let SearchContext: string;
    let docuPath: string;
    let DocuAddress = "";
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            if (DocuPath !== undefined && DocuPath !== "") {
                docuPath = DocuPath as string;
                docuPath = docuPath.split('"').join("").split('\\').join('/');
                if (!docuPath.endsWith('/')) {
                    docuPath += "/" + `${Language}/`;
                } else {
                    docuPath += `${Language}/`;
                }
            } else {
                docuPath = `https://www.isg-stuttgart.de/kernel-html5/${Language}/`;
            }
            if (activeTextEditor.selection.isEmpty !== true) {
                SearchContext = activeTextEditor.document.getText(
                    activeTextEditor.selection
                );
                const query = new URLSearchParams();
                query.append("q", SearchContext);
                DocuAddress = docuPath + `search.html?${query.toString()}`;
            } else {
                DocuAddress = docuPath + "index.html";
            }
        }
    }
    return DocuAddress;
}

/**
 * This method is called when the extension is deactivated
 *
 */
export function deactivate(): void {
    OutputChannel.appendLine("Close vscode-isg-cnc");
    OutputChannel.dispose();
}

export function Beautify(): void {
    let currentLine: string;
    let newLine: string;
    let saveBlockNumber: string;
    let whiteSpaces: number;
    let currentPos = 0;
    const textEdits: vscode.TextEdit[] = [];

    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            whiteSpaces = 2;
            // edit document line by line
            if (activeTextEditor.options.tabSize !== undefined && typeof activeTextEditor.options.tabSize === 'number') {
                whiteSpaces = activeTextEditor.options.tabSize;
            }
            if (activeTextEditor.options.tabSize !== undefined && typeof activeTextEditor.options.tabSize !== 'number') {
                whiteSpaces = parseInt(activeTextEditor.options.tabSize);
            }
            let isCommentBlock = false;
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);

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
                    //line.isEmptyOrWhitespace ||
                    line.text.startsWith(";") ||
                    line.text.startsWith("(") ||
                    isCommentBlock
                ) {
                    continue;
                }

                currentLine = line.text;
                saveBlockNumber = "";
                newLine = "";

                // Get blocknumber and line text
                const match = regExpBlocknumbers.exec(line.text);
                if (match !== null && match.index !== undefined) {
                    const startPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, match.index)
                    );
                    const endPos = document.offsetAt(
                        new vscode.Position(line.lineNumber, match.index + match[0].length)
                    );
                    const range = new vscode.Range(
                        document.positionAt(startPos),
                        document.positionAt(endPos)
                    );
                    saveBlockNumber = activeTextEditor.document.getText(range);
                    currentLine = activeTextEditor.document.getText(
                        new vscode.Range(document.positionAt(endPos), line.range.end)
                    );
                } else {
                    currentLine = activeTextEditor.document.getText(line.range);
                }

                // empty line trim whitespaces and write to edits buffer
                currentLine.trim();
                if (currentLine.length === 0) {
                    textEdits.push(vscode.TextEdit.replace(line.range, currentLine));
                    continue;
                }

                currentLine = currentLine.trim();

                if (
                    currentLine.indexOf("$DO") === 0 ||
                    currentLine.indexOf("$REPEAT") === 0 ||
                    currentLine.indexOf("$FOR") === 0 ||
                    currentLine.indexOf("$IF") === 0 ||
                    currentLine.indexOf("$WHILE") === 0 ||
                    currentLine.indexOf("#VAR") === 0
                ) {
                    // Einfügen der Zeile an aktueller Position, danach wird die aktuelle Position um die TabSize erhöht

                    newLine = NewLineForBeautifier(currentLine, currentPos);
                    currentPos = currentPos + whiteSpaces;
                } else if (currentLine.indexOf("$SWITCH") === 0) {
                    // Einfügen der Zeile an aktueller Position, danach wird die aktuelle Position um die TabSize erhöht

                    newLine = NewLineForBeautifier(currentLine, currentPos);
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

                    newLine = NewLineForBeautifier(currentLine, currentPos);
                } else if (currentLine.indexOf("$ENDSWITCH") === 0) {
                    // Aktuelle Position wird um TabSize verringert, danach wird die Zeile an der neuen Position eingefügt

                    currentPos = currentPos - whiteSpaces * 2;

                    if (currentPos < 0) {
                        currentPos = 0;
                    }

                    newLine = NewLineForBeautifier(currentLine, currentPos);
                } else if (
                    currentLine.indexOf("$ELSEIF") === 0 ||
                    currentLine.indexOf("$ELSE") === 0 ||
                    currentLine.indexOf("$CASE") === 0 ||
                    currentLine.indexOf("$DEFAULT") === 0
                ) {
                    // Zeile wird an der Aktuellen Position - TabSize eingefügt

                    newLine = NewLineForBeautifier(currentLine, currentPos - whiteSpaces);
                } else {
                    // Zeile wird an der Aktuellen Position eingefügt
                    newLine = NewLineForBeautifier(currentLine, currentPos);
                }

                newLine = saveBlockNumber + newLine;

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

function NewLineForBeautifier(line: string, whiteSpaces: number) {
    let newLine = "";

    for (let i = 0; i < whiteSpaces; i++) {
        newLine = newLine + " ";
    }
    newLine = newLine + line;
    return newLine;
}

export function FindNonAsciiCharacters(): void {
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
        OutputChannel.appendLine(message);
    }
    OutputChannel.show.apply;
}

function triggerUpdateDecorations() {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    timeout = setTimeout(updateDecorations, 50);
}
