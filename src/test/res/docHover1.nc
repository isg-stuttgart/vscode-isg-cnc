; IMPORTANT: Try to always add new stuff at the end of the file to avoid breaking existing tests
#COMMENT BEGIN
  Some description
  @param parameterOne - Description of parameterOne
  @return returnName Description of returnName  
  **Some bold description between**
  @throws ErrorName Description of ErrorName
#COMMENT END
%L UP1           (1. lokales Unterprogramm)

#COMMENT BEGIN
 Doc for Main Program
#COMMENT END
%MAINPROGRAM 
LL UP1 ; Call of the first local subroutine
LL CYCLE[NAME=UP1] ; Cycle call of the first local subroutine

;------GOTOS------;
#COMMENT BEGIN
  Doc for N10
#COMMENT END
N10: foo foo
$GOTO N10
#COMMENT BEGIN
  Doc for testLabel
#COMMENT END
[testLabel] foo foo
$GOTO [testLabel]

;------Variables------;
#VAR
#COMMENT BEGIN
  First Prio Doc for V.P.VAR_1
#COMMENT END

  V.P.VAR_1 = 10 ; Second Prio Doc for V.P.VAR_1
  V.P.VAR_2 = 20 ; Doc for V.P.VAR_2
#ENDVAR
; Use of variables
XV.P.VAR_1 ; X10
