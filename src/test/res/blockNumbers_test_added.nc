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
N050   ; V.P.ARRAY_1[3][6]
N060   V.P.ARRAY_1[3][6] = [10,11 ]
N070   #MSG["Text: %s",@P1]
N080   V.P.ARRAY_1[3][6]
N090 $ELSE
  #COMMENT BEGIN
  V.P.ARRAY_1[3][6]
  #COMMENT END
N100   V.
N110   #MSG["Error no String"]
N120   V.L.MY_ARRAY[3][6]
N130 $ENDIF

N140 $IF IS_NUMBER[@P2] == TRUE

N150   #MSG["Zahl: %f",@P2]

N160 $ELSE

N170   #MSG["Error not a number"]

N180 $ENDIF

N190 M17

% Main

;reference group 1
N200 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N210 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

;reference group 2
N220 L test.nc
N230 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N240 LL cycle
N250 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N260 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N270 M30