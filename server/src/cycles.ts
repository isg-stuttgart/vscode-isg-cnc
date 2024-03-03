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

        // throw error if some required parameters are missing
        if (!this.name) {
            throw new Error("Cycle name is missing");
        }
        if (!this.media) {
            throw new Error("Cycle media is missing");
        }
        if (!this.descriptionDictionary) {
            throw new Error("Cycle description is missing");
        }
        if (!this.parameterList) {
            throw new Error("Cycle parameter list is missing");
        }
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

        // throw error if some required parameters are missing
        if (!this.name) {
            throw new Error("Parameter name is missing: " + this.name);
        }
        if (!this.media) {
            throw new Error("Parameter media is missing" + this.name);
        }
        if (!this.descriptionDictionary || !this.descriptionDictionary["en-US"] || !this.descriptionDictionary["de-DE"]) {
            throw new Error("Parameter description is missing" + this.name);
        }
        if (!this.requirementDictionary) {
            throw new Error("Parameter requirement dictionary is missing" + this.name);
        }
        if (!this.dependencyList) {
            throw new Error("Parameter dependency list is missing" + this.name);
        }

    }


}
/**
 * A requirement dictionary object that represents the requirements of a parameter.
 */
export class RequirementDictionary {
    min: number | undefined;
    max: number | undefined;
    default: string | undefined;
    notNull: boolean;
    required: boolean;
    constructor(min: number | string | undefined, max: number | string | undefined, defaultVal: string, notNull: boolean | string, required: boolean | string | undefined) {
        this.min = parseIntOrUndefined(min);
        this.max = parseIntOrUndefined(max);
        this.default = defaultVal ? defaultVal : undefined;
        this.notNull = typeof notNull === "boolean" ? notNull : notNull === "true";
        this.required = typeof required === "boolean" ? required : required === "true";
    }
}

function parseIntOrUndefined(value: string | number | undefined): number | undefined {
    if (typeof value === "number") {
        return value;
    } else {
        const parsedValue = value === "" ? NaN : Number(value);
        return isNaN(parsedValue) ? undefined : parsedValue;
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

        // throw error if some required parameters are missing
        if (!this.overview || !this.parameter) {
            throw new Error("Documentation reference is missing");
        }
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

        // throw error if some required parameters are missing
        if (!this.enUS || !this.deDE) {
            throw new Error("Description dictionary is missing");
        }
    }
    getDescription(locale: Locale): string {
        return locale === Locale.en ? this.enUS : this.deDE;
    }
}


