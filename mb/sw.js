// Sempre busca da rede (sem cache). Ao ativar, apaga caches antigos e recarrega as abas abertas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
    const wins = await self.clients.matchAll({ type: "window" });
    wins.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req, { cache: "no-store" }).catch(() => caches.match(req)));
});
self.addEventListener("push", (e) => {
  let data = { title: "Meu Bar", body: "Seu drink está pronto!" };
  try { if (e.data) data = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(data.title || "Meu Bar", { body: data.body || "", icon: "./icons/icon-192.png", badge: "./icons/icon-192.png", data: data.url || "./" }));
});
self.addEventListener("notificationclick", (e) => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data || "./")); });
