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
N110 ( Check variables V.P.ARRAY_1[3][6])

N120 $IF IS_STRING[@P1] == TRUE
N130   V.P.ARRAY_1[3][6]

N140   ; V.P.ARRAY_1[3][6]
N150   V.P.ARRAY_1[3][6] = [10,11 ]
N160   #MSG["Text: %s",@P1]
N170   V.P.ARRAY_1[3][6]
N180 $ELSE
N190   #COMMENT BEGIN
N200   V.P.ARRAY_1[3][6]
N210   #COMMENT END
N220   V.
N230   #MSG["Error no String"]
N240   V.L.MY_ARRAY[3][6]
N250 $ENDIF

N260 $IF IS_NUMBER[@P2] == TRUE

N270   #MSG["Zahl: %f",@P2]

N280 $ELSE

N290   #MSG["Error not a number"]

N300 $ENDIF

N310 M17

% Main

N320 ;reference group 1
N330 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N340 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

N350 ;reference group 2
N360 L test.nc
N370 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N380 LL cycle
N390 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N400 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N410 M30