%L UP1           (1. lokales Unterprogramm)

N1 .....

N2 .....

N9 M17           (M17 kann auch entfallen)

%L UP2           (2. lokales Unterprogramm)

N11 .....

N12 .....

N19 M29          (M29 kann auch entfallen)
#COMMENT BEGIN
  Dies ist das Hauptprogramm
#COMMENT END
%MAIN            (Hauptprogramm)

L subPrograms.nc
N100 .....

N105 .....
$IF [Options]
N200   LL UP1      (Aufruf des 1. LUPs)
$ENDIF

L C:\ISG\vscode-isg-cnc\src\test\res\test.nc
.

N250 LL UP2      (Aufruf des 2. LUPs)

.

N300 M30         (Hauptprogrammende)

