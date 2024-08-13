import { TextDocument } from "vscode-languageserver-textdocument";
import { isMatch, Match, MatchType, Position } from "./parserClasses";
import { findPreciseMatchOfTypes } from "./parserSearching";
import { ParseResults } from "./parsingResults";
import { Hover, Range } from "vscode-languageserver";
import { getCycles, getISGCycleByName } from "./cycles";
import path = require("path");
import { getDefinition } from "./parserGlue";
import { getDocByUri } from "./fileSystem";
import { getLocale, Locale } from "./config";
/**
 * Returns the hover information for the given position in the document.
 * Currently it supports cycle call and cycle parameter hover. 
 * @param position the zero-based position in the document 
 * @param textDocument the document to get the hover information for 
 * @returns the hover information item for the given position 
 */
export function getHoverInformation(position: Position, textDocument: TextDocument, rootPaths: string[] | null, openDocs: Map<string, TextDocument>): Hover | null {
    // parse to check which type of hover information is needed
    // supported types are cycle call, cycle parameter, subprogram call
    const parseResults: ParseResults = new ParseResults(textDocument.getText());
    const ast = parseResults.results.fileTree;
    const match = findPreciseMatchOfTypes(ast, position, [
        MatchType.globalCycleCall,
        MatchType.localCycleCall,
        MatchType.globalPrgCall,
        MatchType.localPrgCall
    ]);
    // if no match found, no hover information can be provided
    if (!match) { return null; }

    // cycle call of known isg cycle -> we can provide hover information via json file
    if (match?.type === MatchType.globalCycleCall && match.name && getISGCycleByName(match.name)) {
        return getHoverForISGCycleCall(position, match);
    }

    // cycle call with no known isg cycle or program call
    else if ([MatchType.globalCycleCall, MatchType.localCycleCall, MatchType.globalPrgCall, MatchType.localPrgCall].includes(match.type)) {
        return getHoverForSubProgramCall(textDocument, position, match, rootPaths, openDocs, parseResults);
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
function getHoverForISGCycleCall(position: Position, cycleMatch: Match): Hover | null {
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

/**
 * Returns the hover information for the given position which is within the subprogram/cycle call which can not be found in the cycles.json file.
 * @param textDocument the document to get the hover information for
 * @param position the zero-based position in the document 
 * @param subProgramCall the subprogram/cycle call match containing the position 
 * @param rootPaths the root paths of the workspace 
 * @param openDocs the open documents of the workspace 
 * @param parseResults the parse results of the document
 * @returns the hover information item for the given position, null if no hover information is found
 */
function getHoverForSubProgramCall(textDocument: TextDocument, position: Position, subProgramCall: Match, rootPaths: string[] | null, openDocs: Map<string, TextDocument>, parseResults: ParseResults): Hover | null {
    const definitionResults = getDefinition(parseResults, position, textDocument.uri, rootPaths);
    const definitions = definitionResults.definitionRanges;
    // if no definition found, return null
    if (definitions.length === 0) {
        return null;
    }

    // if multiple definitions found use the first one
    const def = definitions[0];
    const defDoc = getDocByUri(def.uri, openDocs);

    // basic hover content containing the name and if it is a local/global subprogram/cycle call
    const callType = getCallTypeString(subProgramCall);
    let hoverContent = `**${subProgramCall.name}** ${callType}\n\n`;

    // if the definition is in the same document, use the file tree of the current parse results
    let fileTree;
    if (textDocument.uri === def.uri) {
        fileTree = parseResults.results.fileTree;
    }
    // else the definition is in another document which has been already parsed while searching for the definition, use the file tree of the parsed document
    else {
        fileTree = definitionResults.uriToParsedDocs.get(def.uri)!.results.fileTree;
    }
    if (!fileTree) {
        throw new Error("No file tree found for definition of subprogram/cycle call " + subProgramCall.name);
    }


    // find the first position within defDoc before def that is not a whitespace (including newline/tab characters)
    let offset = defDoc.offsetAt(def.range.start) - 1;
    while (offset >= 0 && /\s/.test(defDoc.getText(Range.create(defDoc.positionAt(offset), defDoc.positionAt(offset + 1))))) {
        offset--;
    }

    // if a comment is present before the definition, add it to the hover content
    if (offset >= 0) {
        const commentMatch = findPreciseMatchOfTypes(fileTree, defDoc.positionAt(offset), [MatchType.prgDoc]);

        if (commentMatch) {
            hoverContent += `\n\n${getMarkdownDocumentationOfPrgDoc(commentMatch)}`;
        }
    }

    // add a link to the definition
    hoverContent += `[${def.uri}](${def.uri})`;
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

/**
 * @param subProgramCall  the match to get the call type string for
 * @returns the call type string in the current locale or empty string if match is not a subprogram/cycle call 
 */
function getCallTypeString(subProgramCall: Match) {
    let callType = "";
    const isEnglish = getLocale() === Locale.en;
    switch (subProgramCall.type) {
        case MatchType.globalCycleCall:
            callType = isEnglish ? "(Global Cycle Call)" : "(Globaler Zyklusaufruf)";
            break;
        case MatchType.localCycleCall:
            callType = isEnglish ? "(Local Cycle Call)" : "(Lokaler Zyklusaufruf)";
            break;
        case MatchType.globalPrgCall:
            callType = isEnglish ? "(Global Subprogram Call)" : "(Globaler Unterprogrammaufruf)";
            break;
        case MatchType.localPrgCall:
            callType = isEnglish ? "(Local Subprogram Call)" : "(Lokaler Unterprogrammaufruf)";
            break;
    }
    return callType;
}

/**
 * @param commentMatch the prgDoc match to get the documentation for 
 * @returns the markdown documentation of the prgDoc match 
 */
function getMarkdownDocumentationOfPrgDoc(commentMatch: Match): string {
    let markdown = "";
    for (const contentItem of commentMatch.content) {
        if (isMatch(contentItem)) {// contentItem is a special comment like a @param or @return
            const matchTypeString = contentItem.type.slice(0, -3); // remove "Doc" suffix
            const nameString = contentItem.name ? ` \`\`\`${contentItem.name}\`\`\` ` : "";
            const infoText = contentItem.content ? ` — ${contentItem.content}` : "";
            markdown += `*@${matchTypeString}*${nameString}${infoText}`;
        }
        else if (typeof contentItem === "string") { // contentItem is a simple comment
            markdown += `${contentItem}`;
        }
        else { // otherwise skip
            continue;
        }
        markdown += "\n\n";
    }
    return markdown;
}

