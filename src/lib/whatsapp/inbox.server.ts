/**
 * Caixa de entrada do WhatsApp da loja (servidor): converte mensagens da Evolution
 * API para as tabelas whatsapp_chats / whatsapp_messages.
 *
 * Fontes: webhook da Evolution (mensagens recebidas, enviadas pelo celular e status),
 * envios feitos pelo próprio sistema (avisos de pedido e respostas no admin) e a
 * importação do histórico. Tudo é idempotente pelo id da mensagem do WhatsApp.
 */
import { normalizeWhatsAppNumber } from "@/lib/whatsapp/evolution.server";

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export type ParsedMessage = {
  message_id: string;
  remote_jid: string;
  phone: string | null;
  from_me: boolean;
  push_name: string | null;
  type: string;
  body: string | null;
  media_mime: string | null;
  media_name: string | null;
  quoted_body: string | null;
  status: string | null;
  sent_at: string;
};

/** Conversas que não entram na caixa: grupos, status, canais e transmissões. */
export function isIgnoredJid(jid: string) {
  return !jid || /@(g\.us|broadcast|newsletter)$/.test(jid) || jid === "status@broadcast";
}

const STATUS: Record<string, string> = {
  ERROR: "error",
  PENDING: "pending",
  SERVER_ACK: "sent",
  DELIVERY_ACK: "delivered",
  READ: "read",
  PLAYED: "read",
};
const STATUS_RANK: Record<string, number> = { error: 0, pending: 1, sent: 2, delivered: 3, read: 4 };

/** Telefone a partir de um jid de telefone (…@s.whatsapp.net); @lid não tem telefone. */
function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid || !jid.endsWith("@s.whatsapp.net")) return null;
  return normalizeWhatsAppNumber(jid.split("@")[0].split(":")[0]);
}

function textOf(m: any): string | null {
  if (!m) return null;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    null
  );
}

/** Converte uma mensagem da Evolution (webhook, envio ou histórico). null = ignorar. */
export function parseEvolutionMessage(raw: any): ParsedMessage | null {
  const key = raw?.key ?? {};
  const id: string | undefined = key.id;
  const jid: string = key.remoteJid ?? "";
  if (!id || isIgnoredJid(jid)) return null;
  const m = raw.message ?? {};
  const kind: string = raw.messageType ?? Object.keys(m).find((k) => k.endsWith("Message") || k === "conversation") ?? "unknown";

  let type = "text";
  let body: string | null = null;
  let mime: string | null = null;
  let name: string | null = null;
  switch (kind) {
    case "conversation":
    case "extendedTextMessage":
      body = textOf(m);
      break;
    case "imageMessage":
      type = "image";
      body = m.imageMessage?.caption || null;
      mime = m.imageMessage?.mimetype ?? null;
      break;
    case "videoMessage":
      type = "video";
      body = m.videoMessage?.caption || null;
      mime = m.videoMessage?.mimetype ?? null;
      break;
    case "audioMessage":
      type = "audio";
      mime = m.audioMessage?.mimetype ?? null;
      break;
    case "documentMessage":
    case "documentWithCaptionMessage": {
      const doc = m.documentMessage ?? m.documentWithCaptionMessage?.message?.documentMessage;
      type = "document";
      body = doc?.caption || null;
      mime = doc?.mimetype ?? null;
      name = doc?.fileName ?? doc?.title ?? null;
      break;
    }
    case "stickerMessage":
      type = "sticker";
      break;
    case "locationMessage":
      type = "location";
      body = `📍 Localização${m.locationMessage?.name ? `: ${m.locationMessage.name}` : ""}`;
      break;
    case "contactMessage":
      type = "contact";
      body = `👤 Contato: ${m.contactMessage?.displayName ?? ""}`.trim();
      break;
    case "protocolMessage":
    case "reactionMessage":
    case "senderKeyDistributionMessage":
    case "messageContextInfo":
    case "editedMessage":
    case "pollUpdateMessage":
      return null;
    default:
      body = textOf(m) ?? m.interactiveMessage?.body?.text ?? m.buttonsResponseMessage?.selectedDisplayText ?? m.listResponseMessage?.title ?? null;
      if (!body) type = "other";
  }

  const ts = Number(raw.messageTimestamp ?? 0);
  const quoted = raw.contextInfo?.quotedMessage ?? m?.[kind]?.contextInfo?.quotedMessage;
  const fromMe = !!key.fromMe;
  const altJid = [key.remoteJidAlt, key.senderPn].find((j: unknown) => typeof j === "string" && String(j).endsWith("@s.whatsapp.net")) as string | undefined;
  return {
    message_id: id,
    remote_jid: jid,
    phone: phoneFromJid(jid) ?? phoneFromJid(altJid),
    from_me: fromMe,
    push_name: !fromMe && raw.pushName && raw.pushName !== "Você" ? String(raw.pushName).slice(0, 120) : null,
    type,
    body: body ? String(body).slice(0, 8000) : null,
    media_mime: mime,
    media_name: name,
    quoted_body: quoted ? (textOf(quoted) ?? "Mídia")?.slice(0, 300) ?? null : null,
    status: STATUS[String(raw.status ?? "")] ?? (fromMe ? "sent" : null),
    sent_at: new Date(ts > 0 ? (ts > 1e12 ? ts : ts * 1000) : Date.now()).toISOString(),
  };
}

