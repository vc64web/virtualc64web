cmake_minimum_required(VERSION 3.16)

project(vc64 C CXX)

#to build a worker built 
#1.set thread_type to "worker"
#2.go to the sw.js and set needs_shared_array_buffer=true
set(thread_type "nonworker")
#set(thread_type "worker")

# Specify the C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED True)
set(CMAKE_CXX_EXTENSIONS False)

add_executable(vc64 mainsdl.cpp)

if("${thread_type}" STREQUAL "worker")
	target_compile_options(vc64 PRIVATE -sWASM_WORKERS)
	add_definitions(-Dwasm_worker)
else()
endif()

target_compile_options(vc64 PRIVATE -Wall -Werror)
target_compile_options(vc64 PRIVATE -Wno-unused-parameter)
target_compile_options(vc64 PRIVATE -O3 -mnontrapping-fptoint -fwasm-exceptions -s USE_SDL=2)
target_compile_options(vc64 PRIVATE -Wfatal-errors)
#target_compile_options(vc64 PRIVATE -g) 


add_subdirectory("Emulator" "vc64Core")
target_link_libraries(vc64 vc64Core)

#emscripten linker settings

#set(LF_OPTI  "-O3 -s NO_DISABLE_EXCEPTION_CATCHING")
set(LF_OPTI  "-O3 -mnontrapping-fptoint -fwasm-exceptions -s USE_SDL=2")
set(LF_SHELL "--shell-file ../shell.html")

set(LF_EXPORTS "-s EXPORTED_RUNTIME_METHODS=['cwrap','ccall'] -s EXPORTED_FUNCTIONS=\"['_wasm_delete_disk','_main', '_wasm_toggleFullscreen', '_wasm_loadFile', '_wasm_key', '_wasm_joystick', '_wasm_reset', '_wasm_halt', '_wasm_run', '_wasm_take_user_snapshot', '_wasm_create_renderer', '_wasm_set_warp','_wasm_set_borderless', '_wasm_press_play', '_wasm_press_stop', '_wasm_rewind', '_wasm_sprite_info', '_wasm_set_sid_model', '_wasm_cut_layers', '_wasm_rom_info', '_wasm_set_2nd_sid', '_wasm_set_sid_engine', '_wasm_get_cpu_cycles', '_wasm_set_color_palette', '_wasm_schedule_key', '_wasm_peek', '_wasm_poke', '_wasm_export_disk', '_wasm_configure', '_wasm_write_string_to_ser', '_wasm_print_error', '_wasm_get_sound_buffer_address', '_wasm_copy_into_sound_buffer','_wasm_copy_into_sound_buffer_stereo', '_wasm_open_main_thread_audio', '_wasm_close_main_thread_audio', '_wasm_set_sample_rate', '_wasm_keyboard_reset', '_wasm_get_config', '_wasm_auto_type', '_wasm_get_core_version', '_wasm_mouse', '_wasm_mouse_button', '_wasm_expansion_port_info', '_wasm_soft_reset', '_wasm_hard_reset',  '_wasm_detach_cartridge', '_wasm_is_warping']\"")

#only safari shows 20% performance regression since vamiga v2.4. To fix it safari
#needs LF -s BINARYEN_EXTRA_PASSES=--one-caller-inline-max-function-size=550
set(LF_OTHER  "-s WASM_BIGINT -s DISABLE_DEPRECATED_FIND_EVENT_TARGET_BEHAVIOR=1  -s LLD_REPORT_UNDEFINED -s ASSERTIONS=0 -s GL_ASSERTIONS=0 -sNO_EXIT_RUNTIME=1 -s WARN_UNALIGNED=1 -mbulk-memory")

#configure the service worker
file(READ sw_template.js sw_template)
if("${thread_type}" STREQUAL "worker")
	set(LF_WORKER  "-sWASM_WORKERS")

	set(needs_shared_array_buffer "true")
	file(CONFIGURE OUTPUT sw.js CONTENT "${sw_template}" @ONLY)

	#bug iOS/iPadOS does not allow mem growing on a shared_array_buffer therefore we set it to a fixed size 
	set(LF_MEM   "-s INITIAL_MEMORY=1024MB -s TOTAL_STACK=32MB -s ALLOW_MEMORY_GROWTH=0")
else()
	set(LF_WORKER  " ")

	set(needs_shared_array_buffer "false")
	file(CONFIGURE OUTPUT sw.js CONTENT "${sw_template}" @ONLY)

	#bug iOS/iPadOS does not allow mem growing above 1GB consider using fixed memsize for >1GB 
	set(LF_MEM   "-s INITIAL_MEMORY=260MB -s TOTAL_STACK=32MB -s ALLOW_MEMORY_GROWTH=1")
endif()

#-s ALLOW_MEMORY_GROWTH=1 -g -s BINARYEN_EXTRA_PASSES=--one-caller-inline-max-function-size=19306 

set_target_properties(vc64 PROPERTIES LINK_FLAGS "${LF_SHELL} ${LF_OPTI} ${LF_MEM} ${LF_EXPORTS} ${LF_OTHER} ${LF_WORKER}" )
set(CMAKE_EXECUTABLE_SUFFIX ".html")

#run local webserver
if("${thread_type}" STREQUAL "worker")
	#run worker version on local webserver
	add_custom_target(run
		COMMAND ${CMAKE_COMMAND} -E copy vc64.html ../index.html
		COMMAND ${CMAKE_COMMAND} -E copy vc64.js ..
		COMMAND ${CMAKE_COMMAND} -E copy vc64.ww.js ..
		COMMAND ${CMAKE_COMMAND} -E copy vc64.wasm ..
		COMMAND ${CMAKE_COMMAND} -E copy sw.js ..
	#    COMMAND ${CMAKE_COMMAND} -E chdir .. python3 -m http.server 8080
			COMMAND ${CMAKE_COMMAND} -E chdir .. python3 ./https.py
			DEPENDS vc64
	)
