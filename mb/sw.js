const CACHE = "meubar-v3";

// Só assets estáticos. HTML sempre tenta rede primeiro (evita tela preta no PWA).
const ASSETS = [
  "./style.css",
  "./app.js",
  "./menu.js",
  "./catalog.js",
  "./brand.js",
  "./config.js",
  "./logo.png",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      await Promise.all(ASSETS.map((u) => c.add(u).catch(() => null)));
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
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação (index, menu, app instalado): rede primeiro
  const isNav = req.mode === "navigate" || req.destination === "document" ||
    url.pathname.endsWith(".html") || url.pathname.endsWith("/") ||
    url.pathname.endsWith("/menu") || url.pathname.endsWith("/index");

  if (isNav) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("./index.html") || caches.match("./menu.html"))
        )
    );
    return;
  }

  // Demais arquivos: cache, depois rede
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached)
    )
  );
});

self.addEventListener("push", (e) => {
  let data = { title: "Meu Bar", body: "Seu drink está pronto!" };
  try { if (e.data) data = e.data.json(); } catch (_) {}
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
