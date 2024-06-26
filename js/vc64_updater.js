/**
 * 
 * 
 */

set_settings_cache_value = async function (key, value)
{
    let settings = await caches.open('settings');
    await settings.put(key, new Response(value) );
}
get_settings_cache_value= async function (key)
{
    try {
        let settings = await caches.open('settings');
        let response=await settings.match(key)
        if(response==undefined)
            return null;
        return await response.text();    
    }
    catch(e){
        console.error(e);
        return "can't read version";
    }
}

execute_update = async function() 
{
    let current_version= await get_settings_cache_value('active_version');
    if(current_version == null)
    {//no version management then clear all caches
        let keys = await caches.keys();
        console.log('deleting cache files:'+keys);
        await Promise.all(keys.map(key => caches.delete(key)));
    }
    if(typeof sw_version != 'undefined')
    {
        set_settings_cache_value('active_version', sw_version.cache_name);        
    }
    window.location.reload();
}

$("#div_toast").hide();
show_new_version_toast= ()=>{
    $("#div_toast").show();
    $(".toast").toast({autohide: false});
    $('.toast').toast('show');
}
$('.toast').on('hidden.bs.toast', function () {
    $("#div_toast").hide();
});

has_installed_version=async function (cache_name){
    let cache_names=await caches.keys();
    for(c_name of cache_names)
        if(c_name == cache_name)
            return true;        
    return false;
}
get_current_ui_version = async function (){
    current_version = await get_settings_cache_value("active_version");
    
    current_ui='unkown';
    if(current_version != null)
    {
        current_ui=current_version.split('@')[1];
    }
}


