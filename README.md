# VirtualC64 web edition

![alt Logo](http://www.dirkwhoffmann.de/software/images/banner-vcweb3.jpg)

## Info
The base is a copy of virtualC64 without its usual mac GUI in v3.4b1 master branch March 3 2020 latest commit point fe1629c

## What happened so far ...
https://github.com/dirkwhoffmann/vAmiga/issues/291

## How to build and run it in a web browser 
* install [emsdk](https://emscripten.org/docs/getting_started/downloads.html) 
* clone this repository into a folder 
* cd into that folder
* copy c64-roms (four .bin files) into subfolder roms
* make 
* make main
* ./start.sh
* open your browser and head to http://localhost:8080/vC64.html

_note_: start.sh starts an webserver with URL base path pointing to the folder where the build resides.

## already achieved goals 
* builds without errors in emsdk  (output vC64.html, vC64.js, vC64.wasm, vC64.data)
* runs Octopus in redwine demo in a browser

## next goals
* sound output
* implementing a Javascript API to be able to feed the vC64-WASM Core with disks, crts, keyboard and joystick controller input from  HTML5 side

