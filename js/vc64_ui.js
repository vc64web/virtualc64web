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
            if(load_roms(true) == false)
                $('#modal_roms').modal();
        },0);
 
    }
}


function fetchOpenROMS(){



    install = function (rom_url){
        var oReq = new XMLHttpRequest();
        oReq.open("GET", rom_url, true);
        oReq.responseType = "arraybuffer";

        oReq.onload = function(oEvent) {
            var arrayBuffer = oReq.response;
            var byteArray = new Uint8Array(arrayBuffer);
            var rom_url_path = rom_url.split('/');
            var rom_name = rom_url_path[rom_url_path.length-1];

            var romtype = wasm_loadfile(rom_name, byteArray, byteArray.byteLength);
            if(romtype != "")
            {
                localStorage.setItem(romtype+".bin", ToBase64(byteArray));
                load_roms(false);
            }
        };
        oReq.send();  
    }
    
    install("https://mega65.github.io/open-roms/bin/basic_generic.rom");
    install("https://mega65.github.io/open-roms/bin/kernal_generic.rom");
    install("https://mega65.github.io/open-roms/bin/chargen_openroms.rom");
}




function load_roms(install_to_core){
    var loadStoredItem= function (item_name){
        var stored_item = localStorage.getItem(item_name); 
        if(stored_item != null)
        {
            var restoredbytearray = Uint8Array.from(FromBase64(stored_item));
            if(install_to_core)
            {
                wasm_loadfile(item_name, restoredbytearray, restoredbytearray.byteLength);
            }
            return restoredbytearray;
        }
        else
        {
            return null;
        }
    }

    compare_header = function (header_array,file_array)
    {
        var matches = true;
        header_array.forEach(function (element, i) {
            if(file_array[i] != element)
              matches=false;
        }
        );

        return matches;

    }

    var all_fine = true;
    try{
        var the_rom=loadStoredItem('basic_rom.bin');
        if (the_rom==null){
            all_fine=false;
            $("#rom_basic").attr("src", "img/rom_empty.png");
            $("#button_delete_basic").hide();
        }
        else
        {
            $("#rom_basic").attr("src", compare_header([0x94,0xe3, 0xb7], the_rom) ?
            "img/rom_mega65.png":"img/rom.png");
        
            $("#button_delete_basic").show();
        }

        var the_rom=loadStoredItem('kernal_rom.bin');
        if (the_rom==null){
            all_fine=false;
            $("#rom_kernal").attr("src", "img/rom_empty.png");
            $("#button_delete_kernal").hide();
        }
        else
        {
            $("#rom_kernal").attr("src", 
            compare_header([0x4c,0xb2, 0xa6], the_rom)||
            compare_header([0xA9,0x01, 0x2C], the_rom)  //2020_09_22
             ?
            "img/rom_mega65.png":"img/rom.png");
            $("#button_delete_kernal").show();
        }

        var the_rom=loadStoredItem('char_rom.bin');
        if (the_rom==null){
            all_fine=false;
            $("#rom_charset").attr("src", "img/rom_empty.png");
            $("#button_delete_char_rom").hide();
        }
        else
        {
            $("#rom_charset").attr("src", compare_header([0x3c, 0x66, 0x6e, 110, 96, 102], the_rom) ?
            "img/rom_mega65.png":"img/rom.png");
            $("#button_delete_char_rom").show();
        }

        var the_rom=loadStoredItem('vc1541_rom.bin'); 
        if (the_rom==null){
            all_fine=false;
            $("#rom_disk_drive").attr("src", "img/rom_empty.png");
            $("#button_delete_disk_drive_rom").hide();
        }
        else
        {
            $("#rom_disk_drive").attr("src", "img/rom.png");
            $("#button_delete_disk_drive_rom").show();
        }
    } catch(e){}
    return all_fine;
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
                pushFile(f);
                break;
            }
        }
    }
    else {
        for (var i=0; i < dt.files.length; i++) {
            pushFile(dt.files[i]);
            break;
        }
    }
}

