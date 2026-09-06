const CACHE = 'ftv2-static-v1';
const ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
	self.skipWaiting();
});

self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
	e.respondWith(
		caches.match(e.request).then(
			(hit) =>
				hit ||
				fetch(e.request).then((res) => {
					if (url.origin === location.origin) {
						const copy = res.clone();
						caches.open(CACHE).then((c) => c.put(e.request, copy));
					}
					return res;
				})
		)
	);
});
