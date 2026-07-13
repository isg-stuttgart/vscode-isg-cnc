/**
 * Single, explicit boundary between the extension client and the language server's code.
 *
 * The client reuses the real grammar parser (and a few file-system helpers) of the language server
 * instead of duplicating them with fragile regex heuristics. Keeping every such import in this one
 * module makes that coupling explicit and refactor-safe: if the server layout changes, or these
 * features are eventually moved behind dedicated LSP requests, only this file needs to change
 * instead of every feature module reaching into `../../server/src/*`.
 *
 * NOTE: importing {@link ParseResults} means the (large, generated) grammar parser runs synchronously
 * in the extension host. Moving the formatter / outline / block-number features to server-side LSP
 * requests would remove that in-process parsing entirely; that is a larger, separate change.
 */
export { ParseResults } from "../../server/src/parsingResults";
export { MatchType } from "../../server/src/matchTypes";
export { WorkspaceIgnorer, findFileInRootDir } from "../../server/src/fileSystem";
export type { SyntaxArray } from "../../server/src/parsingResults";
export type { Match } from "../../server/src/parserClasses";
