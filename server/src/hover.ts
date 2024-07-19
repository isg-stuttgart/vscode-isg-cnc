import { TextDocument } from "vscode-languageserver-textdocument";
import { Match, MatchType, Position } from "./parserClasses";
import { findPreciseMatchOfTypes } from "./parserSearching";
import { ParseResults } from "./parsingResults";
import { Hover, Range } from "vscode-languageserver";
import { getCycles } from "./cycles";
import path = require("path");
import { getDefinition } from "./parserGlue";
import fs = require("fs");
/**
 * Returns the hover information for the given position in the document.
 * Currently it supports cycle call and cycle parameter hover. 
 * @param position the zero-based position in the document 
 * @param textDocument the document to get the hover information for 
 * @returns the hover information item for the given position 
 */
export function getHoverInformation(position: Position, textDocument: TextDocument, rootPaths: string[] | null, openDocs: Map<string, TextDocument>): Hover | null {
    // check if hovering is within a cycle call and return the fitting hover information if so
    const parseResults: ParseResults = new ParseResults(textDocument.getText());
    const ast = parseResults.results.fileTree;

    //cycle call
    const cycle = findPreciseMatchOfTypes(ast, position, [MatchType.globalCycleCall]);
    if (cycle) {
        return getHoverForCycleCall(position, cycle);
    }


    const subProgramCall = findPreciseMatchOfTypes(ast, position, [MatchType.localPrgCall, MatchType.globalPrgCall]);
    if (subProgramCall) {
        return getHoverForSubProgramCall(textDocument, position, subProgramCall, rootPaths, openDocs, parseResults);
    }

    // no hover information found
    return null;
}

/**
 * Returns the hover information for the given position which is within the cycle call.
 * @param position the zero-based position in the document 
 * @param cycleMatch the cycle call match containing the position 
 * @returns the hover information item for the given position, null if no hover information is found 
 */
function getHoverForCycleCall(position: Position, cycleMatch: Match): Hover | null {
    // find the cycle object fitting to the name of the cycle call
    if (!cycleMatch.name) { return null; }
    const cycleName = path.parse(cycleMatch.name).name;
    const cycle = getCycles().find(c => c.name === cycleName);
    if (!cycle) { return null; }
    // find the most precise match being either the cycle name or a parameter
    const cycleSubMatch = findPreciseMatchOfTypes(cycleMatch, position, [MatchType.globalCycleCallName, MatchType.cycleParameter]);
    if (!cycleSubMatch) { return null; }
    // if on cycle name, show cycle documentation
    if (cycleSubMatch.type === MatchType.globalCycleCallName) {
        return {
            contents: cycle.getMarkupDocumentation(),
            range: {
                start: {
                    line: cycleSubMatch.location.start.line - 1,
                    character: cycleSubMatch.location.start.column - 1
                },
                end: {
                    line: cycleSubMatch.location.end.line - 1,
                    character: cycleSubMatch.location.end.column - 1
                }
            }
        };
    }
    // else if on cycle parameter, show parameter documentation
    else if (cycleSubMatch.type === MatchType.cycleParameter) {
        const parameter = cycle.parameterList.find(p => p.name === cycleSubMatch.name);
        return parameter ? {
            contents: parameter.getMarkupDocumentation(),
            range: {
                start: {
                    line: cycleSubMatch.location.start.line - 1,
                    character: cycleSubMatch.location.start.column - 1
                },
                end: {
                    line: cycleSubMatch.location.end.line - 1,
                    character: cycleSubMatch.location.end.column - 1
                }
            }
        } : null;
    }

    // no hover information found
    return null;
}
function getHoverForSubProgramCall(textDocument: TextDocument, position: Position, subProgramCall: Match, rootPaths: string[] | null, openDocs: Map<string, TextDocument>, parseResults: ParseResults): Hover | null {
    const definitions = getDefinition(textDocument.getText(), position, textDocument.uri, rootPaths);

    // if no definition found, return null
    if (definitions.length === 0) {
        return null;
    }

    // if multiple definitions found use the first one
    const def = definitions[0];
    let defDoc = openDocs.get(def.uri);
    // if no fitting open document found, read from fs
    if (!defDoc) {
        const defContent = fs.readFileSync(new URL(def.uri), "utf8");
        defDoc = TextDocument.create(def.uri, "prg", 0, defContent);
    }
    // find the first position within defDoc before def that is not a whitespace (including newline/tab characters)
    let offset = defDoc.offsetAt(def.range.start) - 1;
    while (offset >= 0 && /\s/.test(defDoc.getText(Range.create(defDoc.positionAt(offset), defDoc.positionAt(offset + 1))))) {
        offset--;
    }


    let hoverContent = `**${subProgramCall.name}**\n\n[${def.uri}](file://${def.uri})`;
    const fileTree = textDocument.uri === def.uri ? parseResults.results.fileTree : new ParseResults(defDoc.getText()).results.fileTree;

    if (offset >= 0) {
        // check if a comment is present before the definition
        const commentMatch = findPreciseMatchOfTypes(fileTree, defDoc.positionAt(offset), [MatchType.comment]);
        if (commentMatch) {
            hoverContent += `\n\n${commentMatch.text}`;
        }
    }

    return {
        contents: {
            kind: "markdown",
            value: hoverContent
        },
        range: {
            start: {
                line: subProgramCall.location.start.line - 1,
                character: subProgramCall.location.start.column - 1
            },
            end: {
                line: subProgramCall.location.end.line - 1,
                character: subProgramCall.location.end.column - 1
            }
        }
    };
}

