const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

var map_of_running_scripts = [];
var map_of_running_scripts_stop_request = [];
var execute_script = function(id, action_script) {    
    if(map_of_running_scripts[id] == true)
    {
        //alert("action script with "+id+" is still running, double execution is prevented... requesting stop");
        map_of_running_scripts_stop_request[id]=true;
    }
    else
    {
        setTimeout(async function() { 
            $('#ck'+id).css("background-color", "var(--red)");
            map_of_running_scripts[id]=true;
            map_of_running_scripts_stop_request[id]=false;
            try{
              await parse_script(action_script, true, id);
            }
            finally
            {
              $('#ck'+id).css("background-color", "");
              map_of_running_scripts[id]=false;
              map_of_running_scripts_stop_request[id]=false;
            }
        });
    }
}

function stop_all_scripts()
{
    for(id in map_of_running_scripts)
    {
        if(map_of_running_scripts[id]==true)
        {
            map_of_running_scripts_stop_request[id]=true;
        }
    }
}

function not_stopped(id)
{
    return id<0 ? true : map_of_running_scripts_stop_request[id] != true;
}

async function parse_script(action_script, execute = false, execution_id = -1) {
    action_script = action_script.trim();
    if(action_script.length==0)
    {
        $('#action_button_syntax_error').html('you have to enter at least one action ...');
        return false;
    }

    if(action_script.startsWith("js:"))
    {
        var valid = true;
        var js_script=action_script.substring(3);
        var js_script_function;
        let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
        try {            
            js_script_function=new AsyncFunction("var this_id="+execution_id+";"+js_script);
        } catch (error) {
            valid=false;
            if(execute==false)
            {
                $('#action_button_syntax_error').html(error.message);
            }
        }
        if(execute)
        {
            await js_script_function();
        }
    }
    else
    {
       valid = await execute_action_sequence_script(action_script, execute, execution_id);
    }
    return valid;
};

async function action(cmd, execute=true)
{
    await execute_action_sequence_script(cmd, execute);
}


