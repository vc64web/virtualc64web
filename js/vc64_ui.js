const default_app_title="c64 - start screen";
let global_apptitle=default_app_title;
let call_param_openROMS=false;
let call_param_2ndSID=null;
let call_param_navbar=null;
let call_param_wide=null;
let call_param_border=null;
let call_param_touch=null;
let call_param_dark=null;
let call_param_buttons=[];
let call_param_dialog_on_missing_roms=null;
let call_param_dialog_on_disk=null;
let call_param_SID=null;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContext();
let audio_connected=false;
let current_audio_device='mono audio';

let v_joystick=null;
let v_fire=null;
let fixed_touch_joystick_base=false;
let stationaryBase = false;

let load_sound = async function(url){
    let response = await fetch(url);
    let buffer = await response.arrayBuffer();
    let audio_buffer= await audioContext.decodeAudioData(buffer);
    return audio_buffer;
} 
let parallel_playing=0;
let keyboard_sound_volume=0.04;
let key_haptic_feedback=false;
let play_sound = function(audio_buffer, sound_volume=0.6){
        if(audio_buffer== null)
        {                 
            load_all_sounds();
            return;
        }
        if(parallel_playing>2 && audio_buffer==audio_df_step)
        {//not more than 3 stepper sounds at the same time
            return;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audio_buffer;

        let gain_node = audioContext.createGain();
        gain_node.gain.value = sound_volume; 
        gain_node.connect(audioContext.destination);

        source.addEventListener('ended', () => {
            parallel_playing--;
        });
        source.connect(gain_node);
        source.start();
        parallel_playing++;
}   

let audio_df_insert=null;
let audio_df_eject=null;
let audio_df_step=null;
let audio_hd_step=null;
let audio_key_standard=null;
let audio_key_backspace=null;
let audio_key_space=null;

async function load_all_sounds()
{
    if(audio_df_insert==null)
        audio_df_insert=await load_sound('sounds/insert.mp3');
/*    if(audio_df_eject==null)
        audio_df_eject=await load_sound('sounds/eject.mp3');*/
    if(audio_df_step == null)
        audio_df_step=await load_sound('sounds/step.mp3');
    if(audio_key_standard == null)   
        audio_key_standard=await load_sound('sounds/key_standard.mp3');
    if(audio_key_backspace == null)   
        audio_key_backspace=await load_sound('sounds/key_backspace.mp3');
    if(audio_key_space == null)   
        audio_key_space=await load_sound('sounds/key_space.mp3');

}
load_all_sounds();





let floppy_has_disk=false;
let floppy_step_count=0;

const load_script= (url) => {
    return new Promise(resolve =>
    {
        let script = document.createElement("script")
        script.type = "text/javascript";
        script.onload = resolve;
        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}

function ToBase64(u8) 
{
    return btoa(String.fromCharCode.apply(null, u8));
}

function FromBase64(str) {
    return atob(str).split('').map(function (c) { return c.charCodeAt(0); });
}

function html_encode(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&#34;');
}


function get_parameter_link()
{
    let parameter_link=null;
    let param_pos = window.location.href.indexOf('#');
    let param_part = decodeURIComponent(window.location.href.substring(param_pos));
    if( param_pos >= 0 && param_part.startsWith("#{") &&
    param_part.endsWith("}"))
    {//json notation 
        /*
        #{"url":"http://csdb.dk/getinternalfile.php/205771/CopperBooze.prg","buttons": [{"title":"hello","key":"h","script": "alert('d2hpbGUobm90X3N0b3BwZWQodGhpc19pZCkpIHthd2FpdCBhY3Rpb24oIkE9Pjk5OW1zIik7fQ');"}] }
        #{"buttons":[{"position":"top:10vh;left:90vw","title":"hello","key":"h","run":true,"script":"d2hpbGUobm90X3N0b3BwZWQodGhpc19pZCkpIHthd2FpdCBhY3Rpb24oIkE9Pjk5OW1zIik7fQ=="}]}
        */
        call_obj = JSON.parse(param_part.substring(1), (key, value) => {            
            console.log(key); 
            if(key=='script_base64')
            {//base64decode
                return atob(value);
            }
            return value;
        });
        parameter_link = call_obj.url;
        
        call_param_openROMS=call_obj.openROMS === undefined ? null : call_obj.openROMS;
        call_param_dialog_on_missing_roms = call_obj.dialog_on_missing_roms === undefined ? null : call_obj.dialog_on_missing_roms;
        call_param_dialog_on_disk = call_obj.dialog_on_disk === undefined ? null : call_obj.dialog_on_disk;
        call_param_2ndSID = call_obj._2ndSID === undefined ? null : "enabled at $"+call_obj._2ndSID;
        call_param_SID = call_obj.SID === undefined ? null : call_obj.SID;
        call_param_navbar = call_obj.navbar === undefined ? null : call_obj.navbar==false ? "hidden": null;
        call_param_wide=call_obj.wide === undefined ? null : call_obj.wide;
        call_param_border=call_obj.border === undefined ? null : call_obj.border;
        call_param_touch=call_obj.touch === undefined ? null : call_obj.touch;
        call_param_dark=call_obj.dark === undefined ? null : call_obj.dark;
        if(call_obj.touch)
        {
            call_param_touch=true;
            register_v_joystick();   
        }
        if(call_obj.port1)
        {
            port1=call_param_touch != true ? "keys":"touch";          
            port2="none";
            $('#port1').val(port1);
            $('#port2').val(port2);
        }
        if(call_obj.port2)
        {
            port1="none";
            port2=call_param_touch != true ? "keys":"touch";
            $('#port1').val(port1);       
            $('#port2').val(port2);
        }
        
        
        if(call_obj.buttons !== undefined && call_param_buttons.length==0)
        {
            for(let b of call_obj.buttons)
            {
                if(b.position === undefined)
                {
                    b.position = "top:50vh;left:50vw";
                }
                if(b.script_base64 !== undefined){
                    b.script=b.script_base64;
                }
                if(b.lang === undefined)
                {
                    b.lang = "javascript";
                }
                b.transient = true;
                b.app_scope = true;
                b.id = 1000+call_param_buttons.length;
                if(b.key === undefined) b.key='';
                if(b.title === undefined) b.title='';
                call_param_buttons.push( b );
            }
        }
    }
    else
    {
        //hash style notation
        var call_url = window.location.href.split('#');
        if(call_url.length>1)
        {//there are # inside the URL
            //process settings 
            for(var i=1; i<call_url.length;i++)
            {//in case there was a # inside the parameter link ... rebuild that
                var token = call_url[i]; 
                
                if(parameter_link != null)
                {
                    parameter_link+="#"+token;
                }
                else if(token.startsWith("http"))
                {
                    parameter_link=token;
                }
                else
                { // it must be a setting
                    if(token.match(/openROMS=true/i))
                    {
                        call_param_openROMS=true;
                    }
                    else if(token.match(/2ndSID=.*/i))
                    {
                        var sid_addr=token.replace(/2ndSID=/i,"");
                        //for example #2ndSID=d420#http...
                        call_param_2ndSID = "enabled at $"+sid_addr; 
                    }
                    else if(token.match(/SID=.*/i))
                    {
                        var sid_addr=token.replace(/SID=/i,"");
                        call_param_SID = sid_addr; 
                    }
                    else if(token.match(/touch=true/i))
                    {
                        call_param_touch=true;
                        register_v_joystick();
                    }
                    else if(token.match(/port1=true/i))
                    {
                        port1=call_param_touch != true ? "keys":"touch";          
                        port2="none";     
                        $('#port1').val(port1);
                        $('#port2').val(port2);
                    }
                    else if(token.match(/port2=true/i))
                    {
                        port1="none";
                        port2=call_param_touch != true ? "keys":"touch";
                        $('#port1').val(port1);       
                        $('#port2').val(port2);
                    }
                    else if(token.match(/navbar=hidden/i))
                    {
                        call_param_navbar='hidden';
                    }
                    else if(token.match(/wide=(true|false)/i))
                    {
                        call_param_wide=token.match(/.*(true|false)/i)[1].toLowerCase() == 'true';
                    }
                    else if(token.match(/border=(true|false)/i))
                    {
                        call_param_border=token.match(/.*(true|false)/i)[1].toLowerCase() == 'true';
                    }
                    else if(token.match(/border=([01]([.][0-9]*)?)/i))
                    {//border=0.3
                        call_param_border=token.match(/border=([01]([.][0-9]*)?)/i)[1];
                    }
                    else if(token.match(/dark=(true|false)/i))
                    {
                        call_param_dark=token.match(/.*(true|false)/i)[1].toLowerCase() == 'true';
                    }
                    else if(token.match(/dialog_on_missing_roms=(true|false)/i))
                    {
                        call_param_dialog_on_missing_roms=token.match(/.*(true|false)/i)[1].toLowerCase() == 'true';
                    }
                    else if(token.match(/dialog_on_disk=(true|false)/i))
                    {
                        call_param_dialog_on_disk=token.match(/.*(true|false)/i)[1].toLowerCase() == 'true';
                    }
                }
            }
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

var last_drive_event=0;
var msg_callback_stack = []
function fire_on_message( msg, callback_fn)
{
    var handler = new Object();
    handler.message = msg;
    handler.callback_fn = callback_fn;
    msg_callback_stack.push(handler); 
}

function wait_on_message(msg)
{
    return new Promise(resolve => fire_on_message(msg, resolve));
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

async function disk_loading_finished()
{//await disk_loading_finished() before typing 'run'
    if(JSON.parse(wasm_rom_info()).drive_rom.startsWith("Patched"))
    {
        last_drive_event=wasm_get_cpu_cycles();
        while (wasm_get_cpu_cycles() < last_drive_event + 982000*1.6)
        {
            console.log("wait for disk_loading_finished: "+ wasm_get_cpu_cycles()+" "+last_drive_event);       
            await sleep(100);  
        }   
    }
    else
    {
        await wait_on_message("MSG_SER_BUSY");
        await wait_on_message("MSG_SER_IDLE");
        await wait_on_message("MSG_SER_BUSY");
        await wait_on_message("MSG_SER_IDLE");
    }
    console.log("detected disk_loading_finished: "+wasm_get_cpu_cycles()+" "+last_drive_event);
}   


function message_handler(msg, data1, data2)
{   
    queueMicrotask(()=>{
        message_handler_queue_worker( msg, data1, data2 )
    });
}
function message_handler_queue_worker(msg, data1, data2)
{
    //UTF8ToString(cores_msg);
    if(msg == "MSG_READY_TO_RUN")
    {
        //start it async
        setTimeout(function() { try{wasm_first_run=Date.now(); wasm_run();}catch(e){}},10);
        setTimeout(function() { 
            try{
                load_parameter_link();
                if(call_param_2ndSID!=null)
                {
                    set_2nd_sid(call_param_2ndSID);
                }
                if(call_param_SID!=null)
                {
                    set_sid_model(call_param_SID);
                }
                if(call_param_navbar=='hidden')
                {
                    setTimeout(function(){
                    $("#button_show_menu").click();
                    },500);
                }
                if(call_param_wide != null)
                {
                    use_wide_screen = call_param_wide;
                    scaleVMCanvas();
                    wide_screen_switch.prop('checked', use_wide_screen);
                }
                if(call_param_border != null)
                {
                    use_borderless = 1-call_param_border;
                    wasm_set_borderless(use_borderless);
                    borderless_switch.prop('checked', use_borderless);
                }

            }catch(e){}},
        150);
    }
    else if(msg == "MSG_ROM_MISSING")
    {        
        //try to load roms from local storage
        setTimeout(async function() {
            if(load_roms(true) == false)
            {
                get_parameter_link(); //just make sure the parameters are set
                if(call_param_openROMS==true)
                {
                    await fetchOpenROMS();        
                }
                else if(call_param_dialog_on_missing_roms != false)
                {
                    $('#modal_roms').modal();
                }
            }
        },0);
 
    }
    else if(msg == "MSG_RUN")
    {
        required_roms_loaded=true;
        emulator_currently_runs=true;
        document.body.setAttribute('warpstate',Module._wasm_is_warping());
    }
    else if(msg == "MSG_PAUSE")
    {
        emulator_currently_runs=false;
        document.body.setAttribute('warpstate', 0);
    }
    else if(msg === "MSG_WARP")
    {
        let is_warping = Module._wasm_is_warping();
        document.body.setAttribute('warpstate', is_warping);
        window.parent.postMessage({ msg: 'render_run_state', value: is_running(), is_warping:  is_warping },"*");
    }
    else if(msg == "MSG_DISK_INSERT")
    {
        play_sound(audio_df_insert, drive_loudness);
        floppy_has_disk=true; 
    } 
    else if(msg == "MSG_SER_IDLE" || 
            msg == "MSG_SER_BUSY" || 
            msg.startsWith("MSG_DRIVE_")
        )
    {
        if(msg == "MSG_DRIVE_STEP")
        {
            floppy_step_count++;
            if(floppy_has_disk||floppy_step_count>1)
            { 
                play_sound(audio_df_step, drive_loudness);
               $("#drop_zone").html(`drv${8+data1} ${data2.toString().padStart(2, '0')}`);
            }
        }    
        
        try { last_drive_event = wasm_get_cpu_cycles(); } catch {};
        check_ready_to_fire(msg);
    }
    else if(msg == "MSG_RS232")
    {
        //rs232_message.push(data);
        rs232_message += String.fromCharCode(data1);
    }
    else if(msg =="MSG_PAL" || msg =="MSG_NTSC")
    {
//        wasm_get_config= Module.cwrap('wasm_get_config', 'number', ['string']);
        let vic = wasm_get_config("OPT_VIC_REVISION");
        let vic_rev=["PAL 50Hz 6569","PAL 50Hz 6569 R3","PAL 50Hz 8565","NTSC 60Hz 6567 R56A","NTSC 60Hz 6567","NTSC 60Hz 8562"];
        if(0 <= vic && vic<vic_rev.length) $("#button_vic_rev").text("vicII rev "+ vic_rev[vic]);
    }
}
rs232_message = "";
//rs232_message=[];

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
                local_storage_set(romtype+".bin", ToBase64(byteArray));
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
        var stored_item = local_storage_get(item_name); 
        if(stored_item != null)
        {
            var restoredbytearray = Uint8Array.from(FromBase64(stored_item));
            if(install_to_core)
            {
                romtype = wasm_loadfile(item_name, restoredbytearray, restoredbytearray.byteLength);
                if(!romtype.endsWith("rom"))
                {//in case the core thinks rom is not valid anymore delete it
                    local_storage_remove(item_name);
                    return null;
                }
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
            $("#rom_basic").attr("src", JSON.parse(wasm_rom_info()).basic.startsWith("M.E.G.A") ?
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
            let kernal_title =JSON.parse(wasm_rom_info()).kernal; 
            $("#rom_kernal").attr("src", 
            kernal_title.startsWith("M.E.G.A") ? "img/rom_mega65.png":
            kernal_title.startsWith("Patched") ? "img/rom_patched.png":
            "img/rom.png");
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
            //wasm_rom_classifier(the_rom, the_rom.byteLength).startsWith("M.E.G.A") ?
            JSON.parse(wasm_rom_info()).charset.startsWith("M.E.G.A") ?
            "img/rom_mega65.png":"img/rom.png");
            $("#button_delete_char_rom").show();
        }

        var the_rom=loadStoredItem('vc1541_rom.bin'); 
        if (the_rom==null){
            var param_link=get_parameter_link();
            if( 
                param_link != null &&
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
            let drive_rom =JSON.parse(wasm_rom_info()).drive_rom; 
            $("#rom_disk_drive").attr("src", 
            drive_rom.startsWith("Patched") ? "img/rom_patched.png":"img/rom.png");
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
file_slot_file = null;
current_side = 0; // 0 = no side loaded, 1 = side1/sideA, 2 = side2/sideB, etc.
last_zip_archive_name = null;
last_zip_archive = null;
used_side_numbers = []; // Track which side numbers have been used with their filenames

// Function to scan all files and build used_side_numbers
function scan_files_for_sides(files) {
    used_side_numbers = []; // Reset the array
    
    // First pass: collect all d64 files
    const d64_files = [];
    Object.values(files).forEach(file => {
        if (!file.dir && !file.name.startsWith("__MACOSX") &&
            (
                file.name.toLowerCase().endsWith('.d64') ||
                file.name.toLowerCase().endsWith('.g64')
            )
        ) {
            d64_files.push(file.name);
        }
    });
    
    // Sort files alphabetically for consistent ordering
    d64_files.sort();
    
    // Assign sequential numbers starting from 1
    d64_files.forEach((filename, index) => {
        used_side_numbers.push({ 
            side: index + 1,  // Start from 1
            filename: filename 
        });
    });
    
    // Sort by side number for easier debugging
    used_side_numbers.sort((a, b) => a.side - b.side);
}

// Function to get the side number for a filename
function get_side_number(filename) {
    const entry = used_side_numbers.find(e => e.filename === filename);
    return entry ? entry.side : 0;
}

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
                local_storage_set(romtype+".bin", ToBase64(file_slot_file));
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
                auto_run = true;
                reset_before_load = true; //when flashing a prg always reset
            }
            else if(file_slot_file_name.match(/[.]tap$/i)) 
            {
                $("#div_auto_load").show(); auto_load = true;
                $("#div_auto_press_play").show(); auto_press_play = true;
                $("#div_auto_run").hide(); auto_run = false;
                $("#button_insert_file").html("insert tape"+return_icon);
                $("#modal_file_slot").modal();
            }
            else if(file_slot_file_name.match(/[.](d64|g64)$/i)) 
            {
                // If loading from ZIP and there's a previous side, insert directly without dialog
                if (last_zip_archive_name !== null && current_side > 0) {
                    auto_load = false;
                    auto_run = false;
                    reset_before_load = false;
                    insert_file();
                    return;
                }
                
                // Normal case: show dialog with options
                $("#div_auto_load").show();  
                auto_load = true;
                $("#div_auto_run").show(); 
                auto_run = true;
                $("#div_auto_reset").show();
                
                $("#div_auto_press_play").hide();
                $("#button_insert_file").html("insert disk"+return_icon);
                
                if (local_storage_get('vc1541_rom.bin')==null)
                {
                    $("#no_disk_rom_msg").show();
                    $("#button_insert_file").attr("disabled", true);
                }
                if(call_param_dialog_on_disk == false)
                {
                    insert_file();
                }
                else
                {
                    $("#modal_file_slot").modal();
                }
            }
            else if(file_slot_file_name.match(/[.](crt)$/i)) 
            {
            }
            else if(file_slot_file_name.match(/[.](zip)$/i)) 
            {
                $("#div_auto_load").hide();
                $("#div_auto_press_play").hide();
                $("#div_auto_run").hide();
                $("#div_auto_reset").hide();

                $("#div_zip_content").show();
                $("#button_eject_zip").show();
                $("#button_eject_zip").click(function(){
                    $("#modal_file_slot").modal('hide');
                    last_zip_archive_name = null;
                    last_zip_archive = null;
                    current_side = 0; // Reset side counter when ejecting ZIP
                    used_side_numbers = []; // Reset used side numbers
                    $("#drop_zone").html("file slot");
                    $("#drop_zone").css("border", "");
                });

                var zip = new JSZip();
                zip.loadAsync(file_slot_file).then(function (zip) {
                    var list='<ul id="ui_file_list" class="list-group">';
                    var mountable_count=0;
                    var mountable_files = [];
                    var next_side_to_select = current_side + 1;
                    
                    // First scan all files to build used_side_numbers
                    scan_files_for_sides(zip.files);
                    
                    // Helper function to check if a file is the next side
                    function is_next_side(filename, next_side) {
                        const entry = used_side_numbers.find(e => e.filename === filename);
                        return entry && entry.side === next_side;
                    }
                    
                    zip.forEach(function (relativePath, zipfile){
                        if(!relativePath.startsWith("__MACOSX"))
                        {
                            var mountable = relativePath.toLowerCase().match(/[.](zip|prg|t64|d64|g64|tap|crt|vc64)$/i);
                            var next_side = false;
                            
                            if (mountable) {
                                next_side = is_next_side(relativePath, next_side_to_select);
                            }
                            
                            list+='<li '+
                            (mountable ? 'id="li_fileselect'+mountable_count+'"':'')
                            +' class="list-group-item list-group-item-action'+ 
                                (mountable ? '':' disabled')+'">'+relativePath+'</li>';
                            
                            if(mountable) {
                                mountable_files.push({
                                    path: relativePath,
                                    index: mountable_count,
                                    is_next_side: next_side
                                });
                                mountable_count++;
                            }
                        }
                    });
                    list += '</ul>';
                    $("#div_zip_content").html("select a file<br><br>"+ list);
                    
                    queueMicrotask(()=> {                   
                        // Find and select the appropriate file
                        let file_to_select = mountable_files.find(f => f.is_next_side);
                        
                        if (file_to_select) {
                            $('#li_fileselect' + file_to_select.index).click();
                        } /*else if (mountable_count > 0) {
                            // If no matching side found, select the first mountable file
                            $('#li_fileselect0').click();
                        }*/
                    });

                    $('#ui_file_list li').click( function (e) {
                        e.preventDefault();
                        if(typeof uncompress_progress !== 'undefined' && uncompress_progress!=null)
                        {
                            return;
                        }
                        $(this).parent().find('li').removeClass('active');
                        $(this).addClass('active');
                        $("#button_insert_file").attr("disabled", true);
                        var path = $(this).text();
                        uncompress_progress='0';
                        zip.file(path).async("uint8array", 
                            function updateCallback(metadata) {
                                let current_progress=metadata.percent.toFixed(0);
                                if(uncompress_progress != current_progress)
                                {
                                    uncompress_progress = current_progress;
                                    $("#button_insert_file").html(`extract ${uncompress_progress}%`);
                                }
                            }).then(function (u8) {
                                file_slot_file_name=path;
                                file_slot_file=u8;
                    
                                if(mountable_count==1)
                                {//in case that there was only one mountable file in the zip, auto mount it
                                    configure_file_dialog(reset_before_load);
                                }        
                                else
                                {//file is ready to insert
                                    $("#button_insert_file").html("mount file"+return_icon);
                                    $("#button_insert_file").removeAttr("disabled");
                                }
                                uncompress_progress=null;
                            });
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

                    if(mountable_count>=1)
                    {
                        $("#modal_file_slot").modal();
                    }
                });

                $("#button_insert_file").html("mount file"+return_icon);
                $("#button_insert_file").attr("disabled", true);
            }

            $("#auto_reset").prop('checked', reset_before_load);
            $("#auto_load").prop('checked', auto_load);
            $("#auto_press_play").prop('checked', auto_press_play);
            $("#auto_run").prop('checked', auto_run);    

            if(file_slot_file_name.match(/[.](prg|t64|crt|vc64)$/i))
            {
                insert_file();
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
    if(typeof editor !== 'undefined' && editor.hasFocus())
        return true;

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
function serialize_key_code(e){
    let mods = ""; let code = e.code;
    if(e.altKey && !code.startsWith('Alt'))
        mods+="Alt+";
    if(e.metaKey && !code.startsWith('Meta'))
        mods+="Meta+";
    if(e.shiftKey && !code.startsWith('Shift'))
        mods+="Shift+";
    if(e.ctrlKey && !code.startsWith('Control'))
        mods+="Ctrl+";
    return mods+code;
}
var shift_pressed_state=false;
function keydown(e) {
    if(is_any_text_input_active())
        return;

    e.preventDefault();
    if(e.repeat)
    {
      //if a key is being pressed for a long enough time, it starts to auto-repeat: 
      //the keydown triggers again and again, and then when it's released we finally get keyup
      //we just have to ignore the autorepeats here
      return;
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

    let serialized_code=serialize_key_code(e);
    for(action_button of custom_keys)
    {
        if(action_button.key == e.key /* e.key only for legacy custom keys*/   
           || action_button.key == serialized_code)
        {
            let running_script=get_running_script(action_button.id);                    
            if(running_script.running == false)
            {
                running_script.action_button_released = false;
            }
            execute_script(action_button.id, action_button.lang, action_button.script);
            return;
        }
    }

    if(use_symbolic_map && e.code.toLowerCase().startsWith("shift"))
    {
        shift_pressed_state=true;
        return;
    }
    var c64code = translateKey2(e.code, e.key, !use_symbolic_map);
    if(c64code !== undefined)
    {
        if(c64code.modifier != null)
        {
            wasm_schedule_key(c64code.modifier[0], c64code.modifier[1], 1, 0);
        }

        if(use_symbolic_map)
        {
            let active_sym_key_on_keycap=key_pressed_buffer[e.code];
            if( active_sym_key_on_keycap!= undefined && active_sym_key_on_keycap!=null)
            {//don't accept another symkey
                return;
            }
            key_pressed_buffer[e.code]=c64code;
        }
        wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 1, 0);
    }
}

let key_pressed_buffer=[];

function keyup(e) {
    if(is_any_text_input_active())
        return;

    e.preventDefault();

    if(port1=='keys'||port2=='keys')
    {
        var joystick_cmd = joystick_keyup_map[e.code];
        if(joystick_cmd !== undefined)
        {
            let port_id=port1=='keys'?'1':'2';
            if( joystick_cmd=='RELEASE_FIRE'
                ||
                //only release axis on key_up if the last key_down for that axis was the same direction
                port_state[port_id+'x'] == joystick_keydown_map[e.code]
                ||
                port_state[port_id+'y'] == joystick_keydown_map[e.code]
            )
            {
                emit_joystick_cmd(port_id+joystick_cmd);
            }
            return;
        }
    }

    let serialized_code=serialize_key_code(e);
    for(action_button of custom_keys)
    {
        if(action_button.key == e.key /* e.key only for legacy custom keys*/   
           || action_button.key == serialized_code)
        {
            get_running_script(action_button.id).action_button_released = true;
            return;
        }
    }

    if(use_symbolic_map && e.code.toLowerCase().startsWith("shift"))
    {
        if(shift_pressed_state)
        {//when shift is released before the keyup of the shiftkey is done
         //release the shift in c64 too, because the following keyup will not include the shiftkey
            shift_pressed_state=false;
            var c64code = translateKey2(e.code, e.key, use_positional_mapping=true);
            wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 0, 0);
        }
        return;
    }

    if(use_symbolic_map)
    {
        let active_sym_key_on_keycap=key_pressed_buffer[e.code];
        if( active_sym_key_on_keycap!= undefined && active_sym_key_on_keycap!=null)
        {
            wasm_schedule_key(active_sym_key_on_keycap.raw_key[0], active_sym_key_on_keycap.raw_key[1], 0, 0);
            if(active_sym_key_on_keycap.modifier != null )
            {
                wasm_schedule_key(active_sym_key_on_keycap.modifier[0], active_sym_key_on_keycap.modifier[1], 0, 0);
            }    
        }
        key_pressed_buffer[e.code]=null;
        return;
    }

    var c64code = translateKey2(e.code, e.key, !use_symbolic_map);
    if(c64code !== undefined )
    {
        wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 0, 0);
        if(c64code.modifier != null )
        {
            wasm_schedule_key(c64code.modifier[0], c64code.modifier[1], 0, 0);
        }
    }
}

timestampjoy1 = null;
timestampjoy2 = null;
last_touch_cmd = null;
last_touch_fire= null;
/* callback for wasm mainsdl.cpp */
function draw_one_frame()
{
    var gamepads=null;
    if(port1 != 'none' && port1 !='keys' && port1 !='touch')
    {
        gamepads = navigator.getGamepads();        
        var joy1= gamepads[port1];
        
        if(joy1 != null && timestampjoy1 != joy1.timestamp)
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
        
        if(joy2 != null && timestampjoy2 != joy2.timestamp)
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
        var new_touch_cmd = portnr + new_touch_cmd_x + new_touch_cmd_y;
        if( last_touch_cmd != new_touch_cmd)
        {
            last_touch_cmd = new_touch_cmd;
            emit_joystick_cmd(portnr+new_touch_cmd_x);
            emit_joystick_cmd(portnr+new_touch_cmd_y);
            //play_sound(audio_df_step);
            v_joystick.redraw_base(new_touch_cmd);
        }
        var new_touch_fire = portnr + new_fire;
        if( last_touch_fire != new_touch_fire)
        {
            last_touch_fire = new_touch_fire;
            emit_joystick_cmd(new_touch_fire);
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

    const horizontal_axis = 0;
    const vertical_axis = 1;

    var bReleaseX=true;
    var bReleaseY=true;

    for(let stick=0; stick<=gamepad.axes.length/2;stick+=2)
    {
        if(bReleaseX && 0.5<gamepad.axes[stick+horizontal_axis])
        {
            emit_joystick_cmd(portnr+"PULL_RIGHT");
            bReleaseX=false;
        }
        else if(bReleaseX && -0.5>gamepad.axes[stick+horizontal_axis])
        {
            emit_joystick_cmd(portnr+"PULL_LEFT");
            bReleaseX=false;
        }
 
        if(bReleaseY && 0.5<gamepad.axes[stick+vertical_axis])
        {
            emit_joystick_cmd(portnr+"PULL_DOWN");
            bReleaseY=false;
        }
        else if(bReleaseY && -0.5>gamepad.axes[stick+vertical_axis])
        {
            emit_joystick_cmd(portnr+"PULL_UP");
            bReleaseY=false;
        }
    }

    if(gamepad.buttons.length > 15 && bReleaseY && bReleaseX)
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
    try{add_pencil_support_for_elements_which_need_it();} catch(e) {console.error(e)}
    wasm_loadfile = Module.cwrap('wasm_loadFile', 'string', ['string', 'array', 'number']);
    wasm_key = Module.cwrap('wasm_key', 'undefined', ['number', 'number', 'number']);
    wasm_toggleFullscreen = Module.cwrap('wasm_toggleFullscreen', 'undefined');
    wasm_joystick = Module.cwrap('wasm_joystick', 'undefined', ['string']);
    wasm_reset = Module.cwrap('wasm_reset', 'undefined');
    wasm_halt = Module.cwrap('wasm_halt', 'undefined');
    wasm_run = Module.cwrap('wasm_run', 'undefined');
    wasm_take_user_snapshot = Module.cwrap('wasm_take_user_snapshot', 'string');

    wasm_create_renderer = Module.cwrap('wasm_create_renderer', 'undefined', ['string']);
    wasm_set_warp = Module.cwrap('wasm_set_warp', 'undefined', ['number']);
    wasm_set_borderless = Module.cwrap('wasm_set_borderless', 'undefined', ['number']);
    wasm_press_play = Module.cwrap('wasm_press_play', 'undefined');
    wasm_press_stop = Module.cwrap('wasm_press_stop', 'undefined');
    wasm_rewind = Module.cwrap('wasm_rewind', 'undefined');
    wasm_sprite_info = Module.cwrap('wasm_sprite_info', 'string');
    wasm_set_sid_model = Module.cwrap('wasm_set_sid_model', 'undefined', ['number']);

    wasm_cut_layers = Module.cwrap('wasm_cut_layers', 'undefined', ['number']);

    wasm_rom_info = Module.cwrap('wasm_rom_info', 'string');

    wasm_set_2nd_sid = Module.cwrap('wasm_set_2nd_sid', 'undefined', ['number']);

    wasm_set_sid_engine = Module.cwrap('wasm_set_sid_engine', 'undefined', ['string']);

    wasm_get_cpu_cycles = Module.cwrap('wasm_get_cpu_cycles', 'number');
    wasm_set_color_palette = Module.cwrap('wasm_set_color_palette', 'undefined', ['string']);

    wasm_schedule_key = Module.cwrap('wasm_schedule_key', 'undefined', ['number', 'number', 'number', 'number']);

    wasm_peek = Module.cwrap('wasm_peek', 'number', ['number']);
    wasm_poke = Module.cwrap('wasm_poke', 'undefined', ['number', 'number']);
    wasm_export_disk = Module.cwrap('wasm_export_disk', 'string');
    wasm_configure = Module.cwrap('wasm_configure', 'undefined', ['string', 'number']);
    wasm_get_config = Module.cwrap('wasm_get_config', 'number', ['string']);
    wasm_write_string_to_ser = Module.cwrap('wasm_write_string_to_ser', 'undefined', ['string']);
    wasm_print_error = Module.cwrap('wasm_print_error', 'undefined', ['number']);

    wasm_get_sound_buffer_address = Module.cwrap('wasm_get_sound_buffer_address', 'number');
    wasm_copy_into_sound_buffer = Module.cwrap('wasm_copy_into_sound_buffer', 'number');
    wasm_set_sample_rate = Module.cwrap('wasm_set_sample_rate', 'undefined', ['number']);
    wasm_auto_type = Module.cwrap('wasm_auto_type', 'undefined', ['string']);

    const drive_loudness_slider = document.getElementById('drive_loudness_slider');
    set_drive_loudness = (new_volume)=>{
        const volume = parseFloat(new_volume);
        current_sound_volume = volume*2.5;
        drive_loudness = current_sound_volume;
        console.log(`drive loudness set to: ${volume * 100}%`);
        $("#drive_loudness_text").text(`drive loudness = ${Math.round(volume * 100)}%`)
        save_setting('drive_loudness', new_volume);
    }
    drive_loudness_slider.addEventListener('input', (event) => {
        set_drive_loudness(event.target.value);
    });
 
    let loaded_drive_loudness=load_setting('drive_loudness', 0.25);
    set_drive_loudness(loaded_drive_loudness);
    $("#drive_loudness_slider").val(loaded_drive_loudness);





    const volumeSlider = document.getElementById('volume-slider');
    set_volume = (new_volume)=>{
        const volume = parseFloat(new_volume);
        current_sound_volume = volume*5;
        if(typeof gainNode !== "undefined") 
            gainNode.gain.value = current_sound_volume;
        console.log(`Volume set to: ${volume * 100}%`);
        $("#volumetext").text(`sound volume = ${Math.round(volume * 100)}%`)
        save_setting('master_sound_volume', new_volume);
    }
    volumeSlider.addEventListener('input', (event) => {
        set_volume(event.target.value);
    });
 
    let loaded_vol=load_setting('master_sound_volume', 0.5);
    set_volume(loaded_vol);
    $("#volume-slider").val(loaded_vol);

    resume_audio=async ()=>{
        try {
            await audioContext.resume();  
        }
        catch(e) {
            console.error(e); console.error("try to setup audio from scratch...");
            try {
                await audioContext.close();
            }
            finally
            {
                audio_connected=false; 
                audioContext=new AudioContext();
            }
        }
    }

    connect_audio_processor = async () => {
        if(audioContext.state !== 'running') {
            await resume_audio();  
        }
        if(audio_connected==true)
            return; 
        if(audioContext.state !== 'running') {
            return;  
        }
        audio_connected=true;
        wasm_set_sample_rate(audioContext.sampleRate);
        console.log("try connecting audioprocessor");           
        await audioContext.audioWorklet.addModule('js/vc64_audioprocessor.js');
        worklet_node = new AudioWorkletNode(audioContext, 'vc64_audioprocessor', {
            outputChannelCount: [1],
            numberOfInputs: 0,
            numberOfOutputs: 1
        });
        
        let sound_buffer_address = wasm_get_sound_buffer_address();
        soundbuffer_slots_mono=[];
        for(slot=0;slot<12;slot++)
        {
            soundbuffer_slots_mono.push(
                new Float32Array(Module.HEAPF32.buffer, sound_buffer_address+(slot*1024)*4, 1024));
        }

        empty_shuttles=new RingBuffer(12);
        worklet_node.port.onmessage = (msg) => {
            //direct c function calls with preceeding Module._ are faster than cwrap
            let samples=Module._wasm_copy_into_sound_buffer();
            let shuttle = msg.data;
            if(samples<1024)
            {
                if(shuttle!="empty")
                {
                    empty_shuttles.write(shuttle);
                }
                return;
            }
            let slot=0;
            while(samples>=1024)
            {
                if(shuttle == null || shuttle=="empty")
                {
                    if(!empty_shuttles.isEmpty())
                    {
                        shuttle = empty_shuttles.read();
                    }
                    else
                    {
                      return;
                    }
                }
                shuttle.set(soundbuffer_slots_mono[slot++]);
                worklet_node.port.postMessage(shuttle, [shuttle.buffer]);
                shuttle=null;
                samples-=1024;
            }            
        };
        worklet_node.port.onmessageerror = (msg) => {
            console.log("audio processor error:"+msg);
        };

        gainNode = audioContext.createGain();
        gainNode.gain.value = current_sound_volume;
        worklet_node.connect(gainNode);
        gainNode.connect(audioContext.destination);
//        worklet_node.connect(audioContext.destination);        
    }

    connect_audio_processor_stereo = async () => {
        if(audioContext.state !== 'running') {
            await resume_audio();  
        }
        if(audio_connected==true)
            return; 
        if(audioContext.state !== 'running') {
            return;  
        }
        audio_connected=true;
        wasm_set_sample_rate(audioContext.sampleRate);
        console.log("try connecting audioprocessor");           
        await audioContext.audioWorklet.addModule('js/vc64_audioprocessor_stereo.js');
        worklet_node_stereo = new AudioWorkletNode(audioContext, 'vc64_audioprocessor_stereo', {
            outputChannelCount: [2],
            numberOfInputs: 0,
            numberOfOutputs: 1
        });

        let sound_buffer_address = wasm_get_sound_buffer_address();
        soundbuffer_slots_stereo=[];
        for(slot=0;slot<12;slot++)
        {
            soundbuffer_slots_stereo.push(
                new Float32Array(Module.HEAPF32.buffer, sound_buffer_address+(slot*2048)*4, 2048));
        }

        empty_shuttles_stereo=new RingBuffer(16);
        worklet_node_stereo.port.onmessage = (msg) => {
            //direct c function calls with preceeding Module._ are faster than cwrap
            let samples=Module._wasm_copy_into_sound_buffer_stereo();
            let shuttle = msg.data;
            if(samples<1024)
            {
                if(shuttle!="empty")
                {
                    empty_shuttles_stereo.write(shuttle);
                }
                return;
            }
            let slot=0;
            while(samples>=1024) 
            {
                if(shuttle == null || shuttle=="empty")
                {
                    if(!empty_shuttles_stereo.isEmpty())
                    {
                        shuttle = empty_shuttles_stereo.read();
                    }
                    else
                    {
                      return;
                    }
                }
                shuttle.set(soundbuffer_slots_stereo[slot++]);
                worklet_node_stereo.port.postMessage(shuttle, [shuttle.buffer]);
                shuttle=null;
                samples-=1024;
            }            
        };
        worklet_node_stereo.port.onmessageerror = (msg) => {
            console.log("audio processor error:"+msg);
        };
        gainNode = audioContext.createGain();
        gainNode.gain.value = current_sound_volume;
        worklet_node_stereo.connect(gainNode);
        gainNode.connect(audioContext.destination);
//        worklet_node_stereo.connect(audioContext.destination);        
    }


//---
    config_audio_thread = async function (audio_device)
    {
        //close current device
        Module._wasm_close_main_thread_audio();     

        if(typeof worklet_node !== 'undefined')
        {
            audio_connected=false;
            worklet_node.port.postMessage(null);
            worklet_node.disconnect();
            document.removeEventListener('click', connect_audio_processor, false);                
        }

        if(typeof worklet_node_stereo !== 'undefined')
        {
            worklet_node_stereo.port.postMessage(null);
            worklet_node_stereo.disconnect();
            document.removeEventListener('click', connect_audio_processor_stereo, false);
        }
        audio_connected=false;

        current_audio_device=audio_device;

        //open and unlock new audio device

        if(current_audio_device == 'main thread (mono)')
        {
            Module._wasm_open_main_thread_audio();
        }
        unlock_WebAudio();
        add_unlock_user_action();
    }

    add_unlock_user_action = function(){
         //in case we did go suspended reinstall the unlock events
        document.removeEventListener('click',unlock_WebAudio);
        document.addEventListener('click',unlock_WebAudio, false);

        //iOS safari does not bubble click events on canvas so we add this extra event handler here
        let canvas=document.getElementById('canvas');
        canvas.removeEventListener('touchstart',unlock_WebAudio);
        canvas.addEventListener('touchstart',unlock_WebAudio,false);    
    }
    remove_unlock_user_action = function(){
        //if it runs we dont need the unlock handlers, has no effect when handler already removed 
        document.removeEventListener('click',unlock_WebAudio);
        document.getElementById('canvas').removeEventListener('touchstart',unlock_WebAudio);
    }

    //when app becomes hidden/visible
    window.addEventListener("visibilitychange", async () => {
        if(document.visibilityState == "hidden") {
            console.log("visibility=hidden");
            let is_full_screen=document.fullscreenElement!=null;
            console.log("fullscreen="+is_full_screen);
            if(!is_full_screen)
            {//safari bug: goes visible=hidden when entering fullscreen
             //in that case don't disable the audio 
                try { audioContext.suspend(); } catch(e){ console.error(e);}
            }
        }
        else
        {
            try { await unlock_WebAudio(); } catch(e){ console.error(e);}
            add_unlock_user_action();
        }
        if(document.visibilityState === "visible" && wakeLock !== null)
        {
            if(is_running())
            {
//                alert("req wakelock again "+document.visibilityState);
                set_wake_lock(true);
            }
        }
    });

    //when app is going to background
    window.addEventListener('blur', ()=>{
        Module._wasm_keyboard_reset();
        //reset touch on virtual joystick
 //       if(v_joystick !==null) v_joystick._touchIdx=null;
 //       if(v_fire !==null) v_fire._touchIdx=null;
    });

    //when app is coming to foreground again
    window.addEventListener('focus', async ()=>{ 
        Module._wasm_keyboard_reset();
        //reset touch on virtual joystick
//        if(v_joystick !==null) v_joystick._touchIdx=null;
//        if(v_fire !==null) v_fire._touchIdx=null;
    });
    

    audioContext.onstatechange = () => {
        let state = audioContext.state;
        console.error(`audioContext.state=${state}`);
        if(state!=='running'){
            add_unlock_user_action();
        }
        else {
            remove_unlock_user_action();
        }
    }
    unlock_WebAudio=async function() {
        try { 
            if(current_audio_device == 'main thread (mono)')
            {
                if(audioContext.state !== 'running') {
                    //for floppy drive sounds
                    await audioContext.resume();  
                }
            }
            else if(current_audio_device == 'mono audio')
            {
                await connect_audio_processor();
            }
            else if(current_audio_device == 'stereo audio')
            {
                await connect_audio_processor_stereo();
            }
            if(audioContext.state==="running")
            {
                remove_unlock_user_action();
            }
        } 
        catch(e){ console.error(e);}
    }

    set_audio_device = function (audio_device) {
        if(audio_device !== 'mono audio' && audio_device !== 'stereo audio')
        {
            audio_device='mono audio';
        }
        $("#button_audio_device").text(audio_device);
        config_audio_thread(audio_device);
    }
    $('#choose_audio_device a').click(function () 
    {
        let audio_device=$(this).text();
        set_audio_device(audio_device);
        save_setting('audio_device',audio_device)
        $("#modal_settings").focus();
    });    
    set_audio_device(load_setting('audio_device', 'mono audio'));


//----

    get_audio_context=function() {
        if(current_audio_device.includes('main thread'))
        {
            if (typeof Module === 'undefined'
            || typeof Module.SDL2 == 'undefined'
            || typeof Module.SDL2.audioContext == 'undefined')
            {
                return null;
            }
            else
            {
                return Module.SDL2.audioContext;
            }
        }
        else
            return audioContext;
    }
    window.addEventListener('message', event => {
        if(event.data == "poll_state")
        {
            window.parent.postMessage({ msg: 'render_run_state', value: is_running(), is_warping:  Module._wasm_is_warping() },"*");
            var audio_context=get_audio_context(); 
            window.parent.postMessage({ msg: 'render_current_audio_state', 
                value: audio_context == null ? 'suspended' : audio_context.state},"*"); 
        }
        else if(event.data == "button_run()")
        {
            if(required_roms_loaded)
            {
                $('#button_run').click();
                window.parent.postMessage({ msg: 'render_run_state', value: is_running(), is_warping:  Module._wasm_is_warping() },"*");
            }
        }
        else if(event.data == "toggle_audio()")
        {
            var context = get_audio_context();
            if (context !=null)
            {
                if(context.state == 'suspended') {
                    context.resume();
                }
                else if (context.state == 'running')
                {
                    context.suspend();
                }
            }
            window.parent.postMessage({ msg: 'render_current_audio_state', 
                value: context == null ? 'suspended' : context.state },"*");
        }
        else if(event.data == "open_zip()")
        {
            var modal = $('#modal_file_slot'); 
            if(modal.is(':visible'))
            {
                modal.modal('hide');
            }
            else
            {
                if(required_roms_loaded && last_zip_archive_name != null)
                {
                    file_slot_file_name = last_zip_archive_name;
                    file_slot_file = last_zip_archive;
                    configure_file_dialog();
                }
            }
        }
        else if(event.data.cmd == "script")
        {
            let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
            let js_script_function=new AsyncFunction(event.data.script);
            js_script_function();
        }
        else if(event.data.cmd == "load")
        {
            function copy_to_local_storage(romtype, byteArray)
            {
                if(romtype != "")
                {
                    local_storage_set(romtype+".bin", ToBase64(byteArray));
                    load_roms(false);
                }
            }

            let with_reset=false;
            //check if any roms should be preloaded first... 
            if(event.data.floppy_rom !== undefined)
            {
                let byteArray = event.data.floppy_rom;
                let rom_type=wasm_loadfile("1541.rom", byteArray, byteArray.byteLength);
                copy_to_local_storage(rom_type, byteArray);
                with_reset=true;
            }
            if(event.data.basic_rom !== undefined)
            {
                let byteArray = event.data.basic_rom;
                let rom_type=wasm_loadfile("basic.rom", byteArray, byteArray.byteLength);
                copy_to_local_storage(rom_type, byteArray);
                with_reset=true;
            }
            if(event.data.kernal_rom !== undefined)
            {
                let byteArray = event.data.kernal_rom;
                let rom_type=wasm_loadfile("kernal.rom", byteArray, byteArray.byteLength);
                copy_to_local_storage(rom_type, byteArray);
                with_reset=true;
            }
            if(event.data.charset_rom !== undefined)
            {
                let byteArray = event.data.charset_rom;
                let rom_type=wasm_loadfile("charset.rom", byteArray, byteArray.byteLength);
                copy_to_local_storage(rom_type, byteArray);
                with_reset=true;
            }
            if(with_reset){
                wasm_reset();
                reset_keyboard();
            }
            if(event.data.file_name !== undefined && event.data.file !== undefined)
            {
                file_slot_file_name = event.data.file_name;
                file_slot_file = event.data.file;
                //if there is still a zip file in the fileslot, eject it now
                $("#button_eject_zip").click();
                configure_file_dialog(reset=false);
            }
        }
    }); 
    
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
    
    //--- mouse pointer lock
    canvas = document.querySelector('canvas');
    canvas.requestPointerLock = canvas.requestPointerLock ||
                                canvas.mozRequestPointerLock;

    document.exitPointerLock = document.exitPointerLock ||
                            document.mozExitPointerLock;

    has_pointer_lock=false;
    try_to_lock_pointer=0;
    has_pointer_lock_fallback=false;
    window.last_mouse_x=0;
    window.last_mouse_y=0;

    is_pointer_lock_supported = 'pointerLockElement' in document ||
            'requestPointerLock' in Element.prototype;

    request_pointerlock = async function() {
        if(!is_pointer_lock_supported)
        {
            if(!has_pointer_lock_fallback)
            {
                add_pointer_lock_fallback();      
            }
            return;
        }
        if(!has_pointer_lock && try_to_lock_pointer <20)
        {
            try_to_lock_pointer++;
            try {
                if(has_pointer_lock_fallback) {remove_pointer_lock_fallback();}
                await canvas.requestPointerLock();
                try_to_lock_pointer=0;
            } catch (error) {
                await sleep(100);
                await request_pointerlock();                
            }
        }
    };
    
    window.add_pointer_lock_fallback=()=>{
        document.addEventListener("mousemove", updatePosition_fallback, false); 
        document.addEventListener("mousedown", mouseDown, false);
        document.addEventListener("mouseup", mouseUp, false);
        has_pointer_lock_fallback=true;
    };
    window.remove_pointer_lock_fallback=()=>{
        document.removeEventListener("mousemove", updatePosition_fallback, false); 
        document.removeEventListener("mousedown", mouseDown, false);
        document.removeEventListener("mouseup", mouseUp, false);
        has_pointer_lock_fallback=false;
    };
    document.addEventListener('pointerlockerror', add_pointer_lock_fallback, false);

    // Hook pointer lock state change events for different browsers
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

    function lockChangeAlert() {
        if (document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas) {
            has_pointer_lock=true;
//            console.log('The pointer lock status is now locked');
            document.addEventListener("mousemove", updatePosition, false);
            document.addEventListener("mousedown", mouseDown, false);
            document.addEventListener("mouseup", mouseUp, false);

        } else {
//            console.log('The pointer lock status is now unlocked');  
            document.removeEventListener("mousemove", updatePosition, false);
            document.removeEventListener("mousedown", mouseDown, false);
            document.removeEventListener("mouseup", mouseUp, false);

            has_pointer_lock=false;
        }
    }
    var mouse_port=1;
    function updatePosition(e) {
        if(e.movementX != 0 || e.movementY !=0)
            Module._wasm_mouse(mouse_port,e.movementX,e.movementY);
    }
    function updatePosition_fallback(e) {
        let movementX=e.screenX-window.last_mouse_x;
        let movementY=e.screenY-window.last_mouse_y;
        window.last_mouse_x=e.screenX;
        window.last_mouse_y=e.screenY;
        let border_speed=4;
        let border_pixel=2;
    
        if(e.screenX<=border_pixel)
          movementX=-border_speed;
        if(e.screenX>=window.innerWidth-border_pixel)
          movementX=border_speed;
        if(e.screenY<=border_pixel)
          movementY=-border_speed;
        if(e.screenY>=window.innerHeight-border_pixel)
          movementY=border_speed;        
        Module._wasm_mouse(mouse_port,movementX*8,movementY*8);  
    }
    function mouseDown(e) {
        Module._wasm_mouse_button(mouse_port,e.which, 1/* down */);
    }
    function mouseUp(e) {
        Module._wasm_mouse_button(mouse_port,e.which, 0/* up */);
    }

    //--
    mouse_touchpad_port=1;
    mouse_touchpad_move_touch=null;
    mouse_touchpad_left_button_touch=null;
    mouse_touchpad_right_button_touch=null;

    function emulate_mouse_touchpad_start(e)
    {
        for (var i=0; i < e.changedTouches.length; i++) {
            let touch = e.changedTouches[i];
        
            if(mouse_touchpad_pattern=='mouse touchpad')
            {
                let mouse_touchpad_move_area= touch.clientX > window.innerWidth/10 &&
                touch.clientX < window.innerWidth-window.innerWidth/10;
                let mouse_touchpad_button_area=!mouse_touchpad_move_area;

                if(mouse_touchpad_button_area)
                {
                    let left_button = touch.clientX < window.innerWidth/10;
                    if(left_button)
                    {
                        mouse_touchpad_left_button_touch=touch; 
                        Module._wasm_mouse_button(mouse_touchpad_port,1, 1/* down */);                
                    }
                    else
                    {
                        mouse_touchpad_right_button_touch=touch; 
                        Module._wasm_mouse_button(mouse_touchpad_port,3, 1/* down */);                
                    }
                }
                else
                {
                    mouse_touchpad_move_touch=touch;
                }
            }
            else if(mouse_touchpad_pattern=='mouse touchpad2')
            {
                let mouse_touchpad_move_area= touch.clientX < window.innerWidth/2;
                let mouse_touchpad_button_area=!mouse_touchpad_move_area;

                if(mouse_touchpad_button_area)
                {
                    let left_button = touch.clientY >= window.innerHeight/2;
                    if(left_button)
                    {
                        mouse_touchpad_left_button_touch=touch; 
                        Module._wasm_mouse_button(mouse_touchpad_port,1, 1/* down */);                
                    }
                    else
                    {
                        mouse_touchpad_right_button_touch=touch; 
                        Module._wasm_mouse_button(mouse_touchpad_port,3, 1/* down */);                
                    }
                }
                else
                {
                    mouse_touchpad_move_touch=touch;
                }
            }

        }
    }
    function emulate_mouse_touchpad_move(e)
    {
        for (var i=0; i < e.changedTouches.length; i++) {
            let touch = e.changedTouches[i];
            if(mouse_touchpad_move_touch!=null && 
                mouse_touchpad_move_touch.identifier== touch.identifier)
            {
                Module._wasm_mouse(
                    mouse_touchpad_port,
                    (touch.clientX-mouse_touchpad_move_touch.clientX)*8,
                    (touch.clientY-mouse_touchpad_move_touch.clientY)*8
                );
                mouse_touchpad_move_touch=touch;
            }
        }
    }
    function emulate_mouse_touchpad_end(e)
    {
        for (var i=0; i < e.changedTouches.length; i++) {
            let touch = e.changedTouches[i];
            if(mouse_touchpad_move_touch!=null && 
                mouse_touchpad_move_touch.identifier== touch.identifier)
            {
                mouse_touchpad_move_touch=null;
            }
            else if(mouse_touchpad_left_button_touch != null && 
                mouse_touchpad_left_button_touch.identifier == touch.identifier)
            {
                Module._wasm_mouse_button(mouse_touchpad_port,1, 0/* down */);
                mouse_touchpad_left_button_touch=null;
            }
            else if(mouse_touchpad_right_button_touch != null && 
                mouse_touchpad_right_button_touch.identifier == touch.identifier)
            {
                Module._wasm_mouse_button(mouse_touchpad_port,3, 0/* down */);
                mouse_touchpad_right_button_touch=null;
            }
        }
    }
    //check if call_param_mouse is set
    call_param_mouse=false;
    if(call_param_mouse)
    {
        if(call_param_touch==true)
        {
            port1="mouse touchpad2";
            $('#port1').val(port1);
            mouse_touchpad_pattern=port1;
            mouse_touchpad_port=1;
            document.addEventListener('touchstart',emulate_mouse_touchpad_start, false);
            document.addEventListener('touchmove',emulate_mouse_touchpad_move, false);
            document.addEventListener('touchend',emulate_mouse_touchpad_end, false);
            if(port2=="touch")
            {
                port2="none";
                $('#port2').val(port2);
            }    
        }
        else
        { 
            port1="mouse";
            $('#port1').val(port1);
            canvas.addEventListener('click', request_pointerlock);
        }
    }
    //--

    installKeyboard();
    $("#button_keyboard").click(function(){
        setTimeout( scaleVMCanvas, 500);
        setTimeout( hide_all_tooltips, 1000);
    });



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
    symbolic_mapping_switch = $('#symbolic_mapping_switch');
    use_symbolic_map=load_setting('use_symbolic_map', true);
    symbolic_mapping_switch.prop('checked', use_symbolic_map);
    symbolic_mapping_switch.change( function() {
        use_symbolic_map=this.checked;
        save_setting('use_symbolic_map', use_symbolic_map);
    });

//----
    auto_selecting_app_title_switch = $('#auto_selecting_app_title_switch');
    auto_selecting_app_title=load_setting('auto_selecting_app_title', true);
    auto_selecting_app_title_switch.prop('checked', auto_selecting_app_title);
    auto_selecting_help = ()=>{
        if(auto_selecting_app_title)
            {
                $("#auto_select_on_help").show();
                $("#auto_select_off_help").hide();
            }
            else
            {
                $("#auto_select_on_help").hide();
                $("#auto_select_off_help").show();
            }    
    }
    auto_selecting_help();


    auto_selecting_app_title_switch.change( function() {
        auto_selecting_app_title=this.checked;
        save_setting('auto_selecting_app_title', auto_selecting_app_title);
        auto_selecting_help();
    });
//----
    movable_action_buttons_in_settings_switch = $('#movable_action_buttons_in_settings_switch');
    movable_action_buttons=load_setting('movable_action_buttons', true);

    movable_action_buttons_in_settings_switch.prop('checked', movable_action_buttons);
    movable_action_buttons_in_settings_switch.change( function() {
        movable_action_buttons=this.checked;
        install_custom_keys();
        save_setting('movable_action_buttons', movable_action_buttons);
        $('#move_action_buttons_switch').prop('checked',movable_action_buttons);
        set_move_action_buttons_label();
    });

    $('#move_action_buttons_switch').prop('checked',movable_action_buttons);

    let set_move_action_buttons_label=()=>{
        $('#move_action_buttons_label').html(
            movable_action_buttons ? 
            `Once created, you can <span>move any 'action button' by dragging</span>… A <span>long press will enter 'edit mode'</span>… While 'moveable action buttons' is switched on, <span>scripts can not detect release</span> state (to allow this, you must disable the long press gesture by turning 'moveable action buttons' off)`
            :
            `All <span>'action button' positions are now locked</span>… <span>scripts are able to trigger actions when the button is released</span>… <span>long press edit mode is disabled</span> (instead use the <span>+</span> from the top menu bar and choose any buttons from the list to edit)`
        );
        $('#move_action_buttons_label_settings').html(
            movable_action_buttons ? 
            `long press action button to enter edit mode. movable by dragging. action scripts are unable to detect buttons release state.`
            :
            `action button positions locked. action scripts can detect release state. Long press edit gesture disabled, use <span>+</span> from the top menu bar and choose any buttons from list to edit`
        );
    }
    set_move_action_buttons_label();
    $('#move_action_buttons_switch').change( 
        ()=>{
                movable_action_buttons=!movable_action_buttons;
                set_move_action_buttons_label();
                install_custom_keys();
                movable_action_buttons_in_settings_switch.prop('checked', movable_action_buttons);
                save_setting('movable_action_buttons', movable_action_buttons);
            }
    ); 


//----

  let set_vbk_choice = function (choice) {
        $(`#button_vbk_touch`).text('keycap touch behaviour='+choice);
        current_vbk_touch=choice;
        save_setting("vbk_touch",choice);   

        for(el of document.querySelectorAll(".vbk_choice_text"))
        {
            el.style.display="none";
        }
        document.getElementById(choice.replace(" ","_").replace(" ","_")+"_text").style.display="inherit";
    }
    current_vbk_touch=load_setting("vbk_touch", "mix of both");
    set_vbk_choice(current_vbk_touch);

    $(`#choose_vbk_touch a`).click(function () 
    {
        let choice=$(this).text();
        set_vbk_choice(choice);
        $("#modal_settings").focus();
    });
//---
let set_vjoy_choice = function (choice) {
    $(`#button_vjoy_touch`).text('positioning='+choice);
    current_vjoy_touch=choice;
    
    let need_re_register=false;
    if(v_joystick != null)
    {
        need_re_register=true;
        unregister_v_joystick()
    }

    if(v_joystick != null)
    {
        v_joystick._stationaryBase=false;    
    }
    if(choice == "base moves")
    {
        stationaryBase = false;
        fixed_touch_joystick_base=false;
    }
    else if(choice == "base fixed on first touch")
    {
        stationaryBase = false;
        fixed_touch_joystick_base=true;
    }
    else if(choice.startsWith("stationary"))
    {
        stationaryBase = true;
        fixed_touch_joystick_base=true;
    }
    if(need_re_register)
    {
        register_v_joystick()
    }

    save_setting("vjoy_touch",choice);   

    for(el of document.querySelectorAll(".vjoy_choice_text"))
    {
        el.style.display="none";
    }
    let text_label=document.getElementById(choice.replaceAll(" ","_")+"_text");
    if(text_label !== null)
    {
        text_label.style.display="inherit";
    }
}
current_vjoy_touch=load_setting("vjoy_touch", "base moves");
set_vjoy_choice(current_vjoy_touch);

$(`#choose_vjoy_touch a`).click(function () 
{
    let choice=$(this).text();
    set_vjoy_choice(choice);
    $("#modal_settings").focus();
});
//---
set_vjoy_dead_zone(load_setting('vjoy_dead_zone', 14));
function set_vjoy_dead_zone(vjoy_dead_zone) {
    rest_zone=vjoy_dead_zone;
    $("#button_vjoy_dead_zone").text(`virtual joysticks dead zone=${vjoy_dead_zone}`);
}
$('#choose_vjoy_dead_zone a').click(function () 
{
    var vjoy_dead_zone=$(this).text();
    set_vjoy_dead_zone(vjoy_dead_zone);
    save_setting('vjoy_dead_zone',vjoy_dead_zone);
    $("#modal_settings").focus();
});

//--
set_keycap_size(load_setting('keycap_size', '1.00'));
function set_keycap_size(keycap_size) {
    document.querySelector(':root').style.setProperty('--keycap_zoom', keycap_size);
    $("#button_keycap_size").text(`keycap size=${keycap_size}`);
}
$('#choose_keycap_size a').click(function () 
{
    var keycap_size=$(this).text();
    set_keycap_size(keycap_size);
    save_setting('keycap_size',keycap_size);
    $("#modal_settings").focus();
});
//--
set_keyboard_bottom_margin(load_setting('keyboard_bottom_margin_', 'auto'));
function set_keyboard_bottom_margin(keyboard_bottom_margin) {
    document.querySelector(':root').style.
        setProperty('--keyboard_bottom_margin', 
            keyboard_bottom_margin==='auto' ? 'env(safe-area-inset-bottom)':keyboard_bottom_margin);
    $("#button_keyboard_bottom_margin").text(`keyboard bottom margin=${keyboard_bottom_margin}`);
}
$('#choose_keyboard_bottom_margin a').click(function () 
{
    var keyboard_bottom_margin=$(this).text();
    set_keyboard_bottom_margin(keyboard_bottom_margin);
    save_setting('keyboard_bottom_margin_',keyboard_bottom_margin);
    $("#modal_settings").focus();
});
//----
set_keyboard_sound_volume(load_setting('keyboard_sound_volume', '50'));
function set_keyboard_sound_volume(volumne) {
    keyboard_sound_volume = 0.01 * volumne;
    $("#button_keyboard_sound_volume").text(`key press sound volume=${volumne}%`);
}
$('#choose_keyboard_sound_volume a').click(function () 
{
    var sound_volume=$(this).text();
    set_keyboard_sound_volume(sound_volume);
    save_setting('keyboard_sound_volume',sound_volume);
    $("#modal_settings").focus();
});
//----
set_keyboard_transparency(load_setting('keyboard_transparency', '0'));
function set_keyboard_transparency(value) {
    document.querySelector(':root').style.setProperty('--keyboard_opacity', `${100-value}%`);
    $("#button_keyboard_transparency").text(`keyboard transparency=${value}%`);
}
$('#choose_keyboard_transparency a').click(function () 
{
    let val=$(this).text();
    set_keyboard_transparency(val);
    save_setting('keyboard_transparency',val);
    $("#modal_settings").focus();
});
//---
key_haptic_feedback_switch = $('#key_haptic_feedback');
set_key_haptic_feedback = function(value){
    if ('vibrate' in navigator) {
        key_haptic_feedback = value;
        $('#key_haptic_feedback').prop('checked', value);
    } else {
        key_haptic_feedback=false;
        key_haptic_feedback_switch.prop('disabled', true);
    }
}

set_key_haptic_feedback(load_setting('key_haptic_feedback', true));
key_haptic_feedback_switch.change( function() {
    save_setting('key_haptic_feedback', this.checked);
    set_key_haptic_feedback(this.checked);
});

//--
let set_csdb_count = function (choice) {
    $(`#button_csdb_count`).text('each chart category shows = '+choice);
    current_csdb_count=choice;
    get_data_collector("csdb").loaded_feeds=null; //reset feed cache
    save_setting("csdb_count",choice);   
}
current_csdb_count=load_setting("csdb_count", "25");
set_csdb_count(current_csdb_count);

$(`#choose_csdb_count a`).click(function () 
{
    let choice=$(this).text();
    set_csdb_count(choice);
    $("#modal_settings").focus();
});


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
wasm_set_borderless(use_borderless);
borderless_switch.change( function() {
    wasm_set_borderless(this.checked);
    save_setting('borderless', this.checked);
});

//------


drive_power_save_switch = $('#OPT_DRV_POWER_SAVE');
var use_drive_power_save=load_setting('OPT_DRV_POWER_SAVE', true);
drive_power_save_switch.prop('checked', use_drive_power_save);
wasm_configure('OPT_DRV_POWER_SAVE',use_drive_power_save);
drive_power_save_switch.change( function() {
    wasm_configure('OPT_DRV_POWER_SAVE',this.checked);
    save_setting('OPT_DRV_POWER_SAVE', this.checked);
});



vic_power_save_switch = $('#OPT_VIC_POWER_SAVE');
var use_vic_power_save=load_setting('OPT_VIC_POWER_SAVE', true);
vic_power_save_switch.prop('checked', use_vic_power_save);
wasm_configure('OPT_VIC_POWER_SAVE',use_vic_power_save);
vic_power_save_switch.change( function() {
    wasm_configure('OPT_VIC_POWER_SAVE',this.checked);
    save_setting('OPT_VIC_POWER_SAVE', this.checked);
});

sid_power_save_switch = $('#OPT_SID_POWER_SAVE');
var use_sid_power_save=load_setting('OPT_SID_POWER_SAVE', true);
sid_power_save_switch.prop('checked', use_sid_power_save);
wasm_configure('OPT_SID_POWER_SAVE',use_sid_power_save);
sid_power_save_switch.change( function() {
    wasm_configure('OPT_SID_POWER_SAVE',this.checked);
    save_setting('OPT_SID_POWER_SAVE', this.checked);
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
  // create a reference for the wake lock
wakeLock = null;


check_wake_lock = async () => {
    if(is_running())
    {
        if(wakeLock != null)
        {
//            alert("req");
            requestWakeLock();
        }
    }
    else
    {
        if(wakeLock != null)
        {
//            alert("release");
            wakeLock.release();
        }
    }
}

// create an async function to request a wake lock
requestWakeLock = async () => {
    try {
      wakeLock = await navigator.wakeLock.request('screen');

      // change up our interface to reflect wake lock active
      $("#wake_lock_status").text("(wake lock active, app will stay awake, no auto off)");
      wake_lock_switch.prop('checked', true);

      // listen for our release event
      wakeLock.onrelease = function(ev) {
        console.log(ev);
      }
      wakeLock.addEventListener('release', () => {
        // if wake lock is released alter the button accordingly
        if(wakeLock==null)
            $("#wake_lock_status").text(`(no wake lock, system will probably auto off and sleep after a while)`);
        else
            $("#wake_lock_status").text(`(wake lock released while pausing, system will probably auto off and sleep after a while)`);
        wake_lock_switch.prop('checked', false);

      });
    } catch (err) {
      // if wake lock request fails - usually system related, such as battery
      $("#wake_lock_status").text(`(no wake lock, system will probably auto off and sleep after a while). ${err.name}, ${err.message}`);
      wake_lock_switch.prop('checked', false);
      console.error(err);
//      alert(`error while requesting wakelock: ${err.name}, ${err.message}`);
    }
}

set_wake_lock = (use_wake_lock)=>{
    let is_supported=false;
    if ('wakeLock' in navigator) {
        is_supported = true;
    } else {
        wake_lock_switch.prop('disabled', true);
        $("#wake_lock_status").text("(wake lock is not supported on this browser, your system will decide when it turns your device off)");
    }
    if(is_supported && use_wake_lock)
    {
        requestWakeLock();
    }
    else if(wakeLock != null)
    {
        let current_wakelock=wakeLock;
        wakeLock = null;
        current_wakelock.release();
    }
}

wake_lock_switch = $('#wake_lock_switch');
let use_wake_lock=load_setting('wake_lock', false);
set_wake_lock(use_wake_lock);
wake_lock_switch.change( function() {
    let use_wake_lock  = this.checked;
    set_wake_lock(use_wake_lock);
    save_setting('wake_lock', this.checked);
});
//---
fullscreen_switch = $('#button_fullscreen');
if(document.fullscreenEnabled)
{
    fullscreen_switch.show();
    svg_fs_on=`<path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>`;
    $('#svg_fullscreen').html(svg_fs_on);

    addEventListener("fullscreenchange", () => {
        $('#svg_fullscreen').html(
            document.fullscreenElement?
            `<path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/>`:
            svg_fs_on
        );
        $('#svg_fullscreen').attr("data-original-title",
            document.fullscreenElement? "exit fullscreen":"fullscreen"
        );
    });

    fullscreen_switch.click( ()=>{	
        if(!document.fullscreenElement)
            document.documentElement.requestFullscreen({navigationUI: "hide"});
        else
            document.exitFullscreen();            
    });
}
else
{
    fullscreen_switch.hide();
}
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
    const GLOBAL_SPRITE_BIT= 0x1100;

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
    load_console=function () { var script = document.createElement('script'); script.src="js/eruda.js"; document.body.appendChild(script); script.onload = function () { eruda.init(
    {
        defaults: {
            displaySize: 50,
            transparency: 0.9,
            theme: load_setting('dark_switch', true) ? 'dark':'light'
        }
        }) } 
    }

    live_debug_output=load_setting('live_debug_output', false);
    wasm_configure("log_on", live_debug_output.toString());
    $("#cb_debug_output").prop('checked', live_debug_output);
    if(live_debug_output)
    {
        load_console();
     //   $("#output_row").show(); 
        $("#output_row").hide(); 
    }
    else
    {
//        eruda.destroy();
        $("#output_row").hide(); 
    }

    $("#cb_debug_output").change( function() {
        live_debug_output=this.checked;
        wasm_configure("log_on",live_debug_output.toString());
        save_setting('live_debug_output', this.checked);
        if(this.checked)
        {
           load_console();
           //$("#output_row").show();
        }
        else
        {
           eruda.destroy();
        //    $("#output_row").hide();
        }
        $("#output_row").hide();
    });
//---    
    $('#modal_reset').keydown(event => {
        if(event.key === "Enter")
        {
            $( "#button_reset_confirmed" ).click();                        
        }
        return true;
    }
    );
    document.getElementById('button_reset').onclick = function() {
        if(Module._wasm_expansion_port_info()) $("#button_detach_cartridge").show();
        else $("#button_detach_cartridge").hide();
        $("#modal_reset").modal('show');
    }
    document.getElementById('button_soft_reset_confirmed').onclick = function() {
        Module._wasm_soft_reset();
        reset_keyboard();

        if(!is_running())
        {
            $("#button_run").click();
        }
        $("#modal_reset").modal('hide').blur();
    }
    document.getElementById('button_reset_confirmed').onclick = function() {
        Module._wasm_hard_reset();
        reset_keyboard();

        if(!is_running())
        {
            $("#button_run").click();
        }
        $("#modal_reset").modal('hide').blur();
    }
    document.getElementById('button_detach_cartridge').onclick = function() {
        Module._wasm_detach_cartridge();
        reset_keyboard();

        if(!is_running())
        {
            $("#button_run").click();
        }
        $("#modal_reset").modal('hide').blur();
    }
//---
    running=true;
    emulator_currently_runs=false;
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
        check_wake_lock(); 
        //document.getElementById('canvas').focus();
    });

    $("#button_ff").click(()=> {
        action('toggle_warp'); 
        hide_all_tooltips();
    });

    $('#modal_file_slot').on('hidden.bs.modal', function () {
        $("#filedialog").val(''); //clear file slot after file has been loaded
    });

    $( "#modal_file_slot" ).keydown(event => {
            if(event.key === "Enter" && $("#button_insert_file").attr("disabled")!=true)
            {
                insert_file();
               // $( "#button_insert_file" ).click();                        
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
        reset_before_load = $("#auto_reset").prop('checked');

        $('#modal_file_slot').modal('hide');

        var execute_load = async function(){
            var filetype = wasm_loadfile(file_slot_file_name, file_slot_file, file_slot_file.byteLength);

            // Update current_side based on the mounted file
            current_side = get_side_number(file_slot_file_name);

            if(auto_selecting_app_title)
            {
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
                        for(let param_button of call_param_buttons)
                        {
                            custom_keys.push(param_button);
                        }
                        install_custom_keys();
                    }
                );
            }
            if(call_param_dialog_on_disk == false)
            {//loading is probably done by scripting
            }
            else if(do_auto_load)
            {
                if(file_slot_file_name.endsWith('.tap'))
                {
                    //shift + runStop
                    wasm_auto_type("\nload\n");
                    //action("'Enter=>30ms=>shiftrunstop'");
                    //emit_string(['Enter','ShiftRunStop']);
                    
                    if(do_auto_press_play)
                    {
                        //press play on tape shortly after emitting load command
                        setTimeout(function() {wasm_press_play(); },650);
                    }
/*                  https://github.com/vc64web/virtualc64web/issues/79  
                    if(do_auto_run)
                    {
                        fire_when_no_more_message("MSG_VC1530_PROGRESS",function() {
                            emit_string(['Enter','r','u','n','Enter']);
                        });
                    }
*/
                }
                else
                {                    
                    wasm_auto_type('\nload"*",8,1:\n');
                    if(do_auto_run)
                    {
                        await disk_loading_finished();
                        wasm_auto_type("\nrun:\n");    
                    }
                }
            }
            else if(do_auto_run)
            {
                wasm_auto_type("\nrun:\n");
            }
            if(file_slot_file_name.endsWith('.vc64'))
            {
                $("#button_run").click();
                if(!is_running())
                {
                    $("#button_run").click();
                }    
            }
        };

        if(!is_running())
        {
            $("#button_run").click();
        }
        let kernal_rom=JSON.parse(wasm_rom_info()).kernal;
        var faster_open_roms_installed = kernal_rom.startsWith("M.E.G.A") || kernal_rom.startsWith("Patched");
        
        //the roms differ from cold-start to ready prompt, orig-roms 3300ms and open-roms 250ms   
        var time_since_start=wasm_get_cpu_cycles();
        var time_coldstart_to_ready_prompt = faster_open_roms_installed ? 500000:2700000;
 
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
            //$('#alert_reset').show();
            wasm_reset();
            reset_keyboard();

            var intervall_id = setInterval(() => {  
                var cycles_now= wasm_get_cpu_cycles();
//                console.log("cycles now ="+cycles_now+ " time_coldstart_to_ready_prompt"+time_coldstart_to_ready_prompt+ "  id="+intervall_id);
                if(cycles_now > time_coldstart_to_ready_prompt)
                {
                    clearInterval(intervall_id);
                    execute_load();
            //        $('#alert_reset').hide();
                    reset_before_load=false;
                }
            }, 50);
        }
    }
    
    document.querySelector("#button_insert_file").addEventListener("click",
        (event)=>{event.stopPropagation(); insert_file();}
    )
    //$("#button_insert_file").click(insert_file);
    
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

        let d64_json = wasm_export_disk();
        let d64_obj = JSON.parse(d64_json);
        Module._wasm_delete_disk();
        
        if(d64_obj.size>0)
        {
            $("#button_export_disk").show();
        }
        else
        {
            $("#button_export_disk").hide();
        }
    }
    $('#button_export_disk').click(function() 
    {
        let d64_json = wasm_export_disk();
        let d64_obj = JSON.parse(d64_json);
        let d64_buffer = new Uint8Array(Module.HEAPU8.buffer, d64_obj.address, d64_obj.size);
        let filebuffer = d64_buffer.slice(0,d64_obj.size);
        let blob_data = new Blob([filebuffer], {type: 'application/octet-binary'});
        Module._wasm_delete_disk();
        
        const url = window.URL.createObjectURL(blob_data);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        let app_name = $("#input_app_title").val();
        let extension_pos = app_name.indexOf(".");
        if(extension_pos >=0)
        {
            app_name = app_name.substring(0,extension_pos);
        }
        a.download = app_name+'.d64';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    });

    $('#button_save_snapshot').click(function() 
    {       
        let app_name = $("#input_app_title").val();
        var snapshot_json= wasm_take_user_snapshot();
        var snap_obj = JSON.parse(snapshot_json);
        var snapshot_buffer = new Uint8Array(Module.HEAPU8.buffer, snap_obj.address, snap_obj.size);
   
        //snapshot_buffer is only a typed array view therefore slice, which creates a new array with byteposition 0 ...
        save_snapshot(app_name, snapshot_buffer.slice(0,snap_obj.size));
   
        $("#modal_take_snapshot").modal('hide');
        //document.getElementById('canvas').focus();
    });

    $('#modal_settings').on('show.bs.modal', function() 
    {    
        let traits = JSON.parse(wasm_rom_info());
        if(traits.crt.startsWith("REU"))
        {
            let mem=traits.crt.replace("REU","")/1024;
            mem = mem<1024 ? `${mem} KB`:`${mem/1024} MB` ;
            $("#button_expansion_ram").text("RAM expansion = REU "+mem);
        }
        else if(traits.crt.startsWith("GeoRam"))
        {
          let mem=traits.crt.replace("GeoRam","")/1024;
          mem = mem<1024 ? `${mem} KB`:`${mem/1024} MB` ;
          $("#button_expansion_ram").text("RAM expansion = GeoRAM "+mem);
        }
        else
        {
            $("#button_expansion_ram").text("RAM expansion = none");
        }
        
    });
    //--
    const speed_percentage_text =`Execute the number of frames per host refresh needed to match <span>{0}</span> of the original C64's speed.

The PAL C64 refreshes at 50.125 Hz, which doesn't match the refresh rates of most modern monitors. Similarly, the NTSC C64 runs at 59.826 Hz, which is also slightly off from today's standard.
<br>
This discrepancy can lead to stuttering or jumpy movement, depending on the content being displayed. <br><br> For a smoother video output, consider enabling the <span>vsync</span> option. Vsync synchronizes the emulation with your display's refresh rate, resulting in smoother visuals by adjusting the C64's emulation speed to match the monitor's refresh rate.
    `;
    const vsync_text=" Video output is smoother when using <span>vsync</span>. However, depending on your monitor's refresh rate, the resulting speed may not be exactly 100% of the original C64's speed.";
    speed_text={
        "every 2nd vsync": "Render one C64 frame every second vsync."+vsync_text,
        "vsync":"Render exactly one C64 frame on vsync."+vsync_text,
        "2 frames on vsync":"Render two C64 frames on vsync."+vsync_text,
        "50%":`<span>slow motion</span> ${speed_percentage_text.replace("{0}","50%")}`,
        "75%":`<span>slow motion</span> ${speed_percentage_text.replace("{0}","75%")}`,
        "100%":`<span>original speed</span> ${speed_percentage_text.replace("{0}","100%")}`,
        "120%":`<span>fast</span> ${speed_percentage_text.replace("{0}","120%")}`,
        "160%":`<span>fast</span> ${speed_percentage_text.replace("{0}","160%")}`,
        "200%":`<span>very fast</span> ${speed_percentage_text.replace("{0}","200%")}`
    }

    current_speed=100;
    set_speed = function (new_speed) {
        $("#button_speed").text("speed & frame sync = "+new_speed);
        $('#speed_text').html(speed_text[new_speed]);

        selected_speed = new_speed.replaceAll("%","").replaceAll(" ","");
        if(selected_speed.includes("vsync"))
        {
            let map = {"every2ndvsync":-2,"vsync":1,"2framesonvsync":2};
            selected_speed=map[selected_speed];
        }

        if(selected_speed == 100)
            $('#button_speed_toggle').hide();
        else
            $('#button_speed_toggle').show();
 
        current_speed=100;
        $('#button_speed_toggle').click();

        save_setting('frame_sync', new_speed);
    }
    $('#choose_speed a').click(function () 
    {
        selected_speed=$(this).text();
        set_speed(selected_speed);
        $("#modal_settings").focus();
    });
    
    $('#button_speed_toggle').click(function () 
    {
        hide_all_tooltips();
        if(current_speed==100)
            current_speed=selected_speed;    
        else
            current_speed=100;
     
        $('#button_speed_toggle').html(
            `
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" style="margin-top:-5px" width="1.6em" height="1.6em" fill="currentColor" class="bi bi-speedometer" viewBox="0 0 16 16">
                <path style='opacity:${current_speed == 100 ? 1:1}'  d="M8 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5A.5.5 0 0 1 8 2M3.732 3.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 8a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 7.31A.91.91 0 1 0 8.85 8.569l3.434-4.297a.39.39 0 0 0-.029-.518z"/>
                <path style='opacity:${current_speed == 100 ? 1:1}' fill-rule="evenodd" d="M6.664 15.889A8 8 0 1 1 9.336.11a8 8 0 0 1-2.672 15.78zm-4.665-4.283A11.95 11.95 0 0 1 8 10c2.186 0 4.236.585 6.001 1.606a7 7 0 1 0-12.002 0"/>
            </svg>
            <div style="font-size: x-small;position: absolute;top: -2px;width:44px;text-align:center;margin-left: -11px;">
            ${current_speed>4?'&nbsp;'+current_speed+'%': current_speed<0?'&frac12;vsync':current_speed==1?'vsync':current_speed+'vsync' }
            </div>
            <div id="host_fps" style="font-size: xx-small;position: absolute;top: 32px;width:44px;text-align:center;margin-left: -11px;">
            </div>
        </div>
          `
        );

        wasm_configure("OPT_C64_SPEED_BOOST", 
            current_speed);

        $("#modal_settings").focus();
    });
    set_speed(load_setting("frame_sync","100%"));
    $('#button_speed_toggle').click();
//--
set_run_ahead = function (run_ahead) {
    $("#button_run_ahead").text("run ahead = "+run_ahead);
    wasm_configure("OPT_EMU_RUN_AHEAD", 
        run_ahead.toString().replace("frames","").replace("frame",""));
}
set_run_ahead("0 frame");
$('#choose_run_ahead a').click(function () 
{
    var run_ahead=$(this).text();
    set_run_ahead(run_ahead);
    $("#modal_settings").focus();
});
//--- REU
set_expansion_ram = function (expansion) {
    $("#button_expansion_ram").text("RAM expansion = "+expansion);
    let isREU = expansion.includes("REU");

    let value = expansion.replace("REU","").replace("GeoRAM","").replace("KB","").trim();
    if(value.includes("MB"))
    {
        value = value.replace("MB","").trim();
        value = value*1024;
    }
    wasm_configure(isREU ? "REU": "GeoRAM",value);
    
}
set_expansion_ram(load_setting('expansion_ram', 'none'));

$('#choose_expansion_ram a').click(function () 
{
    var expansion_ram=$(this).text();
    set_expansion_ram(expansion_ram);
    save_setting('expansion_ram',expansion_ram)
    $("#modal_settings").focus();
});

//---
set_vic_rev = function (vic_rev) {
    $("#button_vic_rev").text("vicII rev "+vic_rev);
    wasm_configure(vic_rev);
    PAL_VIC=vic_rev.includes("PAL");;
    scaleVMCanvas();
}
set_vic_rev(load_setting('vic_rev', 'PAL 50Hz 6569 R3'));

$('#choose_vic_rev a').click(function () 
{
    var vic_rev=$(this).text();
    set_vic_rev(vic_rev);
    save_setting('vic_rev',vic_rev)
    $("#modal_settings").focus();
});

    set_sid_model = function (sid_model) {
        $("#button_sid_model").text("sid model "+sid_model);
        wasm_set_sid_model(parseInt(sid_model));
    }
    set_sid_model(load_setting('sid_model', '8580'));

    $('#choose_sid_model a').click(function () 
    {
        var sid_model=$(this).text();
        set_sid_model(sid_model);
        save_setting('sid_model',sid_model)
        $("#modal_settings").focus();
    });

    set_2nd_sid = function (sid_addr) {
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

    setup_browser_interface();


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
        if(port1 == 'mouse')
        {                
            mouse_port=1;    
            canvas.addEventListener('click', request_pointerlock);
            request_pointerlock();
        }
        else if(port2 != 'mouse')
        {
            canvas.removeEventListener('click', request_pointerlock);
            remove_pointer_lock_fallback();
        }
        if(port1.startsWith('mouse touch'))
        {
            mouse_touchpad_pattern=port1;
            mouse_touchpad_port=1;
            document.addEventListener('touchstart',emulate_mouse_touchpad_start, false);
            document.addEventListener('touchmove',emulate_mouse_touchpad_move, false);
            document.addEventListener('touchend',emulate_mouse_touchpad_end, false);
        }
        else if(!port2.startsWith('mouse touch'))
        {
            document.removeEventListener('touchstart',emulate_mouse_touchpad_start, false);
            document.removeEventListener('touchmove',emulate_mouse_touchpad_move, false);
            document.removeEventListener('touchend',emulate_mouse_touchpad_end, false);
        }
        this.blur();
    }
    document.getElementById('port2').onchange = function() {
        port2 = document.getElementById('port2').value;
        if(port1 == port2 || 
           port1.indexOf("touch")>=0 && port2.indexOf("touch")>=0)
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
        if(port2 == 'mouse')
        {                
            mouse_port=2;
            canvas.addEventListener('click', request_pointerlock);
            request_pointerlock();
        }
        else if(port1 != 'mouse')
        {
            canvas.removeEventListener('click', request_pointerlock);
            remove_pointer_lock_fallback();
        }
        if(port2.startsWith('mouse touch'))
        {
            mouse_touchpad_pattern=port2;
            mouse_touchpad_port=2;
            document.addEventListener('touchstart',emulate_mouse_touchpad_start, false);
            document.addEventListener('touchmove',emulate_mouse_touchpad_move, false);
            document.addEventListener('touchend',emulate_mouse_touchpad_end, false);
        }
        else if(!port1.startsWith('mouse touch'))
        {
            document.removeEventListener('touchstart',emulate_mouse_touchpad_start, false);
            document.removeEventListener('touchmove',emulate_mouse_touchpad_move, false);
            document.removeEventListener('touchend',emulate_mouse_touchpad_end, false);
        }
        this.blur();
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
          this.value=null; //to be able to load the same file again on change
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

        reconfig_editor = function(new_lang){
            if(typeof editor !== 'undefined' )
            {
                editor.setOption("lineNumbers", new_lang == 'javascript');
                if(new_lang=='javascript')
                {
                    editor.setOption("gutters", ["CodeMirror-lint-markers"]);
                    editor.setOption("lint", { esversion: 10});
                    $('#check_autocomplete').show();
                    $('#check_livecomplete').prop('checked', true);                 
                    editor.setOption('placeholder', "add example code with the menu button 'add'->'javascript'");
                }
                else
                {
                    editor.setOption("gutters", false);
                    editor.setOption("lint", false);
                    $('#check_autocomplete').hide();
                    editor.setOption('placeholder', "type a single key like 'B' for bomb ... or compose a sequence of actions separated by '=>'");
                }
            }
        }
        set_complete_label = function(){
          $('#check_livecomplete_label').text(  
              $('#check_livecomplete').prop('checked') ?
              "live complete":"autocomplete on ctrl+space");
        }
        $('#check_livecomplete').change( function(){ 
            set_complete_label();
            editor.focus();
        });

        short_cut_input = document.getElementById('input_button_shortcut');
        button_delete_shortcut=$("#button_delete_shortcut");
        short_cut_input.addEventListener(
            'keydown',
            (e)=>{
                e.preventDefault();
                e.stopPropagation();
                short_cut_input.value=serialize_key_code(e);
                button_delete_shortcut.prop('disabled', false);
                validate_custom_key();
            }
        );
        short_cut_input.addEventListener(
            'keyup',
            (e)=>{
                e.preventDefault();
                e.stopPropagation();
            }
        );
        short_cut_input.addEventListener(
            'blur',
            (e)=>{
                e.preventDefault();
                e.stopPropagation();
                short_cut_input.value=short_cut_input.value.replace('^','').replace('^','');
            }
        );
        button_delete_shortcut.click(()=>{
            
            short_cut_input.value='';
            button_delete_shortcut.prop('disabled', true);
            validate_custom_key();
        });

        $('#modal_custom_key').on('show.bs.modal', function () {
          bind_custom_key();    
        });

        bind_custom_key = async function () {
            $('#choose_padding a').click(function () 
            {
                 $('#button_padding').text('btn size = '+ $(this).text() ); 
            });
            $('#choose_opacity a').click(function () 
            {
                 $('#button_opacity').text('btn opacity = '+ $(this).text() ); 
            });

            function set_script_language(script_language) {
                $("#button_script_language").text(script_language);;
            }
            $('#choose_script_language a').click(function () 
            {
                let new_lang = $(this).text();
                set_script_language(new_lang);
                validate_action_script();

                reconfig_editor(new_lang);
                editor.focus();
            });

            let otherButtons=`<a class="dropdown-item ${create_new_custom_key?"active":""}" href="#" id="choose_new">&lt;new&gt;</a>`;
            for(let otherBtn of custom_keys)
            {
                let keys = otherBtn.key.split('+');
                let key_display="";
                for(key of keys)
                {
                    key_display+=`<div class="px-1" style="border-radius: 0.25em;margin-left:0.3em;background-color: var(--gray);color: white">
                    ${html_encode(key)}
                    </div>`;
                }
                otherButtons+=`<a class="dropdown-item ${!create_new_custom_key &&haptic_touch_selected.id == 'ck'+otherBtn.id ? 'active':''}" href="#" id="choose_${otherBtn.id}">
                <div style="display:flex;justify-content:space-between">
                    <div>${html_encode(otherBtn.title)}</div>
                    <div style="display:flex;margin-left:0.3em;" 
                        ${otherBtn.key==''?'hidden':''}>
                        ${key_display}
                    </div>
                </div></a>`;
            }
            
            group_list = await stored_groups();
            group_list = group_list.filter((g)=> g !== '__global_scope__');
            if(!group_list.includes(global_apptitle))
            {
                group_list.push(global_apptitle);
            }
            other_groups=``;
            for(group_name of group_list)
            {   
                other_groups+=`
            <option ${group_name === global_apptitle?"selected":""} value="${group_name}">${group_name}</option>
            `;
            }

            $('#select_other_group').tooltip('hide');

            if($("#other_buttons").html().length==0)
            {
                $("#other_buttons").html(`
                <div class="dropdown">
                    <button id="button_other_action" class="ml-4 py-0 btn btn-primary dropdown-toggle text-right" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    list (${custom_keys.length})
                    </button>
                    <div id="choose_action" style="min-width:250px" class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenuButton">
                    
                    <div style="width:100%;display:flex;justify-content:center">
                        <select onclick="event.stopPropagation();" id="select_other_group" 
                            style="width:95%"
                            class="custom-select" data-placement="left" data-toggle="tooltip" title="action button group">
                        ${other_groups}
                        </select>
                    </div>
                    <div id="other_buttons_content">
                    ${otherButtons}
                    </div>
                    <div class="mt-3 px-2" style="width:100%;display: grid;grid-template-columns: 1.5fr 1fr;">
                    <button type="button" id="button_delete_group" class="btn btn-danger justify-start">delete group</button>
                    <button type="button" id="button_new_group" class="btn btn-primary justify-end" style="grid-column:2/2">+ group</button>
                    </div>

                    </div>
                </div>`
                );

                document.getElementById("button_delete_group").addEventListener("click",
                    (e)=>{
                        e.stopPropagation();
                        if(confirm(`delete all actions specific to group ${global_apptitle}?`))
                        {
                            delete_button_group(global_apptitle);
                            switch_to_other_group(default_app_title);                       
                        }    
                    }, false
                );
                document.getElementById("button_new_group").addEventListener("click",
                    (e)=>{
                        e.stopPropagation();    
                        let new_group_name = prompt(`group name`);
                        if(new_group_name!==null)
                        {
                            save_new_empty_group(new_group_name);
                            switch_to_other_group(new_group_name);
                        }
                    }, false
                );
                document.getElementById('select_other_group').onchange = function() {
                    let title=document.getElementById('select_other_group').value; 
                    switch_to_other_group(title)
                }
            }
            else
            {
                $("#button_other_action").html(`list (${custom_keys.length})`);
                $("#other_buttons_content").html(otherButtons);
                $("#select_other_group").html(other_groups);
            }

            //dont show delete group when on default group and no actions in it
            if(otherButtons.length===0 && global_apptitle === default_app_title)
                $("#button_delete_group").hide();
            else
                $("#button_delete_group").show();


            $('#choose_action a').click(function () 
            {
                let btn_id = this.id.replace("choose_","");
                if(btn_id == "new"){
                    if(create_new_custom_key)
                        return;
                    create_new_custom_key=true;
                }
                else
                {
                    create_new_custom_key=false;
                    var btn_def = custom_keys.find(el=>el.id == btn_id);
                   
                    haptic_touch_selected= {id: 'ck'+btn_def.id};
                }
                bind_custom_key();
                reset_validate();
            });


            switch_to_other_group=(title)=>
            {
                global_apptitle = title; 
             
                get_custom_buttons(global_apptitle, 
                    function(the_buttons) {
                        custom_keys = the_buttons;
                        for(let param_button of call_param_buttons)
                        {
                            custom_keys.push(param_button);
                        }

                        create_new_custom_key=true;
                        
                        install_custom_keys();
                        bind_custom_key();
                    }
                );
            }

            reset_validate();
            if(create_new_custom_key)
            {
                $('#button_delete_custom_button').hide();
                $('#check_app_scope').prop('checked',true);
                $('#input_button_text').val('');
                $('#input_button_shortcut').val('');

                $('#input_action_script').val('');
                if(typeof(editor) !== 'undefined') editor.getDoc().setValue("");
                $('#button_reset_position').prop('disabled', true);
                button_delete_shortcut.prop('disabled', true);
                $('#button_padding').prop('disabled', true);
                $('#button_opacity').prop('disabled', true);
     
            }
            else
            {
                var btn_def = custom_keys.find(el=> ('ck'+el.id) == haptic_touch_selected.id);

                $('#button_reset_position').prop('disabled', btn_def.currentX !== undefined &&
                    btn_def.currentX==0 && btn_def.currentY==0);
     
                set_script_language(btn_def.lang);
                $('#input_button_text').val(btn_def.title);
                $('#input_button_shortcut').val(btn_def.key);
                
                let padding = btn_def.padding == undefined ? 'default':btn_def.padding ;
                $('#button_padding').text('btn size = '+ padding );
                let opacity = btn_def.opacity == undefined ? 'default':btn_def.opacity ;
                $('#button_opacity').text('btn opacity = '+ opacity);
                
                $('#check_app_scope').prop('checked',btn_def.app_scope);
                $('#input_action_script').val(btn_def.script);
                if(typeof(editor) !== 'undefined') editor.getDoc().setValue(btn_def.script);

                $('#button_delete_custom_button').show();
                
                button_delete_shortcut.prop('disabled',btn_def.key == "");
                $('#button_padding').prop('disabled', btn_def.title=='');
                $('#button_opacity').prop('disabled', btn_def.title=='');
     
                //show errors
                validate_action_script();
            }

            if(btn_def !== undefined && btn_def.transient !== undefined && btn_def.transient)
            {
                $('#check_app_scope_label').html(
                    '[ transient button from preconfig, globally visible ]'
                );
                $('#check_app_scope').prop("disabled",true);
            }
            else
            {
                $('#check_app_scope').prop("disabled",false);
                set_scope_label = function (){
                    $('#check_app_scope_label').html(
                        $('#check_app_scope').prop('checked') ? 
                        '[ currently visible only for '+global_apptitle+' ]' :
                        '[ currently globally visible ]'
                    );
                }
                set_scope_label();
                $('#check_app_scope').change( set_scope_label ); 
            }

            
            if(is_running())
            {
                wasm_halt();
            }

            //click function
            var on_add_action = function() {
                var txt= $(this).text();

                let doc = editor.getDoc();
                let cursor = doc.getCursor();
                doc.replaceRange(txt, cursor);
                editor.focus();
                validate_action_script();
            };

            $('#predefined_actions').collapse('hide');

            //Special Keys action
            var list_actions=['Space','Comma','F1','F3','F5','F8','runStop','restore','commodore', 'Delete','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','rightShift','ControlLeft'];
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
            var list_actions=['100ms','300ms','1000ms', 'loop2{','loop3{','loop6{', '}','await_action_button_released'];
            html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_timer_action').html(html_action_list);
            $('#add_timer_action a').click(on_add_action);
            
            //system action
            var list_actions=['toggle_run','take_snapshot', 'restore_last_snapshot', 'swap_joystick', 'keyboard', 'fullscreen','menubar', 'pause', 'run', 'clipboard_paste', 'datasette_play','datasette_stop','datasette_rewind','toggle_action_buttons','toggle_speed'];
            html_action_list='';
            list_actions.forEach(element => {
                html_action_list +='<a class="dropdown-item" href="#">'+element+'</a>';
            });
            $('#add_system_action').html(html_action_list);
            $('#add_system_action a').click(on_add_action);

            //script action
            var list_actions=['simple while', 'peek & poke', 'API example', 'aimbot', 'keyboard combos'];
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
                            action_script_val = 'while(not_stopped(this_id))\n{\n  await action("A=>200ms");\n}';
                        else if(txt=='peek & poke')
                        {
                            action_script_val = 
`let orig_color = wasm_peek(0xD020);
for(let i=0;not_stopped(this_id);i++)
{
	wasm_poke( 0xD020, i%15);
	await action("200ms");
}
wasm_poke(0xD020, orig_color);`;
                        }
                        else if(txt=='API example')
                            action_script_val = '//example of the API\nwhile(not_stopped(this_id))\n{\n  //wait some time\n  await action("100ms");\n\n  //get information about the sprites 0..7\n  var y_light=sprite_ypos(0);\n  var y_dark=sprite_ypos(0);\n\n  //reserve exclusive port 1..2 access (manual joystick control is blocked)\n  set_port_owner(1,PORT_ACCESSOR.BOT);\n  await action(`j1left1=>j1up1=>400ms=>j1left0=>j1up0`);\n  //give control back to the user\n  set_port_owner(1,PORT_ACCESSOR.MANUAL);\n}';
                        else if(txt=='aimbot')
                            action_script_val = '//archon aimbot\nconst port_light=1, port_dark=2, sprite_light=0, sprite_dark=1;\n\nwhile(not_stopped(this_id))\n{\n  await aim_and_shoot( port_light /* change bot side here ;-) */ );\n  await action("100ms");\n}\n\nasync function aim_and_shoot(port)\n{ \n  var y_light=sprite_ypos(sprite_light);\n  var y_dark=sprite_ypos(sprite_dark);\n  var x_light=sprite_xpos(sprite_light);\n  var x_dark=sprite_xpos(sprite_dark);\n\n  var y_diff=Math.abs(y_light - y_dark);\n  var x_diff=Math.abs(x_light - x_dark);\n  var angle = shoot_angle(x_diff,y_diff);\n\n  var x_aim=null;\n  var y_aim=null;\n  if( y_diff<10 || 26<angle && angle<28 )\n  {\n     var x_rel = (port == port_dark) ? x_dark-x_light: x_light-x_dark;  \n     x_aim=x_rel > 0 ?"left":"right";   \n  }\n  if( x_diff <10 || 26<angle && angle<28)\n  {\n     var y_rel = (port == port_dark) ? y_dark-y_light: y_light-y_dark;  \n     y_aim=y_rel > 0 ?"up":"down";   \n  }\n  \n  if(x_aim != null || y_aim != null)\n  {\n    set_port_owner(port, \n      PORT_ACCESSOR.BOT);\n    await action(`j${port}left0=>j${port}up0`);\n\n    await action(`j${port}fire1`);\n    if(x_aim != null)\n     await action(`j${port}${x_aim}1`);\n    if(y_aim != null)\n      await action(`j${port}${y_aim}1`);\n    await action("60ms");\n    if(x_aim != null)\n      await action(`j${port}${x_aim}0`);\n    if(y_aim != null)\n      await action(`j${port}${y_aim}0`);\n    await action(`j${port}fire0`);\n    await action("60ms");\n\n    set_port_owner(\n      port,\n      PORT_ACCESSOR.MANUAL\n    );\n    await action("500ms");\n  }\n}\n\nfunction shoot_angle(x, y) {\n  return Math.atan2(y, x) * 180 / Math.PI;\n}';
                        else if(txt=='keyboard combos')
                            action_script_val =
`//example for key combinations
//here CTRL+1 which gives a black cursor
press_key('ControlLeft');
press_key('1');
release_key('1');
release_key('ControlLeft');`;
                        set_script_language('javascript');
                    }
                    else
                    {
                        alert('first empty manually the existing script code then try again to insert '+txt+' template')
                    }

                    editor.getDoc().setValue(action_script_val);
                    //$('#input_action_script').val(action_script_val);
                    editor.focus();
                    validate_action_script();
                }
            );
        };

        turn_on_full_editor = ()=>{
            require.config(
                {
                    packages: [{
                        name: "codemirror",
                        location: "js/cm",
                        main: "lib/codemirror"
                    }]
                });
                require(["codemirror", "codemirror/mode/javascript/javascript",
                            "codemirror/addon/hint/show-hint", "codemirror/addon/hint/javascript-hint",
                            "codemirror/addon/edit/closebrackets","codemirror/addon/edit/matchbrackets", 
                            "codemirror/addon/selection/active-line", "codemirror/addon/display/placeholder",
                            "codemirror/addon/lint/lint", "codemirror/addon/lint/javascript-lint",
      //                      "codemirror/lib/jshint", not working with require.js
                            ], function(CodeMirror) 
                {
                    editor = CodeMirror.fromTextArea(document.getElementById("input_action_script"), {
                        lineNumbers: true,
                        styleActiveLine: true,
                        mode:  {name: "javascript", globalVars: true},
                        lineWrapping: true,
                        autoCloseBrackets: true,
                        matchBrackets: true,
                        tabSize: 2,
                        gutters: ["CodeMirror-lint-markers"],
                        lint: { esversion: 10},
                        extraKeys: {"Ctrl-Space": "autocomplete"}
                    });

                    let check_livecomplete=$('#check_livecomplete'); 
                    editor.on("keydown",function( cm, event ) {
                        if(event.key === "Escape")
                        {//prevent that ESC closes the complete modal when in editor
                            event.stopPropagation();
                            return false;
                        }
                        if (!cm.state.completionActive && 
                            event.key !== undefined &&
                            event.key.length == 1  &&
                            event.metaKey == false && event.ctrlKey == false &&
                            event.key != ';' && event.key != ' ' && event.key != '(' 
                            && event.key != ')' && 
                            event.key != '{' && event.key != '}'
                            ) 
                        {
                            if(check_livecomplete.is(":visible") && 
                               check_livecomplete.prop('checked'))
                            {
                                cm.showHint({completeSingle: false});
                            }
                        }
                    });
                    editor.on("change", (cm) => {
                        cm.save();
                        validate_action_script();
                    });

                    if( (call_param_dark == null || call_param_dark)
                       && load_setting('dark_switch', true))
                    {
                        editor.setOption("theme", "vc64dark");
                    }
                    reconfig_editor($("#button_script_language").text());
                    $(".CodeMirror").css("width","100%").css("min-height","60px");
                    editor.setSize("100%", 'auto');

                    $("#button_script_add, #button_script_language").each(function(){
                        $(this).prop('disabled', false).
                        removeClass( "btn-secondary" ).
                        addClass("btn-primary");
                    });
                });
        }



        $('#modal_custom_key').on('shown.bs.modal', async function () 
        {
            if(typeof jshint_loaded != 'undefined')
            {
                turn_on_full_editor();
            }
            else
            {   
                $("#button_script_add, #button_script_language").each(function(){
                    $(this).prop('disabled', true).
                    removeClass( "btn-primary" ).
                    addClass("btn-secondary");
                });
                function load_css(url) {
                    var link = document.createElement("link");
                    link.type = "text/css";
                    link.rel = "stylesheet";
                    link.href = url;
                    document.getElementsByTagName("head")[0].appendChild(link);
                }
                load_css("css/cm/codemirror.css");
                load_css("css/cm/lint.css");
                load_css("css/cm/show-hint.css");
                load_css("css/cm/theme/vc64dark.css");

                //lazy load full editor now
                await load_script("js/cm/lib/jshint.js");
                jshint_loaded=true;  
                await load_script("js/cm/lib/require.js");
                turn_on_full_editor();
            }
        });



        $('#modal_custom_key').on('hidden.bs.modal', function () {
            if(typeof editor != 'undefined')
            {
                editor.toTextArea();
            }
            create_new_custom_key=false;
        
            if(is_running())
            {
                wasm_run();
            }

        });


        $('#input_button_text').keyup( function () {
            validate_custom_key(); 
            let empty=document.getElementById('input_button_text').value =='';
            $('#button_padding').prop('disabled', empty);
            $('#button_opacity').prop('disabled', empty);
            return true;
        } );
        $('#input_action_script').keyup( function () {validate_action_script(); return true;} );


        $('#button_reset_position').click(function(e) 
        {
            var btn_def = custom_keys.find(el=> ('ck'+el.id) == haptic_touch_selected.id);
            if(btn_def != null)
            {
                btn_def.currentX=0;
                btn_def.currentY=0;
                btn_def.position= "top:50%;left:50%";
                install_custom_keys();
                $('#button_reset_position').prop('disabled',true);
                save_custom_buttons(global_apptitle, custom_keys);
            }
        });

        $('#button_save_custom_button').click(async function(e) 
        {
            editor.save();
            if( (await validate_custom_key_form()) == false)
                return;

            let padding = $('#button_padding').text().split("=")[1].trim();
            let opacity = $('#button_opacity').text().split("=")[1].trim();
            if(create_new_custom_key)
            {
                //create a new custom key buttom  
                let new_button={  id: custom_keys.length
                      ,title: $('#input_button_text').val()
                      ,key: $('#input_button_shortcut').val()
                      ,app_scope: $('#check_app_scope').prop('checked')
                      ,script:  $('#input_action_script').val()
                      ,position: "top:50%;left:50%"
                      ,lang: $('#button_script_language').text()
                    };
                if(padding != 'default')
                {
                    new_button.padding=padding;
                }
                if(opacity != 'default')
                {
                    new_button.opacity=opacity;
                }
                custom_keys.push(new_button);

                movable_action_buttons=true;
                $('#movable_action_buttons_in_settings_switch').prop('checked', movable_action_buttons);
                $('#move_action_buttons_switch').prop('checked',movable_action_buttons);

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
                btn_def.lang = $('#button_script_language').text();
                btn_def.padding=padding;
                if(padding == 'default')
                {
                    delete btn_def.padding;    
                }
                btn_def.opacity=opacity;
                if(opacity == 'default')
                {
                    delete btn_def.opacity;    
                }
                install_custom_keys();
            }
            $('#modal_custom_key').modal('hide');
            save_custom_buttons(global_apptitle, custom_keys);
        });

        $('#button_delete_custom_button').click(function(e) 
        {
            let id_to_delete =haptic_touch_selected.id.substring(2);

            get_running_script(id_to_delete).stop_request=true;

            custom_keys =custom_keys.filter(el=> +el.id != id_to_delete);            
            install_custom_keys();
            $('#modal_custom_key').modal('hide');
            save_custom_buttons(global_apptitle, custom_keys);
        });

        custom_keys = [];
        action_scripts= {};

        get_custom_buttons(global_apptitle, 
            function(the_buttons) {
                custom_keys = the_buttons;                
                for(let param_button of call_param_buttons)
                {
                    custom_keys.push(param_button);
                }
                install_custom_keys();
            }
        );
        //install_custom_keys();
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
            element.id = element.transient !== undefined && element.transient ? element.id : i;

            if(element.transient && element.title == undefined ||
                element.title=="")
            {//don't render transient buttons if no title
                return;
            }

            var btn_html='<button id="ck'+element.id+'" class="btn btn-secondary btn-sm custom_key" style="position:absolute;'+element.position+';';
            if(element.currentX)
            {
                btn_html += 'transform:translate3d(' + element.currentX + 'px,' + element.currentY + 'px,0);';
            } 
            if(element.transient)
            {
                btn_html += 'border-width:3px;border-color: rgb(100, 133, 188);'; //cornflowerblue=#6495ED
            }
            else if(element.app_scope==false)
            {
                btn_html += 'border-width:3px;border-color: #99999999;';
            }
            if(element.padding != undefined && element.padding != 'default')
            {
                btn_html += 'padding:'+element.padding+'em;';
            }
            if(element.opacity != undefined && element.opacity != 'default')
            {
                btn_html += 'opacity:'+element.opacity+' !important;';
            }
            if(movable_action_buttons)
            {
                btn_html += 'box-shadow: 0.12em 0.12em 0.5em rgba(0, 0, 0, 0.9);';
            }

            btn_html += 'touch-action:none">'+html_encode(element.title)+'</button>';

            $('#div_canvas').append(btn_html);
            action_scripts["ck"+element.id] = element.script;

            let custom_key_el = document.getElementById(`ck${element.id}`);
            if(!movable_action_buttons)
            {//when action buttons locked
             //process the mouse/touch events immediatly, there is no need to guess the gesture
                let action_function = function(e) 
                {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    var action_script = action_scripts['ck'+element.id];

                    let running_script=get_running_script(element.id);                    
                    if(running_script.running == false)
                    {
                      running_script.action_button_released = false;
                    }
                    execute_script(element.id, element.lang, action_script);

                };
                let mark_as_released = function(e) 
                {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    get_running_script(element.id).action_button_released = true;
                };

                custom_key_el.addEventListener("pointerdown", (e)=>{
                    custom_key_el.setPointerCapture(e.pointerId);
                    action_function(e);
                },false);
                custom_key_el.addEventListener("pointerup", mark_as_released,false);
                custom_key_el.addEventListener("lostpointercapture", mark_as_released);
                custom_key_el.addEventListener("touchstart",(e)=>e.stopImmediatePropagation());
   
            }
            else
            {
                add_pencil_support(custom_key_el);
                custom_key_el.addEventListener("click",(e)=>
                {
                    e.stopImmediatePropagation();
                    e.preventDefault();      
                    //at the end of a drag ignore the click
                    if(just_dragged)
                        return;
    
                    var action_script = action_scripts['ck'+element.id];
                    get_running_script(element.id).action_button_released = true;
                    execute_script(element.id, element.lang, action_script);
                });
            }


        });

        if(movable_action_buttons)
        {
            install_drag();
        }
        for(b of call_param_buttons)
        {   //start automatic run actions built from a call param
            if(b.run)
            {
                if(b.auto_started === undefined)
                {//only start one time
                    execute_script(b.id, b.lang, b.script);
                    b.auto_started = true;
                }

                if(get_running_script(b.id).running)
                {//if it still runs  
                    $('#ck'+b.id).css("background-color", "var(--red)");
                }
            }
        }
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

        container.addEventListener("pointerdown", dragStart, false);
        container.addEventListener("pointerup", dragEnd, false);
        container.addEventListener("pointermove", drag, false);
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

        just_dragged=false;
      }
    }



    function checkForHapticTouch(e)
    {
        if(active)
        {
            var dragTime = Date.now()-timeStart;
            if(!just_dragged && dragTime > 300)
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
        
        if(ckdef.currentX === undefined)
        {
            ckdef.currentX = 0;
            ckdef.currentY = 0;
        }

        if(just_dragged)
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
 
        if(!just_dragged)
        {
            const magnetic_force=5.25;
            just_dragged = Math.abs(xOffset[e.target.id]-currentX)>magnetic_force || Math.abs(yOffset[e.target.id]-currentY)>magnetic_force;
        }
        if(just_dragged)
        { 
            xOffset[e.target.id] = currentX;
            yOffset[e.target.id] = currentY;

            setTranslate(currentX, currentY, dragItem);
        }
      }
    }

    function setTranslate(xPos, yPos, el) {
     //   console.log('translate: x'+xPos+' y'+yPos+ 'el=' +el.id);  
      el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
    }

//---- end custom key ----

function loadTheme() {
    var dark_theme_selected = load_setting('dark_switch', true);;
    get_parameter_link();
    if(call_param_dark!=null)
    {
        dark_theme_selected= call_param_dark;
    }
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
  
PAL_VIC=true;
function scaleVMCanvas() {
        var src_width=428 -2*33;// PAL=362
        var src_height=276 /*NTSC +40*/+(PAL_VIC?-6:4);// PAL=240
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
        if(v_joystick!=null)
            return;
        v_joystick	= new VirtualJoystick({
            container	: document.getElementById('div_canvas'),
            mouseSupport	: true,
            strokeStyle	: 'white',
            stickRadius	: 118,
            limitStickTravel: true,
            stationaryBase: stationaryBase
        });
        v_joystick.addEventListener('touchStartValidation', function(event){
            var touches = event.changedTouches;
            var touch =null;
            if(touches !== undefined)
                touch= touches[0];
            else
                touch = event;//mouse emulation    
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
            var touches = event.changedTouches;
            var touch =null;
            if(touches !== undefined)
                touch= touches[0];
            else
                touch = event;//mouse emulation    
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
        var c64code = translateKey2(the_key, the_key/*.toLowerCase()*/);
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
function emit_key(the_key, type_first_key_time=200, release_delay_in_ms=50)
{  
    // Set the initial delay for the first key (in frames)
    var delay = type_first_key_time / 50;
    var release_delay = delay + release_delay_in_ms / 50;
    if(release_delay<1)
    {
        release_delay = 1;
    }
    console.log(the_key);
    var c64code = translateKey2(the_key, the_key/*.toLowerCase()*/);
    if(c64code !== undefined)
    {
        if(c64code.modifier != null)
        {
            wasm_schedule_key(c64code.modifier[0], c64code.modifier[1], 1, delay);
        }
        wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 1, delay);

        if(c64code.modifier != null)
        {
            wasm_schedule_key(c64code.modifier[0], c64code.modifier[1], 0, release_delay);
        }
        wasm_schedule_key(c64code.raw_key[0], c64code.raw_key[1], 0, release_delay);
    }
}


function hide_all_tooltips()
{
    //close all open tooltips
    $('[data-toggle="tooltip"]').tooltip('hide');
}
    
add_pencil_support = (element) => {
    let isPointerDown = false;
    let pointerId = null;

    element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'pen') {
            isPointerDown = true;
            pointerId = event.pointerId;
        }
    });

    element.addEventListener('pointerup', (event) => {
        if (isPointerDown && event.pointerId === pointerId) {
            isPointerDown = false;
            pointerId = null;

            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            });

            element.focus();
            element.dispatchEvent(clickEvent);      
        }
    });

    element.addEventListener('pointercancel', (event) => {
        if (event.pointerType === 'pen') {
            isPointerDown = false;
            pointerId = null;
        }
    });
}
function add_pencil_support_to_childs(element) {
    element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE)
          add_pencil_support(child);
    });  
}
function add_pencil_support_for_elements_which_need_it()
{
    let elements_which_need_pencil_support=
        ["button_show_menu","button_run", "button_reset", "button_take_snapshot",
        "button_snapshots", "button_keyboard", "button_custom_key", "drop_zone",
        "button_fullscreen", "button_settings", "port1", "port2" ]
    for(let element_id of elements_which_need_pencil_support)
    {
        add_pencil_support(document.getElementById(element_id));
    }
}

function copy_to_clipboard(element) {
    var textToCopy = element.innerText;
    navigator.clipboard.writeText(textToCopy).then(function() {
        alert(`copied to clipboard: ${textToCopy}`);
    }, function(err) {
        console.error(err);
    });
}