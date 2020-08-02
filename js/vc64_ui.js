let global_apptitle="c64 - start screen"

function ToBase64(u8) 
{
    return btoa(String.fromCharCode.apply(null, u8));
}

function FromBase64(str) {
    return atob(str).split('').map(function (c) { return c.charCodeAt(0); });
}
    

function message_handler(cores_msg)
{
    var msg = UTF8ToString(cores_msg);
    if(msg == "MSG_READY_TO_RUN")
    {
        //start it async
        setTimeout(function() { try{wasm_run();}catch(e){}},10);
    }
    else if(msg == "MSG_ROM_MISSING")
    {        
        //try to load roms from local storage
        setTimeout(function() {
            var loadStoredItem= function (item_name){
                var stored_item = localStorage.getItem(item_name); 
                if(stored_item != null)
                {
                    var restoredbytearray = Uint8Array.from(FromBase64(stored_item));
                    wasm_loadfile(item_name, restoredbytearray, restoredbytearray.byteLength);
                    return true;
                }
                else
                {
                    return false;
                }
            }
            try{
                var all_fine = true;
                if (!loadStoredItem('basic_rom.bin'))
                    all_fine=false;
                if (!loadStoredItem('kernal_rom.bin'))
                    all_fine=false;
                if (!loadStoredItem('char_rom.bin'))
                    all_fine=false;
                if (!loadStoredItem('vc1541_rom.bin'))
                    all_fine=false;
 
                if(all_fine == false)
                    $('#modal_roms').modal();
       
            } catch(e){}
        
        },0);
 
    }


}

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
            var romtype = wasm_loadfile(file.name, byteArray, byteArray.byteLength);
            if(romtype != "")
            {
                localStorage.setItem(romtype+".bin", ToBase64(byteArray));
            }
            else
            {
                global_apptitle = file.name;
            }

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
    if($('input').is(":focus") == false)
    {//incase any html5 input control has the focus, we should let it get the keyup 
        event.preventDefault();
    }

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
    if($('input').is(":focus") == false)
    {//incase any html5 input control has the focus, we should let it get the keyup 
        event.preventDefault();
    }
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
last_touch_cmd = null;
/* callback for wasm mainsdl.cpp */
function draw_one_frame()
{
    var gamepads=null;
    if(port1 != 'none' && port1 !='keys' && port1 !='touch')
    {
        gamepads = navigator.getGamepads();        
        var joy1= gamepads[port1];
        
        if(timestampjoy1 != joy1.timestamp)
        {
            timestampjoy1 = joy1.timestamp;
            handleGamePad('1', joy1);
        }
    }
    if(port2 != 'none' && port2 !='keys' && port2 !='touch')
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
    if(port1 == 'touch')
    {
        handle_touch("1");
    }
    else if(port2 == 'touch')
    {
        handle_touch("2");
    }	
}


