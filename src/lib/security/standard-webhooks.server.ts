/**
 * Verificação de assinatura no padrão Standard Webhooks (https://standardwebhooks.com),
 * usado pelo Send Email Hook do Supabase Auth e pelos webhooks da Resend (Svix).
 *
 * Assinatura: base64(HMAC-SHA256(segredo, `${id}.${timestamp}.${corpo}`)), enviada como
 * "v1,<assinatura>" (pode haver várias separadas por espaço). O segredo vem como
 * "v1,whsec_<base64>" (Supabase) ou "whsec_<base64>" (Resend).
 */

const TOLERANCE_SECONDS = 5 * 60;

function decodeSecret(secret: string): Uint8Array<ArrayBuffer> {
  const b64 = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Lê o corpo e valida a assinatura. Retorna o corpo bruto quando válido, ou null.
 * `prefix` escolhe os cabeçalhos: "webhook" (Supabase) ou "svix" (Resend).
 */
export async function verifyStandardWebhook(
  request: Request,
  secret: string | undefined,
  prefix: "webhook" | "svix" = "webhook",
): Promise<string | null> {
  if (!secret) return null;
  const id = request.headers.get(`${prefix}-id`);
  const timestamp = request.headers.get(`${prefix}-timestamp`);
  const signatures = request.headers.get(`${prefix}-signature`);
  if (!id || !timestamp || !signatures) return null;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return null;

  const body = await request.text();
  const key = await crypto.subtle.importKey(
    "raw",
    decodeSecret(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  const ok = signatures
    .split(" ")
    .map((s) => s.split(",")[1] ?? "")
    .some((sig) => timingSafeEqual(sig, expected));
  return ok ? body : null;
}
