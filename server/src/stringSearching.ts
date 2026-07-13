import { FileRange, Match, Position } from "./parserClasses";
import { ParseResults } from "./parsingResults";
import { getCommandUriToOpenDocu } from "./helper";

/**
 * Find all ranges of the given string in the given file content. Hereby exclude strings in comments (parser based). If an empty string is specified to be searched, an empty array is returned.
 * When the parser fails, comments are not excluded.
 * @param fileContent the file string
 * @param string the string to search for
 * @param uri the uri of the file
 * @returns an array of file ranges (uri and start/end positions)
 */
export function findLocalStringRanges(fileContent: string, string: string, uri: string, commentMatches?: Match[], wholeWord: boolean = false): FileRange[] {
    // if string is empty, return empty array
    if (string.length === 0) {
        return [];
    }
    let ranges: FileRange[] = [];
    const lines = fileContent.split("\n");
    // reuse comments from an already parsed tree if provided, otherwise parse once here
    if (commentMatches === undefined) {
        try {
            commentMatches = new ParseResults(fileContent).syntaxArray.comments;
        } catch (error) {
            // if the parser fails, comments are not excluded
            commentMatches = [];
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let varIndex = line.indexOf(string);
        while (varIndex !== -1) {
            const varEnd = varIndex + string.length;
            // For variable searches (wholeWord) the match must not be the prefix of a longer variable
            // name (e.g. V.P.FOO must not match inside V.P.FOOBAR / V.P.FOO.BAR). Only the trailing
            // boundary is checked: NC address words like the "X" in "XV.L.VAR" legitimately precede a
            // variable, so a leading identifier character must not disqualify the match.
            const after = varEnd < line.length ? line[varEnd] : "";
            const trailingBoundaryOk = !wholeWord || !/[_a-zA-Z0-9.]/.test(after);
            if (trailingBoundaryOk && !isWithinMatches(commentMatches, new Position(i, varIndex))) {
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
    const lines = text.split("\n");
    const line = lines[position.line];
    if (line === undefined) {
        return null;
    }
    // dots are part of the name (e.g. V.P.FOO.BAR), matching the grammar rule name = [_a-zA-Z0-9.]+
    const varRegex = /V\.(P|S|L|CYC)\.[_a-zA-Z0-9.]+/g;

    // scan the line once and return the variable that contains the position (single pass instead of O(col^2))
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(line)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (position.character >= start && position.character <= end) {
            return match[0];
        }
    }
    return null;
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
