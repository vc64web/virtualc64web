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
var port1 = 'none';
var port2 = 'none';
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
    if(port1=='keys'||port2=='keys')
    {
        var joystick_cmd = joystick_keydown_map[e.code];
        if(joystick_cmd !== undefined)
        {
            wasm_joystick((port1=='keys'?'1':'2')+joystick_cmd);
            return;
        }
    }
    var c64code = translateKey(e.code, e.key);
    if(c64code !== undefined)
        wasm_key(c64code[0], c64code[1], 1);
}
function keyup(e) {
    if(port1=='keys'||port2=='keys')
    {
        var joystick_cmd = joystick_keyup_map[e.code];
        if(joystick_cmd !== undefined)
        {
            wasm_joystick((port1=='keys'?'1':'2')+joystick_cmd);
            return;
        }
    }

    var c64code = translateKey(e.code, e.key);
    if(c64code !== undefined)
        wasm_key(c64code[0], c64code[1], 0);
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
        document.getElementById('canvas').focus();
    }
    document.getElementById('port1').onchange = function() {
        port1 = document.getElementById('port1').value;
        if(port1 == port2)
        {
            port2 = 'none';
            document.getElementById('port2').value = 'none';
        }
        document.getElementById('canvas').focus();
    }
    document.getElementById('port2').onchange = function() {
        port2 = document.getElementById('port2').value;
       if(port1 == port2)
        {
            port1 = 'none';
            document.getElementById('port1').value = 'none';
        }
        document.getElementById('canvas').focus();
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
