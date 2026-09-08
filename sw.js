const STATIC='nigun-offline-v2-single-note';
const CORE=['./','index.html','app.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(STATIC).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys()){if(k!==STATIC)await caches.delete(k)}await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 const r=e.request;
 if(r.method!=='GET')return;
 e.respondWith((async()=>{
   const hit=await caches.match(r); if(hit)return hit;
   try{const res=await fetch(r); if(res&&res.ok){const c=await caches.open(STATIC);c.put(r,res.clone()).catch(()=>{});} return res}
   catch(err){if(r.mode==='navigate')return (await caches.match('index.html'))||(await caches.match('./'));throw err}
 })());
});
