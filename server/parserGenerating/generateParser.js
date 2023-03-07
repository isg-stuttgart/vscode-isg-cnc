const fs = require('fs');
// generate a parser from the grammar and write it into a file
var peggy = require('peggy');
const tsPegjs = require('ts-pegjs');

try {
    let grammar = fs.readFileSync('./server/parserGenerating/ncGrammar.pegjs', 'utf8');
    let parser = peggy.generate(grammar, {
        output: 'source',
        format: 'commonjs',
        plugins: [tsPegjs],
        tspegjs: {
            customHeader: "/* eslint-disable */\n// @ts-nocheck"
        }
    });
    // write result to filer
    fs.writeFileSync('./server/src/ncParser.ts', parser);
} catch (error) {
    console.error(error);
}

