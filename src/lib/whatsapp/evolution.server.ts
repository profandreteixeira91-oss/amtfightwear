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
export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };
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

/**
 * Envia texto. `delay` (ms) faz a Evolution mostrar "digitando…" antes de enviar,
 * o que deixa o ritmo mais natural e reduz o risco de bloqueio do número.
 */
export async function sendWhatsAppText(to: string, text: string, delay = 1200): Promise<SendResult> {
  const cfg = evolutionConfig();
  if (!cfg) return { ok: false, error: "WhatsApp não configurado" };
  const number = normalizeWhatsAppNumber(to);
  if (!number) return { ok: false, error: "Número inválido" };
  try {
    const json = await evo<{ key?: { id?: string } }>("POST", `/message/sendText/${enc(cfg.instance)}`, {
      number,
      text,
      delay,
    });
    return { ok: true, id: json?.key?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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