else()
	add_custom_target(run
		COMMAND ${CMAKE_COMMAND} -E copy vc64.html ../index.html
		COMMAND ${CMAKE_COMMAND} -E copy vc64.js ..
		COMMAND ${CMAKE_COMMAND} -E copy vc64.wasm ..
		COMMAND ${CMAKE_COMMAND} -E copy sw.js ..
		COMMAND ${CMAKE_COMMAND} -E chdir .. python3 -m http.server 8080
		DEPENDS vc64
	)
endif()







#publish complete build to a gh-pages folder
set(PUBLISH_FOLDER "../../vc64web.github.io")
add_custom_target(publish
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${PUBLISH_FOLDER}/roms
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${PUBLISH_FOLDER}/sounds
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${PUBLISH_FOLDER}/css
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${PUBLISH_FOLDER}/js
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${PUBLISH_FOLDER}/img
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${PUBLISH_FOLDER}/vc64.*
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${PUBLISH_FOLDER}/*.js
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${PUBLISH_FOLDER}/*.json
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${PUBLISH_FOLDER}/index.html
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${PUBLISH_FOLDER}/run.html
	COMMAND ${CMAKE_COMMAND} -E copy vc64.html ${PUBLISH_FOLDER}/index.html
    COMMAND ${CMAKE_COMMAND} -E copy vc64.js ${PUBLISH_FOLDER}
    #the following line is only needed for the worker build
	#COMMAND ${CMAKE_COMMAND} -E copy vc64.ww.js ${PUBLISH_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy vc64.wasm ${PUBLISH_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../js ${PUBLISH_FOLDER}/js
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../css ${PUBLISH_FOLDER}/css
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../img ${PUBLISH_FOLDER}/img
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../roms ${PUBLISH_FOLDER}/roms
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../sounds ${PUBLISH_FOLDER}/sounds
	COMMAND ${CMAKE_COMMAND} -E copy ../run.html ${PUBLISH_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy sw.js ${PUBLISH_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy ../manifest.json ${PUBLISH_FOLDER}
	DEPENDS vc64
)

set(UAT_FOLDER "../../uat")
add_custom_target(uat
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${UAT_FOLDER}/sounds
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${UAT_FOLDER}/roms
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${UAT_FOLDER}/css
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${UAT_FOLDER}/js
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${UAT_FOLDER}/img
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${UAT_FOLDER}/vc64.*
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${UAT_FOLDER}/*.js
#	COMMAND ${CMAKE_COMMAND} -E rm -f  ${UAT_FOLDER}/*.json
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${UAT_FOLDER}/index.html
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${UAT_FOLDER}/run.html
	COMMAND ${CMAKE_COMMAND} -E copy vc64.html ${UAT_FOLDER}/index.html
    COMMAND ${CMAKE_COMMAND} -E copy vc64.js ${UAT_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy vc64.wasm ${UAT_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../js ${UAT_FOLDER}/js
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../css ${UAT_FOLDER}/css
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../img ${UAT_FOLDER}/img
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../roms ${UAT_FOLDER}/roms
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../sounds ${UAT_FOLDER}/sounds
	COMMAND ${CMAKE_COMMAND} -E copy ../run.html ${UAT_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy sw.js ${UAT_FOLDER}
#	COMMAND ${CMAKE_COMMAND} -E copy ../manifest.json ${UAT_FOLDER}
	DEPENDS vc64
)

set(WORKER_FOLDER "../../worker")
add_custom_target(worker
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${WORKER_FOLDER}/sounds
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${WORKER_FOLDER}/roms
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${WORKER_FOLDER}/css
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${WORKER_FOLDER}/js
	COMMAND ${CMAKE_COMMAND} -E rm -rf ${WORKER_FOLDER}/img
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${WORKER_FOLDER}/vc64.*
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${WORKER_FOLDER}/*.js
#	COMMAND ${CMAKE_COMMAND} -E rm -f  ${WORKER_FOLDER}/*.json
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${WORKER_FOLDER}/index.html
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${WORKER_FOLDER}/vc64.html
	COMMAND ${CMAKE_COMMAND} -E rm -f  ${WORKER_FOLDER}/run.html
	COMMAND ${CMAKE_COMMAND} -E copy vc64.html ${WORKER_FOLDER}/index.html
	COMMAND ${CMAKE_COMMAND} -E copy vc64.js ${WORKER_FOLDER}
    COMMAND ${CMAKE_COMMAND} -E copy vc64.ww.js ${WORKER_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy vc64.wasm ${WORKER_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../js ${WORKER_FOLDER}/js
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../css ${WORKER_FOLDER}/css
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../img ${WORKER_FOLDER}/img
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../roms ${WORKER_FOLDER}/roms
	COMMAND ${CMAKE_COMMAND} -E copy_directory ../sounds ${WORKER_FOLDER}/sounds
	COMMAND ${CMAKE_COMMAND} -E copy ../run.html ${WORKER_FOLDER}
	COMMAND ${CMAKE_COMMAND} -E copy sw.js ${WORKER_FOLDER}
	#COMMAND ${CMAKE_COMMAND} -E copy ../manifest.json ${WORKER_FOLDER}
	DEPENDS vc64
)