try{
    //when the serviceworker talks with us ...  
    navigator.serviceWorker.addEventListener("message", async (evt) => {
        await get_current_ui_version();
        let cache_names=null;
        try{
            cache_names=await caches.keys();
        }
        catch(e)
        {
            console.error(e);
            return;
        }
        let version_selector = `
        manage already installed versions:
        <br>
        <div style="display:flex">
        <select id="version_selector" class="ml-2">`;
        for(c_name of cache_names)
        {
            let name_parts=c_name.split('@');
            let core_name= name_parts[0];
            let ui_name= name_parts[1];
            let selected=c_name==current_version?"selected":"";

            if(c_name.includes('@'))
            {   
                if(//uat version should not show regular versions and vice versa
                    location.pathname.startsWith("/uat") ?
                        ui_name.endsWith("uat")
                    :
                        !ui_name.endsWith("uat")
                )
                {
                    version_selector+=`<option ${selected} value="${c_name}">core ${core_name}, ui ${ui_name}</option>`;
                }
            }
        }
        version_selector+=
        `</select>
        
        <button type="button" id="activate_version" disabled class="btn btn-primary btn-sm px-1 mx-1">activate</button>
        <button type="button" id="remove_version" class="btn btn-danger btn-sm px-1 mx-1"><svg style="width:1.5em;height:1.5em"><use xlink:href="/img/sprites.svg#trash"/></svg>
        </button>
        </div>
        `;

        //2. diese vergleichen mit der des Service workers
        sw_version=evt.data;
        if(sw_version.cache_name != current_version)
        {
            let new_version_already_installed=await has_installed_version(sw_version.cache_name);
            let new_version_installed_or_not = new_version_already_installed ?
            `newest version (already installed)`:
            `new version available`;

            let activate_or_install = `
            <button type="button" id="activate_or_install" class="btn btn-${new_version_already_installed ?"primary":"success"} btn-sm px-1 mx-1">${
                new_version_already_installed ? "activate": "install"
            }</button>`;



            let upgrade_info = `    
            currently active version (old):<br>
            <div style="display:flex">
            <span class="ml-2 px-1 py-1 outlined">core <i>${wasm_get_core_version()}</i></span> <span class="ml-2 px-1 py-1 outlined">ui <i>${current_ui}</i></span>
            </div><br>
            <span id="new_version_installed_or_not">${new_version_installed_or_not}</span>:<br> 
            <div style="display:flex">
            <span class="ml-2 px-1 py-1 outlined">core <i>${sw_version.core}</i></span> <span class="ml-2 px-1 py-1 outlined">ui <i>${sw_version.ui}</i></span> ${activate_or_install}
            </div>
            <div id="install_warning" class="my-1">Did you know that upgrading the core may break your saved snapshots?<br/>
            In that case you can still select and activate an older compatible installation to run it ...
            </div>`;

            $('#update_dialog').html(upgrade_info);
            $('#activate_or_install').remove();
            $('#install_warning').remove();
            $('#version_display').html(`${upgrade_info} 
            <br>
            ${version_selector}`);
            if(!new_version_already_installed)
            {
                show_new_version_toast();
            }
        }
        else
        {
            $("#version_display").html(`
            currently active version (latest):<br>
            <div style="display:flex">
            <span class="ml-2 px-1 py-1 outlined">core <i>${wasm_get_core_version()}</i></span> <span class="ml-2 px-1 py-1 outlined">ui <i>${current_ui}</i></span>
            <button type="button" id="activate_or_install" class="btn btn-success btn-sm px-1 py-1">
            install</button>
            </div>
            <br>
            ${version_selector}`
            );
            $("#activate_or_install").hide();
        }
        document.getElementById('version_selector').onchange = function() {
            let select = document.getElementById('version_selector');
            document.getElementById('activate_version').disabled=
                (select.options[select.selectedIndex].value == current_version);
        }
        document.getElementById('remove_version').onclick = function() {
            let select = document.getElementById('version_selector');
            let cache_name = select.value;
            if(cache_name == sw_version.cache_name)
            {
                $("#new_version_installed_or_not").text("new version available");
                $("#activate_or_install").text("install").attr("class","btn btn-success btn-sm px-1 mx-1").show();
            }
            caches.delete(cache_name);
            select.options[select.selectedIndex].remove();
            if(current_version == cache_name)
            {//when removing the current active version, activate another installed version
                if(select.options.length>0)
                {
                    select.selectedIndex=select.options.length-1;
                    set_settings_cache_value("active_version",select.options[select.selectedIndex].value); 
                }
                else
                {
                    set_settings_cache_value("active_version",sw_version.cache_name); 
                }   
            }
            if(select.options.length==0)
            {
                document.getElementById('remove_version').disabled=true;        
                document.getElementById('activate_version').disabled=true;
            }
            else 
            {
                document.getElementById('activate_version').disabled=
                (select.options[select.selectedIndex].value == current_version);
            }
        }
        document.getElementById('activate_version').onclick = function() {
            let cache_name = document.getElementById('version_selector').value; 
            set_settings_cache_value("active_version",cache_name);
            window.location.reload();
        }
        let activate_or_install_btn = document.getElementById('activate_or_install');
        if(activate_or_install_btn != null)
        {
            activate_or_install_btn.onclick = () => {
                (async ()=>{
                    let new_version_already_installed=await has_installed_version(sw_version.cache_name); 
                    if(new_version_already_installed)
                    {
                        set_settings_cache_value("active_version",sw_version.cache_name);
                        window.location.reload();
                    }
                    else
                    {
                        execute_update();
                    }
                })();
            }
        }        
    });


    // ask service worker to send us a version message
    // wait until it is active
    navigator.serviceWorker.ready
    .then( (registration) => {
        if (registration.active) {
            registration.active.postMessage('version');
        }
    });

    wasm_get_core_version=()=>"v4";

    //in the meantime until message from service worker has not yet arrived show this
    let init_version_display= async ()=>{
        await get_current_ui_version();
        $("#version_display").html(`
        currently active version:<br>
        <span class="ml-2 px-1 outlined">core <i>${wasm_get_core_version()}</i></span> <span class="ml-2 px-1 outlined">ui <i>${current_ui}</i></span>
        <br><br>
        waiting for service worker...`
        );
    };
    init_version_display();
} catch(e)
{
    console.error(e.message);
}