//-- indexedDB API

function initDB() {  
  window.addEventListener('unhandledrejection', function(event) {
    alert("Error: " + event.reason.message);
  });


  //indexedDB.deleteDatabase('vc64db');

  let openReq =  indexedDB.open('vc64db', 2);

  openReq.onupgradeneeded = function (event){
      let db = openReq.result;
      switch (event.oldVersion) {
          case 0:
              //no db
              break;
          default:
              break;
      }
      if(!db.objectStoreNames.contains('snapshots'))
      {
         //alert("create two local object stores");
         var snapshot_store=db.createObjectStore('snapshots', {keyPath: 'id', autoIncrement: true});
         snapshot_store.createIndex("title", "title", { unique: false });
      }
      if(!db.objectStoreNames.contains('apps'))
      {
         var apps_store=db.createObjectStore('apps', {keyPath: 'title'}); 
      }
  };
  openReq.onerror = function() { console.error("Error", openReq.error);}
  openReq.onsuccess = function() {
      db=openReq.result;
  }  
}


function save_snapshot(the_name, the_data) {
  //beim laden in die drop zone den Titel merken
  //dann beim take snapshot, den titel automatisch mitgeben
  //im Snapshotbrowser jeden titel als eigene row darstellen
  //erste row autosnapshot, danach kommen die Titel
  //extra user snapshot ist dann unnötig
  let the_snapshot = {
    title: the_name,
    data: the_data //,
//    created: new Date()
  };

  let tx_apps = db.transaction('apps', 'readwrite');
  let req_apps = tx_apps.objectStore('apps').put({title: the_name});
  req_apps.onsuccess= function(e){ 
        console.log("wrote app with id="+e.target.result)        
  };


  let tx = db.transaction('snapshots', 'readwrite');
  tx.oncomplete = function() {
    console.log("Transaction is complete");
  };
  tx.onabort = function() {
    console.log("Transaction is aborted");
  };
 
  try {
    let req = tx.objectStore('snapshots').add(the_snapshot);
    req.onsuccess= function(e){ 
        console.log("wrote snapshot with id="+e.target.result)        
    };
    req.onerror = function(e){ 
        console.error("could not write snapshot: ",  req.error) 
    };
  } catch(err) {
    if (err.name == 'ConstraintError') {
      alert("Such snapshot exists already");
    } else {
      throw err;
    }
  }
}

function get_stored_app_titles(callback_fn)
{
       let transaction = db.transaction("apps"); // readonly
    let apps = transaction.objectStore("apps");

    let request = apps.getAllKeys();

    request.onsuccess = function() {
        if (request.result !== undefined) {
            callback_fn(request.result);
        } else {
            console.log("No titles found");
        }
    };
}

function get_snapshots_for_app_title(app_title, callback_fn)
{
    let transaction = db.transaction("snapshots"); 
    let snapshots = transaction.objectStore("snapshots");
    let priceIndex = snapshots.index("title");

    let request = priceIndex.getAll(app_title);

    request.onsuccess = function() {
        callback_fn(app_title, request.result);
    };
}

function get_snapshot_per_id(the_id, callback_fn)
{
    let transaction = db.transaction("snapshots"); 
    let snapshots = transaction.objectStore("snapshots");
 
    let request = snapshots.get(parseInt(the_id));

    request.onsuccess = function() {
        callback_fn(request.result);
    };
}

function delete_snapshot_per_id(the_id)
{
  get_snapshot_per_id(the_id, 
  function(the_snapshot) {
    let transaction = db.transaction("snapshots", 'readwrite'); 
    let snapshots = transaction.objectStore("snapshots");
    snapshots.delete(parseInt(the_id));
    //check if this was the last snapshot of the game title 
    get_snapshots_for_app_title(the_snapshot.title, 
      function (app_title, snapshot_list) {
        if(snapshot_list.length == 0)
        {//when it was the last one, then also delete the app title
          let tx_apps = db.transaction("apps", 'readwrite'); 
          let apps = tx_apps.objectStore("apps");
          apps.delete(app_title);
        }
      }
    );
  });
}


//--- local storage API ---

function load_setting(name, default_value) {
    var value = localStorage.getItem(name);
    if(value === null)
    {
        return default_value;
    } 
    else
    {
        if(value=='true')
          return true;
        else if(value=='false')
          return false;
        else
          return value;
    }
}

function save_setting(name, value) {
    if (value!= null) {
      localStorage.setItem(name, value);
    } else {
      localStorage.removeItem(name);
    }
}
