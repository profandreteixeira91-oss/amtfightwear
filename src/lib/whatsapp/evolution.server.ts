/**
 * Cliente mínimo da Evolution API v2 (WhatsApp via instância própria).
 *
 * Variáveis de ambiente (servidor):
 *  - EVOLUTION_API_URL   URL pública da sua Evolution API (ex.: https://whatsapp.amtfightwear.com.br)
 *  - EVOLUTION_API_KEY   chave da instância (ou a AUTHENTICATION_API_KEY global)
 *  - EVOLUTION_INSTANCE  nome da instância conectada ao número da loja
 *
 * Sem configuração, as funções não lançam erro: devolvem { ok: false } e o
 * fluxo do pedido segue normalmente.
 */

export type EvolutionConfig = { url: string; apiKey: string; instance: string };
export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export function evolutionConfig(): EvolutionConfig | null {
  const url = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instance = process.env.EVOLUTION_INSTANCE?.trim();
  if (!url || !apiKey || !instance) return null;
  return { url, apiKey, instance };
}

/** Normaliza para dígitos com DDI 55 (ex.: 5582999998888). */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 ? digits : null;
}

/**
 * Envia texto. `delay` (ms) faz a Evolution mostrar "digitando…" antes de enviar,
 * o que deixa o ritmo mais natural e reduz o risco de bloqueio do número.
 */
export async function sendWhatsAppText(to: string, text: string, delay = 1200): Promise<SendResult> {
  const cfg = evolutionConfig();
  if (!cfg) return { ok: false, error: "Evolution API não configurada" };
  const number = normalizeWhatsAppNumber(to);
  if (!number) return { ok: false, error: "Número inválido" };
  try {
    const res = await fetch(`${cfg.url}/message/sendText/${encodeURIComponent(cfg.instance)}`, {
      method: "POST",
      headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number, text, delay }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    const json = (await res.json().catch(() => ({}))) as { key?: { id?: string } };
    return { ok: true, id: json.key?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Estado da conexão da instância: "open" = número conectado e pronto para enviar. */
export async function evolutionConnectionState(): Promise<string | null> {
  const cfg = evolutionConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/instance/connectionState/${encodeURIComponent(cfg.instance)}`, {
      headers: { apikey: cfg.apiKey },
    });
    if (!res.ok) return `erro ${res.status}`;
    const json = (await res.json()) as { instance?: { state?: string }; state?: string };
    return json.instance?.state ?? json.state ?? null;
  } catch {
    return "inacessível";
  }
}
