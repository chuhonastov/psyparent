// Offline cache of Кора (storage names keep the old psyparent prefix): after the first visit the reference opens without network.
// Pages: network first, cached copy when offline. Hashed assets: cache first. Server functions (/api/) are never cached.
const CACHE='kora-v3';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./',copy));return res;}).catch(()=>caches.match('./')));
    return;
  }
  if(url.pathname.includes('/assets/')||url.pathname.includes('/forms/')){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
  }
});
