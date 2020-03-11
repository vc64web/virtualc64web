SRC	  = $(wildcard C64/*/*.cpp C64/*/*/*.cpp)
SRC_CC	  = $(wildcard C64/SID/resid/*.cc)
OBJECTS	  = $(patsubst %.cpp,%.o,$(SRC))
OBJECTS_CC = $(patsubst %.cc,%.o,$(SRC_CC))
CC        = emcc 
INCLUDE   = -I. -IC64 -IC64/Cartridges -IC64/Cartridges/CustomCartridges -IC64/CPU -IC64/CIA -IC64/Computer -IC64/Datasette -IC64/Drive -IC64/FileFormats -IC64/Memory -IC64/General -IC64/Mouse -IC64/SID -IC64/SID/fastsid -IC64/VICII
WARNINGS  = -Wall -Wno-unused-variable
STD       = -std=c++17
OPTIMIZE  = -flto -O3
CFLAGS    = $(INCLUDE) $(WARNINGS) $(STD) $(OPTIMIZE) -s ASSERTIONS=1 -s USE_SDL=2 
WITH_THREADS = -s USE_PTHREADS=1 

.PHONY: all clean

all: $(OBJECTS_CC) $(OBJECTS)

clean:
	rm -f *.o
	rm -f vC64.html
	rm -f vC64.js
	rm -f vC64.wasm
	rm -f vC64.data

main:
	$(CC)  -c $(CFLAGS) mainsdl.cpp C64/C64.cpp
	$(CC)  $(CFLAGS) -o vC64.html  -s TOTAL_MEMORY=64MB -s ALLOW_MEMORY_GROWTH=1  *.o --preload-file roms

$(OBJECTS): %.o: %.cpp
	$(CC) -c $(CFLAGS) $<

$(OBJECTS_CC): %.o: %.cc
	$(CC) -c $(CFLAGS) $<

#reminder
#alle Vorkommen von
#mach, timebase
#richtig behandeln
