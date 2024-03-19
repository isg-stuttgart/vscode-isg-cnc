import * as path from 'path';
import * as fs from 'fs';
import { Locale, getDocumentationPath, getDocumentationPathWithLocale, getLocale } from './config';
import { MarkupContent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
let cycles: Cycle[];

/**
 * This function returns the markup uri to documentation with the given id, hidden behind the shown text "More information".
 * If the documentation path is not the default path to online doku, 
 * the uri will be a command uri to open the local documentation at configured path with the given id.
 * If no id is given, an empty string will be returned.
 * @returns markup uri to documentation with the given id
 */
export function getMarkUpDocUri(id: string | undefined): string {
    if (!id) {
        return "";
    }

    const localedDefaultPath = getDocumentationPathWithLocale();
    // if not the default path to online doku, interpret as local path and return command uri to open it in browser
    if (getDocumentationPath() !== "https://www.isg-stuttgart.de/fileadmin/kernel/kernel-html/") {
        const commandUri = URI.parse(`command:isg-cnc.openDocuWithId?${encodeURIComponent(JSON.stringify([id]))}`);
        return `[More information](${commandUri.toString()})`;
    } else {
        return `[More information](${localedDefaultPath}#${id})`;
    }
}

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
    const parameterList = cycle.ParameterList.map((parameter: any) => jsonParameterToParameter(parameter, cycle.DocumentationReference?.Parameter));
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
function jsonParameterToParameter(parameter: any, documentationReference: string | undefined): Parameter {
    const requirementDictionary = new RequirementDictionary(
        parameter.RequirementDictionary.Min,
        parameter.RequirementDictionary.Max,
        parameter.RequirementDictionary.Default,
        parameter.RequirementDictionary.NotNull,
        parameter.RequirementDictionary.Required
    );
    const descriptionDictionary = new DescriptionDictionary(parameter.DescriptionDictionary["en-US"], parameter.DescriptionDictionary["de-DE"]);
    return new Parameter(
        parameter.Name,
        parameter.Media,
        descriptionDictionary,
        requirementDictionary,
        parameter.DependencyList,
        documentationReference
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
    getMarkupDocumentation(): MarkupContent {
        return {
            kind: "markdown",
            value:
                "### " + this.name + "  \n" + this.descriptionDictionary.getDescription(getLocale()) + "  \n" +
                getMarkUpDocUri(this.documentationReference?.overview)
        };
    }
}
/**
 * A parameter object that represents a parameter of a cycle.
 */
export class Parameter {
    name: string;
    media: string;
    descriptionDictionary: DescriptionDictionary;
    requirementDictionary: RequirementDictionary;
    dependencyList: string[];
    documentationReference: string | undefined;
    constructor(
        name: string,
        media: string,
        descriptionDictionary: DescriptionDictionary,
        requirementDictionary: RequirementDictionary,
        dependencyList: string[],
        documentationReference: string | undefined
    ) {
        this.name = name;
        this.media = media;
        this.descriptionDictionary = descriptionDictionary;
        this.requirementDictionary = requirementDictionary;
        this.dependencyList = dependencyList;
        this.documentationReference = documentationReference;
        // throw error if some required parameters are missing
        if (!this.name) {
            throw new Error("Parameter name is missing: " + this.name);
        }
        if (!this.media) {
            throw new Error("Parameter media is missing" + this.name);
        }
        if (!this.descriptionDictionary) {
            throw new Error("Parameter description is missing" + this.name);
        }
        if (!this.requirementDictionary) {
            throw new Error("Parameter requirement dictionary is missing" + this.name);
        }
        if (!this.dependencyList) {
            throw new Error("Parameter dependency list is missing" + this.name);
        }
    }
    /**
    * Get a placeholder for the given parameter with following cases from highest to lowest priority:
    * - Case 1: parameter has min and max with maximum difference of 10 -> use a choice
    * - Case 2: parameter has min and max but the difference is too big -> show the range as placeholder
    * - Case 3: parameter has a default value -> use the default value as placeholder
    * - Case 4: nothing special -> use the lowercase parameter name as placeholder
    * @param tabstopNumber the number of the tabstop of this parameter
    * @returns the placeholder for the parameter 
    */
    getPlaceholder(tabstopNumber: number): string {
        const min = this.requirementDictionary.min;
        const max = this.requirementDictionary.max;
        const defaultVal = this.requirementDictionary.default;
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
            return "${" + tabstopNumber + ":" + this.name.toLowerCase() + "}";
        }
    }
    /**
     * @returns a markdown string that contains important information about the parameter. Can be used for completion or hover items.
     */
    getMarkupDocumentation(): MarkupContent {
        const min = this.requirementDictionary.min;
        const max = this.requirementDictionary.max;
        const defaultVal = this.requirementDictionary.default;
        const notNull = this.requirementDictionary.notNull;
        const required = this.requirementDictionary.required;
        let description = "";
        try {
            description = this.descriptionDictionary.getDescription(getLocale());
        } catch (error) {
            console.error("Failed to get description for parameter " + this.name + ": " + error);
        }
        const dependencyMarkdownString = this.dependencyList.map(dep => "- " + dep).join("\n");
        return {
            kind: "markdown",
            value:
                "### " + this.name + ": " + description + "  \n" +

                (min !== undefined ? "Minimal value: " + min + "  \n" : "") +
                (max !== undefined ? "Maximal value: " + max + "  \n" : "") +
                (defaultVal !== undefined ? "Default value: " + defaultVal + "  \n" : "") +
                "Not null: " + notNull + "  \n" +
                "Required: " + required + "\n\n" +

                (this.dependencyList && this.dependencyList.length > 0 ? "Dependencies:  \n" + dependencyMarkdownString + "\n\n" : "") +
                getMarkUpDocUri(this.documentationReference)
        };
    };
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

/**
 * Parses a string or number to a number or undefined if the value is not a number.  
 * @param value the value to parse 
 * @returns the parsed number or undefined if the value is not a number 
 */
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
    private "en-US": string;
    private "de-DE": string;
    constructor(enUS: string, deDE: string) {
        this["en-US"] = enUS;
        this["de-DE"] = deDE;

        // throw error if some required parameters are missing
        if (!this["en-US"] || !this["de-DE"]) {
            throw new Error("Description dictionary is missing");
        }
    }
    /**
     * @param locale the locale to get the description for 
     * @returns the description for the given locale 
     */
    getDescription(locale: Locale): string {
        if (locale === Locale.de) {
            return this["de-DE"];
        } else {
            return this["en-US"];
        }
    }
}


