/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

export {}; // ensures no global augmentations leak

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open('v1').then((cache) =>
      cache.addAll(['/', '/manifest.json'])
    )
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then(
      (response) => response || fetch(event.request)
    )
  );
});
