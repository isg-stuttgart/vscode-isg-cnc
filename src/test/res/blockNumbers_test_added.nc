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
N100   #COMMENT BEGIN
  V.P.ARRAY_1[3][6]
  #COMMENT END
N110   V.
N120   #MSG["Error no String"]
N130   V.L.MY_ARRAY[3][6]
N140 $ENDIF

N150 $IF IS_NUMBER[@P2] == TRUE

N160   #MSG["Zahl: %f",@P2]

N170 $ELSE

N180   #MSG["Error not a number"]

N190 $ENDIF

N200 M17

% Main

;reference group 1
N210 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc
N220 L CYCLE [NAME=C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc @P1 ="String1" @P2=12.34]

;reference group 2
N230 L test.nc
N240 L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]

N250 LL cycle
N260 LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N270 L C:\ISG\cnc-language-server\test\NC\dir1\dir2\dir3\test.nc

N280 M30