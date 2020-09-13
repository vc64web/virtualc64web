var execute_cmd_seq = function(action_script) {
    parseActionScript(action_script, true);
}


var parseActionScript = function(action_script, execute = false) {
    if(action_script.trim().length==0)
        return false;
    
    var cmd_sequence= action_script.split(',');
    var valid = true;
    cmd_sequence.forEach(cmd => {
        //key
        if(cmd.trim().length == 1)
        {
            if(execute)
            {            
                var c64code = translateKey(action_script, action_script.toLowerCase());
                if(c64code !== undefined)
                    wasm_key(c64code[0], c64code[1], 1);
                setTimeout(function() {wasm_key(c64code[0], c64code[1], 0);}, 100);
            }
        }
        else if(cmd.startsWith('pause'))
        {
            if(execute)
            {
                //if(is_running())
                {
                    wasm_pause();
                } 
            }
        
        }
        else if(cmd.startsWith('run'))
        {
            if(execute)
            {
                //if(is_running())
                {
                    wasm_run();
                } 
            }
        }
        else
        {
            valid = false;
            return;
        }
    });
    return valid;
};


var validate_custom_key=function(){

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
    if( parseActionScript($('#input_action_script').val()) == false)
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

