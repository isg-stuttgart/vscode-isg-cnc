import { Match, ParseResultContent } from "./parserClasses";
import { MatchType } from "./parserClasses";
import * as ncParser from "./parserGenerating/ncParser";

/**
 * An class providing the results of the parser for ISG-CNC files and helper methods to extract additional information.
 * The parsing itself is only done once in the constructor to avoid unnecessary parsing.
 * @throws Error if the parser throws an error
 */
export class ParseResults {
    public readonly results: ParseResultContent;
    public readonly syntaxArray: SyntaxArray;
    constructor(text: string) {
        this.results = ncParser.parse(text) as ParseResultContent;
        this.syntaxArray = this.getSyntaxArrayByTree(this.results.fileTree);
    }

    /**
     * Returns a map with linenumbers as keys, and the first blocknumber-match of the line as values.
     * This is 0 based, in contrast to the original location objects of the parser.
     * @returns a map with linenumbers as keys, and the first blocknumber-match of the line as values
     */
    public getLineToBlockNumberMap(): Map<number, Match> {
        const map: Map<number, Match> = new Map();
        this.syntaxArray.blockNumbers.forEach((match) => {
            if (map.get(match.location.start.line - 1) === undefined) {
                map.set(match.location.start.line - 1, match);
            }
        });
        return map;
    }

    /**
     * Returns all linenumbers (sorted) of lines which should be numbered by blocknumbers. This is 0 based, in contrast to the original location objects of the parser.
     * If the parser throws an error, an empty array is returned.
     * @param text the text to parse
     * @returns Array with linenumbers
     */
    public getNumberableLines(): Array<number> {
        const numberableLines = Array.from(this.results.numberableLinesUnsorted.values()).map(line => line - 1);
        //sort set because of wrong order due to recursive adding
        numberableLines.sort((a: number, b: number) => a - b);
        return numberableLines;
    }

    /**
     * Collects the important matches of the nc-file-content into an array.
     * The array contains the following matches within own arrays: toolCalls, prgCallNames, trash, controlBlocks, multilines, skipBlocks, blockNumbers, comments.
     * @param tree ast returned by the parser
     * @returns Array with the important matches
     */
    private getSyntaxArrayByTree(tree: any[]): SyntaxArray {
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
                    case MatchType.toolCall:
                        toolCalls.push(element);
                        break;
                    case MatchType.localPrgCallName:
                    case MatchType.globalPrgCallName:
                    case MatchType.localCycleCallName:
                    case MatchType.globalCycleCallName:
                        prgCallNames.push(element);
                        break;
                    case MatchType.trash:
                        trash.push(element);
                        break;
                    case MatchType.controlBlock:
                        controlBlocks.push(element);
                        break;
                    case MatchType.multiline:
                        multilines.push(element);
                        break;
                    case MatchType.skipBlock:
                        skipBlocks.push(element);
                        break;
                    case MatchType.blockNumber:
                    case MatchType.blockNumberLabel:
                        blockNumbers.push(element);
                        break;
                    case MatchType.comment:
                        comments.push(element);
                        break;
                }
            }
        }
        const syntaxArray = {
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