
var current_browser_datasource='snapshots';
function setup_browser_interface()
{

    document.getElementById('sel_browser_snapshots').onclick = function(){
        $('#sel_browser_snapshots').parent().removeClass('btn-secondary').removeClass('btn-primary')
        .addClass('btn-primary');
        $('#sel_browser_csdb').parent().removeClass('btn-secondary').removeClass('btn-primary')
        .addClass('btn-secondary');
        browser_datasource='snapshots';
        load_browser('snapshots');
    }

    document.getElementById('sel_browser_csdb').onclick = function(){
        $('#sel_browser_csdb').parent().removeClass('btn-secondary').removeClass('btn-primary')
        .addClass('btn-primary');
        $('#sel_browser_snapshots').parent().removeClass('btn-secondary').removeClass('btn-primary')
        .addClass('btn-secondary');
        load_browser('csdb');
    }



    $('#snapshotModal').on('hidden.bs.modal', function () {
        wasm_resume_auto_snapshots();
        if(is_running())
        {
            try{wasm_run();} catch(e) {}
        }
    });

    document.getElementById('button_snapshots').onclick = function() 
    {
        load_browser(current_browser_datasource);
    }
}

function load_browser(datasource_name)
{
    current_browser_datasource=datasource_name;

    internal_usersnapshots_enabled=false;

    if(is_running())
    {
        wasm_halt();
    }

    wasm_suspend_auto_snapshots();

    //empty all feeds
    $('#container_snapshots').empty();

    //-- build snapshot feed
    var collector=get_data_collector(datasource_name);

    var render_persistent_snapshot=function(app_title, the_id){
        var x_icon = '<svg width="1.8em" height="auto" viewBox="0 0 16 16" class="bi bi-x" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg>';
        var scaled_width= datasource_name == 'csdb' ? 20:15;
        var canvas_width = 384;
        var canvas_height= 272;
        var the_html=
        '<div class="col-xs-4">'
        +`<div id="card_snap_${the_id}" class="card" style="width: ${scaled_width}rem;">`
            +`<canvas id="canvas_snap_${the_id}" width="${canvas_width}" height="${canvas_height}" class="card-img-top rounded"></canvas>`;
        if(collector.can_delete(app_title, the_id))
        {
            the_html += '<button id="delete_snap_'+the_id+'" type="button" style="position:absolute;top:0;right:0;padding:0;" class="btn btn-sm icon">'+x_icon+'</button>';
        }
        the_html +=
            '</div>'
        +'</div>';
        return the_html;
    }

    var row_renderer = function(app_title, app_snaps) {
        app_title=app_title.split(' ').join('_');
        the_grid='<div class="row" data-toggle="tooltip" data-placement="left" title="'+app_title+'">';
        for(var z=0; z<app_snaps.length; z++)
        {
            the_grid += render_persistent_snapshot(app_title, app_snaps[z].id);
        }
        the_grid+='</div>';
        $('#container_snapshots').append(the_grid);
        for(var z=0; z<app_snaps.length; z++)
        {
            var canvas_id= "canvas_snap_"+app_snaps[z].id;
            var delete_id= "delete_snap_"+app_snaps[z].id;
            var canvas = document.getElementById(canvas_id);
            var delete_btn = document.getElementById(delete_id);
            if(delete_btn != null)
            {
                delete_btn.onclick = function() {
                    let id = this.id.match(/delete_snap_(.*)/)[1];
                    alert('delete id='+id);
                    delete_snapshot_per_id(id);
                    $("#card_snap_"+id).remove();
                };
            }

            canvas.onclick = function() {
                let id = this.id.match(/canvas_snap_(.*)/)[1];
                collector.run(app_title, id);
            };
            collector.draw_item_into_canvas(app_title, canvas, app_snaps[z]);  
        }
    }

    //start the loading process
    collector.load(row_renderer); 
}




