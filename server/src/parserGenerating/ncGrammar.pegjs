//----------------------------------------------------------
//
//  global initializer
//
//----------------------------------------------------------

{{
	 const types = {
      toolCall: "toolCall",
      mainPrg: "mainPrg",
      localSubPrg: "localSubPrg",

      // prg calls
      localPrgCall: "localPrgCall",
      localPrgCallName: "localPrgCallName",
      localPrgDefinitionName: "localPrgDefinitionName",
      globalPrgCall: "globalPrgCall",
      globalPrgCallName: "globalPrgCallName",
      localCycleCall: "localCycleCall",
      localCycleCallName: "localCycleCallName",
      globalCycleCall: "globalCycleCall",
      globalCycleCallName: "globalCycleCallName",
      cycleParameter: "cycleParameter",
      cycleParameterAssignment: "cycleParameterAssignment",
      cycleParamList: "cycleParamList",
      
      controlBlock: "controlBlock",
      gotoBlocknumber: "gotoBlocknumber",
      gotoLabel: "gotoLabel",
      label: "label",
      multiline: "multiline",
      trash: "trash",
      skipBlock: "skipBlock",
      blockNumber: "blockNumber",
      blockNumberLabel: "blockNumberLabel",
      varDeclaration: "varDeclaration",
      variable:"variable",
      comment: "comment",
  }
 class LightMatch {
    location;
    text;
    constructor(location, text) {
        this.location = location;
        this.text = text;
    }
}
  class Match {                                             // holds information about a relevant match
      type;                                                 // the type of the match e.g. prgCall
      name;
      location;                                             // the location of the match
      content;                                              // the syntax tree of this match
      text;
      isMatch = true;
      constructor(type, content, location, text, name) {
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
  let mainPrg = null;

  // Save start time and cancel and throw error when parsing needs more than 10 seconds
  const startTime = Date.now();
  const timeOutMsg = "\n 'Parsing took longer than 5 seconds.' \n";
  function checkTimeout() {
    if(Date.now() - startTime > 5000){
      throw new Error(timeOutMsg);
    }
  }
}

//----------------------------------------------------------
//
//  parser rules
//
//----------------------------------------------------------

start                                                       // start rule
= fileTree:(file/anyTrash)*                                        
{
  return {fileTree:fileTree, numberableLinesUnsorted:numberableLinesUnsorted, mainPrg:mainPrg} // return the syntax information
}

anyTrash "anyTrash"                                         // any trash which is not a file, only needed for cancellation after timeout
= char: .
{
  checkTimeout();
  return char
}

file "file"
= file:(grayline* subprogram* mainprogram subprogram*)      // each file is a list of programs, also consume lines which cannot be matched otherwise, guarantee that file is parsed succesfully
{
  if(!mainPrg){
    mainPrg=file[2]?file[2]:null;
    return file;
  }
}

subprogram "subprogram"                                     // a subprogram and/or cycle
= content:("%L" $whitespace+ subprogram_name body){                // each subprogram requires a title and a body
 return new Match(types.localSubPrg, content, location(), text(), content[2].name);
}

subprogram_name "subprogram_name"                           // a subprogram name
= name
{
  return new Match(types.localPrgDefinitionName, text(), location(), text(), text());
}

mainprogram "mainprogram"                                   // the main program
= definition:("%" whitespaces $name?)? content:body         // for a main program, the title is optional
{
  let name = null
  if(definition && definition[2]){
    name = definition[2]
  }
  return new Match(types.mainPrg, content, location(), text(), name)
};

body "body"                                                 // the body of a (sub-) program
= (!(("%L" whitespace+ name)/("%" whitespaces name?))       // end body when new program part reached
(block/linebreak))+                                         // the body is a list of comments and blocks

block "block"                                               // an NC block
= content:(
  $whitespace+
/ grayspace                                                 // comment/whitespace. This is also included in block_body->default_block but needed here to keep only-comment-lines out of numberableLinesUnsorted
/ skipped_block
/block_body
){
  checkTimeout();
  return content;
}

skipped_block "skipped_block"                               // a skipped nc block
= content:("/"(digit/"10")?  grayspaces block_body){
    return new Match(types.skipBlock, content, location(), text(), null);
}

block_body "block_body"
= content:(
 n_command?                                                 // each block can be numbered by an n_command
( control_block                                             // a control block, i.e., $IF, $FOR etc.
/ plaintext_block                                           // some plaintext command, i.e., #MSG SAVE
/ default_block)){                                          // default block, i.e., G01 X12 Y23
// if text is not only whitespace, then add line to numberableLinesUnsorted
  if(text().trim().length>0){
    numberableLinesUnsorted.add(location().start.line);
  }
	return content;
}

control_block "control_block"                               // a control block, i.e., $IF, $ELSE, $SWITCH etc.
= content: (if_block/gotoBlock){
  numberableLinesUnsorted.add(location().start.line);
  numberableLinesUnsorted.add(location().end.line);
  return content;
}

if_block "if_block"                                         // an if block
= if_block_for_indentation                                  // this will be saved in controlBlocks
  elseif_block*                                             // any else-if extensions 
  else_block?                                               // optional else extension
  grayspaces "$ENDIF" grayspaces                            // ends when closed by $ENDIF which does not close inner block                                         
    
if_block_for_indentation
= content:(grayspaces "$IF" line_end                        // begins with $IF line
  if_block_content){
  numberableLinesUnsorted.add(location().start.line);
  return new Match(types.controlBlock, content, location(), text(), null);
}

elseif_block
= content:(grayspaces ("$ELSEIF" line_end                   // begins with $ELSEIF line
   if_block_content)){
  numberableLinesUnsorted.add(location().start.line);
	return new Match(types.controlBlock, content, location(), text(), null);
}

else_block
= grayspaces  content:("$ELSE" line_end                     // begins with $ELSEIF line
   if_block_content){
  numberableLinesUnsorted.add(location().start.line);
	return new Match(types.controlBlock, content, location(), text(), null);
}

if_block_content
= (!("$ELSEIF"/"$ELSE"/"$ENDIF")block)*                     // contains some other blocks while not finished or extended by $ELSE/ELSEIF/ENDIF
  
  
gotoBlock "gotoBlock"
= "$GOTO" gap (gotoNCommand/gotoLabel)

gotoNCommand                                                // goto statement to jump to blocknumber
= "N" id:$non_neg_integer
{
    return new Match(types.gotoBlocknumber, null, location(), text(), id)
}

gotoLabel                                                   // goto statement to jump to label
= "[" name:$([^\]]*) "]"{
  const id = name.toLowerCase()
  return new Match(types.gotoLabel, null, location(), text(), id)
}


plaintext_block "plaintext_block"                           // a block containing #-commands, plaintext command
= grayspaces 
( var_block
/ $("#" non_linebreak*))

var_block "var_block"                                       // a block of variable declarations
= content:("#VAR" 
  (n_command/grayline/(!endvar_line (var_dec/non_linebreak)))*
  grayspaces "#ENDVAR"){
  numberableLinesUnsorted.add(location().start.line);
  numberableLinesUnsorted.add(location().end.line);
  return content;
}

var_dec                                                     // var declaration
= id:var_dec_name $(var_index?) $(grayspaces ":" grayspaces data_type grayspaces)? $initialization?{
  numberableLinesUnsorted.add(location().start.line);
  return new Match(types.varDeclaration, null, location(), text(), id)
}


var_index
= ("." name)/(("[" integer "]")*)

initialization
= grayspaces "=" grayspaces
  (("["[^\]]* "]")/number/string)

endvar_line
= (!"#ENDVAR" non_linebreak)* "#ENDVAR"

default_block "default_block"                               // a default block containing "normal" NC-commands
= (multiline_default_block 
/ default_line)

multiline_default_block "multiline_default_block"           // a default block over multiple lines, extended by "\" 
= content:(
 multiline_line+
 default_line?                                             
){                                                          // consume the last block, so the first not extended by "\"
	return new Match(types.multiline, content, location(), null, null);
}

multiline_line
= default_line "\\" grayspaces linebreak                    // at least one line which is extended by \

default_line                                                // line with any whitespaces, paren-comment, program call and commands
= ((grayspace                                               
/ prg_call
/ var
/ command
/ parameter
/ label)+)
/ trash_line                                                // collected trashing


trash_line                                                  // lines which cannot be matched by other rules at the moment
= ((!stop_trashing .)+ linebreak?/linebreak)                         
{return "trash: " + text()}

parameter "parameter"
= "@P" grayspaces "[" (grayspace/var/parameter_trash_token)* "]"

parameter_trash_token "parameter_trash_token"
= $(!(grayspace/var/"]") .)+

var
=id:var_name $var_index?{
  return new Match(types.variable, id, location(), text(), id.name);
}

stop_trashing
= linebreak/"\\"/comment/prg_call/command/control_block/label/var

command "command"                                           // a tool call or other normal command
= (t_command/($([A-Z] number)))                             
 
n_command "n_command"                                       // a command defining the blocknumber, i.e., N010
= "N" id:$non_neg_integer colon:":"?{
  const type = colon?types.blockNumberLabel:types.blockNumber
  return new Match(type, null, location(), text(), id)
}

t_command "t_command"                                       // a command calling a specified tool, i.e., T1
= "T" number {
    return new Match(types.toolCall, null, location(), text(), text());
}

prg_call "prg_call"                                         // a subprogram/cycle call
= cycle_call/local_subprg_call/global_subprg_call

local_subprg_call "local_subprg_call"
= "LL" gap name:prg_name{
	const nameMatch = new Match(types.localPrgCallName, null, name.location, name.text, name.text)
	return new Match(types.localPrgCall, [nameMatch] , location(), text(), name.text);
}

global_subprg_call "global_subprg_call"
= "L" gap name:prg_name{
    const nameMatch = new Match(types.globalPrgCallName, null, name.location, name.text, name.text)
	return new Match(types.globalPrgCall, [nameMatch], location(), text(), name.text);
}

prg_name
= name:(prg_name_string/$(non_delimiter+))
{return new LightMatch(location(), name)}

prg_name_string
= "\"" name:$(non_delimiter+) "\""
 {return name}
  
cycle_call "cycle_call"
= content:(("LL"/"L") gap "CYCLE" grayspaces
  "[" grayspaces ($("NAME" grayspaces "=" grayspaces) prg_name)
  cycle_params grayline* "]"){          // brackets can contain a multline or a singleline
  const type = content[0]==="LL"?types.localCycleCall:types.globalCycleCall
  const nameType = content[0]==="LL"?types.localCycleCallName:types.globalCycleCallName
  let nameLM = content[6][1]                                                  // LightMatch of the cycle name
  const nameMatch = new Match(nameType, null, nameLM.location, nameLM.text, nameLM.text)
  content[6][1] = nameMatch                                                   // replace nameLightMatch with nameMatch  
  return new Match(type, content, location(), text(), nameLM.text);
}

cycle_params = content:(cycle_call_param_multiline/cycle_call_param_line) {
  return new Match(types.cycleParamList, content, location(), text(), null) 
}

cycle_call_param_multiline 
= content:
(cycle_call_param_line "\\" whitespaces linebreak           // at least one line extended by \   
((cycle_call_param_line "\\" whitespaces linebreak)         // any lines extended by \
/ grayline)*                                                // or white/comment lines
cycle_call_param_line linebreak?){             
	return new Match(types.multiline, content, location(), text(), null);
}

cycle_call_param_line "cycle_call_param_line"
= ((line_comment/paramAssignement/param/var/cycle_call_param_line_trash_token/$whitespace+))*

param = content:("@" $("P"non_neg_integer)){                // one parameter of a cycle
  return new Match(types.cycleParameter, content, location(), text(), content[1]);
}

paramAssignement =                                          // one param assignement, meaning a param name followed by a var/string/value
content:(param grayspaces "=" grayspaces value:(var/string/cycle_call_param_line_trash_token?)){
  return new Match(types.cycleParameterAssignment, content, location(), text(), content[0].name);
}

cycle_call_param_line_trash_token                           // trashes non-relevant tokens in cycle call parameters
= $(!("]"/"\r"/"\n"/"\\"/line_comment/var/whitespace) .)+

label                                                       // a label to which you can jump by goto statement
= "[" name:$([^\]]*) "]"{
  const id = name.toLowerCase()                             // labels are not case sensitive
  return new Match(types.label, null, location(), text(), id) 
}

