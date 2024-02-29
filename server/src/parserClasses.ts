import * as peggy from "peggy";
import { WorkDoneProgressServerReporter } from "vscode-languageserver";

/**
 * A position in a text document expressed as zero-based line and character offset.
 */
export class Position {
    /** The line number of the position (zero-based). */
    line: number;
    /** The character offset of the position (zero-based). */
    character: number;
    constructor(line: number, character: number) {
        this.line = line;
        this.character = character;
    }
}

/**
 * A range in a text document expressed as the file uri and the ranges' (zero-based) start and end positions.
 */
export class FileRange {
    uri: string;
    range: {
        start: Position;
        end: Position;
    };
    constructor(uri: string, start: Position, end: Position) {
        this.uri = uri;
        this.range = {
            start: start,
            end: end
        };
    }
}

/**
 * The peggy parser for ISG-CNC files returns an object containing the fileTree and a set of line numbers that are numberable.
 */
export interface ParseResultContent {
    fileTree: Array<any>;
    numberableLinesUnsorted: Set<number>;
    mainPrg: Match | null;
}

/**
 * A text document expressed as the file uri and the text content.
 */
export class Document {
    uri: string;
    text: string;
    constructor(uri: string, text: string) {
        this.uri = uri;
        this.text = text;
    }
}

/**
 * A match object returned by the peggy parser for ISG-CNC files.
 */
export interface Match {
    type: MatchType;
    content: any;
    location: peggy.LocationRange;
    text: string;
    name: string | null;
}

/** Returns if a given object is a Match and so can be converted to such*/
export function hasMatchProperties(obj: any): boolean {
    const exampleMatch = {
        type: null,
        content: null,
        location: null,
        text: null,
        name: null
    };
    return Object.keys(exampleMatch).every(key => obj.hasOwnProperty(key));
}

/**
 * A class that can be used to increment a progress bar.
 */
export class IncrementableProgress {
    private progress: WorkDoneProgressServerReporter;
    private incrementPercentage: number;
    private currentPercentage: number;
    private progressName: string;
    private canceled: boolean = false;

    constructor(progress: WorkDoneProgressServerReporter, totalSteps: number, progressName: string) {
        this.progress = progress;
        this.incrementPercentage = 100 / totalSteps;
        this.currentPercentage = 0;
        this.progressName = progressName;
        this.progress.token.onCancellationRequested(() => {
            this.cancel();
            console.error("Progress canceled");
        });
        this.progress.begin(this.progressName, 0, "...", true);
    }

    increment(message?: string) {
        this.currentPercentage += this.incrementPercentage;
        if (message) {
            this.progress.report(this.currentPercentage, message);
        } else {
            this.progress.report(this.currentPercentage);
        }
    }

    changeMessage(message: string) {
        this.progress.report(this.currentPercentage, message);
    }

    done() {
        this.progress.done();
    }

    cancel() {
        this.canceled = true;
        this.progress.done();
    }

    isCancelled() {
        return this.canceled;
    }
}

/**
 * The different types a match returned by the peggy parser for ISG-CNC files can have.
 */

export enum MatchType {
    toolCall = "toolCall",
    mainPrg = "mainPrg",
    localSubPrg = "localSubPrg",

    // prg calls
    localPrgCall = "localPrgCall",
    localPrgCallName = "localPrgCallName",
    localPrgDefinitionName = "localPrgDefinitionName",
    globalPrgCall = "globalPrgCall",
    globalPrgCallName = "globalPrgCallName",
    localCycleCall = "localCycleCall",
    localCycleCallName = "localCycleCallName",
    globalCycleCall = "globalCycleCall",
    globalCycleCallName = "globalCycleCallName",

    controlBlock = "controlBlock",
    gotoBlocknumber = "gotoBlocknumber",
    gotoLabel = "gotoLabel",
    label = "label",
    multiline = "multiline",
    trash = "trash",
    skipBlock = "skipBlock",
    blockNumber = "blockNumber",
    blockNumberLabel = "blockNumberLabel",
    varDeclaration = "varDeclaration",
    variable = "variable",
    comment = "comment"
};
