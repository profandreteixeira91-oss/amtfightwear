// Registro guardado do service worker do App do Aluno.
// Regras: só registra em produção, nunca em preview do Lovable, iframes ou dev.
// Suporta kill switch via ?sw=off para desregistrar em caso de emergência.

const SW_PATH = "/sw.js";

function isBlockedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  )
    return true;
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  return false;
}

async function unregisterExisting() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || "").endsWith(SW_PATH))
      .map((r) => r.unregister()),
  );
}

export async function registerPwa(): Promise<void> {
  if (isBlockedContext()) {
    await unregisterExisting();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    /* noop */
  }
}
