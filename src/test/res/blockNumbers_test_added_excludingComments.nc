%L cycle
N010 #VAR

  V.P.ARRAY_1[3][6] = [10,11,12,13,14,15, \

  20,21,22,23,24,25, \

  30,31,32,33,34,35 ]

  V.L.MY_ARRAY[3][6] = [10,11,12,13,14,15, 20,21,22,23,24,25, 30,31,32,33,34,35]
  V.P.VAR_1

  V.L.VAR_1

  V.S.VAR_1

N020 #ENDVAR
( Check variables V.P.ARRAY_1[3][6])

N030 $IF IS_STRING[@P1] == TRUE
N040   V.P.ARRAY_1[3][6]

  ; V.P.ARRAY_1[3][6]
N050   V.P.ARRAY_1[3][6] = [10,11 ]
N060   #MSG["Text: %s",@P1]
N070   V.P.ARRAY_1[3][6]
N080 $ELSE
  #COMMENT BEGIN
  V.P.ARRAY_1[3][6]
  #COMMENT END
N090   V.
N100   #MSG["Error no String"]
N110   V.L.MY_ARRAY[3][6]
N120 $ENDIF

N130 $IF IS_NUMBER[@P2] == TRUE

N140   #MSG["Zahl: %f",@P2]

N150 $ELSE

N160   #MSG["Error not a number"]

N170 $ENDIF

N180 M17

% Main

;reference group 1
N190 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N200 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

;reference group 2
N210 L test.nc
N220 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N230 LL cycle
N240 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N250 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N260 M30