%L cycle
#VAR

  V.P.ARRAY_1[3][6] = [10,11,12,13,14,15, \

  20,21,22,23,24,25, \

  30,31,32,33,34,35 ]

  V.L.MY_ARRAY[3][6] = [10,11,12,13,14,15, 20,21,22,23,24,25, 30,31,32,33,34,35]
  V.P.VAR_1

  V.L.VAR_1

  V.S.VAR_1

#ENDVAR
( Check variables V.P.ARRAY_1[3][6])

$IF IS_STRING[@P1] == TRUE
  V.P.ARRAY_1[3][6]
  ; V.P.ARRAY_1[3][6]
  V.P.ARRAY_1[3][6] = [10,11 ]
  #MSG["Text: %s",@P1]
  V.P.ARRAY_1[3][6]
$ELSE
  #COMMENT BEGIN
  V.P.ARRAY_1[3][6]
  #COMMENT END
  V.
  #MSG["Error no String"]
  V.L.MY_ARRAY[3][6]
$ENDIF

$IF IS_NUMBER[@P2] == TRUE

  #MSG["Zahl: %f",@P2]

$ELSE

  #MSG["Error not a number"]

$ENDIF

M17

% Main

;reference group 1
L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

;reference group 2
L test.nc
L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

LL cycle
LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

M30