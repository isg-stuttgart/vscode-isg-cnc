import * as peggy from "peggy";

/**
 * A position in a text document expressed as zero-based line and character offset.
 */
export class Position {
    line: number;
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
export interface ParseResults {
    fileTree: Array<any>;
    numberableLinesUnsorted: Set<number>;
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
export class Match {
    type: string;
    content: any;
    location: peggy.LocationRange | null;
    text: string | null;
    name: string | null;
    constructor(type: string, content: any, location: peggy.LocationRange | null, text: string | null, name: string | null) {
        this.type = type;
        this.content = content;
        this.location = location;
        this.text = text;
        this.name = name;
    }
}

/**
 * The different types a match returned by the peggy parser for ISG-CNC files can have.
 */
export const matchTypes = {
    toolCall: "toolCall",
    localSubPrg: "localSubPrg",
    localPrgCall: "localPrgCall",
    localPrgCallName: "localPrgCallName",
    globalPrgCall: "globalPrgCall",
    globalPrgCallName: "globalPrgCallName",
    localCycleCall: "localCycleCall",
    localCycleCallName: "localCycleCallName",
    globalCycleCall: "globalCycleCall",
    globalCycleCallName: "globalCycleCallName",
    controlBlock: "controlBlock",
    gotoBlocknumber: "gotoBlocknumber",
    gotoLabel: "gotoLabel",
    label: "label",
    multiline: "multiline",
    trash: "trash",
    skipBlock: "skipBlock",
    blockNumber: "blockNumber",
    blockNumberLabel: "blockNumberLabel",
    varDeclaration: "varDeclaration",
    variable: "variable"
};