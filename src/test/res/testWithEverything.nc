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


#VAR

  V.L.LOC_VAR1                    ;REAL64, 0.0

  V.L.LOC_VAR2 : UNS32 = 200      ;UNS32, 200

  V.L.LOC_VAR3 : REAL64 = 11.34   ;REAL64, 11.34

  V.L.LOC_VAR4 : BOOLEAN          ;BOOLEAN, FALSE or 0

  V.L.LOC_VAR5 = 10               ;REAL64, 10.0

  V.L.LOC_VAR6 = [3,
  212,213]

#ENDVAR

:

XV.L.LOC_VAR5        ;X10.0

V.L.LOC_VAR6     ;X212
LL UP3           (3. lokales Unterprogramm)
; Kommentar

%L UP3           (3. lokales Unterprogramm)
N0 N1.....

N2: .....

N9 M17           (M17 kann auch entfallen)

%L UP4           (4. lokales Unterprogramm)
LL CYCLE [NAME = UP1      \
  @P1  = V.L.SurfacePosition        \
  @P2  = V.L.RetractionPlane        \
  @P3  = V.L.SafetyClearance        \
  @P4  = V.L.DepthOfPocket          \
  @P5  = V.L.MachiningMode          \
  @P7  = V.L.MaxIncrementZ          \
  @P8  = V.L.FeedRateZ              \
  @P9  = V.L.MaxIncrementXY         \
  @P50 = V.L.ContourID              \

  ; @P6  = V.L.Direction              \
  ; @P10 = V.L.FinishingSpindleSpeed  \
  ; @P11 = V.L.FinishingOffsetZ       \
  ; @P12 = V.L.FinishingOffsetXY      \
  ; @P13 = V.L.FinishingFeedRateZ     \
  ; @P14 = V.L.FinishingFeedRateXY    \
  ; @P15 = V.L.PlungingModeZ          \
  ; @P16 = V.L.HelixSlope             \
  ; @P17 = V.L.HelixRadiusSetpoint    \

  @P51 = V.L.IsleID1                \
  ; @P52 = V.L.IsleID2                \
  ]
N10 G1 XY

; ----------------GOTO TEST SECTION--------------------------
awigaiw
N20: X100                              ;Label Definition N20:

$IF V.L.dummy_1 <100 $GOTO N20         ;Sprung zu Label N20

$IF V.L.dummy_1 >200

  $GOTO [LABEL_1]                  ;Sprung zu Label [LABEL_1]
  $GOTO N20                        ;Sprung zu Label N20

  N20: Y20

$ENDIF

[LABEL_1] X0                           ;Label Definition [LABEL_1]
L test.nc
LL cycle
L CYCLE [NAME=test.nc @P1 ="String1" @P2=12.34]
LL CYCLE [NAME=cycle @P1 ="String1" @P2=12.34]
N30 A0

$FOR V.P.my_var = 0, 4, 1

  $IF V.L.dummy_2 <200 $GOTO [CONTINUE]  ;Sprung zu Label [CONTINUE]

  $SWITCH V.P.my_var

    $CASE 0
      $GOTO [LABEL_1]                        ;Sprung zu Label [LABEL_1]

      V.P.AXE_X=V.P.GROUP[1].position[V.P.my_var]

      $BREAK

    $CASE 1

      V.P.AXE_Y=V.P.GROUP[1].position[V.P.my_var]

      $BREAK
    $CASE 2

      V.P.AXE_Z=V.P.GROUP[1].position[V.P.my_var]

      $BREAK

    $CASE 3

      V.P.AXE_A=V.P.GROUP[1].position[V.P.my_var]

    $DEFAULT

  $ENDSWITCH

$ENDFOR

[CONTINUE]                             ;Label Definition [CONTINUE]