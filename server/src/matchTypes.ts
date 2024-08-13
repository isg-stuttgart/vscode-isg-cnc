import { MatchType } from "./parserClasses";
import { Match } from "./parserClasses";

/**
 * Returns the according definition-type to a given match and if the definition has
 * to be searched locally or globally
 * @param match the match to get the definition type for 
 * @returns \{ defType: string | null, local: boolean } an object containing the definition type and a boolean indicating if the definition has to be searched locally or globally
 */
export function getDefType(match: Match): { defType: MatchType | null, local: boolean } {
    let defType: MatchType | null;
    let local = true;
    //determine the defType e.g. localSubPrg
    switch (match.type) {
        // program calls
        case MatchType.localPrgCallName:
            defType = MatchType.localSubPrg;
            break;
        case MatchType.localCycleCallName:
            defType = MatchType.localSubPrg;
            break;
        case MatchType.globalCycleCallName:
            defType = MatchType.globalCycleCall;
            local = false;
            break;
        case MatchType.globalPrgCallName:
            defType = MatchType.globalPrgCall;
            local = false;
            break;
        // goto statements
        case MatchType.gotoLabel:
            defType = MatchType.label;
            break;
        case MatchType.gotoBlocknumber:
            defType = MatchType.blockNumberLabel;
            break;
        //variables
        case MatchType.variable:
            defType = MatchType.varDeclaration;
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
export function getRefTypes(match: Match): { refTypes: MatchType[], local: boolean } {
    let refTypes: MatchType[];
    let local = true;

    switch (match.type) {
        // global program calls
        case MatchType.globalCycleCallName:
        case MatchType.globalPrgCallName:
            local = false;
            refTypes = [MatchType.globalCycleCallName, MatchType.globalPrgCallName];
            break;
        // local program calls
        case MatchType.localPrgDefinitionName:
        case MatchType.localPrgCallName:
        case MatchType.localCycleCallName:
            refTypes = [MatchType.localPrgCallName, MatchType.localCycleCallName];
            break;
        // goto label
        case MatchType.gotoLabel:
        case MatchType.label:
            refTypes = [MatchType.gotoLabel];
            break;
        // goto blocknumber
        case MatchType.gotoBlocknumber:
        case MatchType.blockNumberLabel:
            refTypes = [MatchType.gotoBlocknumber];
            break;
        // variables
        case MatchType.variable:
        case MatchType.varDeclaration:
            refTypes = [MatchType.variable];
            break;
        default: refTypes = [];
    }
    return { refTypes, local };
}
