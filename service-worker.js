const CACHE_NAME = 'accueil-secours-v1';
const HOME_ASSETS = [
    './index.html',
    './styles.css',
    './class-info.js',
    './pp-followup.js',
    './home-progressions.js',
    './home-datetime.js'
];

async function fetchWithoutCookies(request) {
    return fetch(new Request(request, { credentials: 'omit' }));
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(HOME_ASSETS.map(async (asset) => {
            try {
                const response = await fetch(new Request(asset, { credentials: 'omit', cache: 'reload' }));
                if (response.ok) {
                    await cache.put(asset, response);
                }
            } catch (error) {
                console.warn(`Impossible de mettre ${asset} en cache.`, error);
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME && cacheName.startsWith('accueil-secours-'))
            .map((cacheName) => caches.delete(cacheName)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetchWithoutCookies(event.request);
            if (response.ok) {
                await cache.put(event.request, response.clone());
                return response;
            }
            throw new Error(`Réponse HTTP ${response.status}`);
        } catch (error) {
            const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
            if (cachedResponse) {
                return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
                const cachedHome = await cache.match('./index.html');
                if (cachedHome) {
                    return cachedHome;
                }
            }
            throw error;
        }
    })());
});
