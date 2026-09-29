// Shared regular expressions for recognizing block numbers and labels in NC code.
// Kept in one place so the formatter and the block-number commands stay in sync.

/** Matches an N-blocknumber label (e.g. "N10:") or a bracket label (e.g. "[start]:"). */
export const regExpLabels = new RegExp(/(\s?)N[0-9]*:{1}(\s?)|\[.*\]:{1}/);

/** Matches a leading block number, optionally preceded by skip-block markers (e.g. "/1 N10"). */
export const regExpBlocknumbers = new RegExp(/^((\s?)((\/)|(\/[1-9]{0,2}))*?(\s*?)N[0-9]*(\s?))/);
