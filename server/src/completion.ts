import { CompletionItem, CompletionItemKind, InsertTextFormat, InsertTextMode } from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';
import { CycleSnippetFormatting, Locale, getCycleSnippetFormatting, getDocumentationPathWithLocale, getExtensionForCycles, getLocale } from './config';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as ls from 'vscode-languageserver';
import { Position } from './parserClasses';

let cycles: Cycle[];
let staticCycleCompletions: CompletionItem[];

export function getCompletions(pos: Position, doc: TextDocument): CompletionItem[] {
    // if the position is within a cycle call, don't suggest cycle snippets but fitting parameters
    // TODO

    // if the position is at a fitting prefix of a cycle, adapt fitting cycle completions to replace the prefix
    let completions: CompletionItem[] = JSON.parse(JSON.stringify(staticCycleCompletions));

    let startCharacter = pos.character - 1;
    while (startCharacter >= 0) {
        const text = doc.getText({
            start: { line: pos.line, character: startCharacter },
            end: { line: pos.line, character: pos.character }
        });

        if (text.startsWith("L ")) {
            for (const completion of completions) {
                // if the completion starts with the text, adapt it to replace the text
                if (completion.insertText && completion.insertText.startsWith(text)) {
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
 * Reads the res/cycles.json file and returns a list of {@link Cycle} objects from it.
 * @returns a list of cycles
 */
function getCycles(): Cycle[] {
    const cyclesPath = path.join(__dirname, "..", "res", "cycles.json");
    const cyclesJson = JSON.parse(fs.readFileSync(cyclesPath, "utf8"));
    return cyclesJson.map((cycle: any) => jsonCycleToCycle(cycle));
}


/**
 * Creates completion items for all cycles in the cycles.json file based on the current locale and cycle snippet formatting.
 * @param cycles the cycles to create completions for 
 * @returns a list of completion items for the cycles 
 */
function getStaticCycleCompletions(cycles: Cycle[]): CompletionItem[] {
    const completions: CompletionItem[] = [];
    const snippetFormat: CycleSnippetFormatting = getCycleSnippetFormatting();
    for (const cycle of cycles) {
        completions.push(getStaticCycleCompletion(cycle, true, snippetFormat));
        completions.push(getStaticCycleCompletion(cycle, false, snippetFormat));
    }
    return completions;
}

/**
 * Updates the static cycle completions based on the current settings.
 */
export function updateStaticCycleCompletions() {
    staticCycleCompletions = getStaticCycleCompletions(cycles);
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
        snippet += sep + "@" + parameter.name + "=${" + counter + ":" + parameter.name.toLowerCase() + "}";
        if(counter <= 5){
            preview += sep + "@" + parameter.name + "=" + parameter.name.toLowerCase();
        }
        counter++;
    }
    snippet += "]";
    preview += counter <= 5 ? "]" : " ...]";

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

function getDocumentationPath(cycle: Cycle, parametersInsteadOverview: boolean): string | undefined {
    if (cycle.documentationReference) {
        const id: string = parametersInsteadOverview ? cycle.documentationReference.parameter : cycle.documentationReference.overview;
        return getDocumentationPathWithLocale() + "#" + id;
    } else {
        return undefined;
    }
}
class Cycle {
    name: string;
    media: string;
    documentationReference: DocumentationReference | undefined;
    descriptionDictionary: DescriptionDictionary;
    parameterList: Parameter[];
    constructor(name: string, media: string, documentationReference: DocumentationReference | undefined, descriptionDictionary: DescriptionDictionary, parameterList: Parameter[]) {
        this.name = name;
        this.media = media;
        this.documentationReference = documentationReference;
        this.descriptionDictionary = descriptionDictionary;
        this.parameterList = parameterList;
    }
}

class Parameter {
    name: string;
    media: string;
    descriptionDictionary: { "en-US": string, "de-DE": string };
    requirementDictionary: RequirementDictionary;
    dependencyList: string[];
    constructor(
        name: string,
        media: string,
        descriptionDictionary: { "en-US": string, "de-DE": string }, requirementDictionary: RequirementDictionary,
        dependencyList: string[]
    ) {
        this.name = name;
        this.media = media;
        this.descriptionDictionary = descriptionDictionary;
        this.requirementDictionary = requirementDictionary;
        this.dependencyList = dependencyList;
    }
}

class RequirementDictionary {
    min: number;
    max: number;
    default: string;
    notNull: boolean;
    required: boolean;
    constructor(min: number | string, max: number | string, defaultVal: string, notNull: boolean | string, required: boolean | string) {
        this.min = typeof min === "number" ? min : parseInt(min);
        this.max = typeof max === "number" ? max : parseInt(max);
        this.default = defaultVal;
        this.notNull = typeof notNull === "boolean" ? notNull : notNull === "true";
        this.required = typeof required === "boolean" ? required : required === "true";
    }
}

class DocumentationReference {
    overview: string;
    parameter: string;
    constructor(overview: string, parameter: string) {
        this.overview = overview;
        this.parameter = parameter;
    }
}

class DescriptionDictionary {
    enUS: string;
    deDE: string;
    constructor(en: string, de: string) {
        this.enUS = en;
        this.deDE = de;
    }
    getDescription(locale: Locale): string {
        return locale === Locale.en ? this.enUS : this.deDE;
    }
}
function jsonCycleToCycle(cycle: any): Cycle {
    const parameterList = cycle.ParameterList.map((parameter: any) => jsonParameterToParameter(parameter));
    const documentationReference = cycle.DocumentationReference ? new DocumentationReference(cycle.DocumentationReference.Overview, cycle.DocumentationReference.Parameter) : undefined;
    const descriptionDictionary = new DescriptionDictionary(cycle.DescriptionDictionary["en-US"], cycle.DescriptionDictionary["de-DE"]);
    return new Cycle(
        cycle.Name,
        cycle.Media,
        documentationReference,
        descriptionDictionary,
        parameterList
    );

}
function jsonParameterToParameter(parameter: any): Parameter {
    const requirementDictionary = new RequirementDictionary(
        parameter.RequirementDictionary.Min,
        parameter.RequirementDictionary.Max,
        parameter.RequirementDictionary.Default,
        parameter.RequirementDictionary.NotNull,
        parameter.RequirementDictionary.Required
    );
    return new Parameter(
        parameter.Name,
        parameter.Media,
        parameter.DescriptionDictionary,
        requirementDictionary,
        parameter.DependencyList
    );
}

// pre computed completions
cycles = getCycles();
staticCycleCompletions = getStaticCycleCompletions(cycles);


