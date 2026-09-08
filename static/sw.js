// Self-cleanup: an older SW (cache-first on all GETs) served stale page data,
// making deleted transactions reappear after navigation. The app needs no SW
// (all data lives in D1); this version unregisters itself and purges caches.
// Deployed once; delete this file after 2027-01-01.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
	e.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.map((k) => caches.delete(k)));
			await self.registration.unregister();
			const clients = await self.clients.matchAll({ type: 'window' });
			for (const client of clients) client.navigate(client.url);
		})()
	);
});
