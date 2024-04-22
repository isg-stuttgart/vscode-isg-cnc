import { TextDocument } from "vscode-languageserver-textdocument";
import { Match, MatchType, Position } from "./parserClasses";
import { findPreciseMatchOfTypes } from "./parserSearching";
import { ParseResults } from "./parsingResults";
import { Hover } from "vscode-languageserver";
import { getCycles } from "./cycles";
import path = require("path");

/**
 * Returns the hover information for the given position in the document.
 * Currently it supports cycle call and cycle parameter hover. 
 * @param position the zero-based position in the document 
 * @param textDocument the document to get the hover information for 
 * @returns the hover information item for the given position 
 */
export function getHoverInformation(position: Position, textDocument: TextDocument): Hover | null {
    // check if hovering is within a cycle call and return the fitting hover information if so
    const parseResults: ParseResults = new ParseResults(textDocument.getText());
    const ast = parseResults.results.fileTree;
    const cycle = findPreciseMatchOfTypes(ast, position, [MatchType.globalCycleCall]);
    if (cycle) {
        return getHoverForCycleCall(position, cycle);
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
