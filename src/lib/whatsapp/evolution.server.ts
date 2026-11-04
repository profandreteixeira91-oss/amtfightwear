/**
 * Cliente da Evolution API v2 para o WhatsApp da loja.
 *
 * A loja usa o mesmo servidor Evolution do Dojo Manager, com uma instância
 * própria (o número da loja). Variáveis de ambiente (servidor):
 *  - EVOLUTION_API_URL   ex.: https://whatsapp.amtdojomanager.com.br
 *  - EVOLUTION_API_KEY   chave global (AUTHENTICATION_API_KEY) do servidor
 *  - EVOLUTION_INSTANCE  nome da instância da loja (padrão: amt-loja)
 *
 * O envio de avisos nunca lança erro (devolve { ok: false }); as operações de
 * conexão usadas pelo painel lançam EvolutionError com mensagem legível.
 */

export type EvolutionConfig = { url: string; apiKey: string; instance: string };
/** `jid`: identificador do contato devolvido pelo WhatsApp (muitas vezes um @lid, sem telefone). */
export type SendResult = { ok: true; id: string | null; jid: string | null } | { ok: false; error: string };
export type EvolutionState = "open" | "connecting" | "close";
export type EvolutionQr = { base64: string | null; pairingCode: string | null };

const TIMEOUT_MS = 20_000;
const enc = encodeURIComponent;

export class EvolutionError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "EvolutionError";
    this.status = status;
  }
}

export function evolutionConfig(): EvolutionConfig | null {
  const url = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey, instance: process.env.EVOLUTION_INSTANCE?.trim() || "amt-loja" };
}

function requireConfig(): EvolutionConfig {
  const cfg = evolutionConfig();
  if (!cfg) throw new EvolutionError("WhatsApp não configurado (EVOLUTION_API_URL / EVOLUTION_API_KEY).", 503);
  return cfg;
}

function messageOf(body: any, status: number): string {
  const raw = body?.response?.message ?? body?.message ?? body?.error ?? `HTTP ${status}`;
  const text = Array.isArray(raw) ? raw.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("; ") : String(raw);
  return text.slice(0, 300);
}

async function evo<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const { url, apiKey } = requireConfig();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url + path, {
      method,
      headers: { apikey: apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { message: text.slice(0, 300) };
    }
    if (!res.ok) throw new EvolutionError(messageOf(json, res.status), res.status);
    return json as T;
  } catch (err: any) {
    if (err instanceof EvolutionError) throw err;
    const msg = err?.name === "AbortError" ? "Servidor de WhatsApp não respondeu a tempo." : String(err?.message ?? err);
    throw new EvolutionError(msg, 0);
  } finally {
    clearTimeout(timer);
  }
}

/** Normaliza para dígitos com DDI 55 (ex.: 5582999998888). */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 ? digits : null;
}

/* --------------------------------- Envio --------------------------------- */

/** Destino aceito pela Evolution: telefone (só dígitos) ou identificador do WhatsApp (…@lid). */
function recipient(to: string): string | null {
  return to.includes("@") ? to.trim() : normalizeWhatsAppNumber(to);
}

/** Registra o envio na caixa de entrada do admin (nunca derruba o envio). */
async function recordSent(to: string, json: any, fallback: { type: string; body: string | null; mime?: string; name?: string }) {
  try {
    const { recordOutgoingMessage } = await import("@/lib/whatsapp/inbox.server");
    await recordOutgoingMessage(to, json, fallback);
  } catch (err) {
    console.error("[whatsapp] não registrou o envio na caixa de entrada", err);
  }
}

/**
 * Envia texto. `delay` (ms) faz a Evolution mostrar "digitando…" antes de enviar,
 * o que deixa o ritmo mais natural e reduz o risco de bloqueio do número.
 * `to`: telefone ou identificador da conversa (…@lid).
 */
