%L cycle
/N010  skippedLine
N020 $GOTO N20
N20: blabla
N030 #VAR

N040   V.P.ARRAY_1 = [10,11,12,13,14,15, \

  20,21,22,23,24,25, \

  30,31,32,33,34,35 ]

N050   V.L.MY_ARRAY: REAL = [10,11,12,13,14,15, 20,21,22,23,24,25, 30,31,32,33,34,35]
N060   V.P.VAR_1

N070   V.L.VAR_1

N080   V.S.VAR_1

N090 #ENDVAR
( Check variables V.P.ARRAY_1[3][6])

N100 $IF IS_STRING[@P1] == TRUE
N110   V.P.ARRAY_1[3][6]

  ; V.P.ARRAY_1[3][6]
N120   V.P.ARRAY_1[3][6] = [10,11 ]
N130   #MSG["Text: %s",@P1]
N140   V.P.ARRAY_1[3][6]
N150 $ELSE
  #COMMENT BEGIN
  V.P.ARRAY_1[3][6]
  #COMMENT END
N160   V.
N170   #MSG["Error no String"]
N180   V.L.MY_ARRAY[3][6]
N190 $ENDIF

N200 $IF IS_NUMBER[@P2] == TRUE

N210   #MSG["Zahl: %f",@P2]

N220 $ELSE

N230   #MSG["Error not a number"]

N240 $ENDIF

N250 M17

% Main

;reference group 1
N260 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N270 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

;reference group 2
N280 L test.nc
N290 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N300 LL cycle
N310 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N320 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N330 M30