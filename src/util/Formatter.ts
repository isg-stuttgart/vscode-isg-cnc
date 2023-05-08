import * as vscode from 'vscode';
import * as parser from "../../server/src/parsingResults";
import { config } from "./config";

// Blocknumber regex
const regExpBlocknumbers = new RegExp(/^((\s?)((\/)|(\/[1-9]{0,2}))*?(\s*?)N[0-9]*(\s?))/);
const regExpLabels = new RegExp(/(\s?)N[0-9]*:{1}(\s?)|\[.*\]:{1}/);

export class DocumentRangeFormattingEditProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        // if formatter disabled, cancel
        if(config.getParam("enableFormatter") === false){
            return;
        }
       
        let currentLine: string = "";
        let newLine: string = "";
        let saveBlockNumber: string = "";
        let whiteSpaces: number = options.tabSize;
        let currentPos = 0;
        let isCommentBlock = false;
        const textEdits: vscode.TextEdit[] = [];
        const syntaxArray: parser.SyntaxArray = parser.getSyntaxArray(document.getText());

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
                            saveBlockNumber = document.getText(range).trim();
                            currentLine = document.getText(
                                new vscode.Range(document.positionAt(endPos), line.range.end)
                            ).trim();
                        }
                    } else {
                        // jump to label found
                        saveBlockNumber = document.getText(range).trim();
                        currentLine = document.getText(
                            new vscode.Range(document.positionAt(endPos), line.range.end)
                        ).trim();
                    }
                } else {
                    saveBlockNumber = document.getText(range).trim();
                    currentLine = document.getText(
                        new vscode.Range(document.positionAt(endPos), line.range.end)
                    ).trim();
                }
            } else {
                currentLine = document.getText(line.range).trim();
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
            textEdits.push(vscode.TextEdit.replace(line.range, newLine));
        }

        syntaxArray.multilines.forEach((multiline: parser.Match) => {
            const start = multiline.location.start.line;
            const end = multiline.location.end.line;
            for (let lineNumber = start; lineNumber < end; lineNumber++) {
                const line: vscode.TextLine = document.lineAt(lineNumber);
                newLine = " ".repeat(whiteSpaces) + line.text;
                if(range.contains(line.range)){
                    textEdits.push(vscode.TextEdit.replace(line.range, newLine));
                }
            }
        });

        //filter textEdits to only format selected range
        return textEdits.filter(edit=>edit.range.intersection(range)?.isEmpty === false);
    }
}

function newLineForBeautifier(currentLine: string, currentPos: number): string {
    return " ".repeat(currentPos) + currentLine;
}