export async function sendWhatsAppText(to: string, text: string, delay = 1200): Promise<SendResult> {
  const cfg = evolutionConfig();
  if (!cfg) return { ok: false, error: "WhatsApp não configurado" };
  const number = recipient(to);
  if (!number) return { ok: false, error: "Número inválido" };
  try {
    const json = await evo<{ key?: { id?: string; remoteJid?: string } }>("POST", `/message/sendText/${enc(cfg.instance)}`, {
      number,
      text,
      delay,
    });
    await recordSent(number, json, { type: "text", body: text });
    return { ok: true, id: json?.key?.id ?? null, jid: json?.key?.remoteJid ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Envia foto, vídeo ou documento (base64 sem o prefixo data:). */
export async function sendWhatsAppMedia(
  to: string,
  media: { mediatype: "image" | "video" | "document"; mimetype: string; fileName: string; base64: string; caption?: string },
): Promise<SendResult> {
  const cfg = evolutionConfig();
  if (!cfg) return { ok: false, error: "WhatsApp não configurado" };
  const number = recipient(to);
  if (!number) return { ok: false, error: "Número inválido" };
  try {
    const json = await evo<{ key?: { id?: string; remoteJid?: string } }>("POST", `/message/sendMedia/${enc(cfg.instance)}`, {
      number,
      mediatype: media.mediatype,
      mimetype: media.mimetype,
      fileName: media.fileName,
      caption: media.caption ?? "",
      media: media.base64,
      delay: 800,
    });
    await recordSent(number, json, {
      type: media.mediatype,
      body: media.caption || null,
      mime: media.mimetype,
      name: media.fileName,
    });
    return { ok: true, id: json?.key?.id ?? null, jid: json?.key?.remoteJid ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/* ------------------------- Caixa de entrada (leitura) ------------------------- */

/** Webhook que a Evolution chama a cada mensagem (ver /api/public/hooks/whatsapp). */
export async function evolutionSetWebhook(url: string, headers: Record<string, string>): Promise<void> {
  const { instance } = requireConfig();
  await evo("POST", `/webhook/set/${enc(instance)}`, {
    webhook: {
      enabled: true,
      url,
      headers,
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
    },
  });
}

export async function evolutionFindWebhook(): Promise<{ enabled: boolean; url: string | null; events: string[] } | null> {
  const { instance } = requireConfig();
  const res = await evo<any>("GET", `/webhook/find/${enc(instance)}`);
  if (!res) return null;
  return { enabled: !!res.enabled, url: res.url ?? null, events: Array.isArray(res.events) ? res.events : [] };
}

export type EvolutionChat = { remoteJid: string; pushName?: string | null; unreadCount?: number; updatedAt?: string | null };

export async function evolutionFindChats(): Promise<EvolutionChat[]> {
  const { instance } = requireConfig();
  const res = await evo<any>("POST", `/chat/findChats/${enc(instance)}`, {});
  return Array.isArray(res) ? res : [];
}

/** Mensagens de uma conversa, da mais nova para a mais antiga. */
export async function evolutionFindMessages(remoteJid: string, limit = 50): Promise<any[]> {
  const { instance } = requireConfig();
  const res = await evo<any>("POST", `/chat/findMessages/${enc(instance)}`, {
    where: { key: { remoteJid } },
    page: 1,
    offset: limit,
  });
  return res?.messages?.records ?? [];
}

/** Conteúdo de uma foto/áudio/documento recebido, em base64. */
export async function evolutionMediaBase64(messageId: string): Promise<{ base64: string; mimetype: string | null; fileName: string | null }> {
  const { instance } = requireConfig();
  const res = await evo<any>("POST", `/chat/getBase64FromMediaMessage/${enc(instance)}`, {
    message: { key: { id: messageId } },
    convertToMp4: false,
  });
  if (!res?.base64) throw new EvolutionError("Mídia indisponível no WhatsApp.", 404);
  return { base64: res.base64, mimetype: res.mimetype ?? null, fileName: res.fileName ?? null };
}

/** Marca como lidas (o cliente vê os dois tiques azuis). */
export async function evolutionMarkRead(remoteJid: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { instance } = requireConfig();
  await evo("POST", `/chat/markMessageAsRead/${enc(instance)}`, {
    readMessages: ids.map((id) => ({ id, fromMe: false, remoteJid })),
  });
}

/* ------------------------------- Instância -------------------------------- */

function readQr(raw: any): EvolutionQr {
  const q = raw?.qrcode ?? raw ?? {};
  const base64 = typeof q.base64 === "string" && q.base64 ? q.base64 : null;
  return {
    base64: base64 && !base64.startsWith("data:") ? `data:image/png;base64,${base64}` : base64,
    pairingCode: typeof q.pairingCode === "string" ? q.pairingCode : null,
  };
}

/** Estado da instância da loja; null se ela ainda não existe no servidor. */
export async function evolutionConnectionState(): Promise<EvolutionState | null> {
  const { instance } = requireConfig();
  try {
    const res = await evo("GET", `/instance/connectionState/${enc(instance)}`);
    const state = String(res?.instance?.state ?? res?.state ?? "close").toLowerCase();
    return state === "open" ? "open" : state === "connecting" ? "connecting" : "close";
  } catch (err) {
    if (err instanceof EvolutionError && err.status === 404) return null;
    throw err;
  }
}

/** Número e nome do perfil conectados à instância da loja. */
export async function evolutionInstanceInfo(): Promise<{ number: string | null; profileName: string | null }> {
  const { instance } = requireConfig();
  const res = await evo<any>("GET", `/instance/fetchInstances?instanceName=${enc(instance)}`);
  const list: any[] = Array.isArray(res) ? res : res ? [res] : [];
  const row = list.find((r) => (r?.name ?? r?.instance?.instanceName ?? r?.instanceName) === instance) ?? list[0];
  const inst = row?.instance ?? row ?? {};
  const jid = String(inst.ownerJid ?? inst.owner ?? inst.number ?? "");
  const digits = jid.split("@")[0].replace(/\D/g, "");
  return { number: digits || null, profileName: (inst.profileName as string) ?? null };
}

/**
 * Inicia a conexão do número da loja.
 *  - sem `number`: devolve o QR Code (cria a instância se ainda não existir);
 *  - com `number`: devolve o código de pareamento. Na v2.3 o código só sai para
 *    instância criada já com o número, então a instância é recriada.
 */
export async function evolutionStartConnection(number?: string): Promise<EvolutionQr> {
  const { instance } = requireConfig();
  const state = await evolutionConnectionState();
  if (state === "open") throw new EvolutionError("O WhatsApp da loja já está conectado.", 409);

  if (number) {
    if (state !== null) await evo("DELETE", `/instance/delete/${enc(instance)}`).catch(() => undefined);
    const created = await evo("POST", "/instance/create", {
      instanceName: instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      number,
    });
    const fromCreate = readQr(created?.qrcode ?? {});
    if (fromCreate.pairingCode) return fromCreate;
    return readQr(await evo("GET", `/instance/connect/${enc(instance)}?number=${enc(number)}`));
  }

  if (state === null) {
    const created = await evo("POST", "/instance/create", {
      instanceName: instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
    const fromCreate = readQr(created?.qrcode ?? {});
    if (fromCreate.base64) return fromCreate;
  }
  return readQr(await evo("GET", `/instance/connect/${enc(instance)}`));
}

/** Desconecta o número da loja (a instância continua existindo para reconectar). */
export async function evolutionLogout(): Promise<void> {
  const { instance } = requireConfig();
  await evo("DELETE", `/instance/logout/${enc(instance)}`);
}
