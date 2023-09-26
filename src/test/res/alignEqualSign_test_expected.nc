G00 G90 M03 S6000 F5000           ( Technology data )

; cycle call parameter:
#VAR
  V.L.SurfacePosition      = 0                         ; Z-Position of workpiece surface
  V.L.RetractionPlane       = 100                       ; Z-Position of retraction plane
  V.L.SafetyClearance       = 10                        ; relative value of safety clearance
  V.L.DepthOfSpigot         = 5                         ; depth of spigot
  V.L.MachiningMode         = 2                         ; roughing
  V.L.MaxIncrementZ         = V.L.DepthOfSpigot         ; maximal infeed in Z
  V.L.FeedRateZ             = 1000                      ; plunging feedrate
  V.L.MaxIncrementXY        = V.G.WZ_AKT.R*0.8          ; maximal infeed in XY
  V.L.ContourID             = 1                         ; Idendification number pocket contour
  Some trash line which shouldnt be aligned
  ;optional parameter
  V.L.Direction             = 1                   ; down-cut-milling (0) / up-cut-milling (1) (Standard = 0)
  V.L.FinishingSpindleSpeed = 66                  ; Finishing spindle speed (Standard = initial speed)
  V.L.FinishingOffsetZ      = 0.2                 ; Finishing offset in Z (Standard = 0)
  V.L.FinishingOffsetXY     = 1                   ; Finishing offset in XY (Standard = 0)
  V.L.FinishingFeedRateZ    = 77                  ; Finishing feedrate in Z (Standard = roughing feedrate)
  V.L.FinishingFeedRateXY   = 2000                ; Finishing feedrate in XY (Standard = roughing feedrate)
  V.L.PlungingModeZ         = 2                   ; Plunging mode in Z (Standard = 1)
  V.L.HelixSlope            = 1                   ; Helix slope (Standard = 10% of tool radius)
  V.L.HelixRadiusSetpoint   = V.G.WZ_AKT.R * 0.9  ; Helix radius set point (Standard = 90% of tool radius)
  V.L.MaxIncrementXY_Finish              = 0.1                 ; maximal infeed in XY for finishing
  V.L.IsleID1                      = 2                   ; Idendification number isle 1

#ENDVAR