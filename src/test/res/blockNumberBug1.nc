; %Test - Achsen

%Test - Achsen

N10 G90 A1 = 0

N20 #MC_MovePath SYN	[ CH=   \
                          @PL1=V.P.Appr_Start_ACS_X @PL2=V.P.Appr_Start_ACS_Y @PL3=V.P.Appr_Start_ACS_Z ]
                          
N30 M30