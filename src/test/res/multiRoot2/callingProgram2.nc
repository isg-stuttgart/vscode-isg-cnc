;some code of callingProgram2
L calledProgram.nc
;some more code of callingProgram2
L CYCLE [NAME = calledProgram.nc      \
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