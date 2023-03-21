import * as peggy from "peggy";

export class Position {
    line: number;
    character: number;
    constructor(line: number, character: number) {
        this.line = line;
        this.character = character;
    }
}

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

export interface ParseResults {
    fileTree: Array<any>;
    numberableLinesUnsorted: Set<number>;
}


export class Document {
    uri: string;
    text: string;
    constructor(uri: string, text: string) {
        this.uri = uri;
        this.text = text;
    }
}
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