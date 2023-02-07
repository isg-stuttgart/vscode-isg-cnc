import * as peggy from "peggy";

export interface Match {
    name: Match | null;
    type: string;
    text: string;
    location: peggy.LocationRange;
    content: any[];
}

export class Position{
    line: number;
    character: number;
    constructor(line: number, character: number){
        this.line = line;
        this.character = character;
    }
}
export const matchTypes = {
    toolCall: "toolCall",
    prgCall: "prgCall",
    controlBlock: "controlBlock",
    multiline: "multiline",
    trash: "trash",
    name: "name",
    skipBlock: "skipBlock",
    blockNumber: "blockNumber"
};


/**
 * Returns whether pos1 is before,after or equal to pos2
 * @param pos1 
 * @param pos2 
 */
export function compareLocation(pos1: Position, pos2: Position):number{
    let result: number;
    if(pos1.line>pos2.line || (pos1.line===pos2.line && pos1.character>pos2.character)){
        result = -1;
    }else if(pos1.line<pos2.line|| (pos1.line===pos2.line && pos1.character<pos2.character)){
        result = 1;
    }else{
        result=0;
    };
    return result;
}