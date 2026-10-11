/* Mbäfeung — minimal app-shell service worker.
   Caches the local app shell so the calendar keeps working offline / on flaky
   connections, and so browsers that require a service worker for installability
   see one. Bump CACHE_NAME whenever a shipped file changes so clients pick up
   the new version instead of a stale cached copy. */
var CACHE_NAME = "mbafeung-shell-v2";
var APP_SHELL = [
    "./",
    "./index.html",
    "./calendar.js",
    "./manifest.json",
    "./icon-144.png",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", function(event){
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache){ return cache.addAll(APP_SHELL); })
            .then(function(){ return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function(event){
    event.waitUntil(
        caches.keys().then(function(keys){
            return Promise.all(keys.map(function(key){
                if(key !== CACHE_NAME){ return caches.delete(key); }
            }));
        }).then(function(){ return self.clients.claim(); })
    );
});

/* Cache-first for the app shell (same-origin GET requests); network-first
   fallback for everything else (e.g. the html2canvas/jsPDF CDN scripts), so
   those still update normally when online but don't break offline boot. */
self.addEventListener("fetch", function(event){
    if(event.request.method !== "GET"){ return; }
    var url = new URL(event.request.url);
    if(url.origin === self.location.origin){
        event.respondWith(
            caches.match(event.request).then(function(cached){
                return cached || fetch(event.request).then(function(response){
                    var copy = response.clone();
                    caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
                    return response;
                });
            }).catch(function(){ return caches.match("./index.html"); })
        );
    }
});