async function execute_action_sequence_script(action_script, execute=false, execution_id=-1)
{
    action_script=action_script.replace(/[{]/g,'{=>')
    action_script=action_script.replace(/[}]/g,'=>}')
    var cmd_sequence = action_script.split('=>');
    var valid = true;
    var error_message = "";

    var pc=0;
    var pc_loop_begin=[];
    var lc=[];
    var loop_depth=0;

    var joy_cmd_tokens=null;

    while (pc < cmd_sequence.length && not_stopped(execution_id)) {
        var cmd = cmd_sequence[pc].trim();
        pc++;

        if(cmd.match(/^loop[0-9]+[{]$/) != null)
        {
            loop_depth++;
            lc[loop_depth]=execute ? parseInt(cmd.match(/[0-9]+/)) : 1;
            pc_loop_begin[loop_depth]=pc;
        }
        else if(cmd.length == 1 && cmd =='}')
        {
            lc[loop_depth]--;
            if(lc[loop_depth]>0)
            {
                pc=pc_loop_begin[loop_depth];
            }
            else
            {
                loop_depth--;
                if(loop_depth<0)
                {
                    error_message="too many closing loop bracket at pc="+pc;
                    valid=false;
                    break;
                }
            }
        }
        else if(await execute_single_action(cmd, execute)==true)
        {            
        }
        else
        {
            error_message='unknown command "'+cmd+'" at pc=' +pc;
            valid = false;
            break;
        }
    }

    if(loop_depth>0)
    {
        error_message="missing closing loop "+pc_loop_begin+" brackets";
        valid=false;
    }

    if(execute == false)
    {
        $('#action_button_syntax_error').html(error_message);
    }
    return valid;
}


async function execute_single_action(cmd, execute=true)
{
    cmd=cmd.trim();
    var valid = true;
    if(cmd.match(/^'.+?'$/) != null)
    {
        var chars = cmd.substring(1,cmd.length-1).split("");
        var time_to_emit_next_char = 100;
        emit_string(chars,0,time_to_emit_next_char);

        //blocking execution of action script and wait for all keys emitted
        await sleep(time_to_emit_next_char*chars.length);                  
    }
    else if(translateKey2(cmd,cmd.toLowerCase()).raw_key !== undefined)
    {
        if(execute)
        {            
            emit_string([cmd],0,100); 
        }
    }
    else if(cmd == 'pause')
    {
        if(execute)
        {
            //if(is_running())
            {
                wasm_halt();
            } 
        }
    
    }
    else if(cmd == 'run')
    {
        if(execute)
        {
            //if(is_running())
            {
                wasm_run();
            } 
        }
    }
    else if(cmd.match(/^[0-9]+ms$/) != null)
    {
        if(execute)
        {
            await sleep(parseInt(cmd.match(/[0-9]+/)));                 
        }
    }
    else if(cmd == 'take_snapshot')
    {
        if(execute)
        {
            $('#button_take_snapshot').click();
        }
    }
    else if(cmd == 'keyboard')
    {
        if(execute)
        {
            $('#button_keyboard').click();
        }
    }
    else if(cmd == 'restore_last_snapshot')
    {
        if(execute)
        {
            load_last_snapshot();
        }
    }
    else if(cmd == 'swap_joystick')
    {
        if(execute)
        {
            var port1_value=port1;
            port1=port2;
            port2=port1_value;
            port1_value= $('#port1').val();
            $('#port1').val($('#port2').val());
            $('#port2').val(port1_value);
        }
    }
    else if(
        (
            joy_cmd_tokens=cmd.match(/^j([12])(fire|up|down|right|left)([01])$/)
        )
        != null
    )
    {
        if(execute)
        {
            execute_joystick_script(joy_cmd_tokens);
        }
    }
    else
    {
        valid=false;
    }
    return valid;
}


async function validate_custom_key(){

    var is_valid=true;
    $('#input_button_text').removeClass("is-valid");
    $('#input_button_text').removeClass("is-invalid");
    if( $('#input_button_text').val().trim().length==0)
    {
        $('#input_button_text').addClass("is-invalid");
        is_valid=false;
    }
    else
    {  
        $('#input_button_text').addClass("is-valid");
    }

    is_valid = await validate_action_script();

    return is_valid;
};
async function validate_action_script()
{
    var is_valid=true;
    $('#input_action_script').removeClass("is-valid");
    $('#input_action_script').removeClass("is-invalid");
    if( (await parse_script($('#input_action_script').val())) == false)
    {
        $('#input_action_script').addClass("is-invalid");
        is_valid=false;
    }
    else
    {
        $('#input_action_script').addClass("is-valid");
    }
    return is_valid;
};



function execute_joystick_script(cmd_tokens)
{
    var portnr=cmd_tokens[1];
    var dir= cmd_tokens[2].toUpperCase();
    var down_or_release = cmd_tokens[3];

    var previous_owner = set_port_owner(portnr,PORT_ACCESSOR.BOT);
    if(dir == "FIRE")
    {
        send_joystick(PORT_ACCESSOR.BOT,portnr, portnr+(down_or_release == 1 ?"PRESS_"+dir:"RELEASE_"+dir));
    }
    else
    {
        send_joystick(PORT_ACCESSOR.BOT,portnr, portnr+(down_or_release == 1 ?"PULL_"+dir:"RELEASE_"+((dir=="LEFT" || dir=="RIGHT")?"X":"Y")));
    }
    set_port_owner(portnr,previous_owner);
 }

 function load_last_snapshot()
 {
    get_snapshots_for_app_title(global_apptitle, 
        function(app_title, app_snaps) {
            if(app_snaps.length>0)
            {
                var snapshot = app_snaps[app_snaps.length-1];
                wasm_loadfile(
                    snapshot.title+".vc64",
                    snapshot.data, 
                    snapshot.data.length);
            }
        }
    ); 
 }

 function sprite_xpos(sprite_id)
 {
   var all_sprite_pos = wasm_sprite_info().split(",");
   return all_sprite_pos[sprite_id*2];
 }

 function sprite_ypos(sprite_id)
 {
   var all_sprite_pos = wasm_sprite_info().split(",");
   return all_sprite_pos[sprite_id*2+1];
 }