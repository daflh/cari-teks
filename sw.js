const cacheName = 'cari-teks-v1';
const precacheAssets = [
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/vue.min.js',
    '/js/main.js',
    '/img/favicon.ico',
    '/img/apple-touch-icon.png',
    '/img/logo-192x192.png',
    '/img/logo-512x512.png'
];

function putCache(request, response) {
    if (response.type === "error" || response.type === "opaque") {
        return Promise.resolve();
    }
    return caches.open(cacheName)
        .then((cache) => cache.put(request, response.clone()));
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheName).then((cache) => cache.addAll(precacheAssets))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cached) => cached || fetch(event.request))
            .then((response) => putCache(event.request, response).then(() => response))
    );
});
