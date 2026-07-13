import * as vscode from "vscode";
import { digitCount, isNumeric } from "./util";
import { ParseResults, Match, MatchType } from "../shared/languageServer";
import { getIncludeCommentsInNumbering } from "./config";
import { regExpLabels } from "./ncBlockRegex";

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
                    // peggy locations are 1-based and end.column points *after* the last matched
                    // character, so the 0-based exclusive end of the block number is end.column - 1
                    const blockNumberEnd = blockNumber.location.end.column - 1;
                    // remove a single trailing separating space if present, but never the following
                    // command (e.g. keep the "G" in compact "N10G01")
                    const deleteEnd = line.text.charAt(blockNumberEnd) === " " ? blockNumberEnd + 1 : blockNumberEnd;
                    const range = new vscode.Range(
                        new vscode.Position(ln, blockNumber.location.start.column - 1),
                        new vscode.Position(line.lineNumber, deleteEnd)
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
                    // check for all comment lines if they begin (ignoring leading whitespace) with a block number
                    for (let i = match.location.start.line - 1; i <= match.location.end.line - 1; i++) {
                        const line = document.lineAt(i);
                        // match on the untrimmed line so index/length line up with the real range;
                        // require at least one digit so plain words like "Note" are not touched
                        const blockNumberMatch = /^(\s*)(N[0-9]+)/.exec(line.text);
                        if (blockNumberMatch !== null) {
                            const start = blockNumberMatch[1].length;
                            let end = start + blockNumberMatch[2].length;
                            // remove a single trailing separating space if present
                            if (line.text.charAt(end) === " ") {
                                end += 1;
                            }
                            const range = new vscode.Range(
                                new vscode.Position(i, start),
                                new vscode.Position(i, end)
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
            const commentLines: Set<number> = new Set();
            // if configuration says to also number comments, add them to linesToNumber
            if (includeComments) {
                const numberedLines: Set<number> = new Set(linesToNumber);
                parseResult.syntaxArray.comments.forEach((match) => {
                    // add all lines of the comment to linesToNumber if not already included
                    for (let i = match.location.start.line - 1; i <= match.location.end.line - 1; i++) {
                        if (!numberedLines.has(i)) {
                            numberedLines.add(i);
                            linesToNumber.push(i);
                            commentLines.add(i);
                        }
                    }
                });
                // sort once after collecting instead of on every comment match
                linesToNumber.sort((a: number, b: number) => a - b);
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
            // the highest assigned block number is start + (numberedCount - 1) * step, and empty
            // lines are skipped without consuming a number, so count only non-empty lines
            const numberedCount = linesToNumber.filter(ln => document.lineAt(ln).text.trim() !== "").length;
            const maxDigits = digitCount(start + Math.max(0, numberedCount - 1) * step);

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
                } else if (includeComments && commentLines.has(ln)) {
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
                        // insert *after* the complete skip marker ("/", "/0".."/9" or "/10"),
                        // otherwise a multi-character marker would be split (e.g. "/1" -> "/N10 1")
                        const markerMatch = /^\s*\/(?:10|[0-9])?/.exec(line.text);
                        insertIndex = markerMatch ? markerMatch[0].length : skipLineBegin;
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