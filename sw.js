const cache_name = 'vc64_app_cache_v2021_05_28';

// install event
self.addEventListener('install', evt => {
  console.log('service worker installed');
});

// activate event
self.addEventListener('activate', evt => {
  console.log('service worker activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      console.log('deleting cache files:'+keys);
      return Promise.all(keys
        .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', function(event){
  event.respondWith(async function () {
      //is this url one that should not be cached at all ? 
      if(
        event.request.url.startsWith('https://csdb.dk/webservice/') && 
        !event.request.url.endsWith('cache_me=true')
        ||
        event.request.url.startsWith('https://mega65.github.io/')
        ||
        event.request.url.startsWith('https://vc64web.github.io/doc')
        ||
        event.request.url.endsWith('vc64web_player.js')
	||
        event.request.url.endsWith('run.html')
	||
        event.request.url.endsWith('cache_me=false')
      )
      {
        console.log('sw: do not cache fetched resource: '+event.request.url);
        return fetch(event.request);
      }
      else
      {
        //try to get it from the cache
        var cache = await caches.open(cache_name);
        var cachedResponsePromise = await cache.match(event.request);
        if(cachedResponsePromise)
        {
          console.log('sw: get from '+cache_name+' cached resource: '+event.request.url);
          return cachedResponsePromise;
        }

        //if not in cache try to fetch 
        var networkResponsePromise = fetch(event.request);
        event.waitUntil(
          async function () 
          {
            try {
              var networkResponse = await networkResponsePromise;
              console.log('sw: into '+cache_name+' putting fetched resource: '+event.request.url);
              await cache.put(event.request, networkResponse.clone());
            }
            catch(e) { console.error('no network'); }
          }()
        );   
        return networkResponsePromise;
      }
   }());
});
