Anlegen von Variablen mit und ohne Typdeklaration

%test_var_def_1

:

#VAR

  V.P.VAR_1

  V.P.VAR_2 = 10.67

  V.P.VAR_3 : UNS32 = 10

  V.L.NAME_1 : STRING[20] = "GRUNDPLATTE"

  V.L.VAR_1 : REAL = 23.45

  V.L.VAR_2 : SGN08

#ENDVAR

Zur besseren Übersicht kann die Initialisierung eines Variablen-Arrays mit dem „\“-Zeichen auch über mehrere NC-Zeilen geschrieben werden.

%test_var_def_2

:

#VAR

  V.P.ARRAY_1[3][6] = [10,11,12,13,14,15, \

  20,21,22,23,24,25, \

  30,31,32,33,34,35 ]

  V.L.MY_ARRAY[3][6] = [10,11,12,13,14,15, 20,21,22,23,24,25, 30,31,32,33,34,35]

#ENDVAR

N10 $IF EXIST[V.S.EXAMPLE[0]] == TRUE

N20   V.S.EXAMPLE[2] = 10  ;V.S-Variable[2] mit einem Wert belegen

N30 $ELSE

N40   #VAR

N50     V.S.EXAMPLE[5] = [1,2,3,4,5 ]

N60   #ENDVAR

N70 $ENDIF

…

M30

#VAR

  V.L.LOC_VAR1                    ;REAL64, 0.0

  V.L.LOC_VAR2 : UNS32 = 200      ;UNS32, 200

  V.L.LOC_VAR3 : REAL64 = 11.34   ;REAL64, 11.34

  V.L.LOC_VAR4 : BOOLEAN          ;BOOLEAN, FALSE or 0

  V.L.LOC_VAR5 = 10               ;REAL64, 10.0

#ENDVAR

:

XV.L.LOC_VAR5        ;X10.0

%CYCLE_TEST.cyc

P1 = 3        ;erster Index des Arrays

P2 = 2        ;zweiter Index des Arrays

P3 = 10       ;vorgegebene maximale Stringlänge

#VAR

  V.CYC.TEST_A[P1][P2] : STRING[P3]

  V.CYC.TEST_B : STRING[P3] = "TEXT"

  V.CYC.TEST_C : REAL64 = 1.0

#ENDVAR

:

M30