data_type = 
  $("BOOLEAN"/"SGN08"/"UNS08"/"SGN16"/"UNS16"/"SGN32"/"UNS32"/"REAL"/
  ("STRING[" (("12"[0-6]) / ("1"[01][1-9]) / ([1-9][0-9]) / ([0-9]))  "]")) // STRING[i] with i = 1...126


var_dec_name
= $(("V." ("P"/"S"/"L"/"CYC") ".") name) 

var_name
=  var_dec_name                                             // copy of var_dec_name because we don't want var_dec_name to include the same type for definition searching
{
  return new Match(types.variable, text(), location(), text(), text()) 
}
gap                                                         // a gap
= paren_comment* whitespace grayspaces                      // at least one whitespace surrounded by grayspace

grayspace "grayspace"                                       // grayspace, a generalization whitespace, contains whitespace/comments
= whitespace                                               
/ comment

grayspaces "grayspaces"
= grayspace*

grayline "grayline"
= (whitespace/comment)* linebreak
/ (whitespace/comment)+

comment "comment"                                           // comments are either:
= line_comment                                              // line comments, i.e.,  ";" or "()" or
/ block_comment                                             // block comments, i.e., #COMMENT BEGIN/END

line_comment "line_comment"                                 // a line comment is either:
= paren_comment                                             // with parenthesis or
/ semicolon_comment                                         // after semicolon