var collectors = {
    snapshots: {
        load: function (row_renderer){
            //first load autosave snapshots

            var auto_save_count=wasm_auto_snapshots_count();
            var auto_save_items=[];
            for(var z=0; z<auto_save_count; z++)
            {
                var new_item = new Object();
                new_item.id='a'+z;
                new_item.internal_id=z;
                auto_save_items.push(new_item);
            }
            row_renderer('auto_save',auto_save_items);

            //now the user snapshots
            var store_renderer = function(app_titles)
            {
                for(var t=0; t<app_titles.length;t++)
                {
                    var app_title=app_titles[t];
                    get_snapshots_for_app_title(app_title, row_renderer); 
                }
            }
            get_stored_app_titles(store_renderer);
        },
        draw_item_into_canvas: function (app_title, teaser_canvas, item){
            if(app_title == 'auto_save')
            {
                var id = item.internal_id; 
                snapshot_ptr = wasm_pull_auto_snapshot(id);
                var width=wasm_auto_snapshot_width(id);
                var height=wasm_auto_snapshot_height(id);
                this.copy_snapshot_to_canvas(snapshot_ptr, teaser_canvas, width, height);
            }
            else
            {
                width=392;
                height=268;
                var ctx = teaser_canvas.getContext("2d");
                teaser_canvas.width = width;
                teaser_canvas.height = height;

                imgData=ctx.createImageData(width,height);
            
                var data = imgData.data;
                var src_data = item.data;
                snapshot_data = new Uint8Array(src_data, 40/* offset .. this number was a guess... */, data.length);

                for (var i = 0; i < data.length; i += 4) {
                    data[i]     = snapshot_data[i+0]; // red
                    data[i + 1] = snapshot_data[i+1]; // green
                    data[i + 2] = snapshot_data[i+2]; // blue
                    data[i + 3] = snapshot_data[i+3];

                }
                ctx.putImageData(imgData,0,0); 
            }
            return; 
        },
        run: function (app_title, id){
            if(app_title == 'auto_save')
            {
                var _id=id.substring(1);
                wasm_restore_auto_snapshot(_id);
                $('#snapshotModal').modal('hide');
            }
            else
            {
                get_snapshot_per_id(id,
                    function (snapshot) {
                        wasm_loadfile(
                            snapshot.title+".vc64",
                            snapshot.data, 
                            snapshot.data.length);
                        $('#snapshotModal').modal('hide');
                        global_apptitle=snapshot.title;
                        get_custom_buttons(global_apptitle, 
                            function(the_buttons) {
                                custom_keys = the_buttons;
                                install_custom_keys();
                            }
                        );
                    }
                );
            }
            return; 
        },
        can_delete: function(app_title, the_id){
            return app_title == 'auto_save' ? false: true;
        },
        //helper method...
        copy_snapshot_to_canvas: function(snapshot_ptr, canvas, width, height){ 
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
    },

    csdb: {
        load: function (row_renderer){
 
            var count=1;
            var items=[];
            
            //var cors_proxy='https://cors-anywhere.herokuapp.com/';
            //var csdb_url = cors_proxy;
            csdb_url = 'https://csdb.dk/webservice/?type=latestrel';

            fetch(csdb_url).then( async response => {
                var text = await response.text();
                //alert(text);
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(text,"text/xml");

                var releases = xmlDoc.getElementsByTagName("Release");
                
                for(var xml_item of releases)
                {
                    var id = xml_item.getElementsByTagName("ID")[0].textContent;
                    var name = xml_item.getElementsByTagName("Name")[0].textContent;
                    var screen_shot = xml_item.getElementsByTagName("ScreenShot")[0].textContent;
                    //alert(`id=${id}, name=${name}, screen_shot=${screen_shot}`);
                    
                    var new_item = new Object();
                    new_item.id=id;
                    new_item.name=name;
                    new_item.screen_shot=screen_shot;
                    
                    items.push(new_item);
                }
                row_renderer('latest releases',items);

             });


        },
        draw_item_into_canvas: function (app_title, teaser_canvas, item){
            var ctx = teaser_canvas.getContext('2d');
            var img = new Image;
            img.onload = function(){
                ctx.drawImage(img,0,0); // Or at whatever offset you like
            };
            img.src=item.screen_shot;
            return; 
        },
        run: function (app_title, id){
            wasm_restore_auto_snapshot(id);
            $('#snapshotModal').modal('hide');
            return; 
        },
        can_delete: function(app_title, the_id){
            return false;
        },
        //helper method...
        copy_snapshot_to_canvas: function(snapshot_ptr, canvas, width, height){ 
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
    }

};


function get_data_collector(collector_name)
{
    return collectors[collector_name];
}