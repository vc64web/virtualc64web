function setup_browser_interface()
{
    $('#snapshotModal').on('hidden.bs.modal', function () {
        wasm_resume_auto_snapshots();
        if(is_running())
        {
            try{wasm_run();} catch(e) {}
        }
    });

    document.getElementById('button_snapshots').onclick = function() 
    {
        internal_usersnapshots_enabled=false;
        if(is_running())
        {
            wasm_halt();
        }

        wasm_suspend_auto_snapshots();
 
        //empty all feeds
        $('#container_snapshots').empty();

        //-- build auto-snapshot row feed
        var acount = wasm_auto_snapshots_count();

        var renderSnapshot = function (the_id){
            var the_html=
            '<div class="col-xs-4">'
            +'<div class="card" style="width: 15rem;">'
                +'<canvas id="canvas_snap_'+the_id+'" class="card-img-top rounded"></canvas>'
            +'</div>'
            +'</div>';
            return the_html;
        }

        var the_grid=
        '<div class="row" data-toggle="tooltip" data-placement="left" title="auto snapshots">'; 
        for(var z=0; z<acount; z++)
        {
            the_grid += renderSnapshot('a'+z);
        }
        the_grid+='</div>';



        $('#container_snapshots').append(the_grid);

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


    //--- build indexeddb snapshots feeds 
        var render_persistent_snapshot=function(the_id){
            var x_icon = '<svg width="1.8em" height="auto" viewBox="0 0 16 16" class="bi bi-x" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg>';
            var the_html=
            '<div class="col-xs-4">'
            +'<div id="card_snap_'+the_id+'" class="card" style="width: 15rem;">'
                +'<canvas id="canvas_snap_'+the_id+'" class="card-img-top rounded"></canvas>'
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
                            get_custom_buttons(global_apptitle, 
                                function(the_buttons) {
                                    custom_keys = the_buttons;
                                    install_custom_keys();
                                }
                            );
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
                get_snapshots_for_app_title(app_title, row_renderer); 
            }
        }
        get_stored_app_titles(store_renderer);
    //---
    }
}
