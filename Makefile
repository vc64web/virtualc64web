OBJDIR := obj
SRC	  = $(wildcard C64/C64.cpp C64/*/*.cpp C64/*/*/*.cpp)
SRC_CC	  = $(wildcard C64/SID/resid/*.cc)
OBJECTS	  = $(patsubst %.cpp,%.o,$(SRC))
OBJECTS_CC = $(patsubst %.cc,%.o,$(SRC_CC))
CC        = emcc 
INCLUDE   = -I. -IC64 -IC64/Cartridges -IC64/Cartridges/CustomCartridges -IC64/CPU -IC64/CIA -IC64/Computer -IC64/Datasette -IC64/Drive -IC64/FileFormats -IC64/Memory -IC64/General -IC64/Mouse -IC64/SID -IC64/SID/fastsid -IC64/VICII
WARNINGS  = -Wall -Wno-unused-variable
STD       = -std=c++17
OPTIMIZE  = -O2
WASM_EXPORTS= -s EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap'] -s EXPORTED_FUNCTIONS="['_main', '_wasm_toggleFullscreen', '_wasm_loadFile', '_wasm_key', '_wasm_joystick', '_wasm_reset', '_wasm_halt', '_wasm_run', '_wasm_take_user_snapshot', '_wasm_pull_user_snapshot','_wasm_user_snapshot_width', '_wasm_user_snapshot_height', '_wasm_user_snapshots_count','_wasm_pull_auto_snapshot','_wasm_auto_snapshot_width', '_wasm_auto_snapshot_height', '_wasm_auto_snapshots_count','_wasm_restore_user_snapshot','_wasm_restore_auto_snapshot', '_wasm_suspend_auto_snapshots', '_wasm_resume_auto_snapshots']"
CFLAGS    = $(INCLUDE) $(WARNINGS) $(STD) $(OPTIMIZE) -s USE_SDL=2 $(WASM_EXPORTS) 
#-s ASSERTIONS=1

.PHONY: all clean

all: $(OBJECTS_CC) $(OBJECTS)

clean:
	rm -rf obj
	rm -f vC64.html
	rm -f vC64.js
	rm -f vC64.wasm
	rm -f vC64.data

main:
	$(CC)  -c $(CFLAGS) mainsdl.cpp 
	mv *.o obj
	$(CC)  $(CFLAGS) -o vC64.html --shell-file shell.html  -s INITIAL_MEMORY=128MB -s ALLOW_MEMORY_GROWTH=1 $(OBJDIR)/*.o --preload-file roms

publish:
	rm -rf ../gh-pages/css
	rm -rf ../gh-pages/js
	rm -f ../gh-pages/vC64.*
	rm -f ../gh-pages/vC64*.js
	rm -f ../gh-pages/vc64web.png
	cp vc64web.png ../gh-pages
	cp vC64.* ../gh-pages
	cp vC64*.js ../gh-pages
	cp -r js ../gh-pages
	cp -r css ../gh-pages
	mv ../gh-pages/vC64.html ../gh-pages/index.html 


$(OBJECTS): %.o: %.cpp
	$(CC) -c $(CFLAGS) $< -o $(OBJDIR)/$(@F)

$(OBJECTS_CC): %.o: %.cc
	$(CC) -c $(CFLAGS) $< -o $(OBJDIR)/$(@F)

$(OBJECTS): | $(OBJDIR)

$(OBJECTS_CC): | $(OBJDIR)

$(OBJDIR):
	mkdir $(OBJDIR)
