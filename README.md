# VirtualC64 web edition

![alt Logo](http://www.dirkwhoffmann.de/software/images/banner-vcweb.jpg)

## Info

The base is a copy of virtualC64 without its usual mac GUI in v3.4b1 master branch March 3 2020 latest commit point fe1629c

## How to build and run it in a web browser 
* install [emsdk](https://emscripten.org/docs/getting_started/downloads.html) 
* clone this repository into a folder 
* cd into that folder
* copy c64-roms (four .bin files) into subfolder roms
* make 
* make main
* ./start.sh
* open your browser and head to http://localhost:8080/vC64.html

note: start.sh starts an webserver with URL base path pointing to the folder where the build resides.



