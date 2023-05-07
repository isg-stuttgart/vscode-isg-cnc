import { Match } from "./parserClasses";

/**
 * The different types a match returned by the peggy parser for ISG-CNC files can have.
 */
export const matchTypes = {
    toolCall: "toolCall",
    mainPrg: "mainPrg",
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


/**
 * Returns the according definition-type to a given match and if the definition has
 * to be searched locally or globally
 * @param match 
 * @returns \{ defType: string | null, local: boolean } an object containing the definition type and a boolean indicating if the definition has to be searched locally or globally
 */
export function getDefType(match: Match): { defType: string | null, local: boolean } {
    let defType: string | null;
    let local = true;
    //determine the defType e.g. localSubPrg
    switch (match.type) {
        // program calls
        case matchTypes.localPrgCallName:
            defType = matchTypes.localSubPrg;
            break;
        case matchTypes.localCycleCallName:
            defType = matchTypes.localSubPrg;
            break;
        case matchTypes.globalCycleCallName:
            defType = matchTypes.globalCycleCall;
            local = false;
            break;
        case matchTypes.globalPrgCallName:
            defType = matchTypes.globalPrgCall;
            local = false;
            break;
        // goto statements
        case matchTypes.gotoLabel:
            defType = matchTypes.label;
            break;
        case matchTypes.gotoBlocknumber:
            defType = matchTypes.blockNumberLabel;
            break;
        //variables
        case matchTypes.variable:
            defType = matchTypes.varDeclaration;
            break;
        default: defType = null;
    }
    return { defType, local };
}

/**
 * Returns the according reference-types to a given match and if the references have to be searched locally or globally
 * @param match 
 * @returns an object containing the reference types and a boolean indicating if the references have to be searched locally or globally
 */
export function getRefTypes(match: Match): { refTypes: string[], local: boolean } {
    let refTypes: string[];
    let local = true;

    switch (match.type) {
        // global program calls
        case matchTypes.globalCycleCallName:
        case matchTypes.globalPrgCallName:
            local = false;
            refTypes = [matchTypes.globalCycleCallName, matchTypes.globalPrgCallName];
            break;
        // local program calls
        case matchTypes.localPrgCallName:
        case matchTypes.localCycleCallName:
        case matchTypes.localSubPrg:
            refTypes = [matchTypes.localPrgCallName, matchTypes.localCycleCallName];
            break;
        // goto label
        case matchTypes.gotoLabel:
        case matchTypes.label:
            refTypes = [matchTypes.gotoLabel];
            break;
        // goto blocknumber
        case matchTypes.gotoBlocknumber:
        case matchTypes.blockNumberLabel:
            refTypes = [matchTypes.gotoBlocknumber];
            break;
        // variables
        case matchTypes.variable:
        case matchTypes.varDeclaration:
            refTypes = [matchTypes.variable];
            break;
        default: refTypes = [];
    }
    return { refTypes, local };
}