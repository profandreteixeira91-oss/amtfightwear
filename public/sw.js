// Service Worker do App do Aluno AMT Dojo Manager
// Push notifications (Web Push VAPID) + cache offline básico (NetworkFirst para navegações,
// CacheFirst para assets hashados do app).
// A registração acontece apenas em produção via src/lib/pwa/register.ts.

const CACHE_NAV = "amt-nav-v1";
const CACHE_ASSETS = "amt-assets-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("amt-") && n !== CACHE_NAV && n !== CACHE_ASSETS)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// -------- Fetch: NetworkFirst para HTML, CacheFirst para assets estáticos hashados --------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Não interceptar rotas de API/OAuth/webhooks.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/lovable/")
  )
    return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAV);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cache = await caches.open(CACHE_NAV);
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Assets hashados (Vite gera /assets/*.[hash].*)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ASSETS);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cached ?? Response.error();
        }
      })(),
    );
  }
});

// -------- Web Push --------
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "AMT Dojo", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "AMT Dojo Manager";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.jpg",
    badge: payload.badge || "/favicon.jpg",
    data: { url: payload.url || "/app", ...(payload.data || {}) },
    tag: payload.tag,
    renotify: !!payload.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.pathname.startsWith("/app")) {
            await client.focus();
            await client.navigate(targetUrl);
            return;
          }
        } catch {
          /* noop */
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
