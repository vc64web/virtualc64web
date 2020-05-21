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
        try{
        wasm_loadfile(file.name, byteArray, byteArray.byteLength);
        } catch(e) {}
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

timestampjoy1 = null;
timestampjoy2 = null;
/* callback for wasm mainsdl.cpp */
function draw_one_frame()
{
    var gamepads=null;
    if(port1 != 'none' && port1 !='keys')
    {
        gamepads = navigator.getGamepads();        
        var joy1= gamepads[port1];
        
        if(timestampjoy1 != joy1.timestamp)
        {
            timestampjoy1 = joy1.timestamp;
            handleGamePad('1', joy1);
        }
    }
    if(port2 != 'none' && port2 !='keys')
    {
        if(gamepads==null)
        {
            gamepads = navigator.getGamepads();        
        }
        var joy2= gamepads[port2];
        
        if(timestampjoy2 != joy2.timestamp)
        {
            timestampjoy2 = joy2.timestamp;
            handleGamePad('2', joy2);
        }
    }
}

function handleGamePad(portnr, gamepad)
{
    var bReleaseX=false;
    var bReleaseY=false;
    if(0.8<gamepad.axes[0])
    {
        wasm_joystick(portnr+"PULL_RIGHT");   
    }
    else if(-0.8>gamepad.axes[0])
    {
        wasm_joystick(portnr+"PULL_LEFT");
    }
    else
    {
        bReleaseX=true;
    }

    if(0.8<gamepad.axes[1])
    {
        wasm_joystick(portnr+"PULL_DOWN");   
    }
    else if(-0.8>gamepad.axes[1])
    {
        wasm_joystick(portnr+"PULL_UP");
    }
    else
    {
        bReleaseY=true;
    }

    if(bReleaseX && bReleaseY)
    {
        wasm_joystick(portnr+"RELEASE_XY");
    }
    else if(bReleaseX)
    {
        wasm_joystick(portnr+"RELEASE_X");

    }
    else if(bReleaseY)
    {
        wasm_joystick(portnr+"RELEASE_Y");
    }


    var bFirePressed=false;
    for(var i=0; i<gamepad.buttons.length;i++)
    {
        if(gamepad.buttons[i].pressed)
        {
            bFirePressed=true;
        }
    }
    wasm_joystick(portnr + (bFirePressed?"PRESS_FIRE":"RELEASE_FIRE"));
}

function InitWrappers() {
    wasm_loadfile = Module.cwrap('wasm_loadFile', 'undefined', ['string', 'array', 'number']);
    wasm_key = Module.cwrap('wasm_key', 'undefined', ['number', 'number', 'number']);
    wasm_toggleFullscreen = Module.cwrap('wasm_toggleFullscreen', 'undefined');
    wasm_joystick = Module.cwrap('wasm_joystick', 'undefined', ['string']);
    wasm_reset = Module.cwrap('wasm_reset', 'undefined');
    wasm_halt = Module.cwrap('wasm_halt', 'undefined');
    wasm_run = Module.cwrap('wasm_run', 'undefined');

    document.getElementById('button_fullscreen').onclick = function() {
        if (wasm_toggleFullscreen != null) {
            wasm_toggleFullscreen();
        }
        document.getElementById('canvas').focus();
    }
    document.getElementById('button_reset').onclick = function() {
        wasm_reset();
        document.getElementById('canvas').focus();
    }
    document.getElementById('button_halt').onclick = function() {
        wasm_halt();
        $('#button_halt').prop('disabled', 'true');
        $('#button_run').removeAttr('disabled');
        
        document.getElementById('canvas').focus();
    }
    document.getElementById('button_run').onclick = function() {
        //have to catch an intentional "unwind" exception here, which is thrown
        //by emscripten_set_main_loop() after emscripten_cancel_main_loop();
        //to simulate infinity gamelloop see emscripten API for more info ... 
        try{wasm_run();} catch(e) {}
        $('#button_run').prop('disabled', 'true');
        $('#button_halt').removeAttr('disabled');

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

    window.addEventListener("gamepadconnected", function(e) {
        var gp = navigator.getGamepads()[e.gamepad.index];
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
            gp.index, gp.id,
            gp.buttons.length, gp.axes.length);

        var sel1 = document.getElementById('port1');
        var opt1 = document.createElement('option');
        opt1.appendChild( document.createTextNode(gp.id) );
        opt1.value = e.gamepad.index; 
        sel1.appendChild(opt1); 

        var sel2 = document.getElementById('port2');
        var opt2 = document.createElement('option');
        opt2.appendChild( document.createTextNode(gp.id) );
        opt2.value = e.gamepad.index; 
        sel2.appendChild(opt2); 
    });
    window.addEventListener("gamepaddisconnected", (event) => {
        console.log("A gamepad disconnected:");
        console.log(event.gamepad);
        var sel1 = document.getElementById('port1');       
        for(var i=0; i<sel1.length; i++)
        {
            if(sel1.options[i].value == event.gamepad.index)
            {
                sel1.removeChild( sel1.options[i] ); 
                break;
            }
        }
        var sel2 = document.getElementById('port2');       
        for(var i=0; i<sel2.length; i++)
        {
            if(sel2.options[i].value == event.gamepad.index)
            {
                sel2.removeChild( sel2.options[i] ); 
                break;
            }
        }
    });
    $("#canvas").css("width", "80%");

  }
