import { EOL } from "os";
import { FileRange, Match, Position } from "./parserClasses";
import { ParseResults } from "./parsingResults";
import { getCommandUriToOpenDocu } from "./cycles";

/**
 * Find all ranges of the given string in the given file content. Hereby exclude strings in comments (parser based). If an empty string is specified to be searched, an empty array is returned.
 * When the parser fails, comments are not excluded.
 * @param fileContent the file string
 * @param string the string to search for
 * @param uri the uri of the file
 * @returns an array of file ranges (uri and start/end positions)
 */
export function findLocalStringRanges(fileContent: string, string: string, uri: string): FileRange[] {
    // if string is empty, return empty array
    if (string.length === 0) {
        return [];
    }
    let ranges: FileRange[] = [];
    const lines = fileContent.split(EOL);
    let commentMatches: Match[];
    try {
        commentMatches = new ParseResults(fileContent).syntaxArray.comments;
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
 * Returns whether a given position is within one of the given matches.
 * @param matches the matches to check
 * @param pos the position
 */
export function isWithinMatches(matches: Match[], pos: Position): boolean {
    let isInMatch = false;
    for (const match of matches) {
        const matchStart = new Position(match.location.start.line - 1, match.location.start.column - 1);
        const matchEnd = new Position(match.location.end.line - 1, match.location.end.column - 1);
        if (compareLocations(matchStart, pos) <= 0 && compareLocations(pos, matchEnd) <= 0) {
            isInMatch = true;
            break;
        }
    }
    return isInMatch;
}
/**
 * Return the surrounding variable string (locally defined vars) at the given position in the given text. If no variable is found, return null.
 * @param text the text to search in
 * @param position the position to search at 
 * @returns the surrounding variable string or null if no variable is found at the given position 
 */
export function getSurroundingVar(text: string, position: Position): string | null {
    let result = null;
    const lines = text.split(EOL);
    const line = lines[position.line];
    const varRegex = /^V\.(P|S|L|CYC)\.[_a-zA-Z0-9]+/gm;

    // word begin can be between 0 and position.character
    for (let begin = 0; begin <= position.character; begin++) {
        // get match which starts at current begin
        const substring = line.substring(begin);
        const match = substring.match(varRegex);
        if (match) {
            const matchString = match[0];
            const matchEnd = begin + matchString.length;

            // if match ends after position.character, we found the surrounding variable
            if (matchEnd >= position.character) {
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
/**
 * Replaces links to the online documentation with command URIs to open the documentation within the IDE, depending on the type of link (file/https).
 * @param markdown  the markdown text containing possible links to the online documentation
 * @returns  the markdown with replaced links
 */
export function replaceLinksWithCommandUris(markdown: string): string {
    const urlRegex = /https:\/\/www\.isg-stuttgart\.de\/fileadmin\/kernel\/kernel-html\/([A-Za-z\-]+)\/index\.html#(\d+)/g;

    return markdown.replace(urlRegex, (_match, _locale, id) => {
        return getCommandUriToOpenDocu(id);
    });
}
