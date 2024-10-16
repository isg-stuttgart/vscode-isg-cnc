import { TextDocument } from "vscode-languageserver-textdocument";
import { isMatch, Match, Position } from "./parserClasses";
import { findPreciseMatchOfTypes } from "./parserSearching";
import { ParseResults } from "./parsingResults";
import { Hover, Range } from "vscode-languageserver";
import { getCycles, getISGCycleByName } from "./cycles";
import path = require("path");
import { getDefinition } from "./getDefinitionAndReferences";
import { getDocByUri } from "./fileSystem";
import { getLocale, Locale } from "./config";
import { getSurroundingVar } from "./stringSearching";
import { MatchType } from "./matchTypes";
/**
 * Returns the hover information for the given position in the document.
 * Currently it supports cycle call and cycle parameter hover. 
 * @param position the zero-based position in the document 
 * @param textDocument the document to get the hover information for 
 * @returns the hover information item for the given position 
 */
export function getHoverInformation(position: Position, textDocument: TextDocument, rootPaths: string[] | null, openDocs: Map<string, TextDocument>): Hover | null {
    // parse to check which type of hover information is needed
    // supported types are cycle call, cycle parameter, subprogram call, GOTO, variable
    const parseResults: ParseResults = new ParseResults(textDocument.getText());
    const ast = parseResults.results.fileTree;
    const match = findPreciseMatchOfTypes(ast, position, [
        MatchType.localPrgDefinitionName,
        MatchType.mainPrgName,
        MatchType.globalCycleCall,
        MatchType.localCycleCall,
        MatchType.globalPrgCall,
        MatchType.localPrgCall,
        MatchType.gotoBlocknumber,
        MatchType.gotoLabel,
        MatchType.label,
        MatchType.blockNumberLabel,
        MatchType.variable,
        MatchType.varDeclaration
    ]);
    // if no match found, no hover information can be provided
    if (!match) { return null; }

    // cycle call of known isg cycle -> we can provide hover information via json file
    if (match?.type === MatchType.globalCycleCall && match.name && getISGCycleByName(match.name)) {
        return getHoverForISGCycleCall(position, match);
    }

    // basic hover content containing the name and what hover type it is
    const callType = getHoverTypeString(match);
    const name = [MatchType.blockNumberLabel, MatchType.gotoBlocknumber].includes(match.type) ? "N" + match.name : match.name;
    let hoverContent = `**${name}** ${callType}\n\n`;
    let commentOffset = -1;
    let defDocument = textDocument;
    let defTree = ast;

    // if it is a variable, show the variable declaration plus the variable documentation
    const surroundingVar = getSurroundingVar(textDocument.getText(), position);
    if (surroundingVar) {
        const varDefResults = getDefinitionResultsForHover(position, textDocument, rootPaths, openDocs, parseResults);
        if (!varDefResults) { return null; }
        // look 1. for a docComment before the variable declaration
        commentOffset = findFirstNonWhitespaceOffsetBefore(varDefResults.defDoc, varDefResults.defFileRange.range.start);
        const commentMatch = findPreciseMatchOfTypes(varDefResults.defParseResults.results.fileTree, varDefResults.defDoc.positionAt(commentOffset), [MatchType.blockComment]);
        if (commentMatch) {
            hoverContent += getMarkdownDocumentationOfPrgDoc(commentMatch);
        } else {
            // 2. for a line comment behind the variable declaration
            commentOffset = findFirstNonWhitespaceOffsetAfter(varDefResults.defDoc, varDefResults.defFileRange.range.end);
            const lineComment = findPreciseMatchOfTypes(varDefResults.defParseResults.results.fileTree, varDefResults.defDoc.positionAt(commentOffset), [MatchType.lineComment]);
            if (lineComment) {
                hoverContent += `${lineComment.content}\n\n`;
            }
        }
        // comment searching done for variable
        commentOffset = -1;
    }

    // for localSubPrg, mainPrgs which are not at file beginning, label and blockNumberlabel just look before the match for a prgDoc
    if ([MatchType.mainPrgName, MatchType.localPrgDefinitionName, MatchType.label, MatchType.blockNumberLabel].includes(match.type)) {
        let startPos = new Position(match.location.start.line - 1, match.location.start.column - 1);
        // if hovered a mainPrgName or a localPrgDefinitionName, uste the start of the respective program/subprogram instead of the name
        if (match.type === MatchType.mainPrgName || match.type === MatchType.localPrgDefinitionName) {
            const prgMatch = findPreciseMatchOfTypes(ast, startPos, [MatchType.mainPrg, MatchType.localSubPrg]);
            if (prgMatch) {
                startPos = new Position(prgMatch.location.start.line - 1, prgMatch.location.start.column - 1);
            }
        }
        // if it is a main program and at file start, start at the beginning of the file and find the first position which is not a whitespace
        if (match.type === MatchType.mainPrgName && parseResults.results.mainPrgLoc?.start.line === 1) {
            commentOffset = findFirstNonWhitespaceOffsetAfter(defDocument, new Position(0, 0));
        } else {
            commentOffset = findFirstNonWhitespaceOffsetBefore(defDocument, startPos);
        }
    }
    // for any prg/cycle call, label and blockNumberLabel we have to locally search for the definition and find the offset before it
    else if ([MatchType.localPrgCall, MatchType.localCycleCall, MatchType.globalCycleCall, MatchType.globalPrgCall,
    MatchType.gotoBlocknumber, MatchType.gotoLabel].includes(match.type)) {
        const definitionResults = getDefinitionResultsForHover(position, textDocument, rootPaths, openDocs, parseResults);
        if (!definitionResults) { return null; }
        defDocument = definitionResults.defDoc;
        defTree = definitionResults.defParseResults.results.fileTree;
        const startPos = definitionResults.defFileRange.range.start;

        // if the definition is a main program and at file start, start at the beginning of the file and find the first position which is not a whitespace (including newline/tab characters)
        if ([MatchType.globalCycleCall, MatchType.globalPrgCall].includes(match.type)
            && definitionResults.defParseResults.results.mainPrgLoc?.start.line === 1) {
            commentOffset = findFirstNonWhitespaceOffsetAfter(defDocument, new Position(0, 0));
        } else {
            commentOffset = findFirstNonWhitespaceOffsetBefore(defDocument, startPos);
        }
    }


    // try to resolve a blockComment at found offset
    if (commentOffset >= 0) {
        const commentMatch = findPreciseMatchOfTypes(defTree, defDocument.positionAt(commentOffset), [MatchType.blockComment]);
        if (commentMatch) {
            hoverContent += getMarkdownDocumentationOfPrgDoc(commentMatch);
        }
    }

    // add a link to the definition if it is in another document
    if (defDocument.uri !== textDocument.uri) {
        hoverContent += `File Location: [${defDocument.uri}](${defDocument.uri})`;
    }
    // return hover element
    let hover: Hover | null = null;
    if (hoverContent !== "") {
        hover = {
            contents: {
                kind: "markdown",
                value: hoverContent
            },
            range: {
                start: {
                    line: match.location.start.line - 1,
                    character: match.location.start.column - 1
                },
                end: {
                    line: match.location.end.line - 1,
                    character: match.location.end.column - 1
                }
            }
        };
    }
    return hover;
}

