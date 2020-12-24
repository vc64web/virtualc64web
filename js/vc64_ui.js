let global_apptitle="c64 - start screen"

function ToBase64(u8) 
{
    return btoa(String.fromCharCode.apply(null, u8));
}

function FromBase64(str) {
    return atob(str).split('').map(function (c) { return c.charCodeAt(0); });
}

function get_parameter_link()
{
    var call_parameter = window.location.href.split('#');
    var parameter_link=null;
    if(call_parameter.length>1)
    {
        parameter_link=call_parameter[1];
        for(var i=2; i<call_parameter.length;i++)
        {//in case there was a # inside the parameter link ... rebuild that
            parameter_link+="#"+call_parameter[i];
        }
    }
    return parameter_link;
}


var parameter_link__already_checked=false;

function load_parameter_link()
{
    if($('#modal_roms').is(":visible"))
    {
        return;
    }

    if(parameter_link__already_checked)
      return;
    
    parameter_link__already_checked=true;
    var parameter_link = get_parameter_link();
    if(parameter_link != null)
    {
        setTimeout(() => {
            get_data_collector("csdb").run_link("call_parameter", 0,parameter_link);            
        }, 200);
    }
}


var wasm_first_run=null;
var required_roms_loaded =false;

var msg_callback_stack = []
function fire_on_message( msg, callback_fn)
{
    var handler = new Object();
    handler.message = msg;
    handler.callback_fn = callback_fn;
    msg_callback_stack.push(handler); 
}

function check_ready_to_fire(msg)
{
    var execute_stack = [];
    var new_stack = [];
    while(msg_callback_stack.length>0)
    {
        var next = msg_callback_stack.pop();
        if(next.message==msg)
        {
            execute_stack.push(next.callback_fn);
        }
        else
        {
            new_stack.push(next);
        }
    }
    msg_callback_stack= new_stack;

    for(callback_fn of execute_stack)
    {
        callback_fn();
    }
}

function message_handler(cores_msg)
{
    var msg = UTF8ToString(cores_msg);
    if(msg == "MSG_READY_TO_RUN")
    {
        //start it async
        setTimeout(function() { try{wasm_first_run=Date.now(); wasm_run();}catch(e){}},10);
        setTimeout(function() { try{load_parameter_link();}catch(e){}},250);
    }
    else if(msg == "MSG_ROM_MISSING")
    {        
        //try to load roms from local storage
        setTimeout(function() {
            if(load_roms(true) == false)
            {
                $('#modal_roms').modal();
            }
        },0);
 
    }
    else if(msg == "MSG_RUN")
    {
        required_roms_loaded=true;
    }
    else if(msg == "MSG_IEC_BUS_IDLE")
    {
        check_ready_to_fire(msg);
    }
    else if(msg == "MSG_IEC_BUS_BUSY")
    {
        check_ready_to_fire(msg);
    }
}


async function fetchOpenROMS(){
    var installer = async response => {
        try{
            var arrayBuffer = await response.arrayBuffer();
            var byteArray = new Uint8Array(arrayBuffer);
            var rom_url_path = response.url.split('/');
            var rom_name = rom_url_path[rom_url_path.length-1];

            var romtype = wasm_loadfile(rom_name, byteArray, byteArray.byteLength);
            if(romtype != "")
            {
                localStorage.setItem(romtype+".bin", ToBase64(byteArray));
                load_roms(false);
            }
        } catch {
            console.log ("could not install system rom file");
        }  
    }
    
    fetch("https://mega65.github.io/open-roms/bin/basic_generic.rom").then( installer );
    fetch("https://mega65.github.io/open-roms/bin/kernal_generic.rom").then( installer );
//    fetch("https://mega65.github.io/open-roms/bin/chargen_openroms.rom").then( installer );
    fetch("https://mega65.github.io/open-roms/bin/chargen_pxlfont_2.3.rom").then( installer );

}


