import * as peggy from "peggy";
import { ParseResults } from "./parserClasses";
import { matchTypes } from "./matchTypes";
import * as ncParser from "./parserGenerating/ncParser";

/** Returns the output of the peggy parser.
 * @throws Error if the parser throws an error
*/
export function getParseResults(fileContent: string): ParseResults {
    return ncParser.parse(fileContent) as unknown as ParseResults;
}

export interface Match {
    name: Match | null;
    type: string;
    text: string;
    location: peggy.LocationRange;
    content: any[];
}

export interface SyntaxArray {
    toolCalls: Array<Match>;
    prgCallNames: Array<Match>;
    trash: Array<Match>;
    controlBlocks: Array<Match>;
    multilines: Array<Match>;
    skipBlocks: Array<Match>;
    blockNumbers: Array<Match>;
    comments: Array<Match>;
}

/**
 * Returns a map with linenumbers as keys, and the first blocknumber-match of the line as values.
 * This is 0 based, in contrast to the original location objects of the parser.
 * @param text 
 * @returns a map with linenumbers as keys, and the first blocknumber-match of the line as values
 * @throws Error if the parser throws an error
 */
export function getLineToBlockNumberMap(text: string): Map<number, Match> {
    const map: Map<number, Match> = new Map();
    getSyntaxArray(text).blockNumbers.forEach((match) => {
        if (map.get(match.location.start.line - 1) === undefined) {
            map.set(match.location.start.line - 1, match);
        }
    });

    return map;
}
/**
 * Returns all linenumbers of lines which should be numbered by blocknumbers. This is 0 based, in contrast to the original location objects of the parser.
 * If the parser throws an error, an empty array is returned.
 * @param text the text to parse
 * @throws Error if the parser throws an error
 * @returns Array with linenumbers
 */
export function getNumberableLines(text: string): Array<number> {
    const parseResults: ParseResults = getParseResults(text);
    const numberableLines = Array.from(parseResults.numberableLinesUnsorted.values()).map(line => line - 1);
    //sort set because of wrong order due to recursive adding
    numberableLines.sort((a: number, b: number) => a - b);
    return numberableLines;
}

/**
 * Collects the important matches of the nc-file-content into an array.
 * The array contains the following matches within own arrays: toolCalls, prgCallNames, trash, controlBlocks, multilines, skipBlocks, blockNumbers, comments.
 * @param tree ast returned by the parser
 * @throws Error if the parser throws an error
 * @returns Array with the important matches
 */
export function getSyntaxArrayByTree(tree:any[]): SyntaxArray {
    const toolCalls = new Array<Match>();
    const prgCallNames = new Array<Match>();
    const trash = new Array<Match>();
    const controlBlocks = new Array<Match>();
    const multilines = new Array<Match>();
    const skipBlocks = new Array<Match>();
    const blockNumbers = new Array<Match>();
    const comments = new Array<Match>();

    traverseRecursive(tree);
    function traverseRecursive(element: any) {
        // current element is array to traverse recursively
        if (Array.isArray(element)) {
            element.forEach(child => {
                if (child !== null && child !== undefined) {
                    traverseRecursive(child);
                }
            });
        }
        // current element has valid content property (Matches saved in SyntaxTree) to traverse recursively
        if (element.content !== null && element.content !== undefined && Array.isArray(element.content)) {
            element.content.forEach((child: any) => {
                if (child !== null && child !== undefined) {
                    traverseRecursive(child);
                }
            });
        }
        // add to specific array
        if (element.type !== null && element.type !== undefined) {
            switch (element.type) {
                case matchTypes.toolCall:
                    toolCalls.push(element);
                    break;
                case matchTypes.localPrgCallName:
                case matchTypes.globalPrgCallName:
                case matchTypes.localCycleCallName:
                case matchTypes.globalCycleCallName:
                    prgCallNames.push(element);
                    break;
                case matchTypes.trash:
                    trash.push(element);
                    break;
                case matchTypes.controlBlock:
                    controlBlocks.push(element);
                    break;
                case matchTypes.multiline:
                    multilines.push(element);
                    break;
                case matchTypes.skipBlock:
                    skipBlocks.push(element);
                    break;
                case matchTypes.blockNumber:
                    blockNumbers.push(element);
                    break;
                case matchTypes.comment:
                    comments.push(element);
                    break;
            }
        }
    }

    const syntaxArray: SyntaxArray = {
        toolCalls: toolCalls,
        prgCallNames: prgCallNames,
        trash: trash,
        controlBlocks: controlBlocks,
        multilines: multilines,
        skipBlocks: skipBlocks,
        blockNumbers: blockNumbers,
        comments: comments
    };

    return syntaxArray;
}

/**
 * Collects the important matches of the nc-file-content into an array.
 * The array contains the following matches within own arrays: toolCalls, prgCallNames, trash, controlBlocks, multilines, skipBlocks, blockNumbers, comments.
 * @param text the text to parse
 * @throws Error if the parser throws an error
 * @returns Array with the important matches
 */
export function getSyntaxArray(text: string): SyntaxArray {
    let fileTree: any = getParseResults(text).fileTree;
    return getSyntaxArrayByTree(fileTree);
}