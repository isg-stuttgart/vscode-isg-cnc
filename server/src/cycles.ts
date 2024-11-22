import { Locale, getLocale } from './config';
import { MarkupContent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import * as cyclesJson from "../res/cycles.json";
import * as path from "path";

/**
 * If the amount of values for a parameter is below this limit, a choice snippet is used for the placeholder. Else the range is shown.
 */
const rangeLimitForChoiceSnippet = 50;

let cycles: Cycle[];

/**
 * @returns a list of cycles generated from the cycles.json file
 */
export function getCycles(): Cycle[] {
    if (!cycles) {
        cycles = cyclesJson.map((cycle: any) => jsonCycleToCycle(cycle));
    }
    return cycles;
}

export function getISGCycleByName(name: string): Cycle | null {
    const cycleName = path.parse(name).name;
    const cycle = getCycles().find(c => c.name === cycleName);
    return cycle ? cycle : null;
}

/**
 * @returns a markdown string that contains a clickable command uri to open the documentation with the given id
 */
export function getCommandUriToOpenDocu(id: string | undefined): string {
    if (!id) {
        return "";
    }
    const commandUri = URI.parse(`command:isg-cnc.openDocuWithId?${encodeURIComponent(JSON.stringify([id]))}`);
    return commandUri.toString();
}

/**
 * Transforms a cycle object from the cycles.json file to a {@link Cycle} object.
 * @param cycle a cycle object generated from the cycles.json file
 * @returns a {@link Cycle} object 
 */
function jsonCycleToCycle(cycle: any): Cycle {
    try {
        const parameterList: Array<Parameter> = cycle.ParameterList.map((parameter: any) => jsonParameterToParameter(parameter, cycle.DocumentationReference?.Parameter));
        // sort params by name
        parameterList.sort((a: Parameter, b: Parameter) => {
            const numA = parseInt(a.name.replace(/\D/g, ''), 10);
            const numB = parseInt(b.name.replace(/\D/g, ''), 10);
            return numA - numB;
        });

        const documentationReference = (cycle.DocumentationReference && cycle.DocumentationReference.Overview && cycle.DocumentationReference.Parameter) ? new DocumentationReference(cycle.DocumentationReference.Overview, cycle.DocumentationReference.Parameter) : undefined;
        const descriptionDictionary = new DescriptionDictionary(cycle.DescriptionDictionary["en-US"], cycle.DescriptionDictionary["de-DE"]);

        return new Cycle(
            cycle.Name,
            cycle.Media,
            documentationReference,
            descriptionDictionary,
            parameterList,
            cycle.License,
            cycle.SubCycles,
            cycle.Version
        );
    } catch (error) {
        throw new Error("Failed to parse cycle " + cycle.Name + ": \n" + error);
    }
}
/**
 * Transforms a parameter object from the cycles.json file to a {@link Parameter} object. 
 * @param parameter a parameter object generated from the cycles.json file 
 * @returns a {@link Parameter} object 
 */
function jsonParameterToParameter(parameter: any, documentationReference: string | undefined): Parameter {
    try {
        const requirementDictionary = new RequirementDictionary(
            parameter.RequirementDictionary.Min,
            parameter.RequirementDictionary.Max,
            parameter.RequirementDictionary.Min2,
            parameter.RequirementDictionary.Max2,
            parameter.RequirementDictionary.Default,
            parameter.RequirementDictionary.NotZero,
            parameter.RequirementDictionary.Required,
            parameter.RequirementDictionary.Type
        );
        const descriptionDictionary = new DescriptionDictionary(parameter.DescriptionDictionary["en-US"], parameter.DescriptionDictionary["de-DE"]);
        const enumValues: EnumValue[] | undefined = parameter.EnumValues ? parameter.EnumValues.map((enumValueJson: any) => new EnumValue(enumValueJson)) : undefined;

        return new Parameter(
            parameter.Name,
            parameter.Media,
            descriptionDictionary,
            requirementDictionary,
            parameter.DependencyList,
            documentationReference,
            enumValues
        );
    } catch (error) {
        throw new Error("Failed to parse parameter " + parameter.Name + ": \n" + error);
    }
}

/**
 * A cycle object that represents a cycle from the cycles.json file.
 */
export class Cycle {
    name: string;
    media: string | undefined;
    documentationReference: DocumentationReference | undefined;
    descriptionDictionary: DescriptionDictionary;
    parameterList: Parameter[];
    license: string;
    subcycles: string[];
    version: string;
    constructor(name: string, media: string | undefined, documentationReference: DocumentationReference | undefined, descriptionDictionary: DescriptionDictionary, parameterList: Parameter[], license: string, subcycles: string[], version: string) {
        this.name = name;
        this.media = media;
        this.documentationReference = documentationReference;
        this.descriptionDictionary = descriptionDictionary;
        this.parameterList = parameterList;
        this.license = license;
        this.subcycles = subcycles;
        this.version = version;

        // throw error if some required parameters are missing
        if (!this.name) {
            throw new Error("Cycle name is missing");
        }
        if (!this.descriptionDictionary) {
            throw new Error("Cycle description is missing");
        }
        if (!this.parameterList) {
            throw new Error("Cycle parameter list is missing");
        }
        if (!this.license) {
            throw new Error("Cycle license is missing");
        }
        if (!Array.isArray(this.subcycles)) {
            throw new Error("Subcycles is not an array");
        }
        if (!this.version) {
            throw new Error("Cycle version is missing");
        }
    }
    getMarkupDocumentation(onlyRequired: boolean): MarkupContent {
        // if the documentation reference is missing, don't add a link to the documentation
        const moreInfo = getLocale() === Locale.de ? "[Mehr Informationen]" : "[More Information]";
        const infoLink = this.documentationReference && this.documentationReference.overview ? `  \n\n${moreInfo}(${getCommandUriToOpenDocu(this.documentationReference.overview)})` : "";
        const subCycleTitle = (getLocale() === Locale.de ? "### Unterzyklen:  \n" : "### Subcycles:  \n");
        const subcycleString: string = this.subcycles.length > 0 ? subCycleTitle + this.subcycles.map(subcycle => "- " + subcycle).join("\n") + "\n\n" : "";
        let parameterTitle: string;
        const locale = getLocale();
        if (this.parameterList.length > 0) {
            parameterTitle = onlyRequired ? (locale === Locale.de ? "### Erforderliche Parameter:  \n" : "### Required Parameters:  \n") : (locale === Locale.de ? "### Parameter:  \n" : "### Parameters:  \n");
        } else {
            parameterTitle = "";
        }
        return {
            kind: "markdown",
            value:
                "### " + this.name + "  \n" + this.descriptionDictionary.getDescription(getLocale()) + "  \n\n" +

                parameterTitle +
                this.parameterList
                    .filter(param => !onlyRequired || param.requirementDictionary.required)
                    .map(param => param.getShortDescriptionLine()).join("\n") +
                "\n\n" +
                (locale === Locale.de ? "### Lizenz:  \n" : "### License:  \n") + this.license + "  \n" +
                (locale === Locale.de ? "### Version:  \n" : "### Version:  \n") + this.version + "  \n" +
                subcycleString +
                infoLink
        };
    }
}
/**
 * A parameter object that represents a parameter of a cycle.
 */
export class Parameter {
    name: string;
    media: string | undefined;
    descriptionDictionary: DescriptionDictionary;
    requirementDictionary: RequirementDictionary;
    dependencyList: string[];
    documentationReference: string | undefined;
    enumValues: EnumValue[] | undefined;
    constructor(
        name: string,
        media: string | undefined,
        descriptionDictionary: DescriptionDictionary,
        requirementDictionary: RequirementDictionary,
        dependencyList: string[],
        documentationReference: string | undefined,
        enumValues: EnumValue[] | undefined
    ) {
        this.name = name;
        this.media = media;
        this.descriptionDictionary = descriptionDictionary;
        this.requirementDictionary = requirementDictionary;
        this.dependencyList = dependencyList;
        this.documentationReference = documentationReference;
        this.enumValues = enumValues;
        // throw error if some required parameters are missing
        if (!this.name) {
            throw new Error("Parameter name is missing: " + this.name);
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
        const min2 = this.requirementDictionary.min2;
        const max2 = this.requirementDictionary.max2;
        const defaultVal = this.requirementDictionary.default;
        let amountOfValues = Infinity;
        if (min !== undefined && max !== undefined) {
            amountOfValues = max - min + 1;
        }
        if (min2 !== undefined && max2 !== undefined) {
            amountOfValues += max2 - min2 + 1;
        }
        // case 1 parameter has defined enum values -> use a choice
        if (this.enumValues && this.enumValues.length > 0) {
            const choices = this.enumValues.map(enumValue => enumValue.value.toString());
            return "${" + tabstopNumber + "|" + choices.join(",") + "|}";
        }
        // case 2: parameter has one/two ranges with a maximum difference of 50 -> use a choice
        else if (amountOfValues <= rangeLimitForChoiceSnippet) {
            const choices = [];
            if (min !== undefined && max !== undefined) {
                for (let i = min; i <= max; i++) {
                    choices.push(i.toString());
                }
            }
            if (min2 !== undefined && max2 !== undefined) {
                for (let i = min2; i <= max2; i++) {
                    choices.push(i.toString());
                }
            }
            return "${" + tabstopNumber + "|" + choices.join(",") + "|}";
        }
        // case 3: parameter has min and max but the difference is too big -> show the range as placeholder
        else if (min !== undefined && max !== undefined) {
            return "${" + tabstopNumber + ":" + min + "-" + max + "}";
        }
        // case 4: parameter has a default value -> use the default value as placeholder
        else if (defaultVal) {
            return "${" + tabstopNumber + ":" + defaultVal + "}";
        }
        // case 5: nothing special -> use the lowercase parameter name as placeholder
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
        const min2 = this.requirementDictionary.min2;
        const max2 = this.requirementDictionary.max2;
        const defaultVal = this.requirementDictionary.default;
        const notZero = this.requirementDictionary.notZero;
        const required = this.requirementDictionary.required;
        const locale = getLocale();
        let description = "";
        try {
            description = this.descriptionDictionary.getDescription(locale);
        } catch (error) {
            console.error("Failed to get description for parameter " + this.name + ": " + error);
        }
        let dependencyMarkdownString = "";
        if (this.dependencyList && this.dependencyList.length > 0) {
            dependencyMarkdownString = getLocale() === Locale.de ? "### Abhängigkeiten:  \n" : "### Dependencies:  \n";
            dependencyMarkdownString += this.dependencyList.map(dependency => {
                return "- " + dependency;
            }).join("\n") + "\n\n";
        }
        // if the documentation reference is missing, don't add a link to the documentation
        const moreInfo = locale === Locale.de ? "[Mehr Informationen]" : "[More Information]";
        const infoLink = this.documentationReference ? `  \n\n${moreInfo}(${getCommandUriToOpenDocu(this.documentationReference)})` : "";

        const markdownString = "## " + this.name + ": " + description + "  \n" +
            this.getEnumValuesMarkdown() +
            (locale === Locale.de ? "### Anforderungen:  \n" : "### Requirements:  \n") +
            (min !== undefined ? "Min: " + min + "  \n" : "") +
            (max !== undefined ? "Max: " + max + "  \n" : "") +
            (min2 !== undefined ? "Min2: " + min2 + "  \n" : "") +
            (max2 !== undefined ? "Max2: " + max2 + "  \n" : "") +
            (defaultVal !== undefined ? (locale === Locale.de ? "Standardwert: " : "Default Value: ") + defaultVal + "  \n" : "") +
            (locale === Locale.de ? ("Null erlaubt: " + (notZero ? "Nein" : "Ja") + "  \n") : ("Zero allowed: " + (notZero ? "No" : "Yes") + "  \n")) +
            (locale === Locale.de ? ("Erforderlich: " + (required ? "Ja" : "Nein") + "  \n") : ("Required: " + (required ? "Yes" : "No") + "  \n")) +
            (locale === Locale.de ? "Typ" : "Type") + ": " + this.requirementDictionary.type + "  \n" +

            dependencyMarkdownString +

            infoLink;
        return {
            kind: "markdown",
            value: markdownString

        };
    }

    /**
     * @returns a markdown string that contains the enum values of the parameter with their descriptions.
     * If the parameter has no enum values, an empty string is returned.
     */
    getEnumValuesMarkdown(): string {
        if (!this.enumValues || this.enumValues.length === 0) {
            return "";
        }
        const locale = getLocale();
        return (locale === Locale.de ? "### Mögliche Werte:  \n" : "### Possible Values:  \n") +
            this.enumValues.map(enumValue => {
                return "- " + enumValue.value + ": " + enumValue.description.getDescription(locale);
            }).join("\n")
            + "\n\n";
    }
    ;
    /**
     * @returns a short description line for the parameter. Is used within the cycle markdown documentaiton.
     */
    getShortDescriptionLine(): string {
        const id = this.documentationReference;
        const nameMarkdown = id ? `[${this.name}](${getCommandUriToOpenDocu(id)})` : this.name;
        const description = this.descriptionDictionary.getDescription(getLocale());
        return "- " + nameMarkdown + ": " + description;
    }
}

/**
 * A requirement dictionary object that represents the requirements of a parameter.
 */
export class RequirementDictionary {
    min: number | undefined;
    max: number | undefined;
    min2: number | undefined;
    max2: number | undefined;
    notZero: boolean;
    default: string | undefined;
    required: boolean;
    type: string;
    constructor(
        min: number | string | undefined,
        max: number | string | undefined,
        min2: number | string | undefined,
        max2: number | string | undefined,
        defaultVal: string,
        notZero: boolean | string,
        required: boolean | string | undefined,
        type: string
    ) {
        this.min = parseIntOrUndefined(min);
        this.max = parseIntOrUndefined(max);
        this.min2 = parseIntOrUndefined(min2);
        this.max2 = parseIntOrUndefined(max2);
        this.min2 = parseIntOrUndefined(min2);
        this.max2 = parseIntOrUndefined(max2);
        this.default = defaultVal ? defaultVal : undefined;
        this.notZero = typeof notZero === "boolean" ? notZero : notZero === "true";
        this.required = typeof required === "boolean" ? required : required === "true";
        this.type = type;

        if (this.type === undefined) {
            throw new Error("Type is missing");
        }
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
    }
    // if empty string or undefined, return undefined
    else if (!value) {
        return undefined;
    }
    // if "Inf" or "-Inf" return infinity or -infinity
    else if (value === "Inf") {
        return Infinity;
    }
    else if (value === "-Inf") {
        return -Infinity;
    }
    // else parse the value to a number and throw an error if it is not a number
    else {
        const parsedValue = parseInt(value);
        if (isNaN(parsedValue)) {
            throw new Error("Value is not a number: " + value);
        }
        return parsedValue;
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
        let description: string = (locale === Locale.de ? this["de-DE"] : this["en-US"]);
        if (!description || description === "-") {
            return "";
        }
        return description;
    }
}

export class EnumValue {
    value: number;
    description: DescriptionDictionary;
    constructor(enumValueJson: any) {
        // if the value is missing or not an integer, throw an error
        if (enumValueJson.Value === undefined || typeof enumValueJson.Value !== "number") {
            throw new Error("Enum value is missing or not a number");
        }
        if (!enumValueJson.Desc) {
            throw new Error("Enum value description is missing");
        }
        this.value = enumValueJson.Value;
        this.description = new DescriptionDictionary(enumValueJson.Desc["en-US"], enumValueJson.Desc["de-DE"]);
    }
}