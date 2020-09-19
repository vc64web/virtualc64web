const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

var execute_cmd_seq = function(action_script) {
    parseActionScript(action_script, true);
}


async function parseActionScript(action_script, execute = false) {
   if(action_script.trim().length==0)
    {
        $('#action_button_syntax_error').html('you have to enter at least one action ...');
        return false;
    }

    action_script=action_script.replace(/[{]/g,'{,')
    action_script=action_script.replace(/[}]/g,',}')
    var cmd_sequence = action_script.split(',');
    var valid = true;
    var error_message = "";

    var pc=0;
    var pc_loop_begin=[];
    var lc=[];
    var loop_depth=0;

    var joy_cmd_tokens=null;

    while (pc < cmd_sequence.length) {
        var cmd = cmd_sequence[pc];
        pc++;

        if(cmd.trim().match(/^loop[0-9]+[{]$/) != null)
        {
            loop_depth++;
            lc[loop_depth]=execute ? parseInt(cmd.match(/[0-9]+/)) : 1;
            pc_loop_begin[loop_depth]=pc;
        }
        else if(cmd.trim().length == 1 && cmd.trim()=='}')
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
        else if(translateKey(cmd,cmd.toLowerCase()) !== undefined  )
        {
            if(execute)
            {            
                var c64code = translateKey(cmd, cmd.toLowerCase());
                if(c64code !== undefined){
                    wasm_key(c64code[0], c64code[1], 1);
                    setTimeout(function() {wasm_key(c64code[0], c64code[1], 0);}, 100);
                }
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
        else if(cmd.trim().match(/^[0-9]+ms$/) != null)
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
/*        else if(cmd == 'swap_joystick')
        {
            if(execute)
            {
                $('#button_keyboard').click();
            }
        }
*/
        else if(
            (
                joy_cmd_tokens=cmd.trim().match(/^j([12])(fire|up|down|right|left)([01])$/)
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
            error_message='unknown command "'+cmd+'" at pc=' +pc;
            valid = false;
            break;
        }
    }//);

    if(loop_depth>0)
    {
        error_message="missing closing loop "+pc_loop_begin+" brackets";
        valid=false;
    }
    $('#action_button_syntax_error').html(error_message);
    return valid;
};


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

    $('#input_action_script').removeClass("is-valid");
    $('#input_action_script').removeClass("is-invalid");
    if( (await parseActionScript($('#input_action_script').val())) == false)
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

    if(dir == "FIRE")
    {
        wasm_joystick(portnr+(down_or_release == 1 ?"PRESS_"+dir:"RELEASE_"+dir));
    }
    else
    {
        wasm_joystick(portnr+(down_or_release == 1 ?"PULL_"+dir:"RELEASE_"+((dir=="LEFT" || dir=="RIGHT")?"X":"Y")));
    }
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