function handleFileInput(event) 
{
    var myForm = document.getElementById('theFileInput');
    var myfiles = myForm.elements['theFileDialog'].files;
    for (var i=0; i < myfiles.length; i++) {
        pushFile(myfiles[i]);
        break;
    }
    return false;
}


file_slot_file_name = null;
file_slot_file =null;

last_zip_archive_name = null
last_zip_archive = null


function pushFile(file) {
    var fileReader  = new FileReader();
    fileReader.onload  = function() {
        file_slot_file_name = file.name;
        file_slot_file = new Uint8Array(this.result);
        configure_file_dialog();
    }
    fileReader.readAsArrayBuffer(file);
}

function configure_file_dialog(mount_button_delay=0)
{
    if(mount_button_delay>0)
        reset_before_load=true;

    try{
        if($("#modal_roms").is(":visible"))
        {
            var romtype = wasm_loadfile(file_slot_file_name, file_slot_file, file_slot_file.byteLength);
            if(romtype != "")
            {
                localStorage.setItem(romtype+".bin", ToBase64(file_slot_file));
                load_roms(false);
            }
        }
        else
        {
            $("#file_slot_dialog_label").html(" "+file_slot_file_name);
            //configure file_slot

            $("#auto_load").prop('checked', true);
            $("#auto_press_play").prop('checked', true);
            $("#auto_run").prop('checked', true);
            $("#button_insert_file").removeAttr("disabled");
            $("#div_zip_content").hide();
            $("#button_eject_zip").hide();
            
  //          $("#button_insert_file").hide();

            if(file_slot_file_name.match(/[.](prg|t64)$/i)) 
            {
                $("#div_auto_load").hide();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").show();
                $("#button_insert_file").html("flash program");
            }
            else if(file_slot_file_name.match(/[.]tap$/i)) 
            {
                $("#div_auto_load").show();
                $("#div_auto_press_play").show();
                $("#div_auto_run").show();
                $("#button_insert_file").html("insert tape");
            }
            else if(file_slot_file_name.match(/[.](d64|g64)$/i)) 
            {
                $("#div_auto_load").show();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").show();
                $("#button_insert_file").html("insert disk");
            }
            else if(file_slot_file_name.match(/[.](crt)$/i)) 
            {
                $("#div_auto_load").hide();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").hide();
                $("#button_insert_file").html("insert cartridge");
            }
            else if(file_slot_file_name.match(/[.](zip)$/i)) 
            {
                $("#div_auto_load").hide();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").hide();

                $("#div_zip_content").show();

                $("#button_eject_zip").show();
                $("#button_eject_zip").click(function(){

                    $("#modal_file_slot").modal('hide');

                    last_zip_archive_name = null;
                    last_zip_archive = null;
                    
                    $("#drop_zone").html("file slot");
                    $("#drop_zone").css("border", "");

                    //$("#drop_zone").click(); this only works robust on firefox ... so better don't do it
                });

                var zip = new JSZip();
                zip.loadAsync(file_slot_file).then(function (zip) {
                    var list='<ul id="ui_file_list" class="list-group">';
                    var mountable_count=0;
                    zip.forEach(function (relativePath, zipfile){
                        var mountable = relativePath.toLowerCase().match(/[.](zip|prg|t64|d64|g64|tap|crt)$/i);
                        list+='<li '+
                        (mountable ? 'id="li_fileselect'+mountable_count+'"':'')
                        +' class="list-group-item list-group-item-action'+ 
                            (mountable ? '':' disabled')+'" data-toggle="list">'+relativePath+'</li>';
                        if(mountable)
                        {
                            mountable_count++;
                        }
                    });
                    list += '</ul>';
                    $("#div_zip_content").html("select a file<br><br>"+ list);
                    $('#ui_file_list li').click( function (e) {
                        e.preventDefault();
                        $(this).parent().find('li').removeClass('active');
                        $(this).addClass('active');

                        var path = $(this).html();
                        zip.file(path).async("uint8array", 
                            function updateCallback(metadata) {
                                console.log("progression: " + metadata.percent.toFixed(2) + " %");
                            }).then(function (u8) {
                                file_slot_file_name=path;
                                file_slot_file=u8;
                            });
                        $("#button_insert_file").removeAttr("disabled");
                    });
                    if(mountable_count>1)
                    {
                        last_zip_archive_name = file_slot_file_name;
                        last_zip_archive = file_slot_file;

                        $("#drop_zone").html('<svg width="1.3em" height="1.3em" viewBox="0 0 16 16" class="bi bi-archive-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.643 15C13.979 15 15 13.845 15 12.5V5H1v7.5C1 13.845 2.021 15 3.357 15h9.286zM5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM.8 1a.8.8 0 0 0-.8.8V3a.8.8 0 0 0 .8.8h14.4A.8.8 0 0 0 16 3V1.8a.8.8 0 0 0-.8-.8H.8z"/></svg> zip');
                        $("#drop_zone").css("border", "3px solid var(--green)");
                    }
                    else
                    {
                         $("#drop_zone").html("file slot");
                        $("#drop_zone").css("border", "");

                        last_zip_archive_name = null;
                        last_zip_archive = null; 
                    }

                    if(mountable_count==1)
                    {
                        $("#li_fileselect0").click();
                    }
                });

                $("#button_insert_file").html("mount file");
                $("#button_insert_file").attr("disabled", true);
            }
            $("#modal_file_slot").modal();
        }    

    } catch(e) {
        console.log(e);
    }
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
    if($('input').is(":focus") == false && $('textarea').is(":focus") == false )
    {//incase any html5 input control has the focus, we should let it get the keyup 
        event.preventDefault();
    }

    if(port1=='keys'||port2=='keys')
    {
        var joystick_cmd = joystick_keydown_map[e.code];
        if(joystick_cmd !== undefined)
        {
            emit_joystick_cmd((port1=='keys'?'1':'2')+joystick_cmd);
            return;
        }
    }
    var c64code = translateKey(e.code, e.key);
    if(c64code !== undefined)
        wasm_key(c64code[0], c64code[1], 1);
}

