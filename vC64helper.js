function dragover_handler(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = 'copy';
}

function drop_handler(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    var dt = ev.dataTransfer;
 
    if( dt.items ) {
        for (var i=0; i < dt.items.length; i++) {
            if (dt.items[i].kind == "file") {
                var f = dt.items[i].getAsFile();
                pushFile(f, false);
                break;
            }
        }
    }
    else {
        for (var i=0; i < dt.files.length; i++) {
            pushFile(dt.files[i], false);
            break;
        }
    }
}

function handleFileInput(event) 
{
    var myForm = document.getElementById('theFileInput');
    var myfiles = myForm.elements['theFileDialog'].files;
    for (var i=0; i < myfiles.length; i++) {
        pushFile(myfiles[i], false);
        break;
    }
    return false;
}

function pushFile(file, startup) {
    var fileReader  = new FileReader();
    fileReader.onload  = function() {
        var byteArray = new Uint8Array(this.result);
        wasm_loadfile(file.name, byteArray, byteArray.byteLength);
    }
    fileReader.readAsArrayBuffer(file);
}
var useKeyPad = false;
joystick_keydown_map = {
    'ArrowUp':'PULL_UP',
    'ArrowDown':'PULL_DOWN',
    'ArrowLeft':'PULL_LEFT',
    'ArrowRight':'PULL_RIGHT',
    'Space':'PRESS_FIRE'
}
joystick_keyup_map = {
    'ArrowUp':'RELEASE_Y',
    'ArrowDown':'RELEASE_Y',
    'ArrowLeft':'RELEASE_X',
    'ArrowRight':'RELEASE_X',
    'Space':'RELEASE_FIRE'
}

function keydown(e) {
    if(useKeyPad)
    {
//        console.log(e.key);
        wasm_joystick('2'+joystick_keydown_map[e.code]);
    }
    else
    {
        var c64code = translateKey(e.code, e.key);
        if(c64code !== undefined)
          wasm_key(c64code[0], c64code[1], 1);
    }
}
function keyup(e) {
    if(useKeyPad)
    {
        wasm_joystick('2'+joystick_keyup_map[e.code]);
    }
    else
    {
        var c64code = translateKey(e.code, e.key);
        if(c64code !== undefined)
            wasm_key(c64code[0], c64code[1], 0);
    }
}

function InitWrappers() {
    wasm_loadfile = Module.cwrap('wasm_loadFile', 'undefined', ['string', 'array', 'number']);
    wasm_key = Module.cwrap('wasm_key', 'undefined', ['number', 'number', 'number']);
    wasm_toggleFullscreen = Module.cwrap('wasm_toggleFullscreen', 'undefined');
    wasm_joystick = Module.cwrap('wasm_joystick', 'undefined', ['string']);


    document.getElementById('button_fullscreen').onclick = function() {
        if (wasm_toggleFullscreen != null) {
            wasm_toggleFullscreen();
        }
    }

    document.getElementById('keypad').onclick = function() {
        useKeyPad = document.getElementById('keypad').checked;
    }

    document.getElementById('theFileInput').addEventListener("submit", function(e) {
        e.preventDefault();
        handleFileInput();
    }, false);

    document.getElementById('drop_zone').addEventListener("click", function(e) {
    document.getElementById('theFileInput').elements['theFileDialog'].click();
    }, false);

    document.getElementById('drop_zone').addEventListener("dragover", function(e) {
        dragover_handler(e);
    }, false);

    document.getElementById('drop_zone').addEventListener("drop", function(e) {
        drop_handler(e);
    }, false);
    document.getElementById('filedialog').addEventListener("change", function(e) {
          handleFileInput();
        }, false);
    document.addEventListener('keyup', keyup);
    document.addEventListener('keydown', keydown);


  }
