%NC-commands

#RT CYCLE 
#RT CYCLE DELETE
#RT CYCLE END
#WAIT SYN
#SIGNAL SYN
G01 X2 Y+0.0000 Z-2.0000 AP20 BP10+P20  C20 U10 V20 W1
G03 YV.P.2
G02 XP10+P20