/**
* load_roms
  if we open ROM-Dialog then we could 
        A) show current roms in c64 instance,
        or
        B) saved roms in local storage ... 
    
        we choose A) because there is no method in the core for B) , 
 *
 * 
 * @param {*} install_to_core true when we should load roms from local storage into the core. 
 *
 * TODO: maybe split up functionality into load_roms() and refresh_rom_dialog() 
 */
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
            $("#rom_basic").attr("src", JSON.parse(wasm_rom_info()).basic.startsWith("mega") ?
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
            JSON.parse(wasm_rom_info()).kernal.startsWith("mega") ?
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
            $("#rom_charset").attr("src", 
            //wasm_rom_classifier(the_rom, the_rom.byteLength).startsWith("mega") ?
            JSON.parse(wasm_rom_info()).charset.startsWith("mega") ?
            "img/rom_mega65.png":"img/rom.png");
            $("#button_delete_char_rom").show();
        }

        var the_rom=loadStoredItem('vc1541_rom.bin'); 
        if (the_rom==null){
            var param_link=get_parameter_link();
            if( 
                param_link == null ||
                param_link.match(/[.](d64|g64)$/i) != null 
            )
            {
                all_fine=false;
            }            
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

async function drop_handler(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    var dt = ev.dataTransfer;
 
    if( dt.items ) {
        for (item of dt.items) {
            if (item.kind == "file") 
            {
                var f = item.getAsFile();
                pushFile(f);
                break;
            }
            else if (item.kind == "string") 
            {
                var dropped_uri = dt.getData("text"); //dt.getData("text/uri-list");
                //e.g. dropped_uri=https://csdb.dk/release/download.php?id=244060"

/*   old way ...
                var dropped_html = dt.getData("text/html");
                //              e.g. dropped_html =
                //                "<meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
                //                <a href="https://csdb.dk/release/download.php?id=244060">http://csdb.dk/getinternalfile.php/205910/joyride.prg</a>"
                var dropped_id_and_name = dropped_html.match(`id=([0-9]+)">(https?://csdb.dk/getinternalfile.php/.*?)</a>`); 
                if(dropped_id_and_name != null && dropped_id_and_name.length>1)
                {
                    var id = dropped_id_and_name[1];
                    var title_name = dropped_id_and_name[2].split("/");
                    title_name = title_name[title_name.length-1];
                    var parameter_link = dropped_id_and_name[2];
                    setTimeout(() => {
                        get_data_collector("csdb").run_link(title_name, id ,parameter_link);            
                    }, 200);
                }
*/
                if(dropped_uri.startsWith("https://csdb.dk/release/download.php?id="))
                {
                    setTimeout(() => {
                        get_data_collector("csdb").run_link("call_parameter", -1,dropped_uri);            
                    }, 150);
                }
                else if(dropped_uri.startsWith("https://csdb.dk/release/?id="))
                {
                    $('#snapshotModal').modal('show');                    

                    //current_browser_datasource
                    await switch_collector("csdb");
                    current_browser_datasource="csdb";

                    $('#search').val(dropped_uri);
                    document.getElementById('search_symbol').click();
                }
                else
                {
                    alert("Sorry only C64-Files, CSDb-release-links or CSDb-download-links are currently supported by vc64web ...");
                }
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

function configure_file_dialog(reset=false)
{
    reset_before_load=reset;

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

            var auto_load = false;
            var auto_press_play = false;
            var auto_run = false;
            
            $("#button_insert_file").removeAttr("disabled");
            $("#div_zip_content").hide();
            $("#button_eject_zip").hide();
            $("#no_disk_rom_msg").hide();

            var return_icon=`&nbsp;<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-arrow-return-left" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M14.5 1.5a.5.5 0 0 1 .5.5v4.8a2.5 2.5 0 0 1-2.5 2.5H2.707l3.347 3.346a.5.5 0 0 1-.708.708l-4.2-4.2a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 8.3H12.5A1.5 1.5 0 0 0 14 6.8V2a.5.5 0 0 1 .5-.5z"/></svg>`;

            if(file_slot_file_name.match(/[.](prg|t64)$/i)) 
            {
                $("#div_auto_load").hide();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").show(); 
                auto_run = true;
                reset_before_load = true; //when flashing a prg always reset
                $("#button_insert_file").html("flash program "+return_icon);
            }
            else if(file_slot_file_name.match(/[.]tap$/i)) 
            {
                $("#div_auto_load").show(); auto_load = true;
                $("#div_auto_press_play").show(); auto_press_play = true;
                $("#div_auto_run").hide(); auto_run = false;
                $("#button_insert_file").html("insert tape"+return_icon);
            }
            else if(file_slot_file_name.match(/[.](d64|g64)$/i)) 
            {
                $("#div_auto_load").show();  auto_load = true;
                $("#div_auto_press_play").hide();
                $("#div_auto_run").show(); auto_run = true;
                $("#button_insert_file").html("insert disk"+return_icon);
                
                if (localStorage.getItem('vc1541_rom.bin')==null)
                {
                    $("#no_disk_rom_msg").show();
                    $("#button_insert_file").attr("disabled", true);
                }
            }
            else if(file_slot_file_name.match(/[.](crt)$/i)) 
            {
                $("#div_auto_load").hide();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").hide();
                $("#button_insert_file").html("insert cartridge"+return_icon);
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

                        var path = $(this).text();
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

                $("#button_insert_file").html("mount file"+return_icon);
                $("#button_insert_file").attr("disabled", true);
            }

            $("#auto_load").prop('checked', auto_load);
            $("#auto_press_play").prop('checked', auto_press_play);
            $("#auto_run").prop('checked', auto_run);


            if(file_slot_file_name.match(/[.](prg|t64|crt)$/i))
            {
                insert_file();
            }
            else
            { //when tap,g64,d64 or zip show file options dialog
                $("#modal_file_slot").modal();
            }
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


function is_any_text_input_active()
{
    var active = false;
    var element = document.activeElement;
    if(element != null)
    {                 
        if(element.tagName != null)
        {
            var type_name = element.tagName.toLowerCase();
            active = type_name == 'input' || type_name == 'textarea';
        }     
    }
    return active;
}

function keydown(e) {
    if(is_any_text_input_active())
        return;

    e.preventDefault();

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
    {
        //wasm_key(c64code[0], c64code[1], 1);
        wasm_schedule_key(c64code[0], c64code[1], 1,0);
    }
}

function keyup(e) {
    if(is_any_text_input_active())
        return;

    e.preventDefault();

    for(action_button of custom_keys)
    {
        if(action_button.key == e.key)
        {
            execute_script(action_button.id, action_button.script);
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
    {
        //wasm_key(c64code[0], c64code[1], 0);
        wasm_schedule_key(c64code[0], c64code[1], 0,1);
    }
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
    if(live_debug_output)
    {
        var axes_output="";
        for(var axe of gamepad.axes)
        {
            axes_output += axe.toFixed(2)+", ";
        }
        
        var btns_output = "";
        for(var btn of gamepad.buttons)
        {
            btns_output += (btn.pressed ? "1":"0")+ ", ";
        }

        Module.print(`controller ${gamepad.id}, mapping= ${gamepad.mapping}`);
        Module.print(`${gamepad.axes.length} axes= ${axes_output}`);
        Module.print(`${gamepad.buttons.length} btns= ${btns_output}`);
    }

    var horizontal_axis = 0;
    var vertical_axis = 1;

    var bReleaseX=false;
    var bReleaseY=false;
    if(0.8<gamepad.axes[horizontal_axis])
    {
        emit_joystick_cmd(portnr+"PULL_RIGHT");   
    }
    else if(-0.8>gamepad.axes[horizontal_axis])
    {
        emit_joystick_cmd(portnr+"PULL_LEFT");
    }
    else
    {
        bReleaseX=true;
    }

    if(0.8<gamepad.axes[vertical_axis])
    {
        emit_joystick_cmd(portnr+"PULL_DOWN");   
    }
    else if(-0.8>gamepad.axes[vertical_axis])
    {
        emit_joystick_cmd(portnr+"PULL_UP");
    }
    else
    {
        bReleaseY=true;
    }


    if(gamepad.buttons.length >= 15 && bReleaseY && bReleaseX)
    {
        if(gamepad.buttons[12].pressed)
        {bReleaseY=false;
            emit_joystick_cmd(portnr+"PULL_UP");   
        }
        else if(gamepad.buttons[13].pressed)
        {bReleaseY=false;
            emit_joystick_cmd(portnr+"PULL_DOWN");   
        }
        else
        {
            bReleaseY=true;
        }
        if(gamepad.buttons[14].pressed)
        {bReleaseX=false;
            emit_joystick_cmd(portnr+"PULL_LEFT");   
        }
        else if(gamepad.buttons[15].pressed)
        {bReleaseX=false;
            emit_joystick_cmd(portnr+"PULL_RIGHT");   
        }
        else
        {
            bReleaseX=true;
        }
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
    for(var i=0; i<gamepad.buttons.length && i<12;i++)
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
    if(port_state[port+'x'] !== undefined && !port_state[port+'x'].includes("RELEASE")) 
    {
        wasm_joystick( port + port_state[port+'x'] );
    }
    if(port_state[port+'y'] !== undefined && !port_state[port+'y'].includes("RELEASE")) 
    {
        wasm_joystick( port + port_state[port+'y'] );
    }
    if(port_state[port+'fire'] !== undefined && !port_state[port+'fire'].includes("RELEASE")) 
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
    wasm_pull_user_snapshot_file = Module.cwrap('wasm_pull_user_snapshot_file', 'string');

    wasm_create_renderer = Module.cwrap('wasm_create_renderer', 'undefined', ['string']);
    wasm_set_warp = Module.cwrap('wasm_set_warp', 'undefined', ['number']);
    wasm_set_borderless = Module.cwrap('wasm_set_borderless', 'undefined', ['number']);
    wasm_press_play = Module.cwrap('wasm_press_play', 'undefined');
    wasm_sprite_info = Module.cwrap('wasm_sprite_info', 'string');
    wasm_set_sid_model = Module.cwrap('wasm_set_sid_model', 'undefined', ['number']);

    wasm_cut_layers = Module.cwrap('wasm_cut_layers', 'undefined', ['number']);

//    wasm_rom_classifier = Module.cwrap('wasm_rom_classifier', 'string', ['array', 'number']);
    wasm_rom_info = Module.cwrap('wasm_rom_info', 'string');

    wasm_set_2nd_sid = Module.cwrap('wasm_set_2nd_sid', 'undefined', ['number']);

    wasm_set_sid_engine = Module.cwrap('wasm_set_sid_engine', 'undefined', ['string']);

    wasm_get_cpu_cycles = Module.cwrap('wasm_get_cpu_cycles', 'number');
    wasm_set_color_palette = Module.cwrap('wasm_set_color_palette', 'undefined', ['string']);


    wasm_schedule_key = Module.cwrap('wasm_schedule_key', 'undefined', ['number', 'number', 'number', 'number']);



    dark_switch = document.getElementById('dark_switch');


    $('#modal_roms').on('hidden.bs.modal', async function () {
        //check again if required roms are there when user decides to exit rom-dialog 
        if(required_roms_loaded == false)
        {//if they are still missing ... we make the decision for the user and 
         //just load the open roms for him instead ...
            await fetchOpenROMS();
        }
        load_parameter_link();
    });

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
        hide_all_tooltips();
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
    var use_webgl=load_setting('use_webgl', false);
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
    set_pixel_art(load_setting('pixel_art', true));
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
var take_auto_snapshots=load_setting('auto_snapshot_switch', false);
auto_snapshot_switch.prop('checked', take_auto_snapshots);
set_take_auto_snapshots(take_auto_snapshots ? 1:0);
auto_snapshot_switch.change( function() {
    set_take_auto_snapshots(this.checked ? 1:0);
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

$('.layer').change( function(event) {
    //recompute stencil cut out layer value
    const layers={
        sprite0: 0x01,
        sprite1: 0x02,
        sprite2: 0x04,
        sprite3: 0x08,
        sprite4: 0x10,
        sprite5: 0x20,
        sprite6: 0x40,
        sprite7: 0x80,        
    };
    const GLOBAL_SPRITE_BIT= 0x100;

    var layer_value = 0;
    for(var layer_id in layers)
    {
        if(document.getElementById(layer_id).checked)
        {
            layer_value |= layers[layer_id];
        }
    }
    if((layer_value & 0xff) != 0)
    {
        layer_value |= GLOBAL_SPRITE_BIT;
    }

    wasm_cut_layers( layer_value );
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

        if(!is_running())
        {
            $("#button_run").click();
        }
        //document.getElementById('canvas').focus();
        //alert('reset');
    }

    running=true;
    $("#button_run").click(function() {
        hide_all_tooltips();
        if(running)
        {        
            wasm_halt();
            running = false;
            //set run icon
            $('#button_run').html(`<svg class="bi bi-play-fill" width="1.6em" height="auto" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
          </svg>`).parent().attr("title", "run").attr("data-original-title", "run");
        }
        else
        {
            //set pause icon
            $('#button_run').html(`<svg class="bi bi-pause-fill" width="1.6em" height="auto" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
          </svg>`).parent().attr("title", "pause").attr("data-original-title", "pause");

            //have to catch an intentional "unwind" exception here, which is thrown
            //by emscripten_set_main_loop() after emscripten_cancel_main_loop();
            //to simulate infinity gamelloop see emscripten API for more info ... 
            try{wasm_run();} catch(e) {}
            running = true;

        }
        
        //document.getElementById('canvas').focus();
    });


    $('#modal_file_slot').on('hidden.bs.modal', function () {
        $("#filedialog").val(''); //clear file slot after file has been loaded
    });

    $( "#modal_file_slot" ).keydown(event => {
            if(event.key === "Enter" && $("#button_insert_file").attr("disabled")!=true)
            {
                $( "#button_insert_file" ).click();                        
            }
            return false;
        }
    );

    reset_before_load=false;
    insert_file = function() 
    {   
        if($('#div_zip_content').is(':visible'))
        {
            configure_file_dialog(reset_before_load);
            return;
        }
        
        do_auto_load = $("#auto_load").prop('checked')
        do_auto_run =  $("#auto_run").prop('checked');
        do_auto_press_play= $("#auto_press_play").prop('checked');

        $('#modal_file_slot').modal('hide');

        var execute_load = function(){
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
                        setTimeout(function() {wasm_press_play(); },650);
                    }
/*                    if(do_auto_run)
                    {
                        fire_when_no_more_message("MSG_VC1530_PROGRESS",function() {
                            emit_string(['Enter','r','u','n','Enter']);
                        });
                    }
*/
                }
                else
                {
                    emit_string(['Enter','l','o','a','d','"','*','"',',','8',',', '1', 'Enter']);
                    if(do_auto_run)
                    {
                        fire_on_message("MSG_IEC_BUS_BUSY",function() {
                            fire_on_message("MSG_IEC_BUS_IDLE", function() {
                                fire_on_message("MSG_IEC_BUS_BUSY",function() {
                                    fire_on_message("MSG_IEC_BUS_IDLE", function() {
                                        emit_string(['r','u','n','Enter'],0);
                                    })
                                })               
                            })
                        });
                    }
                }
            }
            else if(do_auto_run)
            {
                emit_string(['Enter','r','u','n','Enter']);
            }
        };

        if(!is_running())
        {
            $("#button_run").click();
        }
        var faster_open_roms_installed = JSON.parse(wasm_rom_info()).kernal.startsWith("mega");
        
        //the roms differ from cold-start to ready prompt, orig-roms 3300ms and open-roms 250ms   
        var time_since_start=wasm_get_cpu_cycles();
        var time_coldstart_to_ready_prompt = faster_open_roms_installed ? 500000:2500000;
 
        if(reset_before_load == false)
        {
            if(time_since_start>time_coldstart_to_ready_prompt)
            {
//                console.log("direct cycles now ="+time_since_start+ " time_coldstart_to_ready_prompt"+time_coldstart_to_ready_prompt);
                execute_load();
            }
            else
            {
//                 console.log("not direct cycles now ="+time_since_start+ " time_coldstart_to_ready_prompt"+time_coldstart_to_ready_prompt);

                var intervall_id = setInterval(() => {  
                    var cycles_now= wasm_get_cpu_cycles();
//                    console.log("cycles now ="+cycles_now+ " time_coldstart_to_ready_prompt"+time_coldstart_to_ready_prompt);

                    if(cycles_now > time_coldstart_to_ready_prompt)
                    {
                        clearInterval(intervall_id);
                        execute_load();
                    }
                }, 50);
            }
        }
        else
        {
            $('#alert_reset').show();
            wasm_reset();

            var intervall_id = setInterval(() => {  
                var cycles_now= wasm_get_cpu_cycles();
//                console.log("cycles now ="+cycles_now+ " time_coldstart_to_ready_prompt"+time_coldstart_to_ready_prompt+ "  id="+intervall_id);
                if(cycles_now > time_coldstart_to_ready_prompt)
                {
                    clearInterval(intervall_id);
                    execute_load();
                    $('#alert_reset').hide();
                    reset_before_load=false;
                }
            }, 50);
        }
    }
    $("#button_insert_file").click(insert_file);
    
    $('#modal_take_snapshot').on('hidden.bs.modal', function () {
        if(is_running())
        {
            setTimeout(function(){try{wasm_run();} catch(e) {}},200);
        }
    }).keydown(event => {
            if(event.key === "Enter")
            {
                $( "#button_save_snapshot" ).click();                        
            }
            return true;
        }
    );
   
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
        var snapshot_json= wasm_pull_user_snapshot_file();
        var snap_obj = JSON.parse(snapshot_json);
//        var ptr=wasm_pull_user_snapshot_file();
//        var size = wasm_pull_user_snapshot_file_size();
        var snapshot_buffer = new Uint8Array(Module.HEAPU8.buffer, snap_obj.address, snap_obj.size);
   
        //snapshot_buffer is only a typed array view therefore slice, which creates a new array with byteposition 0 ...
        save_snapshot(app_name, snapshot_buffer.slice(0,snap_obj.size));
   
        $("#modal_take_snapshot").modal('hide');
        //document.getElementById('canvas').focus();
    });

/*
    var delete_cache = () =>{
    caches.keys().then(keys => {
        console.log('opening cache:'+keys);
        return Promise.all(keys
            .map(key => {
                caches.open(key).then(function(cache) { 
                    cache.keys().then(function(cached_requests) { 
                      for(req_in_cache of cached_requests)
                      {
                        //console.log(req_in_cache.url);
                        if(req_in_cache.url.match('/webservice/')!= null)
                        {
                           console.log('delete -> '+req_in_cache.url); 
                           cache.delete(req_in_cache);
                        } 
                      }
                    });
                });
            })
        );
    });
    }
    delete_cache();
*/    

    set_sid_model(load_setting('sid_model', '8580'));
    function set_sid_model(sid_model) {
        $("#button_sid_model").text("sid model "+sid_model);
        wasm_set_sid_model(parseInt(sid_model));
    }
    $('#choose_sid_model a').click(function () 
    {
        var sid_model=$(this).text();
        set_sid_model(sid_model);
        save_setting('sid_model',sid_model)
        $("#modal_settings").focus();
    });

    function set_2nd_sid(sid_addr) {
        $("#button_2nd_sid").text("2nd sid "+sid_addr);
        if(sid_addr == "disabled")
        {
            wasm_set_2nd_sid(0);
        }
        else
        {
            wasm_set_2nd_sid(parseInt(sid_addr.replace("enabled at $",""),16));
        }
    }
    $('#choose_2nd_sid_addr a').click(function () 
    {
        var sid_addr=$(this).text();
        set_2nd_sid(sid_addr);
        $("#modal_settings").focus();
    });


    set_sid_engine(load_setting('sid_engine', 'ReSID - Fast'));
    function set_sid_engine(sid_engine) {
        $("#button_sid_engine").text(sid_engine);
        wasm_set_sid_engine(sid_engine);
    }
    $('#choose_sid_engine a').click(function () 
    {
        var sid_engine=$(this).text();
        set_sid_engine(sid_engine);
        save_setting('sid_engine',sid_engine);
        $("#modal_settings").focus();
    });



    set_color_palette(load_setting('color_palette', 'color'));
    function set_color_palette(color_palette) {
        $("#button_color_palette").text(color_palette.replace("_", " "));
        wasm_set_color_palette(color_palette);
    }
    $('#choose_color_palette a').click(function () 
    {
        var color_palette=$(this).text();
        set_color_palette(color_palette);
        save_setting('color_palette',color_palette);
        $("#modal_settings").focus();
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

    $("html").on('dragover', function(e) {dragover_handler(e.originalEvent); return false;}) 
    .on('drop', function (e) {
        drop_handler( e.originalEvent );
        return false;
    });



//---- rom dialog start
   document.getElementById('button_rom_dialog').addEventListener("click", function(e) {
     $('#modal_settings').modal('hide');
     load_roms(false); //update to current roms
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
            var list_actions=['toggle_run', 'take_snapshot', 'restore_last_snapshot', 'swap_joystick', 'keyboard', 'pause', 'run'];
            html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_system_action').html(html_action_list);
            $('#add_system_action a').click(on_add_action);

            //script action
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
  const dark_theme_selected = load_setting('dark_switch', true);
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
    save_setting('dark_switch', false);
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
        return running;
        //return $('#button_run').attr('disabled')=='disabled';
    }
        
    



function emit_string(keys_to_emit_array, type_first_key_time=200, release_delay_in_ms=50)
{  
    // Set the initial delay for the first key (in frames)
    var delay = type_first_key_time / 50;
    var release_delay = release_delay_in_ms / 50;
    if(release_delay<1)
    {
        release_delay = 1;
    }
    for(the_key of keys_to_emit_array)
    {
        console.log(the_key);
        var c64code = translateKey2(the_key, the_key.toLowerCase());
        if(c64code !== undefined)
        {
            if(c64code.modifier != null)
            {
                wasm_schedule_key(c64code.modifier[0], c64code.modifier[1], 1, delay);
                delay=0;
            }
            wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 1, delay);

            delay=release_delay;
            if(c64code.modifier != null)
            {
                wasm_schedule_key(c64code.modifier[0], c64code.modifier[1], 0, delay);
                delay=0;
            }
            wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 0, delay);
            delay=1;
        }
    }
}

function hide_all_tooltips()
{
    //close all open tooltips
    $('[data-toggle="tooltip"]').tooltip('hide');
}
    