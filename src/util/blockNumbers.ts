import * as vscode from "vscode";
import { digitCount, isNumeric } from "./util";
import { ParseResults } from "../../server/src/parsingResults";
import { Match } from "../../server/src/parserClasses";
import { MatchType } from "../../server/src/matchTypes";
import { getIncludeCommentsInNumbering } from "./config";

// Blocknumber regex
const regExpLabels = new RegExp(/(\s?)N[0-9]*:{1}(\s?)|\[.*\]:{1}/);

/**
 * Remove all block numbers
 *
 */
export async function removeAllBlocknumbers() {
    const textEdits: vscode.TextEdit[] = [];
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        const document = activeTextEditor.document;
        if (document) {
            let linesToBlocknumberMap: Map<number, Match>;
            let parseResults: ParseResults;
            try {
                parseResults = new ParseResults(document.getText());
                linesToBlocknumberMap = parseResults.getLineToBlockNumberMap();
            } catch (error) {
                vscode.window.showErrorMessage("Canceled removing blocknumbers: " + JSON.stringify(error));
                return;
            }
            // edit document line by line
            for (let ln = 0; ln < document.lineCount; ln++) {
                const line = document.lineAt(ln);
                const matchLabel = regExpLabels.exec(line.text);
                const blockNumber: Match | undefined = linesToBlocknumberMap.get(ln);
                if (blockNumber !== undefined) {
                    let gotoPos = line.text.indexOf("$GOTO");
                    const range = new vscode.Range(
                        new vscode.Position(ln, blockNumber.location.start.column - 1),
                        new vscode.Position(line.lineNumber, blockNumber.location.end.column)
                    );
                    // if label found and blocknumber are the same -> skip deleting
                    if (matchLabel !== null && ((gotoPos === -1) || (line.text.indexOf(matchLabel[0]) < gotoPos)) && line.text.indexOf(matchLabel[0].trim()) === blockNumber.location.start.column - 1) {
                        continue;
                    }

                    textEdits.push(vscode.TextEdit.replace(range, ""));
                }
            }
            const workEdits = new vscode.WorkspaceEdit();
            workEdits.set(document.uri, textEdits); // give the edits
            await vscode.workspace.applyEdit(workEdits); // apply the edits

            // if configuration says to also number comments, iterate over all comments and add an entry to linesToBlocknumberMap
            if (getIncludeCommentsInNumbering()) {
                textEdits.length = 0;
                parseResults.syntaxArray.comments.forEach((match) => {
                    // check for all comment lines if the trimmed version BEGINS with a N[0-9]*
                    for (let i = match.location.start.line - 1; i <= match.location.end.line - 1; i++) {
                        const line = document.lineAt(i);
                        const blockNumberMatch = new RegExp(/^\s*N[0-9]*/).exec(line.text.trim());
                        if (blockNumberMatch !== null) {
                            const range = new vscode.Range(
                                new vscode.Position(i, blockNumberMatch.index),
                                new vscode.Position(i, blockNumberMatch.index + blockNumberMatch[0].length + 1)
                            );
                            textEdits.push(vscode.TextEdit.replace(range, ""));
                        }
                    }
                });
                const workEdits = new vscode.WorkspaceEdit();
                workEdits.set(document.uri, textEdits); // give the edits
                await vscode.workspace.applyEdit(workEdits); // apply the edits
            }
        }
    }
}


/**
 * Add new block numbers. You can input start block number and the stepsize in a input box.
 * Returns undefinded when somethings wrong.
 *
 * @returns
 */
export async function addBlocknumbersCommand() {
    let start = 10;
    let step = 10;
    const { activeTextEditor } = vscode.window;

    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            // get start number
            const startInput = await vscode.window.showInputBox({
                prompt: `Type a start number.`,
                validateInput: (input: string) => {
                    if (!isNumeric(parseInt(input, 10))) {
                        return "Please type a number.";
                    }
                },
                value: start.toString(),
            });
            if (!startInput) {
                return;
            }
            start = parseInt(startInput, 10);

            // get step size
            const stepInput = await vscode.window.showInputBox({
                prompt: `Type a step size.`,
                validateInput: (input: string) => {
                    if (!isNumeric(parseInt(input, 10))) {
                        return "Please type a number.";
                    }
                },
                value: step.toString(),
            });
            if (!stepInput) {
                return;
            }
            step = parseInt(stepInput, 10);

            await addBlockNumbers(start, step);
        }
    }
}

