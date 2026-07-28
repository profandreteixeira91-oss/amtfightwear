// Client-side helper para inscrever/desinscrever Web Push.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg?.pushManager.getSubscription().then((s) => s ?? null) ?? null;
}

export async function subscribePush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (Notification.permission === "denied") return null;
  const perm =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (perm !== "granted") return null;

  // Garante que o SW esteja registrado antes de tentar assinar (evita "no active service worker").
  if (!(await navigator.serviceWorker.getRegistration("/"))) {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {
      /* noop — registerPwa já tenta e a falha aqui vira erro claro abaixo */
    }
  }
  const reg = await navigator.serviceWorker.ready;
  const appServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // Se já existe inscrição, valida se a applicationServerKey confere.
  // Chaves diferentes fazem o push service rejeitar com "push service error".
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    const existingKey = existing.options?.applicationServerKey as ArrayBuffer | null | undefined;
    const sameKey =
      !!existingKey &&
      new Uint8Array(existingKey).length === appServerKey.length &&
      new Uint8Array(existingKey).every((b, i) => b === appServerKey[i]);
    if (sameKey) return existing;
    try {
      await existing.unsubscribe();
    } catch {
      /* noop */
    }
  }

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey.buffer as ArrayBuffer,
    });
    // Persiste a chave VAPID no SW para permitir re-inscrição automática
    // em "pushsubscriptionchange" (rotação comum em Android/iOS PWA).
    try {
      reg.active?.postMessage({ type: "SET_VAPID_KEY", key: vapidPublicKey });
    } catch {
      /* noop */
    }
    return sub;
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (msg.toLowerCase().includes("push service")) {
      throw new Error(
        "Não foi possível registrar no serviço de push do navegador. Verifique conexão, feche e reabra o app e tente novamente. No iPhone, instale o app na Tela de Início antes de ativar.",
      );
    }
    if (err?.name === "NotAllowedError") {
      throw new Error("Permissão de notificação negada pelo navegador.");
    }
    throw err;
  }
}

export function subscriptionToPayload(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
  };
}

/**
 * Registra um listener global que re-upa a inscrição no servidor sempre que
 * o SW notificar rotação. Deve ser chamado UMA vez na inicialização do app.
 */
export function attachPushRotationListener(
  onRotated: (payload: { endpoint: string; p256dh: string; auth: string; user_agent?: string }) => void,
) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", (ev) => {
    const data: any = ev.data;
    if (!data || data.type !== "PUSH_SUB_CHANGED") return;
    const keys = data.subscription?.keys ?? {};
    if (!data.endpoint || !keys.p256dh || !keys.auth) return;
    onRotated({
      endpoint: data.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
    });
  });
}

