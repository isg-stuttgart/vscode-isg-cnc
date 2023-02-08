//----------------------------------------------------------
//
//  global initializer
//
//----------------------------------------------------------

{{
	const types = {
      toolCall: "toolCall",
      localSubPrg: "localSubPrg",
      localPrgCall: "localPrgCall",
      globalPrgCall: "globalPrgCall",
      localCycleCall: "localCycleCall",
      globalCycleCall: "globalCycleCall",
      controlBlock: "controlBlock",
      multiline: "multiline",
      trash: "trash",
      name: "name",
      skipBlock: "skipBlock",
      blockNumber: "blockNumber"
    }
    
  class Match {                                             // holds information about a relevant match
      type;                                                 // the type of the match e.g. prgCall
      name;
      location;                                             // the location of the match
      content;                                              // the syntax tree of this match
      text;
      constructor(type, content, location, text,name) {
        this.type = type;
        this.content = content;
        this.location = location;
        this.text = text;
        this.name = name;
      }
    }
}}

//----------------------------------------------------------
//
//  per-parser initializer
//
//----------------------------------------------------------

{
	const numberableLinesUnsorted = new Set();
}

//----------------------------------------------------------
//
//  parser rules
//
//----------------------------------------------------------

start                                                       // start rule
= fileTree:file                                             // return the syntax information
{return {fileTree:fileTree, numberableLinesUnsorted:numberableLinesUnsorted}}
file "file"
= (program/.)*                                              // each file is a list of programs, also consume lines which cannot be matched otherwise, guarantee that file is parsed succesfully

program "program"
= subprogram                                                // each program is either a sub-program or
/ mainprogram                                               // a program

subprogram "subprogram"                                     // a subprogram and/or cycle
= comment? "%L" whitespace+ title:$name content:body{       // each subprogram requires a title and a body
 return new Match(types.localSubPrg, content, location(), text(), title);
}

mainprogram "mainprogram"                                   // the main program
= $(comment? mainprg_title?) body                           // for a main program, the title is optional

mainprg_title "mainprg_title"                               // the title of the main program
= "%" whitespaces title:name

body "body"                                                 // the body of a (sub-) program
= (!(("%L" whitespace+ title:$name)/mainprg_title)           // end body when new program part reached
($(whitespaces linebreak)									// consume empty lines / rest of lines
/ ( whitespaces (comment / block) whitespaces linebreak?)))+ // the body is a list of comments and blocks

comment "comment"                                           // comments are either:
= line_comment                                              // line comments, i.e.,  ";" or "()" or
/ block_comment                                             // block comments, i.e., #COMMENT BEGIN/END

line_comment "line_comment"                                 // a line comment is either:
= paren_comment                                             // with parenthesis or
/ semicolon_comment                                         // after semicolon
{return text()}

paren_comment "paren_comment"                               // a line comment with parenthesis
= "(" [^)\r\n]* ")" 
/ "(" [^\r\n]*                                              // if only opened, then same behaviour as ;-comment


semicolon_comment "semicolon_comment"                       // a line comment after a semicolon
= ";" [^\r\n]*

block_comment "block_comment"                               // a block comment
= grayspaces                                                // may be proceeded by ws or comments
  "#COMMENT" whitespace+ "BEGIN"                            // consume #COMMENT BEGIN
  (!("#COMMENT" whitespace+ "END") .)*                      // consume while current pointer is not on "COMMENT END"
  ("#COMMENT" whitespace+ "END")                            // consume #COMMENT END

block "block"                                               // an NC block
= grayspaces (skipped_block/block_body)

skipped_block "skipped_block"                               // a skipped nc block
= content:("/"(digit/"10")?  grayspaces block_body){
    return new Match(types.skipBlock, content, location(), text() ,null);
}

block_body "block_body"
= content:(
 n_command?                                                 // each block can be numbered by an n_command
( control_block                                             // a control block, i.e., $IF, $FOR etc.
/ plaintext_block                                           // some plaintext command, i.e., #MSG SAVE
/ default_block)){                                          // default block, i.e., G01 X12 Y23
	numberableLinesUnsorted.add(location().start.line);
	return content;
}

control_block "control_block"                               // a control block, i.e., $IF, $ELSE, $SWITCH etc.
= if_block 
/ grayspaces "$" non_linebreak*
    
if_block "if_block"                                         // an if block
= if_block_for_indentation                                  // this will be saved in controlBlocks
  elseif_block*                                             // any else-if extensions 
  else_block?                                               // optional else extension
  grayspaces "$ENDIF" grayspaces linebreak?                 // ends when closed by $ENDIF which does not close inner block                                         
    
if_block_for_indentation
= content:(grayspaces "$IF" line_end                        // begins with $IF line
  if_block_content){
  return new Match(types.controlBlock, content, location(), null, null);
}

elseif_block
= content:(grayspaces ("$ELSEIF" line_end                   // begins with $ELSEIF line
   if_block_content)){
	return new Match(types.controlBlock, content, location(), null, null);
}

else_block
= grayspaces  content:("$ELSE" line_end                     // begins with $ELSEIF line
   if_block_content){
	return new Match(types.controlBlock, content, location(), null, null);
}

if_block_content
= (!(grayspaces ("$ELSEIF"/"$ELSE"/"$ENDIF")                // contains some other blocks while not finished or extended by $ELSE/ELSEIF/ENDIF
  grayspaces linebreak?)block)*
  
