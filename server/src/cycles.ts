import * as path from 'path';
import * as fs from 'fs';
import { Locale } from './config';
let cycles: Cycle[];

/**
 * @returns a list of cycles generated from the cycles.json file
 */
export function getCycles(): Cycle[] {
    if (!cycles) {
        const cyclesPath = path.join(__dirname, "..", "res", "cycles.json");
        const cyclesJson = JSON.parse(fs.readFileSync(cyclesPath, "utf8"));
        cycles = cyclesJson.map((cycle: any) => jsonCycleToCycle(cycle));
    }
    return cycles;
}

/**
 * Transforms a cycle object from the cycles.json file to a {@link Cycle} object.
 * @param cycle a cycle object generated from the cycles.json file
 * @returns a {@link Cycle} object 
 */
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
/**
 * Transforms a parameter object from the cycles.json file to a {@link Parameter} object. 
 * @param parameter a parameter object generated from the cycles.json file 
 * @returns a {@link Parameter} object 
 */
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

/**
 * A cycle object that represents a cycle from the cycles.json file.
 */
export class Cycle {
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
/**
 * A parameter object that represents a parameter of a cycle.
 */
export class Parameter {
    name: string;
    media: string;
    descriptionDictionary: { "en-US": string; "de-DE": string; };
    requirementDictionary: RequirementDictionary;
    dependencyList: string[];
    constructor(
        name: string,
        media: string,
        descriptionDictionary: { "en-US": string; "de-DE": string; }, requirementDictionary: RequirementDictionary,
        dependencyList: string[]
    ) {
        this.name = name;
        this.media = media;
        this.descriptionDictionary = descriptionDictionary;
        this.requirementDictionary = requirementDictionary;
        this.dependencyList = dependencyList;
    }
}
/**
 * A requirement dictionary object that represents the requirements of a parameter.
 */
export class RequirementDictionary {
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
/**
 * A documentation reference object that contains the documentation references of a cycle and its parameters.
 */
export class DocumentationReference {
    overview: string;
    parameter: string;
    constructor(overview: string, parameter: string) {
        this.overview = overview;
        this.parameter = parameter;
    }
}
/**
 * A description dictionary object that contains the description of a cycle or parameter in different languages.
 */
export class DescriptionDictionary {
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


