const CACHE = "meubar-v2";
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
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      await Promise.all(
        ASSETS.map((u) => c.add(u).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
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
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request)
        .then((res) => {
          if (res && res.ok && e.request.method === "GET") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached)
    )
  );
});

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