function keyup(e) {
    if($('input').is(":focus") == false && $('textarea').is(":focus") == false)
    {//incase any html5 input control has the focus, we should let it get the keyup 
        event.preventDefault();

        for(action_button of custom_keys)
        {
            if(action_button.key == e.key)
            {
                execute_script(action_button.id, action_button.script);
            }
        }
    }
 
    if(port1=='keys'||port2=='keys')
    {
        var joystick_cmd = joystick_keyup_map[e.code];
        if(joystick_cmd !== undefined)
        {
            emit_joystick_cmd((port1=='keys'?'1':'2')+joystick_cmd);
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
            emit_joystick_cmd(portnr+new_touch_cmd_x);
            emit_joystick_cmd(portnr+new_touch_cmd_y);
            emit_joystick_cmd(portnr+new_fire);
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
        emit_joystick_cmd(portnr+"PULL_RIGHT");   
    }
    else if(-0.8>gamepad.axes[0])
    {
        emit_joystick_cmd(portnr+"PULL_LEFT");
    }
    else
    {
        bReleaseX=true;
    }

    if(0.8<gamepad.axes[1])
    {
        emit_joystick_cmd(portnr+"PULL_DOWN");   
    }
    else if(-0.8>gamepad.axes[1])
    {
        emit_joystick_cmd(portnr+"PULL_UP");
    }
    else
    {
        bReleaseY=true;
    }

    if(bReleaseX && bReleaseY)
    {
        emit_joystick_cmd(portnr+"RELEASE_XY");
    }
    else if(bReleaseX)
    {
        emit_joystick_cmd(portnr+"RELEASE_X");

    }
    else if(bReleaseY)
    {
        emit_joystick_cmd(portnr+"RELEASE_Y");
    }


    var bFirePressed=false;
    for(var i=0; i<gamepad.buttons.length;i++)
    {
        if(gamepad.buttons[i].pressed)
        {
            bFirePressed=true;
        }
    }
    emit_joystick_cmd(portnr + (bFirePressed?"PRESS_FIRE":"RELEASE_FIRE"));
}

var port_state={};
function emit_joystick_cmd(command)
{
    var port = command.substring(0,1);
    var cmd  = command.substring(1); 
  
    if(cmd == "PULL_RIGHT")
    {
        port_state[port+'x'] = cmd;
    }
    else if(cmd == "PULL_LEFT")
    {
        port_state[port+'x'] = cmd;
    }
    else if(cmd == "RELEASE_X")
    {
        port_state[port+'x'] = cmd;
    }
    else if(cmd == "PULL_UP")
    {
        port_state[port+'y'] = cmd;
    }
    else if(cmd == "PULL_DOWN")
    {
        port_state[port+'y'] = cmd;
    }
    else if(cmd == "RELEASE_Y")
    {
        port_state[port+'y'] = cmd;
    }
    else if(cmd == "RELEASE_XY")
    {
        port_state[port+'x'] = "RELEASE_X";
        port_state[port+'y'] = "RELEASE_Y";
    }
    else if(cmd=="PRESS_FIRE")
    {
        port_state[port+'fire']= cmd;
    }
    else if(cmd=="RELEASE_FIRE")
    {
        port_state[port+'fire']= cmd;
    }

    send_joystick(PORT_ACCESSOR.MANUAL, port, command);
/*
    console.log("portstate["+port+"x]="+port_state[port+'x']);
    console.log("portstate["+port+"y]="+port_state[port+'y']);
*/

}

const PORT_ACCESSOR = {
    MANUAL: 'MANUAL',
    BOT: 'BOT'
}

var current_port_owner = {
    1:PORT_ACCESSOR.MANUAL,
    2:PORT_ACCESSOR.MANUAL,
}; 

function set_port_owner(port, new_owner)
{
    var previous_owner=current_port_owner[port];
    current_port_owner[port]=new_owner;
    if(new_owner==PORT_ACCESSOR.MANUAL)
    {
       restore_manual_state(port);
    }
    return previous_owner;
}
function send_joystick( accessor, port, command )
{
    if(accessor == current_port_owner[port])
    {
        wasm_joystick(command);
    }
}

function restore_manual_state(port)
{
    if(port_state[port+'x'] !== 'undefined') 
    {
        wasm_joystick( port + port_state[port+'x'] );
    }
    if(port_state[port+'y'] !== 'undefined') 
    {
        wasm_joystick( port + port_state[port+'y'] );
    }
    if(port_state[port+'fire'] !== 'undefined') 
    {
        wasm_joystick( port + port_state[port+'fire'] );
    }
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
    wasm_press_play = Module.cwrap('wasm_press_play', 'undefined');
    wasm_sprite_info = Module.cwrap('wasm_sprite_info', 'string');

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

    burger_time_out_handle=null
    burger_button=null;
    menu_button_fade_in = function () {
        if(burger_button == null)
        {
            burger_button = $("#button_show_menu");
        }
        
        burger_button.fadeTo( "slow", 1.0 );
        
        if(burger_time_out_handle != null)
        {
            clearTimeout(burger_time_out_handle);
        }
        burger_time_out_handle = setTimeout(function() {
            if($("#navbar").is(":hidden"))
            {
                burger_button.fadeTo( "slow", 0.0 );
            }
        },5000);    
    };

    //make the menubutton not visible until a click or a touch
    menu_button_fade_in();
    burger_button.hover(function(){ menu_button_fade_in();});

    window.addEventListener("click", function() {
        menu_button_fade_in();
    });
    $("#canvas").on({ 'touchstart' : function() {
        menu_button_fade_in();
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

    $('#modal_file_slot').on('hidden.bs.modal', function () {
        $("#filedialog").val(''); //clear file slot after file has been loaded
    });

    $("#button_insert_file").click(function() 
    {   
        if($('#div_zip_content').is(':visible'))
        {
            configure_file_dialog();
            return;
        }

        if(reset_before_load==true)
        {
            wasm_reset();
        }
        reset_before_load=false;
        
        do_auto_load = $("#auto_load").is(":visible") && $("#auto_load").prop('checked')
        do_auto_run = $("#auto_run").is(":visible") && $("#auto_run").prop('checked');
        do_auto_press_play=$("#auto_press_play").is(":visible") && $("#auto_press_play").prop('checked');

        $('#modal_file_slot').modal('hide');

        $('#alert_reset').show();

        setTimeout(() => {
            var filetype = wasm_loadfile(file_slot_file_name, file_slot_file, file_slot_file.byteLength);

            //if it is a disk from a multi disk zip file, apptitle should be the name of the zip file only
            //instead of disk1, disk2, etc....
            if(last_zip_archive_name !== null)
            {
                global_apptitle = last_zip_archive_name;
            }
            else
            {
                global_apptitle = file_slot_file_name;
            }

            get_custom_buttons(global_apptitle, 
                function(the_buttons) {
                    custom_keys = the_buttons;
                    install_custom_keys();
                }
            );

            if(do_auto_load)
            {
                if(file_slot_file_name.endsWith('.tap'))
                {
                    //shift + runStop
                    emit_string(['Enter','ShiftRunStop']);
                    
                    if(do_auto_press_play)
                    {
                        //press play on tape shortly after emitting load command
                        setTimeout(function() {wasm_press_play(); },420);
                    }

                    if(do_auto_run)
                    {
                        emit_string(['Enter','r','u','n','Enter'], 3000, 800);
                    }
                }
                else
                {
                    emit_string(['Enter','l','o','a', 'd','"','*','"',',','8',',', '1', 'Enter']);
                    
                    if(do_auto_run)
                    {
                        emit_string(['Enter','r','u','n','Enter'], 3000, 800);
                    }
                }
            }
            else if(do_auto_run)
            {
                emit_string(['Enter','r','u','n','Enter']);
            }
            $('#alert_reset').hide();
        }, 2600);
      
    }
    );
    

    $('#modal_take_snapshot').on('hidden.bs.modal', function () {
        if(is_running())
        {
            setTimeout(function(){try{wasm_run();} catch(e) {}},200);
        }
    });
   
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

    setup_browser_interface();

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
            install_custom_keys();
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
            install_custom_keys();
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
        if(last_zip_archive_name != null)
        {
            file_slot_file_name = last_zip_archive_name;
            file_slot_file = last_zip_archive;
            configure_file_dialog();
        }
        else
        {
            document.getElementById('theFileInput').elements['theFileDialog'].click();
        }
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

//---- rom dialog start
    
   document.getElementById('button_rom_dialog').addEventListener("click", function(e) {
     $('#modal_settings').modal('hide');
     setTimeout(function() { $('#modal_roms').modal('show');}, 500);
   }, false);


   document.getElementById('button_fetch_open_roms').addEventListener("click", function(e) {
       fetchOpenROMS();
   }, false);

   
   var bindROMUI = function (id_dropzone, id_delete, id_local_storage) 
   {
        document.getElementById(id_dropzone).addEventListener("click", function(e) {
            document.getElementById('theFileInput').elements['theFileDialog'].click();
        }, false);

        document.getElementById(id_dropzone).addEventListener("dragover", function(e) {
            dragover_handler(e);
        }, false);

        document.getElementById(id_dropzone).addEventListener("drop", function(e) {
            drop_handler(e);
        }, false);

        document.getElementById(id_delete).addEventListener("click", function(e) {
            save_setting(id_local_storage, null);
            load_roms(true);
        }, false);
    }
    bindROMUI('rom_basic', 'button_delete_basic', "basic_rom.bin");
   
    bindROMUI('rom_kernal', 'button_delete_kernal', "kernal_rom.bin");
   
    bindROMUI('rom_charset', 'button_delete_char_rom', "char_rom.bin");
   
    bindROMUI('rom_disk_drive', 'button_delete_disk_drive_rom', "vc1541_rom.bin");
   

//---- rom dialog end

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
    if(!bEnableCustomKeys)
    {
        $("#button_custom_key").remove();
    }
    if(bEnableCustomKeys)
    {
        create_new_custom_key = false;
        $("#button_custom_key").click(
            function(e) 
            {  
                create_new_custom_key = true;
                $('#input_button_text').val('');
                $('#input_action_script').val('');
 
                $('#modal_custom_key').modal('show');
            }
        );

        var adjust_script_textbox_height= function ()
        {
            var action_script_val = $('#input_action_script').val();
            if(action_script_val.startsWith('js:'))
            {
                $('#input_action_script').css("min-height","300px");
            }
            else
            {
                $('#input_action_script').css("min-height","");
            }
        }

        $('#modal_custom_key').on('show.bs.modal', function () {
            if(create_new_custom_key)
            {
                $('#button_delete_custom_button').hide();
                 $('#check_app_scope').prop('checked',true);
            }
            else
            {
                var btn_def = custom_keys.find(el=> ('ck'+el.id) == haptic_touch_selected.id);

                $('#input_button_text').val(btn_def.title);
                $('#input_button_shortcut').val(btn_def.key);
                $('#check_app_scope').prop('checked',btn_def.app_scope);
                $('#input_action_script').val(btn_def.script);

                $('#button_delete_custom_button').show();

                //show errors
                validate_action_script();
            }

            set_scope_label = function (){
                $('#check_app_scope_label').html(
                    $('#check_app_scope').prop('checked') ? 
                    '[ currently visible only for '+global_apptitle+' ]' :
                    '[ currently globally visible ]'
                );
            }
            set_scope_label();
            $('#check_app_scope').change( set_scope_label );
            


            adjust_script_textbox_height();

            if(is_running())
            {
                wasm_halt();
            }

            //click function
            var on_add_action = function() {
                var txt= $(this).text();

                var action_script_val = $('#input_action_script').val();
                if(action_script_val.trim().length==0)
                {
                    action_script_val = txt;
                }
                else if(action_script_val.trim().endsWith('{') || txt == '}')
                {
                    action_script_val += txt;
                }
                else
                {
                    action_script_val += "=>"+txt;
                }

                $('#input_action_script').val(action_script_val);
                validate_action_script();
            };

            $('#predefined_actions').collapse('hide');

            //Special Keys action
            var list_actions=['Space','Comma','F1','F3','F5','F8','runStop','restore','commodore', 'Delete','Enter'];
            var html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_special_key').html(html_action_list);
            $('#add_special_key a').click(on_add_action);

            //joystick1 action
            var list_actions=['j1fire1','j1fire0','j1down1','j1down0','j1up1','j1up0','j1right1','j1right0','j1left1','j1left0'];
            var html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_joystick1_action').html(html_action_list);
            $('#add_joystick1_action a').click(on_add_action);


            //joystick2 action
            var list_actions=['j2fire1','j2fire0','j2down1','j2down0','j2up1','j2up0','j2right1','j2right0','j2left1','j2left0'];
            var html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_joystick2_action').html(html_action_list);
            $('#add_joystick2_action a').click(on_add_action);

            //timer action
            var list_actions=['100ms','300ms','1000ms', 'loop2{','loop3{','loop6{', '}'];
            html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_timer_action').html(html_action_list);
            $('#add_timer_action a').click(on_add_action);
            
            //system action
            var list_actions=['pause', 'run', 'take_snapshot', 'restore_last_snapshot', 'swap_joystick', 'keyboard'];
            html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_system_action').html(html_action_list);
            $('#add_system_action a').click(on_add_action);

            //script action
            
            //system action
            var list_actions=['simple while', 'API example', 'aimbot'];
            html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_javascript').html(html_action_list);
            $('#add_javascript a').click(
                function() {
                    var txt= $(this).text();

                    var action_script_val = $('#input_action_script').val();
                    if(action_script_val.trim().length==0)
                    {
                        if(txt=='simple while')                
                            action_script_val = 'js: \nwhile(not_stopped(this_id))\n{\n await action("A=>200ms")\n}';
                        else if(txt=='API example')
                            action_script_val = 'js://example of the API\nwhile(not_stopped(this_id))\n{\n  //wait some time\n  await action("100ms");\n\n  //get information about the sprites 0..7\n  var y_light=sprite_ypos(0);\n  var y_dark=sprite_ypos(0);\n\n  //reserve exclusive port 1..2 access (manual joystick control is blocked)\n  set_port_owner(1,PORT_ACCESSOR.BOT);\n  await action(`j1left1=>j1up1=>400ms=>j1left0=>j1up0`);\n  //give control back to the user\n  set_port_owner(1,PORT_ACCESSOR.MANUAL);\n}';
                        else if(txt=='aimbot')
                            action_script_val = 'js://archon aimbot\nconst port_light=1, port_dark=2, sprite_light=0, sprite_dark=1;\n\nwhile(not_stopped(this_id))\n{\n  await aim_and_shoot( port_light /* change bot side here ;-) */ );\n  await action("100ms");\n}\n\nasync function aim_and_shoot(port)\n{ \n  var y_light=sprite_ypos(sprite_light);\n  var y_dark=sprite_ypos(sprite_dark);\n  var x_light=sprite_xpos(sprite_light);\n  var x_dark=sprite_xpos(sprite_dark);\n\n  var y_diff=Math.abs(y_light - y_dark);\n  var x_diff=Math.abs(x_light - x_dark);\n  var angle = shoot_angle(x_diff,y_diff);\n\n  var x_aim=null;\n  var y_aim=null;\n  if( y_diff<10 || 26<angle && angle<28 )\n  {\n     var x_rel = (port == port_dark) ? x_dark-x_light: x_light-x_dark;  \n     x_aim=x_rel > 0 ?"left":"right";   \n  }\n  if( x_diff <10 || 26<angle && angle<28)\n  {\n     var y_rel = (port == port_dark) ? y_dark-y_light: y_light-y_dark;  \n     y_aim=y_rel > 0 ?"up":"down";   \n  }\n  \n  if(x_aim != null || y_aim != null)\n  {\n    set_port_owner(port, \n      PORT_ACCESSOR.BOT);\n    await action(`j${port}left0=>j${port}up0`);\n\n    await action(`j${port}fire1`);\n    if(x_aim != null)\n     await action(`j${port}${x_aim}1`);\n    if(y_aim != null)\n      await action(`j${port}${y_aim}1`);\n    await action("60ms");\n    if(x_aim != null)\n      await action(`j${port}${x_aim}0`);\n    if(y_aim != null)\n      await action(`j${port}${y_aim}0`);\n    await action(`j${port}fire0`);\n    await action("60ms");\n\n    set_port_owner(\n      port,\n      PORT_ACCESSOR.MANUAL\n    );\n    await action("500ms");\n  }\n}\n\nfunction shoot_angle(x, y) {\n  return Math.atan2(y, x) * 180 / Math.PI;\n}';
                       adjust_script_textbox_height();
                    }
                    else
                    {
                        alert('first empty manually the existing script code then try again to insert '+txt+' template')
                    }

                    $('#input_action_script').val(action_script_val);
                    validate_action_script();
                }
             );


        });

        $('#modal_custom_key').on('hidden.bs.modal', function () {
            create_new_custom_key=false;
        
            if(is_running())
            {
                wasm_run();
            }
        });


        $('#input_button_text').keyup( function () {validate_custom_key(); return true;} );
        $('#input_action_script').keyup( function () {validate_action_script(); return true;} );

        $('#button_save_custom_button').click(async function(e) 
        {
            if( (await validate_custom_key_form()) == false)
                return;

            if(create_new_custom_key)
            {
                //create a new custom key buttom  
                custom_keys.push( 
                    {  id: custom_keys.length
                      ,title: $('#input_button_text').val()
                      ,key: $('#input_button_shortcut').val()
                      ,app_scope: $('#check_app_scope').prop('checked')
                      ,script:  $('#input_action_script').val()
                      ,position: "top:50%;left:50%" });

                install_custom_keys();
                create_new_custom_key=false;
            }
            else
            {
                var btn_def = custom_keys.find(el=> ('ck'+el.id) == haptic_touch_selected.id);
                btn_def.title = $('#input_button_text').val();
                btn_def.key = $('#input_button_shortcut').val();
                btn_def.app_scope = $('#check_app_scope').prop('checked');
                btn_def.script = $('#input_action_script').val();

                install_custom_keys();
            }
            $('#modal_custom_key').modal('hide');
            save_custom_buttons(global_apptitle, custom_keys);
        });

        $('#button_delete_custom_button').click(function(e) 
        {
            custom_keys=custom_keys.filter(el=> ('ck'+el.id) != haptic_touch_selected.id);            
            install_custom_keys();
            $('#modal_custom_key').modal('hide');
            save_custom_buttons(global_apptitle, custom_keys);
        });

        custom_keys = [];
        action_scripts= {};

        get_custom_buttons(global_apptitle, 
            function(the_buttons) {
                custom_keys = the_buttons;
                install_custom_keys();
            }
        );
        install_custom_keys();
    }

    $("#button_show_menu").click();
    return;
}

//---- start custom keys ------
    function install_custom_keys(){
        //requesting to stop all scripts ... because the custom keys are going to be removed
        //and there is no way to stop their script by clicking the removed button again ...
        stop_all_scripts();

        //remove all existing custom key buttons
        $(".custom_key").remove();
        
        //insert the new buttons
        custom_keys.forEach(function (element, i) {
            element.id = i;
            var btn_html='<button id="ck'+element.id+'" class="btn btn-secondary custom_key" style="position:absolute;'+element.position+';';
            if(element.currentX)
            {
                btn_html += 'transform:translate3d(' + element.currentX + 'px,' + element.currentY + 'px,0);';
            } 
            if(element.app_scope==false)
            {
                btn_html += 'border-width:4px;border-color: #99999999;';
            }
            btn_html += 'touch-action:none">'+element.title+'</button>';

            $('#div_canvas').append(btn_html);
            action_scripts["ck"+element.id] = element.script;


            $('#ck'+element.id).click(function() 
            {       
                var action_script = action_scripts['ck'+element.id];
                execute_script(element.id, action_script);
            });
        });

        install_drag();
    }


    function install_drag()
    {
        dragItems = [];
        container = document;

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
                haptic_touch_selected= e.target;
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

        var ckdef = custom_keys.find(el => ('ck'+el.id) == dragItem.id); 
        
        if(ckdef.currentX != currentX || ckdef.currentY != currentY)
        {
            ckdef.currentX = currentX;
            ckdef.currentY = currentY;
         
            //save new position
            save_custom_buttons(global_apptitle, custom_keys);
        }


        dragItem = null;
        active = false;
      }
    }

    function drag(e) {
      if (active && !haptic_active) {
        e.preventDefault();

        if(dragItems.includes(e.target) && e.target != dragItem)
          return; // custom key is dragged onto other custom key, don't allow that
 
       // console.log('drag:' +e.target.id);  

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


    function is_running()
    {
        return $('#button_run').attr('disabled')=='disabled';
    }
        
    

function emit_string(keys_to_emit_array, type_first_key_time=200, next_key_time=200)
{  
    time_in_future=type_first_key_time;
    keys_to_emit_array.forEach(function (the_key, i) {
             console.log(the_key);
             var c64code = translateKey2(the_key, the_key.toLowerCase());
             if(c64code !== undefined)
             {
                if(c64code.modifier != null)
                {
                    setTimeout(function() {wasm_key(c64code.modifier[0], c64code.modifier[1], 1);}, time_in_future);
                    setTimeout(function() {wasm_key(c64code.modifier[0], c64code.modifier[1], 0);}, time_in_future+next_key_time-10);
                }

                setTimeout(function() {wasm_key(c64code.raw_key[0], c64code.raw_key[1], 1);}, time_in_future+10);
                setTimeout(function() {wasm_key(c64code.raw_key[0], c64code.raw_key[1], 0);}, time_in_future+next_key_time-10);
                time_in_future +=next_key_time;
             }
        }
    );
}
    