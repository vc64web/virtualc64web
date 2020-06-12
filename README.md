# virtualC64 web edition

![alt Logo](http://www.dirkwhoffmann.de/software/images/banner-vcweb3.jpg)

## info
The base is a copy of virtualC64 without its usual mac GUI in v3.4b1 master branch March 3 2020 latest commit point fe1629c

## try and feel it here 
https://dirkwhoffmann.github.io/virtualc64web/

## what happened so far ...
https://github.com/dirkwhoffmann/vAmiga/issues/291

## how to build and run it in a web browser 
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
* sound output
* replace the standard emsdk html page and build a specific html5 file which allows to insert disks ... 
* keyboard works for many keys 
* completing and extending the Javascript API for keyboard and joystick controller input from  HTML5 side
* non persistent snapshot support
* additional modal dialog to load roms via file dialog and save them to the browsers local storage, in case they are not already embedded in folder roms ...   
* a virtual keyboard

## next goals
* javascript interface for settings of the emulation like (greydotbugemulation, soundbuffer size, and so on...) 
* storing selected snapshots into local storage ... effectively making those choosen snapshots persistent 
