%L cycle
   #VAR

         V.P.ARRAY_1[3][6] = [10,11,12,13,14,15, \
  20,21,22,23,24,25, \
  30,31,32,33,34,35 ]
V.L.MY_ARRAY[3][6] = [10,11,12,13,14,15, 20,21,22,23,24,25, 30,31,32,33,34,35]
       V.P.VAR_1

   V.L.VAR_1

  V.S.VAR_1

#ENDVAR
( Check variables V.P.ARRAY_1[3][6])

        $IF IS_STRING[@P1] == TRUE
    V.P.ARRAY_1[3][6]
  ; V.P.ARRAY_1[3][6]
   $ELSE
V.P.ARRAY_1[3][6] = 20
     V.L.MY_ARRAY[3][6]
$ENDIF

% Main
; nested if
$IF IS_STRING[@P1] == TRUE
    V.P.ARRAY_1[3][6]
    $ELSEIF IS_STRING[@P2] == TRUE
    $IF IS_STRING[@P3] == TRUE
       V.P.ARRAY_1[3][6]
 $ELSEIF IS_STRING[@P4] == TRUE
     V.P.ARRAY_1[3][6]
    $ENDIF
$ELSE
V.P.ARRAY_1[3][6]
 $ENDIF  

 $FOR P[Counting Variable] = [Start value], [End value], [counting increment]
 V.P.ARRAY_1[3][6]
 $ENDFOR

  #COMMENT BEGIN
   some comment 
which should not be formatted
 #COMMENT END
;cycle call:
L CYCLE [NAME = SysMillContourSpigotDemo.nc  \
        @P1 = V.L.SurfacePosition     \
  @P2 = V.L.RetractionPlane     \
          @P3 = V.L.SafetyClearance     \
       @P4 = V.L.DepthOfSpigot       \
    @P5 = V.L.MachiningMode       \
@P7 = V.L.MaxIncrementZ       \
              @P8 = V.L.FeedRateZ           \
@P9 = V.L.MaxIncrementXY      \
@P50 = V.L.ContourID          \

; @P6 = V.L.Direction               \
       ; @P10 = V.L.FinishingSpindleSpeed  \
; @P11 = V.L.FinishingOffsetZ       \
; @P12 = V.L.FinishingOffsetXY      \
; @P13 = V.L.FinishingFeedRateZ     \
; @P14 = V.L.FinishingFeedRateXY    \
; @P15 = V.L.PlungingModeZ          \
; @P16 = V.L.HelixSlope             \
; @P17 = V.L.HelixRadiusSetpoint    \
; @P23 = V.L.MaxIncrementXY_Finish  \

    @P51 = V.L.IsleID1]