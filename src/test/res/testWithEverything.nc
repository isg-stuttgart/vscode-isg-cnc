; IMPORTANT: Try to always add new stuff at the end of the file to avoid breaking existing tests

%L UP1           (1. lokales Unterprogramm)

N0 N1.....

N2: .....

N9 M17           (M17 kann auch entfallen)

%L UP2           (2. lokales Unterprogramm)

N11 G15 T23

N12 .....

N19 M29          (M29 kann auch entfallen)

%MAIN            (Hauptprogramm)

L subPrograms.nc \
  G33 G23 \
  G15 T23 \
  G33 G23
N100 .....

N105 .....
$IF true
N200   LL UP1      (Aufruf des 1. LUPs)
N200   T23
  $IF false
N210     LL UP2      (Aufruf des 2. LUPs)
  $ENDIF
$ENDIF
/ ausgeblendete Zeile
L C:\ISG\vscode-isg-cnc\src\test\res\test.nc
.
#COMMENT BEGIN
  Blockkommentar
  über mehrere Zeilen
#COMMENT END
N250 LL UP2      (Aufruf des 2. LUPs)

.

N300 M30         (Hauptprogrammende)