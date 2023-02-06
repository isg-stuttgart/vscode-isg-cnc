import { Position } from "vscode-languageserver";

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