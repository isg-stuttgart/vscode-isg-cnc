%L cycle
N010 new Line
/N020  skippedLine
N030 $GOTO N20
N20: blabla
N040 #VAR

N050   V.P.ARRAY_1 = [10,11,12,13,14,15, \

  20,21,22,23,24,25, \

  30,31,32,33,34,35 ]

N060   V.L.MY_ARRAY: REAL = [10,11,12,13,14,15, 20,21,22,23,24,25, 30,31,32,33,34,35]
N070   V.P.VAR_1

N080   V.L.VAR_1

N090   V.S.VAR_1

N100 #ENDVAR
( Check variables V.P.ARRAY_1[3][6])

N110 $IF IS_STRING[@P1] == TRUE
N120   V.P.ARRAY_1[3][6]

  ; V.P.ARRAY_1[3][6]
N130   V.P.ARRAY_1[3][6] = [10,11 ]
N140   #MSG["Text: %s",@P1]
N150   V.P.ARRAY_1[3][6]
N160 $ELSE
  #COMMENT BEGIN
  V.P.ARRAY_1[3][6]
  #COMMENT END
N170   V.
N180   #MSG["Error no String"]
N190   V.L.MY_ARRAY[3][6]
N200 $ENDIF

N210 $IF IS_NUMBER[@P2] == TRUE

N220   #MSG["Zahl: %f",@P2]

N230 $ELSE

N240   #MSG["Error not a number"]

N250 $ENDIF

N260 M17

% Main

;reference group 1
N270 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N280 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

;reference group 2
N290 L test.nc
N300 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N310 LL cycle
N320 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N330 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N340 M30