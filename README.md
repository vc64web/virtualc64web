# virtualC64 web edition ( vc64web )

![alt Logo](http://www.dirkwhoffmann.de/software/images/banner-vcweb3.jpg)

## info
vc64web is a C64 emulator that is based solely on HTML5 techniques e.g. javascript and WASM. VC64web is therefore runnable on modern desktop browsers and also on web browsers for touch devices like phones and tablets ... 

it supports PWA standard which gives it the appearance of an nearly native app e.g. runs offline, no browser addressbar and so on  ... to install it nativley as a PWA on iOS devices for example -> save it to homescreen 

The emulation core is a copy of virtualC64 without its usual mac GUI in v3.4b1 master branch March 3 2020 latest commit point fe1629c

some highlighted features: 
* includes an online interface to the csdb.dk named scene browser (powered by CSDb web service https://csdb.dk/webservice/ and inspired by Mr.SIDs Scene https://csdb.dk/release/?id=171112) 
* supports external gamecontroller
* supports touch device as joystick
* free definable action buttons with own javascript action scripts for creating bot controller support (e.g. aimbots, auto defense bot, etc...)   
* snaphot saving to the local browser web storage ...
* supports multivolumne titles in zip archives
* supports direct start ... a link to a C64 file (zip, d64, ...) as an call parameter (e.g.  https://dirkwhoffmann.github.io/virtualc64web/#http://csdb.dk/getinternalfile.php/205771/CopperBooze.prg ) 


## start up VirtualC64Web right now in your browser
https://dirkwhoffmann.github.io/virtualc64web/

on a touch screen device, don't forget to save it to homescreen as it fully supports the PWA standard and for that will behave like a real app and not just like a browser app (with save to homescreen you will get rid of all those unwanted browser gestures like adressbar swipe back and swipe forward, etc...)  

## the roots ... or how and when did the development begin ...
https://github.com/dirkwhoffmann/vAmiga/issues/291

## how to build and run it in a web browser 
* install [emsdk](https://emscripten.org/docs/getting_started/downloads.html) 
* clone this repository into a folder 
* cd into that folder
* copy c64-roms (four .bin files) into subfolder roms (this is optional ... roms can be loaded into emulator while running)
* make 
* make main
* ./start.sh
* open your browser and head to http://localhost:8080/

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
* storing selected snapshots into local storage ... effectively making those choosen snapshots persistent 
* virtual joystick for touch screen devices
* free positional custom keys as button overlays (aka action buttons) which trigger an action (but no script yet)
* zip support, and enhanced multidisk support when using zip archives 
* action script for the self composed action sequence overlay buttons 
* self designed editable javascript miniprograms which for example are able to control a game ... yes ... bots
* Demo-Scene-Browser: v64web implements an easy browsable online interface to the CSDb scene db with lots of the cool demos 
* polishing of the scene browser UI component ... show more infos about each entry
* added search to the collector interface for local stored snapshots and csdb
* adding favourites feature to the collector interface, to be able to 💖 entries and easily filter them 
* drag and drop for CSDb-download-links into the fileslot or emulator window and CSDb-release-links into search field of scene browser
* XBoxController standard digipad and analog stick mapping supported

## next goals
* scrollable navbar for very tiny phones
* XBoxController should trigger rumble/vibration if VIC is detecting sprite collisions
* new  modern boot sequence/animation  replacing the standard emscripten visual boot code 
* javascript interface for more settings of the emulation like (greydotbugemulation) 
* export/import of a complete snapshot library as one big zip file 
