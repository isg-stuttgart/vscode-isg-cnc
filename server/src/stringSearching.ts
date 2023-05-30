import { EOL } from "os";
import { FileRange, Position } from "./parserClasses";
import { Match, getSyntaxArray, getSyntaxArrayByTree } from "./parsingResults";

/**
 * Find all ranges of the given string in the given file content. Hereby exclude strings in comments (parser based).
 * When the parser fails, comments are not excluded.
 * @param fileContent the file string
 * @param string the string to search for
 * @param uri the uri of the file
 * @returns an array of file ranges (uri and start/end positions)
 */
export function findLocalStringRanges(fileContent: string, string: string, uri: string): FileRange[] {
    let ranges: FileRange[] = [];
    const lines = fileContent.split(EOL);
    let commentMatches: Match[];
    try {
        commentMatches = getSyntaxArray(fileContent).comments;
    } catch (error) {
        // if the parser fails, comments are not excluded
        commentMatches = [];
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let varIndex = line.indexOf(string);
        while (varIndex !== -1) {
            const varEnd = varIndex + string.length;
            if (!isWithinMatches(commentMatches, new Position(i, varIndex))) {
                const range = new FileRange(uri, new Position(i, varIndex), new Position(i, varEnd));
                ranges.push(range);
            }
            varIndex = line.indexOf(string, varEnd);
        }
    }
    return ranges;
}

/**
 * Returns whether a given position is within a comment, based on the passed AST
 * @param ast 
 * @param position 
 * @returns 
 */
export function isPositionInComment(ast: any, position: Position): boolean {
    const comments = getSyntaxArrayByTree(ast).comments;
    return isWithinMatches(comments, position);
}

/**
 * Returns whether a given position is within a comment
 * @param line 
 * @param varIndex 
 */
export function isWithinMatches(matches: Match[], pos: Position): boolean {
    let isInComment = false;
    for (const match of matches) {
        const matchStart = new Position(match.location.start.line - 1, match.location.start.column - 1);
        const matchEnd = new Position(match.location.end.line - 1, match.location.end.column - 1);
        if (compareLocations(matchStart, pos) <= 0 && compareLocations(pos, matchEnd) <= 0) {
            isInComment = true;
            break;
        }
    }
    return isInComment;
}
/**
 * Return the surrounding variable string at the given position in the given file content. If no variable is found, return null.
 * @param fileContent 
 * @param position 
 * @returns 
 */
export function getSurroundingVar(fileContent: string, position: Position): string | null {
    let result = null;
    const lines = fileContent.split(EOL);
    const line = lines[position.line];
    const varRegex = /^V\.(P|S|L|CYC)\.[_a-zA-Z0-9]+(\.[_a-zA-Z0-9.]+|(\[-?[0-9]+\])*)?/gm;

    // word begin can be between 0 and position.character
    for (let begin = 0; begin <= position.character; begin++) {
        // get match which starts at current begin
        const substring = line.substring(begin);
        const match = substring.match(varRegex);
        if (match) {
            const matchString = match[0];
            const matchEnd = begin + matchString.length;

            // if match ends after position.character, we found the surrounding variable
            if (matchEnd > position.character) {
                result = matchString;
                break;
            }
        }
    }
    return result;
}

/**
 * Returns whether pos1 is before(-1), after(1) or equal(0) to pos2
 * @param pos1 
 * @param pos2 
 */
export function compareLocations(pos1: Position, pos2: Position): number {
    let result: number;
    if (pos1.line > pos2.line || (pos1.line === pos2.line && pos1.character > pos2.character)) {
        result = 1;
    } else if (pos1.line < pos2.line || (pos1.line === pos2.line && pos1.character < pos2.character)) {
        result = -1;
    } else {
        result = 0;
    };
    return result;
}


