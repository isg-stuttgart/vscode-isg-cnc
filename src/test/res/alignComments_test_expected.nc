G00 G90 M03 S6000 F5000                                           ( Technology data )

                                                                  ; cycle call parameter:
#VAR
  V.L.SurfacePosition      = 0                                    ; Z-Position of workpiece surface
  V.L.RetractionPlane = 100                                       ; Z-Position of retraction plane
                                                                  ;optional parameter
  V.L.Direction                         = 1                       ; down-cut-milling (0) / up-cut-milling (1) (Standard = 0)
  V.L.FinishingSpindleSpeed = 66                                  ; Finishing spindle speed (Standard = initial speed)
  V.L.FinishingOffsetZ                      = 0.2                 ; Finishing offset in Z (Standard = 0)
  V.L.FinishingFeedrate = 1000                 #COMMENT BEGIN
    should not be aligned
  #COMMENT END
  V.L.FinishingFeedrateZ = 1000                                   ( Finishing feedrate in Z Standard = 1000)
  V.L.FinishingFeedrateXY = 1000             ( Finishing feedrate in X and Y Standard = 1000) should not be aligned because comment is midline
#ENDVAR


foofoo ; some normal lines with comments
%L UP1              ( UP1 )
fooofoo             ( fooofoo )
#COMMENT BEGIN
should not be aligned
#COMMENT END
fooofoo             ; fooofoo
N1 fooofoo ( fooofoo ) not to be aligned
N2 fooofoo             ; fooofoo not to be aligned
