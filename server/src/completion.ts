import { CompletionItem, CompletionItemKind, InsertTextFormat, InsertTextMode } from 'vscode-languageserver';
import { CycleSnippetFormatting, getCycleSnippetFormatting, getExtensionForCycles } from './config';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as ls from 'vscode-languageserver';
import { Match, MatchType, Position } from './parserClasses';
import { Cycle, getCycles } from './cycles';
import { findMatchesWithinPrgTree, findPreciseMatchOfTypes } from './parserSearching';
import { ParseResults } from './parsingResults';
import path = require('path');

let staticCycleCompletions: CompletionItem[];



export function getCompletions(pos: Position, doc: TextDocument): CompletionItem[] {
    const parseResults: ParseResults = new ParseResults(doc.getText());
    // if the position is within the parameterlist of a cycle call, don't suggest cycle snippets but fitting parameters
    const cycle = findPreciseMatchOfTypes(parseResults.results.fileTree, pos, [MatchType.globalCycleCall]);
    if (cycle) {
        return getCompletionsWithinCycle(pos, doc, cycle);
    }

    return getReplaceCompletion(pos, doc, staticCycleCompletions, "L ");
}

function getReplaceCompletion(pos: Position, doc: TextDocument, completionsToEdit: CompletionItem[], startFilter?: string): CompletionItem[] {
    const completions = JSON.parse(JSON.stringify(completionsToEdit));
    let startCharacter = pos.character - 1;
    while (startCharacter >= 0) {
        const text = doc.getText({
            start: { line: pos.line, character: startCharacter },
            end: { line: pos.line, character: pos.character }
        });

        if (!startFilter || text.toLowerCase().startsWith(startFilter)) { // saves a lot of checks
            for (const completion of completions) {
                // if the completion starts with the text, adapt it to replace the text
                if (completion.insertText && completion.insertText.toLowerCase().startsWith(text.toLowerCase())) {
                    completion.textEdit = ls.TextEdit.replace({
                        start: { line: pos.line, character: startCharacter },
                        end: { line: pos.line, character: pos.character }
                    }, completion.insertText);
                }
            }
        }
        startCharacter--;
    }
    return completions;
}

/**
 * Creates a completion item for a cycle based on the given parameters.
 * @param cycle the cycle to create the completion for
 * @param onlyRequired whether to include only required parameters
 * @param snippetFormat the formatting of the snippet (multi-line or single-line parameters) 
 * @returns the completion item for the cycle
 */
function getStaticCycleCompletion(cycle: Cycle, onlyRequired: boolean, snippetFormat: CycleSnippetFormatting): CompletionItem {
    const fileExtension = getExtensionForCycles();
    const sep = snippetFormat === CycleSnippetFormatting.multiLine ? " \\\n\t" : " ";
    const parameters = onlyRequired ? cycle.parameterList.filter(p => p.requirementDictionary.required) : cycle.parameterList;
    const requiredString = onlyRequired ? "required" : "all";

    // Create the snippet and preview depending on the parameters
    let snippet = "L CYCLE [NAME=" + cycle.name + fileExtension;
    let preview = "L CYCLE [NAME=" + cycle.name + fileExtension;
    let counter = 1;
    for (const parameter of parameters) {
        snippet += sep + "@" + parameter.name + "=" + parameter.getPlaceholder(counter);
        if (counter <= 3) {
            preview += sep + "@" + parameter.name + "=" + parameter.name.toLowerCase();
        }
        counter++;
    }
    snippet += "]";
    preview += counter <= 3 ? "]" : sep + "...]";

    const completionItem: CompletionItem = {
        label: "Cycle: " + cycle.name + " (" + requiredString + " params)",
        kind: CompletionItemKind.Function,
        detail: preview,
        documentation: cycle.getMarkupDocumentation(),
        insertTextFormat: InsertTextFormat.Snippet,
        insertTextMode: InsertTextMode.adjustIndentation,
        filterText: preview,
        insertText: snippet
    };
    return completionItem;
}

/**
 * Updates the static cycle completions based on the current settings.
 */
export function updateStaticCycleCompletions(): void {
    const cycles: Cycle[] = getCycles();
    const completions: CompletionItem[] = [];
    const snippetFormat: CycleSnippetFormatting = getCycleSnippetFormatting();
    for (const cycle of cycles) {
        completions.push(getStaticCycleCompletion(cycle, true, snippetFormat));
        completions.push(getStaticCycleCompletion(cycle, false, snippetFormat));
    }
    staticCycleCompletions = completions;
}
// update once on startup
updateStaticCycleCompletions();


function getCompletionsWithinCycle(pos: Position, doc: TextDocument, cycleMatch: Match): CompletionItem[] {
    // trim file ending from cycle name
    if (!cycleMatch.name) {
        return [];
    }
    const cycleName = path.parse(cycleMatch.name).name;
    const cycle = getCycles().find(c => c.name === cycleName);
    const currentParamList = findPreciseMatchOfTypes(cycleMatch.content, pos, [MatchType.cycleParamList]);
    if (!cycle) {
        return [];
    }
    const currentParamMatches = findMatchesWithinPrgTree(currentParamList?.content, [MatchType.cycleParameter], undefined);
    const missingParams = cycle.parameterList.filter(p => !currentParamMatches.find(m => m.name === p.name));
    const completions: CompletionItem[] = [];
    for (const param of missingParams) {
        const insertText = "@" + param.name + "=" + param.getPlaceholder(1);
        completions.push({
            label: param.name,
            kind: CompletionItemKind.Field,
            documentation: param.getMarkupDocumentation(),
            insertText: insertText,
            insertTextFormat: InsertTextFormat.Snippet,
            filterText: insertText
        });
    }
    return getReplaceCompletion(pos, doc, completions, "@");
}