export async function addBlockNumbers(start: number, step: number) {

    if (start === undefined) {
        start = 10;
    }
    if (step === undefined) {
        step = 10;
    }

    let blocknumber = start;
    const textEdits: vscode.TextEdit[] = [];
    const { activeTextEditor } = vscode.window;
    if (!activeTextEditor) {
        throw new Error("No activeTextEditor found in addBlockNumbers");
    }
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        if (document) {
            const parseResult: ParseResults = new ParseResults(document.getText());
            const linesToNumber: Array<number> = parseResult.getNumberableLines();
            const includeComments = getIncludeCommentsInNumbering();
            const commentLines: Array<number> = [];
            // if configuration says to also number comments, add them to linesToNumber
            if (includeComments) {
                parseResult.syntaxArray.comments.forEach((match) => {
                    // push all lines between match.location.start.line and match.location.end.line to linesToNumber if not already included
                    for (let i = match.location.start.line - 1; i <= match.location.end.line - 1; i++) {
                        if (!linesToNumber.includes(i)) {
                            linesToNumber.push(i);
                            commentLines.push(i);
                        }
                    }
                    // sort because now the order may be destroyed
                    linesToNumber.sort((a: number, b: number) => a - b);
                });
            }
            const skipLineBeginIndexes: Map<number, number> = new Map();
            let skipBlocks;
            try {
                skipBlocks = parseResult.syntaxArray.skipBlocks;
            } catch (error) {
                vscode.window.showErrorMessage("Canceled adding blocknumbers: " + JSON.stringify(error));
                return;
            }
            skipBlocks.forEach((match) => {
                skipLineBeginIndexes.set(match.location.start.line, match.location.start.column);
            });

            let linesToBlocknumberMap;
            try {
                linesToBlocknumberMap = parseResult.getLineToBlockNumberMap();
            } catch (error) {
                vscode.window.showErrorMessage("Canceled adding blocknumbers: " + JSON.stringify(error));
                return;
            }
            // add new blocknumbers
            const maxDigits = digitCount(start + linesToNumber.length * step);

            for (let ln of linesToNumber) {
                const line = document.lineAt(ln);
                // if line is empty skip it
                if (line.text.trim() === "") {
                    continue;
                }
                // generate blocknumber
                const blockNumberString =
                    "N" + blocknumber.toString().padStart(maxDigits, "0");
                let oldBlockNumber: undefined | Match = linesToBlocknumberMap.get(line.lineNumber);
                // if line contains block number label for goto statements, skip it to not change control flow
                if (oldBlockNumber && oldBlockNumber.type === MatchType.blockNumberLabel) {
                    continue;
                }
                let insert: boolean = false;
                // add or replace blocknumber
                const matchLabel = regExpLabels.exec(line.text);
                if (oldBlockNumber) {
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
                        textEdits.push(vscode.TextEdit.replace(range, blockNumberString));
                    }
                } else if (includeComments && commentLines.includes(ln)) {
                    // if parser did not give blocknumber but comments are included and this is a comment line which starts with blocknumber regex, replace it
                    const blockNumberMatch = line.text.match(/^\s*N[0-9]*/);
                    if (blockNumberMatch?.index !== undefined) {
                        const range = new vscode.Range(
                            new vscode.Position(ln, blockNumberMatch.index),
                            new vscode.Position(ln, blockNumberMatch.index + blockNumberMatch[0].length)
                        );
                        textEdits.push(vscode.TextEdit.replace(range, blockNumberString));
                    } else {
                        insert = true;
                    }
                } else {
                    insert = true;
                }
                if (insert) {
                    let insertIndex: number;
                    const skipLineBegin: number | undefined = skipLineBeginIndexes.get(line.lineNumber + 1);  //parser is 1 based
                    if (skipLineBegin !== undefined) {
                        insertIndex = skipLineBegin;
                    } else {
                        insertIndex = line.range.start.character;
                    }
                    textEdits.push(
                        vscode.TextEdit.insert(
                            new vscode.Position(line.lineNumber, insertIndex),
                            blockNumberString + " "
                        )
                    );
                }
                blocknumber += step;
            }
        }
        const workEdits = new vscode.WorkspaceEdit();
        workEdits.set(document.uri, textEdits); // give the edits
        await vscode.workspace.applyEdit(workEdits); // apply the edits
    }
}