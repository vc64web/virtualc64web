OBJDIR := obj
SRC	  = $(wildcard Emulator/C64.cpp Emulator/*/*.cpp Emulator/*/*/*.cpp)
SRC_CC	  = $(wildcard Emulator/SID/resid/*.cc)
OBJECTS	  = $(patsubst %.cpp,%.o,$(SRC))
OBJECTS_CC = $(patsubst %.cc,%.o,$(SRC_CC))
CC        = emcc
INCLUDE   = -I. -IEmulator -IEmulator/Foundation -IEmulator/LogicBoard -IEmulator/Ports -IEmulator/Cartridges -IEmulator/Cartridges/CustomCartridges -IEmulator/CPU -IEmulator/CIA -IEmulator/Computer -IEmulator/Datasette -IEmulator/Drive -IEmulator/Files -IEmulator/Memory -IEmulator/General -IEmulator/Peripherals -IEmulator/SID -IEmulator/SID/fastsid -IEmulator/SID/resid -IEmulator/VICII -IEmulator/FileSystems
WARNINGS  = -Wall -Wno-unused-variable
STD       = -std=c++17
OPTIMIZE  = -O2
WASM_EXPORTS= -s EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap'] -s EXPORTED_FUNCTIONS="['_main', '_wasm_toggleFullscreen', '_wasm_loadFile', '_wasm_key', '_wasm_joystick', '_wasm_reset', '_wasm_halt', '_wasm_run', '_wasm_take_user_snapshot', '_wasm_create_renderer', '_wasm_set_warp', '_wasm_pull_user_snapshot_file','_wasm_set_borderless', '_wasm_press_play', '_wasm_sprite_info', '_wasm_set_sid_model', '_wasm_cut_layers', '_wasm_rom_info', '_wasm_set_2nd_sid', '_wasm_set_sid_engine', '_wasm_get_cpu_cycles', '_wasm_set_color_palette', '_wasm_schedule_key']"
CFLAGS    = $(INCLUDE) $(WARNINGS) $(STD) $(OPTIMIZE) -s USE_SDL=2 $(WASM_EXPORTS) 
#-s ASSERTIONS=1

.PHONY: all clean

all: $(OBJECTS_CC) $(OBJECTS)

clean:
	rm -rf obj
	rm -f index.html
	rm -f vC64.js
	rm -f vC64.wasm
	rm -f vC64.data

main:
	$(CC)  -c $(CFLAGS) Emulator/SID/SIDBridge.cpp mainsdl.cpp
	mv *.o obj
	$(CC)  $(CFLAGS) -o vC64.html --shell-file shell.html  -s INITIAL_MEMORY=128MB -s ALLOW_MEMORY_GROWTH=1 $(OBJDIR)/*.o 
	#--preload-file roms
	#-s TOTAL_STACK=512MB
	mv vC64.html index.html

publish:
	rm -rf ../gh-pages/roms
	rm -rf ../gh-pages/css
	rm -rf ../gh-pages/js
	rm -rf ../gh-pages/img
	rm -f  ../gh-pages/vC64.*
	rm -f  ../gh-pages/*.js
	rm -f  ../gh-pages/*.json
	rm -f  ../gh-pages/index.html
	cp vC64.* ../gh-pages
	cp -r js ../gh-pages
	cp -r css ../gh-pages
	cp -r img ../gh-pages/
	cp -r roms ../gh-pages/
	cp index.html ../gh-pages 
	cp sw.js ../gh-pages
	cp manifest.json ../gh-pages

$(OBJECTS): %.o: %.cpp
	$(CC) -c $(CFLAGS) $< -o $(OBJDIR)/$(@F)

$(OBJECTS_CC): %.o: %.cc
	$(CC) -c $(CFLAGS) $< -o $(OBJDIR)/$(@F)

$(OBJECTS): | $(OBJDIR)

$(OBJECTS_CC): | $(OBJDIR)

$(OBJDIR):
	mkdir $(OBJDIR)