/**
 * 
 * @param defDoc the document to search in
 * @param position the position to start the search from
 * @returns the first offset after position which is not a whitespace in the document 
 */
function findFirstNonWhitespaceOffsetAfter(defDoc: TextDocument, position: Position): number {
    let commentOffset = defDoc.offsetAt(position);
    while (commentOffset < defDoc.getText().length && /\s/.test(defDoc.getText(Range.create(defDoc.positionAt(commentOffset), defDoc.positionAt(commentOffset + 1))))) {
        commentOffset++;
    }
    return commentOffset;
}

/**
 * @param defDoc the document to search in 
 * @param position the position to start the search from 
 * @returns the first offset which is not a whitespace going backwards from the given position (not included) in the document 
 */
function findFirstNonWhitespaceOffsetBefore(defDoc: TextDocument, position: Position): number {
    // start at the start of the line, which avoids n-numbers between comment and definition to block the search
    // this can be done because #COMMENT END is always at the end of the line
    const newPos = new Position(position.line, 0);
    let offset = defDoc.offsetAt(newPos) - 1;
    while (offset >= 0 && /\s/.test(defDoc.getText(Range.create(defDoc.positionAt(offset), defDoc.positionAt(offset + 1)))) && offset < defDoc.getText().length) {
        offset--;
    }
    return offset;
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
            contents: cycle.getMarkupDocumentation(false),
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
 * Returns some important information for the definition of the match at the given position including the document, the parse results and the range of the definition.
 * @param position  the position to get the definition information for
 * @param textDocument the document where the position is in
 * @param rootPaths the root paths of the workspace  
 * @param openDocs the open documents of the workspace 
 * @param parseResults the parse results of the document 
 * @returns an object containing the definition file range, the definition document and the parse results of the definition document 
 */
function getDefinitionResultsForHover(position: Position, textDocument: TextDocument, rootPaths: string[] | null, openDocs: Map<string, TextDocument>, parseResults: ParseResults) {
    const definitionResults = getDefinition(parseResults, position, textDocument.uri, rootPaths, openDocs);
    const definitions = definitionResults.definitionRanges;
    // if no definition found, return null
    if (definitions.length === 0) {
        return null;
    }

    // if multiple definitions found use the first one
    const def = definitions[0];
    const defDoc = getDocByUri(def.uri, openDocs);

    // if the definition is in the same document, use the parse results of the document
    let defParseResults;
    if (def.uri === textDocument.uri) {
        defParseResults = parseResults;
    }
    // else the definition is in another document which has been already parsed while searching for the definition, use the file tree of the parsed document
    else {
        defParseResults = definitionResults.uriToParsedDocs.get(def.uri)!;
    }
    if (!defParseResults) {
        throw new Error("No parse results found for definition of " + def.uri + " while getting hover information.");
    }

    return {
        defFileRange: def,
        defDoc,
        defParseResults
    };
}

/**
 * @param match the match to get the call type string for
 * @returns the hover type string in the current locale or empty string if match is not a valid type
 */
function getHoverTypeString(subProgramCall: Match) {
    let hoverType = "";
    const isEnglish = getLocale() === Locale.en;
    switch (subProgramCall.type) {
        case MatchType.localPrgDefinitionName:
            hoverType = isEnglish ? "Local Subprogram" : "Lokales Unterprogramm";
            break;
        case MatchType.mainPrgName:
            hoverType = isEnglish ? "Main Program" : "Hauptprogramm";
            break;
        case MatchType.globalCycleCall:
            hoverType = isEnglish ? "Global Cycle Call" : "Globaler Zyklusaufruf";
            break;
        case MatchType.localCycleCall:
            hoverType = isEnglish ? "Local Cycle Call" : "Lokaler Zyklusaufruf";
            break;
        case MatchType.globalPrgCall:
            hoverType = isEnglish ? "Global Subprogram Call" : "Globaler Unterprogrammaufruf";
            break;
        case MatchType.localPrgCall:
            hoverType = isEnglish ? "Local Subprogram Call" : "Lokaler Unterprogrammaufruf";
            break;
        case MatchType.gotoLabel:
            hoverType = "GOTO Label";
            break;
        case MatchType.gotoBlocknumber:
            hoverType = isEnglish ? "GOTO Blocknumber" : "GOTO Blocknummer";
            break;
        case MatchType.label:
            hoverType = "Label";
            break;
        case MatchType.blockNumberLabel:
            hoverType = isEnglish ? "Blocknumber Label" : "Blocknummer Label";
            break;
        case MatchType.varDeclaration:
            hoverType = isEnglish ? "Variable Declaration" : "Variablendeklaration";
            break;
        case MatchType.variable:
            hoverType = isEnglish ? "Variable" : "Variable";
            break;
        default:
            return "";
    }
    return "(" + hoverType + ")";
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

