// parse the file
import * as fs from "fs";
import * as path from "path";
import { isMatch, Match, Position } from '../parserClasses.js';
import { findCompleteASTPath, findPreciseMatchOfTypes } from '../parserSearching.js';
import { ParseResults } from "../parsingResults.js";

const debugFilePath = [
  path.join(__dirname, "fileToDebug.nc"),
  path.join(__dirname, "../../../src/parserGenerating/fileToDebug.nc")
].find(fs.existsSync);

if (!debugFilePath) {
  throw new Error("Could not locate fileToDebug.nc for debugParser");
}

const parseResults = new ParseResults(fs.readFileSync(debugFilePath, "utf-8"));
const fileTree = parseResults.results.fileTree;

// comment in/out what you want to debug
function debug() {
  //console.log("Parse results: " + JSON.stringify(parseResults, null, 2));

  printMostPreciseMatchOfTypeAtPosition(new Position(63, 12));

  printCompleteASTPathAtPosition(new Position(63, 12));
  console.log("Debugging finished.");
}

function printCompleteASTPathAtPosition(pos: Position): void {
  let path = findCompleteASTPath(fileTree, pos);
  // reverse path to print from precise match to root
  path.reverse();
  path = path.map(replaceMatchesWithSimplifiedMatches);
  console.log("Complete AST path at position", pos, ": ");
  // iterate from precise match to root and print simple representation of each node
  let counter = 0;
  for (const node of path) {
    counter++;
    console.log(`Node ${counter}:`);
    console.dir(node, { depth: null });
    console.log("\n");
  }
}

function replaceMatchesWithSimplifiedMatches(node: any): any {
  if (Array.isArray(node)) {
    return node.map(replaceMatchesWithSimplifiedMatches);
  } else if (isMatch(node)) {
    return getSimplifiedMatch(node);
  } else {
    return node;
  }
}


function getSimplifiedMatch(match: Match): string {
  const posString = match.location ? `(${match.location.start.line}, ${match.location.start.column})-(${match.location.end.line}, ${match.location.end.column})` : "no location";
  return `Match(type=${match.type}, pos=${posString}, text=${match.text})`;
}

function printMostPreciseMatchOfTypeAtPosition(pos: Position): void {
  const match = findPreciseMatchOfTypes(fileTree, pos);
  console.log("Most precise match at position", pos, ": ");
  console.dir(match, { depth: null });
}
debug();

