import { Position, Range, TextEdit } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseResults } from './parsingResults';
import type { Match } from './parserClasses';
import { regExpBlocknumbers, regExpLabels } from '../../src/util/ncBlockRegex';

export function provideDocumentFormattingEdits(
	document: TextDocument,
	range: Range,
	tabSize: number
): TextEdit[] {
	let currentLine = '';
	let newLine = '';
	let saveBlockNumber = '';
	let currentPos = 0;
	let isCommentBlock = false;
	const whiteSpaces = tabSize;
	const textEdits: TextEdit[] = [];
	const lines = document.getText().split(/\r\n|\r|\n/);
	const syntaxArray = new ParseResults(document.getText()).syntaxArray;

	for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
		const lineText = lines[lineNumber] ?? '';
		const lineRange = getLineRange(lineNumber, lineText);
		saveBlockNumber = '';
		newLine = '';
		if (lineText.startsWith('#COMMENT BEGIN')) {
			isCommentBlock = true;
			continue;
		}
		if (lineText.startsWith('#COMMENT END')) {
			isCommentBlock = false;
			continue;
		}
		// skip program name, comment lines and empty lines
		if (lineText.startsWith('%') || isCommentBlock) {
			continue;
		}

		// Get blocknumber and line text
		const matchLabel = regExpLabels.exec(lineText);
		const matchBlocknumber = regExpBlocknumbers.exec(lineText);
		const gotoPos = lineText.indexOf('$GOTO');

		if (matchBlocknumber !== null && matchBlocknumber.index !== undefined) {
			const blocknumberStart = lineText.indexOf(matchBlocknumber[0]);
			const blocknumberEnd = blocknumberStart + matchBlocknumber[0].length;
			if (matchLabel !== null && matchBlocknumber.index !== undefined) {
				if (gotoPos === -1 || lineText.indexOf(matchLabel[0]) < gotoPos) {
					// label found
					if (lineText.indexOf(matchLabel[0].trim()) === lineText.indexOf(matchBlocknumber[0].trim())) {
						// if blocknumber and label the same
						currentLine = lineText.trim();
					} else {
						saveBlockNumber = lineText.slice(blocknumberStart, blocknumberEnd).trim();
						currentLine = lineText.slice(blocknumberEnd).trim();
					}
				} else {
					// jump to label found
					saveBlockNumber = lineText.slice(blocknumberStart, blocknumberEnd).trim();
					currentLine = lineText.slice(blocknumberEnd).trim();
				}
			} else {
				saveBlockNumber = lineText.slice(blocknumberStart, blocknumberEnd).trim();
				currentLine = lineText.slice(blocknumberEnd).trim();
			}
		} else {
			currentLine = lineText.trim();
		}

		if (currentLine.length === 0 && saveBlockNumber.length === 0) {
			// empty line trim whitespaces and write to edits buffer
			textEdits.push(TextEdit.replace(lineRange, currentLine));
			continue;
		}
		if (
			currentLine.indexOf('$DO') === 0 ||
			currentLine.indexOf('$REPEAT') === 0 ||
			currentLine.indexOf('$FOR') === 0 ||
			(currentLine.indexOf('$IF') === 0 && currentLine.indexOf('$GOTO') === -1) ||
			currentLine.indexOf('$WHILE') === 0 ||
			currentLine.indexOf('#VAR') === 0
		) {
			// insert the line at the current position, then increase the current position by tabSize
			newLine = newLineForBeautifier(currentLine, currentPos);
			currentPos += whiteSpaces;
		} else if (currentLine.indexOf('$SWITCH') === 0) {
			// insert the line at the current position, then increase the current position by tabSize
			newLine = newLineForBeautifier(currentLine, currentPos);
			currentPos += whiteSpaces * 2;
		} else if (
			currentLine.indexOf('$ENDDO') === 0 ||
			currentLine.indexOf('$UNTIL') === 0 ||
			currentLine.indexOf('$ENDFOR') === 0 ||
			currentLine.indexOf('$ENDIF') === 0 ||
			currentLine.indexOf('$ENDWHILE') === 0 ||
			currentLine.indexOf('#ENDVAR') === 0
		) {
			// decrease the current position by tabSize, then insert the line at the new position
			currentPos = Math.max(0, currentPos - whiteSpaces);
			newLine = newLineForBeautifier(currentLine, currentPos);
		} else if (currentLine.indexOf('$ENDSWITCH') === 0) {
			// decrease the current position by tabSize, then insert the line at the new position
			currentPos = Math.max(0, currentPos - whiteSpaces * 2);
			newLine = newLineForBeautifier(currentLine, currentPos);
		} else if (
			currentLine.indexOf('$ELSEIF') === 0 ||
			currentLine.indexOf('$ELSE') === 0 ||
			currentLine.indexOf('$CASE') === 0 ||
			currentLine.indexOf('$DEFAULT') === 0
		) {
			// insert line at actual position - TabSize inserted
			currentPos = Math.max(0, currentPos - whiteSpaces);
			newLine = newLineForBeautifier(currentLine, currentPos);
			currentPos += whiteSpaces;
		} else {
			// insert line at actual position
			newLine = newLineForBeautifier(currentLine, currentPos);
		}

		if (saveBlockNumber.length !== 0) {
			newLine = ` ${newLine}`;
			if (saveBlockNumber.endsWith(':')) {
				newLine = saveBlockNumber + newLine.trimEnd().substring(1);
			} else {
				newLine = saveBlockNumber + newLine.trimEnd();
			}
		} else {
			newLine = newLine.trimEnd();
		}
		textEdits.push(TextEdit.replace(lineRange, newLine));
	}

	syntaxArray.multilines.forEach((multiline: Match) => {
		for (let lineNumber = multiline.location.start.line; lineNumber < multiline.location.end.line; lineNumber++) {
			const lineText = lines[lineNumber] ?? '';
			const lineRange = getLineRange(lineNumber, lineText);
			newLine = ' '.repeat(whiteSpaces) + lineText;
			if (containsRange(range, lineRange)) {
				textEdits.push(TextEdit.replace(lineRange, newLine));
			}
		}
	});

	//filter textEdits to only format selected range
	return textEdits.filter(edit => rangesIntersect(edit.range, range));
}

function getLineRange(lineNumber: number, lineText: string): Range {
	return Range.create(Position.create(lineNumber, 0), Position.create(lineNumber, lineText.length));
}

function containsRange(outer: Range, inner: Range): boolean {
	return comparePositions(outer.start, inner.start) <= 0 && comparePositions(outer.end, inner.end) >= 0;
}

function rangesIntersect(first: Range, second: Range): boolean {
	return comparePositions(first.start, first.end) !== 0 &&
		comparePositions(first.start, second.end) < 0 &&
		comparePositions(second.start, first.end) < 0;
}

function comparePositions(first: Position, second: Position): number {
	return first.line - second.line || first.character - second.character;
}

function newLineForBeautifier(currentLine: string, currentPos: number): string {
	return ' '.repeat(currentPos) + currentLine;
}