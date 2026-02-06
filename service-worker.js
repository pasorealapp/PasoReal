const CACHE_NAME = 'pasoreal-pro-v2';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/ai-engine.js',
    '/fitness-tracker.js',
    '/social-features.js',
    '/premium-features.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/sounds/achievement.mp3',
    'https://aframe.io/releases/1.5.0/aframe.min.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/hls.js@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activar Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia de cache: Network First, fallback a Cache
self.addEventListener('fetch', event => {
    // Ignorar solicitudes no GET
    if (event.request.method !== 'GET') return;

    // Para solicitudes de video, usar estrategia específica
    if (event.request.url.includes('.m3u8') || event.request.url.includes('.mp4')) {
        event.respondWith(videoCacheStrategy(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en caché, devolverlo
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Si no está en caché, ir a red
                return fetch(event.request)
                    .then(response => {
                        // Si la respuesta es válida, guardar en caché
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Si falla la red y no tenemos el recurso en caché,
                        // mostrar página offline
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Estrategia especial para videos
function videoCacheStrategy(request) {
    return caches.match(request)
        .then(cachedResponse => {
            if (cachedResponse) {
                // Actualizar caché en segundo plano
                fetchAndCache(request);
                return cachedResponse;
            }
            
            return fetchAndCache(request);
        })
        .catch(() => {
            // Si no hay conexión y no está en caché, mostrar error
            return new Response('', {
                status: 408,
                statusText: 'Offline'
            });
        });
}

function fetchAndCache(request) {
    return fetch(request)
        .then(response => {
            // No cachear respuestas grandes (videos)
            if (response.ok && response.headers.get('content-length') < 5000000) {
                const clone = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, clone));
            }
            return response;
        });
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Manejar notificaciones push
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación de PasoReal Pro',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Explorar',
                icon: '/icons/explore.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: '/icons/close.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('PasoReal Pro', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});