plaintext_block "plaintext_block"                           // a block containing #-commands, plaintext command
= grayspaces 
( var_block
/ $("#" non_linebreak*))

var_block "var_block"                                       // a block of variable declarations
= "#VAR" 
  (grayline/(!endvar_line default_line))*
  grayspaces "#ENDVAR"{
  numberableLinesUnsorted.add(location().start.line);
  numberableLinesUnsorted.add(location().end.line);
  return text();
}

endvar_line
= (!"#ENDVAR" .)* "#ENDVAR"

default_block "default_block"                               // a default block containing "normal" NC-commands
= multiline_default_block 
/ default_line

multiline_default_block "multiline_default_block"           // a default block over multiple lines, extended by "\" 
= content:(default_line+                                    // at least one line...   (used default_line+ to match all to the next \ when there is a mix of e.g. commands and t)
"\\" whitespaces linebreak                                  // which is extended by \
((default_line+                                             // any other default lines...
"\\" whitespaces linebreak)                                 // extended by \
/ (whitespaces line_comment? linebreak))*                   // allow line comments and white lines between them
default_line+){                                             // consume the last block, so the first not extended by "\"
	return new Match(types.multiline, content, location(), null, null);
}

default_line                                                // line with any whitespaces, paren-comment, program call and commands
= (($grayspace+                                               
/  prg_call                                                 
/  command)+)
/ trash_line
linebreak?

trash_line                                                  // lines which cannot be matched by other rules at the moment
= ((!stop_trashing .)/whitespace)+                                       // last line, without linebreak
{return text()}

stop_trashing
= linebreak/"\\"/grayspace/prg_call/command/control_block

command "command"                                           // a tool call or other normal command
= (t_command/($([A-Z] number)))                             // a tool call
 
n_command "n_command"                                       // a command defining the blocknumber, i.e., N010
= "N" non_neg_integer {
  return new Match(types.blockNumber, null, location(), text(), null)
}

t_command "t_command"                                       // a command calling a specified tool, i.e., T1
= "T" number {
    return new Match(types.toolCall, null, location(), text(), null);
}

prg_call "prg_call"                                         // a subprogram/cycle call
= cycle_call/local_subprg_call/global_subprg_call

local_subprg_call "local_subprg_call"
= "L" gap name:prg_name{
	return new Match(types.localPrgCall, null, location(), text(), name);
}

global_subprg_call "global_subprg_call"
= "LL" gap name:prg_name{
	return new Match(types.globalPrgCall, null, location(), text(), name);
}

prg_name
= non_delimiter+
{return text()}

cycle_call "cycle_call"
= content:(("LL"/"L") gap "CYCLE" grayspaces
   "[" grayspaces ("NAME" grayspaces "=" grayspaces prg_name)?
   (bracket_multiline/[^\]\r\n]*) "]"){                     // brackets can contain a multline or a singleline
	let name = null;
    if(content[6] !== null){
       name = content[6][4]
    }
    return new Match(types.localCycleCall, content, location(), text(), name);
  }

squared_bracket_block "squared_bracket_block"               // a block between "[" and "]"
= "[" (bracket_multiline/[^\]\r\n]*) "]"                    // brackets can contain a multline or a singleline

bracket_multiline
= [^\]\r\n\\]* "\\" whitespaces linebreak                   // at least one line extended by \   
( [^\]\r\n\\]* "\\" whitespaces linebreak                   // any lines extended by \
/ whitespaces line_comment?  linebreak)*                    // or whitelines or comment lines
[^\]\r\n\\]* (linebreak whitespaces)?{                      // last line before "]"
	return new Match(types.multiline, null, location(), null, null);
}

gap                                                         // a gap
= paren_comment* whitespace grayspaces                      // at least one whitespace surrounded by grayspace

grayspace "grayspace"                                       // grayspace, a generalization whitespace, contains
= whitespace                                                // whitespace or
/ paren_comment                                             // a parenthesis line comment

grayspaces "grayspaces"
= grayspace*{
  return text()
}

grayline "grayline"
= (whitespace/comment)* linebreak
/ (whitespace/comment)+

whitespace "whitespace"                                     // a whitespace, without linebreak
= [\t ]

whitespaces "whitespaces"
= whitespace*
{return text()}

linebreak "linebreak"                                       // a linebreak
= "\r\n"                                                    // Windows
/ "\r"                                                      // old Macintosh
/ "\n"                                                      // Unix, Linux, *nix

non_linebreak "non_linebreak"                               // a non-linebreak
= [^\n\r]

integer "integer"                                           // an integer
= "-"? non_neg_integer

non_neg_integer "non_neg_integer"                           // a non-negative integer
= digit+

number "number"                                             // a number
= integer ("." non_neg_integer)?
{return text()}

name "name"                                                 // a name/identifier consisting of alphabetical Characters, "_" and "."
= [_a-zA-Z0-9.]+

digit "digit" = [0-9]                                       // a digit
{return text()}
non_delimiter "non_delimiter"                               // a non-delimiter
= [^\t ();"\[\],#$\n\r]

string "string"                                             // a string
= "\"" [^\"]* "\""
{return text()}

line_end
= non_linebreak* linebreak 
{return text()}
