const CACHE_NAME='physics-8-v5';
const FILES=[
  './manifest.json',
  './search-v2.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

function addSmartSearch(html) {
  if (html.includes('search-v2.js')) return html;
  return html.replace('</body>', '<script src="./search-v2.js?v=2"></script>\n</body>');
}

async function pageResponse(request) {
  try {
    const network = await fetch(request, {cache:'no-store'});
    const html = addSmartSearch(await network.text());
    const response = new Response(html, {
      status: network.status,
      statusText: network.statusText,
      headers: {'Content-Type':'text/html; charset=utf-8'}
    });
    const cache = await caches.open(CACHE_NAME);
    await cache.put('./index.html', response.clone());
    return response;
  } catch (e) {
    return (await caches.match('./index.html')) || Response.error();
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES);
    try {
      const raw = await fetch('./index.html', {cache:'no-store'});
      const html = addSmartSearch(await raw.text());
      await cache.put('./index.html', new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8'}}));
    } catch (e) {}
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(pageResponse(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
