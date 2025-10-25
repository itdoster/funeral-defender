// /sw.js
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.hostname.includes('tildaapi.biz') && url.pathname.includes('/procces')) {
    event.respondWith((async () => {
      const original = event.request.clone();
      let body = null;
      try { body = await original.arrayBuffer(); } catch(e) {}

      const headers = new Headers();
      original.headers.forEach((v, k) => {
        if (!['host', 'origin'].includes(k.toLowerCase())) headers.append(k, v);
      });

      headers.set('X-Forwarded-By', 'sw-proxy');

      return fetch('/tilda-form', {
        method: original.method,
        headers,
        body: body && body.byteLength ? body : undefined,
        credentials: 'include',
        mode: 'same-origin'
      });
    })());
  }
});