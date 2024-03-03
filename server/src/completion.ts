import { CompletionItem, CompletionItemKind, InsertTextFormat, InsertTextMode } from 'vscode-languageserver';
import { CycleSnippetFormatting, getCycleSnippetFormatting, getDocumentationPathWithLocale, getExtensionForCycles, getLocale } from './config';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as ls from 'vscode-languageserver';
import { Position } from './parserClasses';
import { Cycle, Parameter, getCycles } from './cycles';

let staticCycleCompletions: CompletionItem[];



export function getCompletions(pos: Position, doc: TextDocument): CompletionItem[] {
    // if the position is within a cycle call, don't suggest cycle snippets but fitting parameters
    // TODO
    updateStaticCycleCompletions(); // TODO: remove this line on release
    // if the position is at a fitting prefix of a cycle, adapt fitting cycle completions to replace the prefix
    return getDynamicCycleCompletion(pos, doc);
}

function getDynamicCycleCompletion(pos: Position, doc: TextDocument) {
    let completions: CompletionItem[] = JSON.parse(JSON.stringify(staticCycleCompletions));
    let startCharacter = pos.character - 1;
    while (startCharacter >= 0) {
        const text = doc.getText({
            start: { line: pos.line, character: startCharacter },
            end: { line: pos.line, character: pos.character }
        });

        if (text.toLowerCase().startsWith("l ")) { // saves a lot of checks
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
    const locale = getLocale();
    const fileExtension = getExtensionForCycles();
    const sep = snippetFormat === CycleSnippetFormatting.multiLine ? " \\\n\t" : " ";
    const parameters = onlyRequired ? cycle.parameterList.filter(p => p.requirementDictionary.required) : cycle.parameterList;
    const requiredString = onlyRequired ? "required" : "all";

    // Create the snippet and preview depending on the parameters
    let snippet = "L Cycle [NAME=" + cycle.name + fileExtension;
    let preview = "L Cycle [NAME=" + cycle.name + fileExtension;
    let counter = 1;
    for (const parameter of parameters) {
        snippet += sep + "@" + parameter.name + "=" + getParamPlaceholder(parameter, counter);
        if (counter <= 5) {
            preview += sep + "@" + parameter.name + "=" + parameter.name.toLowerCase();
        }
        counter++;
    }
    snippet += "]";
    preview += counter <= 5 ? "]" : sep + "...]";

    const completionItem: CompletionItem = {
        label: "Cycle: " + cycle.name + " (" + requiredString + " params)",
        kind: CompletionItemKind.Function,
        detail: cycle.descriptionDictionary.getDescription(locale),
        documentation: "Preview:\n" + preview,
        insertTextFormat: InsertTextFormat.Snippet,
        insertTextMode: InsertTextMode.adjustIndentation,
        filterText: snippet,
        insertText: snippet
    };
    return completionItem;
}

/**
 * Get a placeholder for the given parameter with following cases from highest to lowest priority:
 * - Case 1: parameter has min and max with maximum difference of 10 -> use a choice
 * - Case 2: parameter has min and max but the difference is too big -> show the range as placeholder
 * - Case 3: parameter has a default value -> use the default value as placeholder
 * - Case 4: nothing special -> use the lowercase parameter name as placeholder
 * @param parameter the parameter to get the placeholder for 
 * @param tabstopNumber the number of the tabstop of this parameter
 * @returns the placeholder for the parameter 
 */
function getParamPlaceholder(parameter: Parameter, tabstopNumber: number) {
    const min = parameter.requirementDictionary.min;
    const max = parameter.requirementDictionary.max;
    const defaultVal = parameter.requirementDictionary.default;
    // case 1: parameter has min and max with maximum difference of 10 -> use a choice
    if (min !== undefined && max !== undefined && (max - min) <= 10) {
        const choices = [];
        for (let i = min; i <= max; i++) {
            choices.push(i.toString());
        }
        return "${" + tabstopNumber + "|" + choices.join(",") + "|}";
    }
    // case 2: parameter has min and max but the difference is too big -> show the range as placeholder
    else if (min !== undefined && max !== undefined) {
        return "${" + tabstopNumber + ":" + min + "-" + max + "}";
    }
    // case 3: parameter has a default value -> use the default value as placeholder
    else if (defaultVal) {
        return "${" + tabstopNumber + ":" + defaultVal + "}";
    }
    // case 4: nothing special -> use the lowercase parameter name as placeholder
    else {
        return "${" + tabstopNumber + ":" + parameter.name.toLowerCase() + "}";
    }
}

function getDocumentationPath(cycle: Cycle, parametersInsteadOverview: boolean): string | undefined {
    if (cycle.documentationReference) {
        const id: string = parametersInsteadOverview ? cycle.documentationReference.parameter : cycle.documentationReference.overview;
        return getDocumentationPathWithLocale() + "#" + id;
    } else {
        return undefined;
    }
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


