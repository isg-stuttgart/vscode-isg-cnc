import * as peggy from "peggy";

export class Match {                                             // holds information about a relevant match
    type:string;                                                 // the type of the match e.g. prgCall
    content:any;                                              // the syntax tree of this match
    location:peggy.LocationRange;                                             // the location of the match
    text:string|null;
    name:string|null;
    constructor(type:string, content:any, location:peggy.LocationRange, text:string|null,name:string|null) {
      this.type = type;
      this.content = content;
      this.location = location;
      this.text = text;
      this.name = name;
    }
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
        result = 1;
    }else if(pos1.line<pos2.line|| (pos1.line===pos2.line && pos1.character<pos2.character)){
        result = -1;
    }else{
        result=0;
    };
    return result;
}