function handle_touch(portnr)
{    
    if(v_joystick == null || v_fire == null)
        return;
    try {
        var new_touch_cmd_x = "";
        if(v_joystick.right())
        {
            new_touch_cmd_x = "PULL_RIGHT";
        }
        else if(v_joystick.left())
        {
            new_touch_cmd_x = "PULL_LEFT";
        }
        else
        {
            new_touch_cmd_x = "RELEASE_X";
        }

        var new_touch_cmd_y = "";
        if(v_joystick.up())
        {
            new_touch_cmd_y = "PULL_UP";
        }
        else if(v_joystick.down())
        {
            new_touch_cmd_y = "PULL_DOWN";
        }
        else
        {
            new_touch_cmd_y ="RELEASE_Y";
        }
        var new_fire = (v_fire._pressed?"PRESS_FIRE":"RELEASE_FIRE");
        var new_touch_cmd = portnr + new_touch_cmd_x + new_touch_cmd_y + new_fire;
        if( last_touch_cmd != new_touch_cmd)
        {
            last_touch_cmd = new_touch_cmd;
            wasm_joystick(portnr+new_touch_cmd_x);
            wasm_joystick(portnr+new_touch_cmd_y);
            wasm_joystick(portnr+new_fire);
        }
    } catch (error) {
        console.error("error while handle_touch: "+ error);        
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
    wasm_loadfile = Module.cwrap('wasm_loadFile', 'string', ['string', 'array', 'number']);
    wasm_key = Module.cwrap('wasm_key', 'undefined', ['number', 'number', 'number']);
    wasm_toggleFullscreen = Module.cwrap('wasm_toggleFullscreen', 'undefined');
    wasm_joystick = Module.cwrap('wasm_joystick', 'undefined', ['string']);
    wasm_reset = Module.cwrap('wasm_reset', 'undefined');
    wasm_halt = Module.cwrap('wasm_halt', 'undefined');
    wasm_run = Module.cwrap('wasm_run', 'undefined');
    wasm_take_user_snapshot = Module.cwrap('wasm_take_user_snapshot', 'undefined');
    wasm_pull_user_snapshot_file = Module.cwrap('wasm_pull_user_snapshot_file', 'number', ['number']);
    wasm_pull_user_snapshot_file_size = Module.cwrap('wasm_pull_user_snapshot_file_size', 'number', ['number']);

    wasm_pull_auto_snapshot = Module.cwrap('wasm_pull_auto_snapshot', 'number', ['number']);
    wasm_auto_snapshot_width = Module.cwrap('wasm_auto_snapshot_width', 'number', ['number']);
    wasm_auto_snapshot_height = Module.cwrap('wasm_auto_snapshot_height', 'number', ['number']);
    wasm_auto_snapshots_count = Module.cwrap('wasm_auto_snapshots_count', 'number');
    wasm_restore_auto_snapshot = Module.cwrap('wasm_restore_auto_snapshot', 'undefined', ['number']);
    wasm_suspend_auto_snapshots = Module.cwrap('wasm_suspend_auto_snapshots', 'undefined');
    wasm_resume_auto_snapshots = Module.cwrap('wasm_resume_auto_snapshots', 'undefined');
    wasm_set_take_auto_snapshots = Module.cwrap('wasm_set_take_auto_snapshots', 'undefined', ['number']);

    wasm_create_renderer =  Module.cwrap('wasm_create_renderer', 'undefined', ['string']);
    wasm_set_warp = Module.cwrap('wasm_set_warp', 'undefined', ['number']);
    wasm_set_borderless = Module.cwrap('wasm_set_borderless', 'undefined', ['number']);

    dark_switch = document.getElementById('dark_switch');

    loadTheme();
    dark_switch.addEventListener('change', () => {
        setTheme();
    });
    
    installKeyboard();
    $("#button_keyboard").click(function(){setTimeout( scaleVMCanvas, 500);});

    window.addEventListener("orientationchange", function() {
      setTimeout( scaleVMCanvas, 500);
    });

    window.addEventListener("resize", function() {
      setTimeout( scaleVMCanvas, 500);
    });
    
    $('#navbar').on('hide.bs.collapse', function () {
        //close all open tooltips on hiding navbar
        $('[data-toggle="tooltip"]').tooltip('hide');
    });

    $('#navbar').on('shown.bs.collapse', function () { 
    });


    menu_button_fade_out = function () {
        setTimeout(function() {
            if($("#navbar").is(":hidden"))
            {
                $("#button_show_menu").fadeOut( "slow" );
            }
            else
            { //maybe try recursivele again?
            }
        },5000);    
    };

    //make the menubutton not visible until a click or a touch
    menu_button_fade_out();
    window.addEventListener("click", function() {
        $("#button_show_menu").fadeIn( "slow" );
        menu_button_fade_out();
    });
    $("#canvas").on({ 'touchstart' : function() {
        $("#button_show_menu").fadeIn( "slow" );
        menu_button_fade_out();
    }});

//----
    webgl_switch = $('#webgl_switch');
    var use_webgl=load_setting('use_webgl', true);
    webgl_switch.prop('checked', use_webgl);
    if(use_webgl)
    {
            wasm_create_renderer("webgl");
    }
    else
    {
            wasm_create_renderer("2d");
    }

    webgl_switch.change( function() {
        save_setting('use_webgl', this.checked);
    });
//----
    warp_switch = $('#warp_switch');
    var use_warp=load_setting('use_warp', false);
    warp_switch.prop('checked', use_warp);
    wasm_set_warp(use_warp ? 1:0);
    warp_switch.change( function() {
        wasm_set_warp(this.checked ? 1:0);
        save_setting('use_warp', this.checked);
    });

//----------

    pixel_art_switch = $('#pixel_art_switch');
    set_pixel_art = function(value){
        if(value)
        {
            $("#canvas").addClass("pixel_art");
        }
        else
        {
            $("#canvas").removeClass("pixel_art");
        }
        $('#pixel_art_switch').prop('checked', value);
    }    
    set_pixel_art(load_setting('pixel_art', false));
    pixel_art_switch.change( function() {
        pixel_art=this.checked;
        save_setting('pixel_art', this.checked);
        set_pixel_art(this.checked);
    });
//--------

borderless_switch = $('#borderless_switch');
var use_borderless=load_setting('borderless', false);
borderless_switch.prop('checked', use_borderless);
wasm_set_borderless(use_borderless ? 1:0);
borderless_switch.change( function() {
    wasm_set_borderless(this.checked ? 1:0);
    save_setting('borderless', this.checked);
});

//------

auto_snapshot_switch = $('#auto_snapshot_switch');
var take_auto_snapshots=load_setting('auto_snapshot_switch', true);
auto_snapshot_switch.prop('checked', take_auto_snapshots);
wasm_set_take_auto_snapshots(take_auto_snapshots ? 1:0);
auto_snapshot_switch.change( function() {
    wasm_set_take_auto_snapshots(this.checked ? 1:0);
    save_setting('auto_snapshot_switch', this.checked);
});

//------

wide_screen_switch = $('#wide_screen_switch');
use_wide_screen=load_setting('widescreen', false);
wide_screen_switch.prop('checked', use_wide_screen);
wide_screen_switch.change( function() {
    use_wide_screen  = this.checked;
    save_setting('widescreen', this.checked);
    scaleVMCanvas();
});


//------


    live_debug_output=load_setting('live_debug_output', false);
    $("#cb_debug_output").prop('checked', live_debug_output);
    if(live_debug_output)
    {
        $("#output_row").show(); 
    }
    else
    {
        $("#output_row").hide(); 
    }

    $("#cb_debug_output").change( function() {
        live_debug_output=this.checked;
        save_setting('live_debug_output', this.checked);
        if(this.checked)
        {
           $("#output_row").show();
        }
        else
        {
            $("#output_row").hide();
        }
    });
    

    /*document.getElementById('button_fullscreen').onclick = function() {
        if (wasm_toggleFullscreen != null) {
            wasm_toggleFullscreen();
        }
        document.getElementById('canvas').focus();
    }
    */
    document.getElementById('button_reset').onclick = function() {
        wasm_reset();
        //document.getElementById('canvas').focus();
        //alert('reset');
    }
    $("#button_halt").click(function() {
        wasm_halt();
        $('#button_halt').prop('disabled', 'true');
        $('#button_run').removeAttr('disabled');
        //document.getElementById('canvas').focus();
    });
    $("#button_run").click(function() {
        //have to catch an intentional "unwind" exception here, which is thrown
        //by emscripten_set_main_loop() after emscripten_cancel_main_loop();
        //to simulate infinity gamelloop see emscripten API for more info ... 
        try{wasm_run();} catch(e) {}
        $('#button_run').prop('disabled', 'true');
        $('#button_halt').removeAttr('disabled');
        //document.getElementById('canvas').focus();
    });


    $('#modal_take_snapshot').on('hidden.bs.modal', function () {
        var running=$('#button_run').attr('disabled')=='disabled';
        if(running)
        {
            setTimeout(function(){try{wasm_run();} catch(e) {}},200);
        }
    })
   
    document.getElementById('button_take_snapshot').onclick = function() 
    {       
        wasm_halt();
        $("#modal_take_snapshot").modal('show');
        $("#input_app_title").val(global_apptitle);
        $("#input_app_title").focus();
    }

    $('#button_save_snapshot').click(function() 
    {       
        var app_name = $("#input_app_title").val();
        wasm_take_user_snapshot();
        var ptr=wasm_pull_user_snapshot_file(0);
        var size = wasm_pull_user_snapshot_file_size(0);
        var snapshot_buffer = new Uint8Array(Module.HEAPU8.buffer, ptr, size);
   
        //snapshot_buffer is only a typed array view therefore slice, which creates a new array with byteposition 0 ...
        save_snapshot(app_name, snapshot_buffer.slice(0,size));
   
        $("#modal_take_snapshot").modal('hide');
        //document.getElementById('canvas').focus();
    });

    document.getElementById('button_update').onclick = function() 
    {
        caches.keys().then(keys => {
            console.log('deleting cache files:'+keys);
            return Promise.all(keys
              .map(key => caches.delete(key))
            );
          });
          window.location.reload(true);
    }

    $('#snapshotModal').on('hidden.bs.modal', function () {
        wasm_resume_auto_snapshots();
        var running=$('#button_run').attr('disabled')=='disabled';
        if(running)
        {
            try{wasm_run();} catch(e) {}
        }
    })
    document.getElementById('button_snapshots').onclick = function() 
    {
        internal_usersnapshots_enabled=false;
        var running=$('#button_run').attr('disabled')=='disabled';
        if(running)
        {
           wasm_halt();
        }
 
        wasm_suspend_auto_snapshots();
        $('#container_snapshots').empty();
        var renderSnapshot=function(the_id){
            var the_html=
            '<div class="col-xs-4">'
            +'<div class="card" style="width: 15rem;">'
                +'<canvas id="canvas_snap_'+the_id+'" class="card-img-top rounded" alt="Card image cap"></canvas>'
            +'</div>'
            +'</div>';
            return the_html;
        }
        var acount = wasm_auto_snapshots_count();
        var the_grid=
        '<div class="row" data-toggle="tooltip" data-placement="left" title="auto snapshots">'; 
        for(var z=0; z<acount; z++)
        {
            the_grid += renderSnapshot('a'+z);
        }
        the_grid+='</div>';

        $('#container_snapshots').append(the_grid);

//--- indexeddb snaps
        var render_persistent_snapshot=function(the_id){
            var x_icon = '<svg width="1.8em" height="auto" viewBox="0 0 16 16" class="bi bi-x" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg>';
            var the_html=
            '<div class="col-xs-4">'
            +'<div id="card_snap_'+the_id+'" class="card" style="width: 15rem;">'
                +'<canvas id="canvas_snap_'+the_id+'" class="card-img-top rounded" alt="Card image cap"></canvas>'
                +'<button id="delete_snap_'+the_id+'" type="button" style="position:absolute;top:0;right:0;padding:0;" class="btn btn-sm icon">'+x_icon+'</button>'
            +'</div>'
            +'</div>';
            return the_html;
        }

        var row_renderer = function(app_title, app_snaps) {
            app_title=app_title.split(' ').join('_');
            the_grid='<div class="row" data-toggle="tooltip" data-placement="left" title="'+app_title+'">';
            for(var z=0; z<app_snaps.length; z++)
            {
                the_grid += render_persistent_snapshot('s'+app_snaps[z].id);
            }
            the_grid+='</div>';
            $('#container_snapshots').append(the_grid);
            for(var z=0; z<app_snaps.length; z++)
            {
                var canvas_id= "canvas_snap_s"+app_snaps[z].id;
                var delete_id= "delete_snap_s"+app_snaps[z].id;
                var canvas = document.getElementById(canvas_id);
                var delete_btn = document.getElementById(delete_id);
                
                delete_btn.onclick = function() {
                    let id = this.id.match(/[a-z_]*(.*)/)[1];
                    delete_snapshot_per_id(id);
                    $("#card_snap_s"+id).remove();
                };

                canvas.onclick = function() {
                    let id = this.id.match(/[a-z_]*(.*)/)[1];
                    get_snapshot_per_id(id,
                        function (snapshot) {
                            wasm_loadfile(
                                snapshot.title+".vc64",
                                snapshot.data, 
                                snapshot.data.length);
                            $('#snapshotModal').modal('hide');
                            global_apptitle=snapshot.title;
                        }
                    );
                };

                width=392;
                height=268;
                var ctx = canvas.getContext("2d");
                canvas.width = width;
                canvas.height = height;

                imgData=ctx.createImageData(width,height);
            
                var data = imgData.data;
                var src_data = app_snaps[z].data;
                snapshot_data = new Uint8Array(src_data, 40/* offset .. this number was a guess... */, data.length);

                for (var i = 0; i < data.length; i += 4) {
                    data[i]     = snapshot_data[i+0]; // red
                    data[i + 1] = snapshot_data[i+1]; // green
                    data[i + 2] = snapshot_data[i+2]; // blue
                    data[i + 3] = snapshot_data[i+3];

                }
                ctx.putImageData(imgData,0,0); 
                
            }
        }
        var store_renderer = function(app_titles)
        {
            for(var t=0; t<app_titles.length;t++)
            {
                var app_title=app_titles[t];
                var app_snaps = get_snapshots_for_app_title(app_title, row_renderer); 
            }
        }
        get_stored_app_titles(store_renderer);
//---

        var copy_snapshot_to_canvas= function(snapshot_ptr, canvas, width, height){ 
            var ctx = canvas.getContext("2d");
            canvas.width = width;
            canvas.height = height;
            imgData=ctx.createImageData(width,height);
        
            var data = imgData.data;

            snapshot_data = new Uint8Array(Module.HEAPU8.buffer, snapshot_ptr, data.length);

            for (var i = 0; i < data.length; i += 4) {
                data[i]     = snapshot_data[i+0]; // red
                data[i + 1] = snapshot_data[i+1]; // green
                data[i + 2] = snapshot_data[i+2]; // blue
                data[i + 3] = snapshot_data[i+3];

            }
            ctx.putImageData(imgData,0,0); 
        }


        for(var z=0; z<acount; z++)
        {
            var c = document.getElementById("canvas_snap_a"+z);

            c.onclick = function() {
                let nr = this.id.match(/[a-z_]*(.*)/)[1];;
            //    alert('restore auto nr'+nr);
                wasm_restore_auto_snapshot(nr);
                $('#snapshotModal').modal('hide');
            }
        
            snapshot_ptr = wasm_pull_auto_snapshot(z);

            var width=wasm_auto_snapshot_width(z);
            var height=wasm_auto_snapshot_height(z);
            
            copy_snapshot_to_canvas(snapshot_ptr, c, width, height);
        }

    }

    v_joystick=null;
    v_fire=null;

    document.getElementById('port1').onchange = function() {
        port1 = document.getElementById('port1').value; 
        if(port1 == port2)
        {
            port2 = 'none';
            document.getElementById('port2').value = 'none';
        }
        //document.getElementById('canvas').focus();

        if(v_joystick == null && port1 == 'touch')
        {
            register_v_joystick();
        }
        if(port1 != 'touch' && port2 != 'touch')
        {
            unregister_v_joystick();
        }
    }
    document.getElementById('port2').onchange = function() {
        port2 = document.getElementById('port2').value;
       if(port1 == port2)
        {
            port1 = 'none';
            document.getElementById('port1').value = 'none';
        }
        //document.getElementById('canvas').focus();

        if(v_joystick == null && port2 == 'touch')
        {
            register_v_joystick();
        }
        if(port1 != 'touch' && port2 != 'touch')
        {
            unregister_v_joystick();
        }
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
    document.addEventListener('keyup', keyup, false);
    document.addEventListener('keydown', keydown, false);

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

    scaleVMCanvas();


    var bEnableCustomKeys = true;
    if(bEnableCustomKeys)
    {
        create_new_custom_key = false;
        $("#button_custom_key").click(
            function(e) 
            {  
                create_new_custom_key = true;
                $('#input_action_script').val('');
 
                $('#modal_custom_key').modal('show');
            }
        );

        $('#button_save_action_script').click(function(e) 
        {
            if(create_new_custom_key)
            {
                //create a new custom key buttom  
                //action_scripts[haptic_touch_selected_id] = $('#input_action_script').val();
                
                custom_keys.push( 
                    {  id: custom_keys.length
                      ,title: '😎' 
                      ,script:  $('#input_action_script').val()
                      ,position: "top:50%;left:50%" });        

                install_custom_keys();
                create_new_custom_key=false;
            }
            else
            {
                action_scripts[haptic_touch_selected_id] = $('#input_action_script').val();
            }
            $('#modal_custom_key').modal('hide');
        });


        //----- custom keys
        custom_keys = [ 
            { id: 0, title: 'hey', script: "z", position: "top:10%;left:10%" },            
            { id: 1, title: 'you', script: "y", position: "top:10%;left:90%" },
            { id: 2, title: '🙃', script: "y", position: "top:90%;left:90%" }
        ];
        action_scripts= {};

        install_custom_keys();
        //----- 
    }
    return;
}

//---- start custom keys ------
    function install_custom_keys(){
        //remove all existing custom key buttons
        $(".custom_key").remove();
        
        //insert the new buttons
        custom_keys.forEach(function (element, i) {
            var btn_html='<button id="ck'+element.id+'" class="btn custom_key" style="position:absolute;'+element.position;
            if(element.currentX)
            {
                btn_html += ';transform:translate3d(' + element.currentX + 'px,' + element.currentY + 'px,0)';
               // setTranslate(currentX, currentY, $("#ck"+element.id));
            } 
            btn_html += ';opacity:1.0">'+element.title+'</button>';

            $('#div_canvas').append(btn_html);
            action_scripts["ck"+element.id] = element.script;


            $('#ck'+element.id).click(function() 
            {       
                var c64code = translateKey("undef", action_scripts['ck'+element.id]);
                if(c64code !== undefined)
                    wasm_key(c64code[0], c64code[1], 1);
                setTimeout(function() {wasm_key(c64code[0], c64code[1], 0);}, 15);
            });
        });

        install_drag();
    }


    function install_drag()
    {
        dragItems = [];
        container = document.querySelector("#div_canvas");

        active = false;
        currentX=0;
        currentY=0;
        initialX=0;
        initialY=0;
    
        xOffset = { };
        yOffset = { };

        custom_keys.forEach(function (element, i) {
            dragItems.push(document.querySelector("#ck"+element.id));
            xOffset["ck"+element.id] = element.currentX;
            yOffset["ck"+element.id] = element.currentY;
        });

        container.addEventListener("touchstart", dragStart, false);
        container.addEventListener("touchend", dragEnd, false);
        container.addEventListener("touchmove", drag, false);

        container.addEventListener("mousedown", dragStart, false);
        container.addEventListener("mouseup", dragEnd, false);
        container.addEventListener("mousemove", drag, false);
    }


    function dragStart(e) {
      if (dragItems.includes(e.target)) {  
        //console.log('drag start:' +e.target.id);  
        dragItem = e.target;
        active = true;
        haptic_active=false;
        timeStart = Date.now(); 

        if(xOffset[e.target.id] === undefined)
        {
            xOffset[e.target.id] = 0;
            yOffset[e.target.id] = 0;
        }
        currentX = xOffset[e.target.id];
        currentY = yOffset[e.target.id];
        startX = currentX;
        startY = currentY;        

        
        setTimeout(() => {
            checkForHapticTouch(e);
        }, 600);
        

        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset[e.target.id];
            initialY = e.touches[0].clientY - yOffset[e.target.id];
        } else {
            initialX = e.clientX - xOffset[e.target.id];
            initialY = e.clientY - yOffset[e.target.id];
        }
      }
    }



    function checkForHapticTouch(e)
    {
        if(active)
        {
            var dragTime = Date.now()-timeStart;
            if(Math.abs(currentX - startX) < 3 &&
                Math.abs(currentY - startY) < 3 &&
                dragTime > 300
                )
            {
                haptic_active=true;
                haptic_touch_selected_id= e.target.id;
                $('#input_action_script').val(action_scripts[e.target.id]);
                $('#modal_custom_key').modal('show');
            }
        }
    }


    function dragEnd(e) {
      if (active) {
        //console.log('drag end:' +e.target.id);  
 
        if(!haptic_active)
        {
            checkForHapticTouch(e);
        }
        initialX = currentX;
        initialY = currentY;

        var ckdef = custom_keys.find(el => ('ck'+el.id) == e.target.id); 
        ckdef.currentX = currentX;
        ckdef.currentY = currentY;
        
        active = false;

      }
    }

    function drag(e) {
      if (active && !haptic_active) {
 
        if(dragItems.includes(e.target) && e.target != dragItem)
          return; // custom key is dragged onto other custom key, don't allow that
 
       // console.log('drag:' +e.target.id);  
        e.preventDefault();

        if (e.type === "touchmove") {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }

        xOffset[e.target.id] = currentX;
        yOffset[e.target.id] = currentY;

        setTranslate(currentX, currentY, dragItem);
      }
    }

    function setTranslate(xPos, yPos, el) {
     //   console.log('translate: x'+xPos+' y'+yPos+ 'el=' +el.id);  
      el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
    }

//---- end custom key ----

function loadTheme() {
  const dark_theme_selected = load_setting('dark_switch', false);
  dark_switch.checked = dark_theme_selected;
  dark_theme_selected ? document.body.setAttribute('data-theme', 'dark') :
    document.body.removeAttribute('data-theme');
}

function setTheme() {
  if (dark_switch.checked) {
    document.body.setAttribute('data-theme', 'dark');
    save_setting('dark_switch', true);
  } else {
    document.body.removeAttribute('data-theme');
    save_setting('dark_switch', null);
  }
}
  

function scaleVMCanvas() {
        var src_width=428 -2*33;
        var src_height=284 -2*22;
        var src_ratio = src_width/src_height; //1.6  kehrwert=0.625
        var inv_src_ratio = src_height/src_width;
        var wratio = window.innerWidth / window.innerHeight;

        var topPos=0;
        if(wratio < src_ratio)
        {
            var reducedHeight=window.innerWidth*inv_src_ratio;
            //alles was kleiner 1.6
            $("#canvas").css("width", "100%");
            $("#canvas").css("height", Math.round(reducedHeight)+'px');
            
            if($("#virtual_keyboard").is(":hidden"))
            {   //center vertical, if virtual keyboard and navbar not present
                topPos=Math.round((window.innerHeight-reducedHeight)/2);
            }
            else
            {//virtual keyboard is present
                var keyb_height= $("#virtual_keyboard").innerHeight();          
                //positioning directly stacked onto keyboard          
                topPos=Math.round(window.innerHeight-reducedHeight-keyb_height);
            }
            if(topPos<0)
            {
                topPos=0;
            }
        }
        else
        {
            //alles was größer als 1.6
            if(use_wide_screen)
            {
                $("#canvas").css("width", "100%"); 
            }
            else
            {
                 $("#canvas").css("width", Math.round((window.innerHeight*src_ratio)) +'px');
            }
            $("#canvas").css("height", "100%"); 
        }

        $("#canvas").css("top", topPos + 'px');   

        //durchsichtiges div über alles legen zum scrollen


    };



    function register_v_joystick()
    {
        v_joystick	= new VirtualJoystick({
            container	: document.getElementById('div_canvas'),
            mouseSupport	: true,
            strokeStyle	: 'white',
            limitStickTravel: true
        });
        v_joystick.addEventListener('touchStartValidation', function(event){
            var touch	= event.changedTouches[0];
            return touch.pageX < window.innerWidth/2;
        });
       
        // one on the right of the screen
        v_fire	= new VirtualJoystick({
            container	: document.getElementById('div_canvas'),
            strokeStyle	: 'red',
            limitStickTravel: true,
            stickRadius	: 0,
            mouseSupport	: true		
        });
        v_fire.addEventListener('touchStartValidation', function(event){
            var touch	= event.changedTouches[0];
            return touch.pageX >= window.innerWidth/2;
        });
    }

    function unregister_v_joystick()
    {   
        if(v_joystick != null)
        {
            v_joystick.destroy();
            v_joystick=null;
        }
        if(v_fire != null)
        {
            v_fire.destroy();
            v_fire=null;
        }
    }