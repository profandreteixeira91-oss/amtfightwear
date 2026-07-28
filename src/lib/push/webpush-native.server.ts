// Envio de Web Push usando Web Crypto (compatível com Cloudflare Workers).
// Substitui a lib `web-push` (baseada em Node crypto) que falha silenciosamente
// no runtime edge. Todas as inscrições Web Push (FCM, Apple, Mozilla)
// aceitam o mesmo protocolo aes128gcm + VAPID.

import { buildPushPayload, type VapidKeys } from "@block65/webcrypto-web-push";

export type WebPushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

export type PushSubRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushResult =
  | { ok: true; status: number }
  | { ok: false; status: number; expired: boolean; error: string };

function getVapid(): VapidKeys {
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@amtfightwear.com.br";
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys ausentes (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)");
  }
  return { subject, publicKey, privateKey };
}

/** Envia um único push. Retorna resultado detalhado (sem lançar). */
export async function sendWebPushOnce(
  sub: PushSubRecord,
  payload: WebPushPayload,
  ttlSeconds = 60 * 60,
): Promise<PushResult> {
  try {
    const vapid = getVapid();
    const subscription = {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    const message = {
      data: JSON.stringify(payload),
      options: { ttl: ttlSeconds },
    };
    const req = await buildPushPayload(message, subscription, vapid);
    const res = await fetch(sub.endpoint, req as unknown as RequestInit);
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status };
    }
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* noop */
    }
    return {
      ok: false,
      status: res.status,
      expired: res.status === 404 || res.status === 410,
      error: `HTTP ${res.status} ${text}`.slice(0, 500),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      expired: false,
      error: String(err?.message || err).slice(0, 500),
    };
  }
}
