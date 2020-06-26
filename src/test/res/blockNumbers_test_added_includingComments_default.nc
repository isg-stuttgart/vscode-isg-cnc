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
N100 ( Check variables V.P.ARRAY_1[3][6])

N110 $IF IS_STRING[@P1] == TRUE
N120   V.P.ARRAY_1[3][6]

N130   ; V.P.ARRAY_1[3][6]
N140   V.P.ARRAY_1[3][6] = [10,11 ]
N150   #MSG["Text: %s",@P1]
N160   V.P.ARRAY_1[3][6]
N170 $ELSE
N180   #COMMENT BEGIN
N190   V.P.ARRAY_1[3][6]
N200   #COMMENT END
N210   V.
N220   #MSG["Error no String"]
N230   V.L.MY_ARRAY[3][6]
N240 $ENDIF

N250 $IF IS_NUMBER[@P2] == TRUE

N260   #MSG["Zahl: %f",@P2]

N270 $ELSE

N280   #MSG["Error not a number"]

N290 $ENDIF

N300 M17

% Main

N310 ;reference group 1
N320 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N330 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

N340 ;reference group 2
N350 L test.nc
N360 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N370 LL cycle
N380 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N390 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N400 M30