const CACHE = "meubar-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./menu.html",
  "./style.css",
  "./app.js",
  "./menu.js",
  "./catalog.js",
  "./brand.js",
  "./config.js",
  "./logo.svg",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});

// Notificações recebidas pelo service worker
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : { title: "Meu Bar", body: "Seu drink está pronto!" };
  e.waitUntil(
    self.registration.showNotification(data.title || "Meu Bar", {
      body: data.body || "",
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      data: data.url || "./"
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || "./"));
});