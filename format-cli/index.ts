import * as path from "path";
import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import { getFormatting } from "../server/src/format";
import * as diff from "diff";
import * as Os from "os";
import { get } from "http";
const inputPath = "C:\\ISG\\vscode-isg-cnc\\src\\test\\res\\formatter_test_unformatted.nc";
const tabSize = 2;
checkFormatting(inputPath, tabSize);

function checkFormatting(inputPath: string, tabSize: number) {
  // if not a valid absolute path check if it is a relative path
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
  const filePaths: string[] = [];
  // if folder, check all files in folder, if file check file
  if (fs.lstatSync(absolutePath).isDirectory()) {
    filePaths.push(...findAllFilesInFolder(absolutePath));
  } else {
    filePaths.push(absolutePath);
  }

  // check formatting of all files
  for (const filePath of filePaths) {
    const document = TextDocument.create(filePath, "isg-cnc", 0, fs.readFileSync(filePath, "utf8"));
    const textEdits = getFormatting(document, { tabSize: tabSize, insertSpaces: true }, undefined);

    // report formatting errors as error message
    if (textEdits.length > 0) {
      reportFormatError(filePath, document, textEdits);
    } else {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`File ${relativePath} is correctly formatted.`);
    }
  }
}

function findAllFilesInFolder(folderPath: string): string[] {
  const result: string[] = [];
  const dirEntries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of dirEntries) {
    const entryPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...findAllFilesInFolder(entryPath));
    } else if (entry.isFile()) {
      result.push(entryPath);
    }
  }
  return result;
}

function reportFormatError(filePath: string, document: TextDocument, textEdits: TextEdit[]) {
  const relativePath = path.relative(process.cwd(), filePath);
  // apply text edits to document
  const oldText = document.getText();
  let newText = applyEdits(document, textEdits);
  console.log(newText);
  // compare new text with old text and report differences
  const diffs: diff.Change[] = diff.diffLines(document.getText(), newText);
  let message = `Formatting errors in file ${relativePath}. Suggested changes:`;
  let diffCounter = 0;
  for (const diff of diffs) {
    continue;
    if (diff.added || diff.removed) {
      diffCounter++;
      message += `\n${diff.value}`;
    }
    if (diffCounter >= 3) {
      message += `\n...and ${diffs.length - 3} more`;
      break;
    }
  }
  const error = new Error(message);
  error.stack = undefined;
  throw error;
}

function applyEdits(document: TextDocument, textEdits: TextEdit[]): string {
  let updatedContent = document.getText();

  // Sort edits to apply them in the right order
  textEdits.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);

  // map contains mapping of old offsets to the new associated offset in sorted order
  const maxOffset = document.getText().length;
  const offsetMap = [
    new OffsetEntry(0, 0),
    new OffsetEntry(maxOffset, maxOffset)
  ];

  // Apply edits to the content
  textEdits.forEach(edit => {
    const startOffsetOld = document.offsetAt(edit.range.start);
    const endOffsetOld = document.offsetAt(edit.range.end);
    const newText = edit.newText;

    // calculate new offsets
    const startOffsetNew = getNewOffset(offsetMap, startOffsetOld);
    const endOffsetNew = getNewOffset(offsetMap, endOffsetOld);

    // apply edit to updated content
    updatedContent = updatedContent.substring(0, startOffsetNew) + newText + updatedContent.substring(endOffsetNew);

    // update offset map
    updateOffsetMap(offsetMap, startOffsetOld, newText);
  });

  return updatedContent;
}


/**
 * Returns the new offset for a given old offset.
 * @param offsetMap the offset map
 * @param startOffsetOld the old offset
 * @returns the new offset
*/
function getNewStartOffset(offsetMap: OffsetEntry[], startOffsetOld: number) {
  // search tupel (old, new) in offsetMap with greatest old <= startOffsetOld
  let index = 0;
  while (offsetMap[index].oldOff <= startOffsetOld) {
    index++;
  }
  return (offsetMap[index].newOff - offsetMap[index].oldOff) + (startOffsetOld - offsetMap[index].oldOff);
}

/**
 * Updates the offset map with the new offset.
 * @param offsetMap the offset map
 * @param endOffsetOld the old offset
 * @param newText the new text
 * @returns the new offset
 */
function getNewEndOffset(offsetMap: OffsetEntry[], endOffsetOld: number) {
  // search tupel (old, new) in offsetMap with greatest old <= startOffsetOld
  let index = 0;
  while (offsetMap[index].oldOff <= startOffsetOld) {
    index++;
  }
  return (offsetMap[index].newOff - offsetMap[index].oldOff) + (startOffsetOld - offsetMap[index].oldOff);
}

function updateOffsetMap(offsetMap: OffsetEntry[], startOffsetOld: number, newText: string) {
  // search tupel (old, new) in offsetMap with greatest old <= startOffsetOld
  let index = 0;
  while (offsetMap[index].oldOff <= startOffsetOld) {
    index++;
  }
  // update all entrys wher
}

/**
 * Maps an old offset to a new offset.
 */
class OffsetEntry {
  constructor(public oldOff: number, public newOff: number) { }
}

