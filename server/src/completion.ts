import { CompletionItem, CompletionItemKind, InsertTextFormat, InsertTextMode } from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';
import { getExtensionForCycles, getLocale } from './config';
import { TextEdit } from 'vscode';


export function getCompletions(): CompletionItem[] {
    /** Cycle objects created by the cycles.json list  */
    const cycles: Cycle[] = getCycles();
    const cycleCompletions = getCycleCompletions(cycles);

    const completions: CompletionItem[] = cycleCompletions;
    return completions;
}

function getCycles(): Cycle[] {
    const cyclesPath = path.join(__dirname, "..", "res", "cycles.json");
    const cyclesJson = JSON.parse(fs.readFileSync(cyclesPath, "utf8"));
    return cyclesJson.map((cycle: any) => jsonCycleToCycle(cycle));
}

function getCycleCompletions(cycles: Cycle[]): CompletionItem[] {
    const completions: CompletionItem[] = [];
    for (const cycle of cycles) {
        completions.push(getCycleCompletion(cycle, true, true));
        completions.push(getCycleCompletion(cycle, false, true));
        completions.push(getCycleCompletion(cycle, true, false));
        completions.push(getCycleCompletion(cycle, false, false));
    }
    return completions;
}

function getCycleCompletion(cycle: Cycle, onlyRequired: boolean, multiLine: boolean): CompletionItem {
    const locale = getLocale();
    const fileExtension = getExtensionForCycles();
    const sep = multiLine ? " \\\n\t" : " ";
    const parameters = onlyRequired ? cycle.parameterList.filter(p => p.requirementDictionary.required) : cycle.parameterList;
    const requiredString = onlyRequired ? "required" : "all";
    const multiLineString = multiLine ? "multi-line" : "single-line";

    // Create the snippet depending on the parameters
    let snippet = "L Cycle [NAME=" + cycle.name + fileExtension;
    let counter = 1;
    for (const parameter of parameters) {
        snippet += sep +
            "@" + parameter.name
            + "=${" + counter + ":" + parameter.name.toLowerCase() + "}";
        counter++;
    }
    snippet += "]";
    const replaceRange = getReplaceRange();
    const textEdit = new TextEdit(replaceRange, snippet);
    const documentation = "Included parameters: " + requiredString
        + "\n" + "Formatting: " + multiLineString;
    return {
        label: "Cycle: " + cycle.name + " (" + requiredString + " params; " + multiLineString + ")",
        kind: CompletionItemKind.Function,
        detail: cycle.descriptionDictionary[locale],
        documentation: documentation,
        insertTextFormat: InsertTextFormat.Snippet,
        insertTextMode: InsertTextMode.adjustIndentation,
        filterText: snippet,
        textEdit
    };
}

class Cycle {
    name: string;
    media: string;
    descriptionDictionary: { "en-US": string, "de-DE": string };
    parameterList: Parameter[];
    constructor(name: string, media: string, descriptionDictionary: { "en-US": string, "de-DE": string }, parameterList: Parameter[]) {
        this.name = name;
        this.media = media;
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

function jsonCycleToCycle(cycle: any): Cycle {
    const parameterList = cycle.ParameterList.map((parameter: any) => jsonParameterToParameter(parameter));
    return new Cycle(
        cycle.Name,
        cycle.Media,
        cycle.DescriptionDictionary,
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