paren_comment "paren_comment"                               // a line comment with parenthesis
= $("(" [^)\r\n]* ")" 
/ "(" [^\r\n]*)                                             // if only opened, then same behaviour as ;-comment
{ return new Match(types.comment, null, location(), text(), null)}

semicolon_comment "semicolon_comment"                       // a line comment after a semicolon
= ";" [^\r\n]*
{ return new Match(types.comment, null, location(), text(), null)}

block_comment "block_comment"                               // a block comment
= "#COMMENT" whitespace+ "BEGIN"                            // consume #COMMENT BEGIN
  (!("#COMMENT" whitespace+ "END") .)*                      // consume while current pointer is not on "COMMENT END"
  ("#COMMENT" whitespace+ "END")                            // consume #COMMENT END
{ return new Match(types.comment, null, location(), text(), null)}

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
= $digit+

number "number"                                             // a number
= integer ("." non_neg_integer)?
{return text()}

name "name"                                                 // a name/identifier consisting of alphabetical Characters, "_" and "."
= $[_a-zA-Z0-9.]+

digit "digit" = $[0-9]                                       // a digit

non_delimiter "non_delimiter"                               // a non-delimiter
= [^\t ();"\[\],#$\n\r]

string "string"                                             // a string
= "\"" [^\"]* "\""
{return text()}

line_end
= non_linebreak* linebreak?
{return text()}
