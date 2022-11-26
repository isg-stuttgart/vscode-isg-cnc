import * as fs from "fs";
import * as peggy from "peggy";
import * as ncParser from "./peggyParser";

export interface Match {
    name: Match | null;
    type: string;
    text: string;
    location: peggy.LocationRange;
    content: any[];
}

export interface SyntaxArray {
    toolCalls: Array<Match>;
    prgCalls: Array<Match>;
    trash: Array<Match>;
    controlBlocks: Array<Match>;
    multilines: Array<Match>;
}

export const matchTypes = {
    toolCall: "toolCall",
    prgCall: "prgCall",
    trash: "trash",
    controlBlock: "controlBlock",
    multiline: "multiline"
};

export function getNumberableLines(file: fs.PathLike): Set<number> {
    const filecontent: string = fs.readFileSync(file, "utf-8");
    const parseResults: { fileTree: Array<any>, numberableLines: Set<number> } = ncParser.parse(filecontent) as unknown as { fileTree: Array<any>, numberableLines: Set<number> };
    return parseResults.numberableLines;
}

/**
 * Collects the important matches of the nc-file-content into an array of the following structure:
 * [toolCalls,prgCalls,trash,controlBlocks,multilines]
 * @param path the path of the nc file
 */
export function getSyntaxArray(file: fs.PathLike): SyntaxArray {
    const filecontent: string = fs.readFileSync(file, "utf-8");
    const parseResults: { fileTree: Array<any>, numberableLines: Set<number> } = ncParser.parse(filecontent) as unknown as { fileTree: Array<any>, numberableLines: Set<number> };

    const toolCalls = new Array<Match>();
    const prgCalls = new Array<Match>();
    const trash = new Array<Match>();
    const controlBlocks = new Array<Match>();
    const multilines = new Array<Match>();

    traverseRecursive(parseResults.fileTree);
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
                case matchTypes.prgCall:
                    prgCalls.push(element);
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
            }
        }

    }

    const syntaxArray: SyntaxArray = {
        toolCalls: toolCalls,
        prgCalls: prgCalls,
        trash: trash,
        controlBlocks: controlBlocks,
        multilines: multilines
    };

    return syntaxArray;
}