/** Garante a conversa e devolve o id. Completa nome e telefone quando chegam. */
export async function upsertChat(jid: string, info: { phone?: string | null; name?: string | null }): Promise<string> {
  const sb = await db();
  const { data: existing, error } = await sb
    .from("whatsapp_chats")
    .select("id, phone_normalized, name")
    .eq("remote_jid", jid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) {
    const patch: { phone_normalized?: string; name?: string } = {};
    if (info.phone && !existing.phone_normalized) patch.phone_normalized = info.phone;
    if (info.name && !existing.name) patch.name = info.name;
    if (Object.keys(patch).length) await sb.from("whatsapp_chats").update(patch).eq("id", existing.id);
    return existing.id;
  }
  const { data: created, error: cErr } = await sb
    .from("whatsapp_chats")
    .upsert({ remote_jid: jid, phone_normalized: info.phone ?? null, name: info.name ?? null }, { onConflict: "remote_jid" })
    .select("id")
    .single();
  if (cErr) throw new Error(cErr.message);
  return created.id;
}

/** Grava mensagens novas (ignora as que já existem). */
export async function insertMessages(chatId: string, list: ParsedMessage[]): Promise<number> {
  if (!list.length) return 0;
  const sb = await db();
  const rows = list
    .slice()
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    .map((p) => ({
      chat_id: chatId,
      message_id: p.message_id,
      from_me: p.from_me,
      type: p.type,
      body: p.body,
      media_mime: p.media_mime,
      media_name: p.media_name,
      quoted_body: p.quoted_body,
      status: p.status,
      sent_at: p.sent_at,
    }));
  const { data, error } = await sb.from("whatsapp_messages").upsert(rows, { onConflict: "message_id", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

async function storeParsed(p: ParsedMessage) {
  const chatId = await upsertChat(p.remote_jid, { phone: p.phone, name: p.push_name });
  await insertMessages(chatId, [p]);
}

/** Atualiza o status (enviada → entregue → lida) sem voltar para trás. */
async function updateStatus(messageId: string, status: string) {
  const sb = await db();
  const { data } = await sb.from("whatsapp_messages").select("id, status").eq("message_id", messageId).maybeSingle();
  if (!data) return;
  if ((STATUS_RANK[status] ?? -1) <= (STATUS_RANK[data.status ?? ""] ?? -1)) return;
  await sb.from("whatsapp_messages").update({ status }).eq("id", data.id);
}

/** Evento do webhook da Evolution. */
export async function handleEvolutionEvent(payload: any): Promise<void> {
  const event = String(payload?.event ?? "").toLowerCase().replace(/_/g, ".");
  const data = payload?.data;
  const items: any[] = Array.isArray(data) ? data : data ? [data] : [];
  if (event === "messages.upsert" || event === "send.message") {
    for (const raw of items) {
      const p = parseEvolutionMessage(raw);
      if (p) await storeParsed(p);
    }
  } else if (event === "messages.update") {
    for (const u of items) {
      const id = u?.keyId ?? u?.key?.id;
      const status = STATUS[String(u?.status ?? "")];
      if (id && status) await updateStatus(String(id), status);
    }
  }
}

/**
 * Envio feito pelo sistema (aviso de pedido, resposta no admin): grava a mensagem e,
 * quando o envio foi para um telefone, aprende o telefone daquela conversa (@lid).
 */
export async function recordOutgoingMessage(
  to: string,
  json: any,
  fallback: { type: string; body: string | null; mime?: string; name?: string },
): Promise<void> {
  const jid: string | undefined = json?.key?.remoteJid;
  const id: string | undefined = json?.key?.id;
  if (!jid || !id || isIgnoredJid(jid)) return;
  const sentTo = to.includes("@") ? phoneFromJid(to) : normalizeWhatsAppNumber(to);
  const parsed = parseEvolutionMessage({ ...json, key: { ...json.key, fromMe: true } });
  const p: ParsedMessage = parsed ?? {
    message_id: id,
    remote_jid: jid,
    phone: null,
    from_me: true,
    push_name: null,
    type: fallback.type,
    body: fallback.body,
    media_mime: fallback.mime ?? null,
    media_name: fallback.name ?? null,
    quoted_body: null,
    status: "sent",
    sent_at: new Date().toISOString(),
  };
  if (!p.body && fallback.body) p.body = fallback.body;
  const chatId = await upsertChat(jid, { phone: p.phone ?? sentTo });
  await insertMessages(chatId, [p]);
}

/** Token que a Evolution envia no cabeçalho do webhook (derivado da chave da API). */
export async function webhookToken(): Promise<string | null> {
  const key = process.env.EVOLUTION_API_KEY?.trim();
  if (!key) return null;
  const mac = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    new TextEncoder().encode("amt-loja:whatsapp-webhook"),
  );
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}
