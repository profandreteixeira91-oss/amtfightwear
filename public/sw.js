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
    // NetworkFirst com timeout de 2.5s. Se o servidor demorar ou falhar,
    // servimos a versão em cache imediatamente e revalidamos em background.
    // Isso elimina a sensação de "app instalado lento" em conexões medianas.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAV);
        const cached = await cache.match(req);

        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);

        // Se já temos cache, corremos rede vs timeout curto; o que vier primeiro ganha.
        if (cached) {
          const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
          const winner = await Promise.race([networkFetch, timeout]);
          if (winner && winner.ok) return winner;
          // Rede lenta ou falhou → entrega cache agora e deixa revalidação seguir.
          event.waitUntil(networkFetch);
          return cached;
        }

        // Sem cache → esperamos a rede; se falhar, offline.
        const res = await networkFetch;
        if (res) return res;
        return new Response("Offline", { status: 503, statusText: "Offline" });
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
    body: payload.body || " ",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/notification-badge.png",
    data: { url: payload.url || "/app", ...(payload.data || {}) },
    tag: payload.tag || "amt-default",
    renotify: true,
    // Vibração e interação: Android exige vibrate para exibir notificação
    // com Doze/Battery Optimizer ativo; requireInteraction mantém a
    // notificação visível na gaveta em vez de sumir em 1-2s.
    vibrate: [120, 60, 120],
    requireInteraction: false,
    silent: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app";
  let targetScope = "/";
  try {
    const t = new URL(targetUrl, self.location.origin);
    targetScope = "/" + (t.pathname.split("/").filter(Boolean)[0] || "");
  } catch {
    /* noop */
  }
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (targetScope !== "/" && u.pathname.startsWith(targetScope)) {
            await client.focus();
            try { await client.navigate(targetUrl); } catch { /* noop */ }
            return;
          }
        } catch {
          /* noop */
        }
      }
      if (all[0]) {
        try {
          await all[0].focus();
          await all[0].navigate(targetUrl);
          return;
        } catch { /* noop */ }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// -------- Push subscription rotation (comum em Android/iOS PWA) --------
// Ao rotacionar (FCM/APNs), o navegador dispara "pushsubscriptionchange" no
// SW. Se não recriarmos a inscrição, os pushes param de chegar silenciosamente
// no celular — é a causa nº 1 de "no desktop funciona, no celular não".
async function readStoredVapidKey() {
  try {
    const cache = await caches.open("amt-push-meta");
    const res = await cache.match("/__vapid_public_key");
    if (!res) return null;
    return (await res.text()) || null;
  } catch {
    return null;
  }
}

function base64UrlToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const key = await readStoredVapidKey();
      if (!key) return;
      try {
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(key),
        });
        // Notifica qualquer janela aberta para reupar a inscrição no servidor.
        const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of all) {
          try {
            c.postMessage({ type: "PUSH_SUB_CHANGED", subscription: sub.toJSON(), endpoint: sub.endpoint });
          } catch {
            /* noop */
          }
        }
      } catch {
        /* noop */
      }
    })(),
  );
});

// Recebe a VAPID public key do app para persistir e poder re-inscrever
// quando o SW estiver fora do contexto de uma aba (rotação de subscription).
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SET_VAPID_KEY" || typeof data.key !== "string") return;
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open("amt-push-meta");
        await cache.put("/__vapid_public_key", new Response(data.key));
      } catch {
        /* noop */
      }
    })(),
  );
});

