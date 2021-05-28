OBJDIR := obj
SRC	  = $(wildcard Utilities/*.cpp Emulator/C64.cpp Emulator/*/*.cpp Emulator/*/*/*.cpp)
SRC_CC	  = $(wildcard Emulator/SID/resid/*.cc)
OBJECTS	  = $(patsubst %.cpp,%.o,$(SRC))
OBJECTS_CC = $(patsubst %.cc,%.o,$(SRC_CC))
CC        = emcc
INCLUDE   = -I. -IUtilities -IEmulator -IEmulator/Base -IEmulator/RetroShell -IEmulator/LogicBoard -IEmulator/Ports -IEmulator/Cartridges -IEmulator/Cartridges/CustomCartridges -IEmulator/CPU -IEmulator/CIA -IEmulator/Computer -IEmulator/Datasette -IEmulator/Drive -IEmulator/Files -IEmulator/Memory -IEmulator/General -IEmulator/Peripherals -IEmulator/SID -IEmulator/SID/fastsid -IEmulator/SID/resid -IEmulator/VICII -IEmulator/FileSystems
WARNINGS  = -Wall -Wno-unused-variable
STD       = -std=c++17
OPTIMIZE  = -O2
#-g
WASM_EXPORTS= -s EXPORTED_RUNTIME_METHODS=['cwrap'] -s EXPORTED_FUNCTIONS="['_main', '_wasm_toggleFullscreen', '_wasm_loadFile', '_wasm_key', '_wasm_joystick', '_wasm_reset', '_wasm_halt', '_wasm_run', '_wasm_take_user_snapshot', '_wasm_create_renderer', '_wasm_set_warp', '_wasm_pull_user_snapshot_file','_wasm_set_borderless', '_wasm_press_play', '_wasm_sprite_info', '_wasm_set_sid_model', '_wasm_cut_layers', '_wasm_rom_info', '_wasm_set_2nd_sid', '_wasm_set_sid_engine', '_wasm_get_cpu_cycles', '_wasm_set_color_palette', '_wasm_schedule_key', '_wasm_peek', '_wasm_poke', '_wasm_export_disk']"
CFLAGS    = $(INCLUDE) $(WARNINGS) $(STD) $(OPTIMIZE) -s USE_SDL=2 $(WASM_EXPORTS) -s DISABLE_EXCEPTION_CATCHING=0 -s BINARYEN_EXTRA_PASSES=--one-caller-inline-max-function-size=19306
#-s ASSERTIONS=1
LFLAGS= -s LLD_REPORT_UNDEFINED
PUBLISH_FOLDER=../vc64web.github.io

.PHONY: all clean

all: $(OBJECTS_CC) $(OBJECTS)

clean:
	rm -rf obj
	rm -f index.html
	rm -f vC64.js
	rm -f vC64.wasm
	rm -f vC64.data

main:
	$(CC)  -c $(CFLAGS) mainsdl.cpp
	mv *.o $(OBJDIR) 
	$(CC)  $(CFLAGS) $(LFLAGS) -o vC64.html --shell-file shell.html  -s INITIAL_MEMORY=128MB -s ALLOW_MEMORY_GROWTH=1 $(OBJDIR)/*.o
	#--preload-file roms
	#-s TOTAL_STACK=512MB
	mv vC64.html index.html

publish:
	rm -rf $(PUBLISH_FOLDER)/roms
	rm -rf $(PUBLISH_FOLDER)/css
	rm -rf $(PUBLISH_FOLDER)/js
	rm -rf $(PUBLISH_FOLDER)/img
	rm -f  $(PUBLISH_FOLDER)/vC64.*
	rm -f  $(PUBLISH_FOLDER)/*.js
	rm -f  $(PUBLISH_FOLDER)/*.json
	rm -f  $(PUBLISH_FOLDER)/index.html
	rm -f  $(PUBLISH_FOLDER)/run.html
	cp vC64.* $(PUBLISH_FOLDER)
	cp -r js $(PUBLISH_FOLDER)
	cp -r css $(PUBLISH_FOLDER)
	cp -r img $(PUBLISH_FOLDER)
	cp -r roms $(PUBLISH_FOLDER)
	cp index.html $(PUBLISH_FOLDER)
	cp run.html $(PUBLISH_FOLDER)
	cp sw.js $(PUBLISH_FOLDER)
	cp manifest.json $(PUBLISH_FOLDER)

$(OBJECTS): %.o: %.cpp
	$(CC) -c $(CFLAGS) $< -o $(OBJDIR)/$(@F)

$(OBJECTS_CC): %.o: %.cc
	$(CC) -c $(CFLAGS) $< -o $(OBJDIR)/$(@F)

$(OBJECTS): | $(OBJDIR)

$(OBJECTS_CC): | $(OBJDIR)

$(OBJDIR):
	mkdir $(OBJDIR)
