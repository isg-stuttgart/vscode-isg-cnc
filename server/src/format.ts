import { TextDocument } from "vscode-languageserver-textdocument";
import { Match } from "./parserClasses";
import { ParseResults } from "./parsingResults";
import { FormattingOptions, Position, Range, TextEdit } from "vscode-languageserver";
import { EOL } from "os";
import { compareLocations } from "./stringSearching";
// Blocknumber regex
const regExpBlocknumbers = new RegExp(/^((\s?)((\/)|(\/[1-9]{0,2}))*?(\s*?)N[0-9]*(\s?))/);
const regExpLabels = new RegExp(/(\s?)N[0-9]*:{1}(\s?)|\[.*\]:{1}/);


/**
 * Calculate the formatting edits for the given document, options and range.
 * @param document the document to format 
 * @param options the formatting options 
 * @param range the range to format, if undefined the whole document is formatted 
 * @returns the text edits to apply to format the document 
 */
export function getFormatting(document: TextDocument, options: FormattingOptions, range: Range | undefined): TextEdit[] {
    const textEdits: TextEdit[] = [];
    const tabSize: number = options.tabSize;
    let currentLine: string = "";
    let newLine: string = "";
    let saveBlockNumber: string = "";
    let currentPos = 0;
    let isCommentBlock = false;
    const syntaxArray = new ParseResults(document.getText()).syntaxArray;
    const lines = document.getText().split(EOL);
    for (let ln = 0; ln < document.lineCount; ln++) {
        const line = lines[ln];
        const oldRange = Range.create(Position.create(ln, 0), Position.create(ln, line.length));
        saveBlockNumber = "";
        newLine = "";
        if (line.startsWith("#COMMENT BEGIN")) {
            isCommentBlock = true;
            continue;
        }
        if (line.startsWith("#COMMENT END")) {
            isCommentBlock = false;
            continue;
        }
        // skip program name, comment lines and empty lines
        if (
            line.startsWith("%", 0) ||
            isCommentBlock
        ) {
            continue;
        }
        // Get blocknumber and line text
        const matchLabel = regExpLabels.exec(line);
        const matchBlocknumber = regExpBlocknumbers.exec(line);
        const gotoPos = line.indexOf("$GOTO");

        if (matchBlocknumber !== null && matchBlocknumber.index !== undefined) {
            const startPos = document.offsetAt(
                Position.create(ln, line.indexOf(matchBlocknumber[0]))
            );
            const endPos = document.offsetAt(
                Position.create(ln, line.indexOf(matchBlocknumber[0]) + matchBlocknumber[0].length)
            );
            const range = Range.create(
                document.positionAt(startPos),
                document.positionAt(endPos)
            );
            if (matchLabel !== null && matchBlocknumber.index !== undefined) {
                // label found
                if ((gotoPos === -1) || (line.indexOf(matchLabel[0]) < gotoPos)) {
                    // if blocknumber and label the same
                    if (line.indexOf(matchLabel[0].trim()) === line.indexOf(matchBlocknumber[0].trim())) {
                        currentLine = line.trim();
                    } else {
                        saveBlockNumber = document.getText(range).trim();
                        currentLine = document.getText(
                            Range.create(document.positionAt(endPos), Position.create(ln, line.length))
                        ).trim();
                    }
                } else {
                    // jump to label found
                    saveBlockNumber = document.getText(range).trim();
                    currentLine = document.getText(
                        Range.create(document.positionAt(endPos),
                            Position.create(ln, line.length))
                    ).trim();
                }
            } else {
                saveBlockNumber = document.getText(range).trim();
                currentLine = document.getText(
                    Range.create(document.positionAt(endPos),
                        Position.create(ln, line.length))
                ).trim();
            }
        } else {
            currentLine = line.trim();
        }

        // empty line trim whitespaces and write to edits buffer
        if (currentLine.length === 0 && saveBlockNumber.length === 0) {
            textEdits.push(TextEdit.replace(oldRange, currentLine));
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
            // Insert new line and increase current position by TabSize
            newLine = prependWhiteSpace(currentLine, currentPos);
            currentPos = currentPos + tabSize;
        } else if (currentLine.indexOf("$SWITCH") === 0) {
            // Insert new line and increase current position by 2*TabSize
            newLine = prependWhiteSpace(currentLine, currentPos);
            currentPos = currentPos + tabSize * 2;
        } else if (
            currentLine.indexOf("$ENDDO") === 0 ||
            currentLine.indexOf("$UNTIL") === 0 ||
            currentLine.indexOf("$ENDFOR") === 0 ||
            currentLine.indexOf("$ENDIF") === 0 ||
            currentLine.indexOf("$ENDWHILE") === 0 ||
            currentLine.indexOf("#ENDVAR") === 0
        ) {
            // Decrease current position by TabSize, then insert line at new position
            currentPos = currentPos - tabSize;
            if (currentPos < 0) {
                currentPos = 0;
            }
            newLine = prependWhiteSpace(currentLine, currentPos);
        } else if (currentLine.indexOf("$ENDSWITCH") === 0) {
            // Decrease current position by 2*TabSize, then insert line at new position
            currentPos = currentPos - tabSize * 2;
            if (currentPos < 0) {
                currentPos = 0;
            }
            newLine = prependWhiteSpace(currentLine, currentPos);
        } else if (
            currentLine.indexOf("$ELSEIF") === 0 ||
            currentLine.indexOf("$ELSE") === 0 ||
            currentLine.indexOf("$CASE") === 0 ||
            currentLine.indexOf("$DEFAULT") === 0
        ) {
            // insert line at actual position - TabSize inserted
            currentPos = currentPos - tabSize;
            if (currentPos < 0) {
                currentPos = 0;
            }
            newLine = prependWhiteSpace(currentLine, currentPos);
            currentPos = currentPos + tabSize;
        } else {
            // insert line at actual position
            newLine = prependWhiteSpace(currentLine, currentPos);
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
        textEdits.push(TextEdit.replace(oldRange, newLine));
    }

    // indent multilines
    syntaxArray.multilines.forEach((multiline: Match) => {
        const start = multiline.location.start.line;
        const end = multiline.location.end.line;
        for (let lineNumber = start; lineNumber < end; lineNumber++) {
            const lineRange = Range.create(
                Position.create(lineNumber, 0),
                Position.create(lineNumber, lines[lineNumber].length));
            const line = lines[lineNumber];
            newLine = prependWhiteSpace(line, tabSize).trimEnd();
            textEdits.push(TextEdit.replace(lineRange, newLine));
        }
    });

    //filter textEdits to only format selected range
    return textEdits.filter(edit =>
        range === undefined || (
            compareLocations(edit.range.start, range.start) >= 0 &&
            compareLocations(edit.range.end, range.end) <= 0
        )
    );
}

function prependWhiteSpace(currentLine: string, whiteSpaces: number): string {
    return " ".repeat(whiteSpaces) + currentLine;
}