import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStoreOwner } from "@/lib/auth/owner-middleware";

/**
 * Caixa de entrada do WhatsApp no admin (só o dono da loja). As conversas vêm do
 * webhook da Evolution; o envio usa a mesma API dos avisos de pedido.
 */

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const siteUrl = () => (process.env.SITE_URL || "https://amtfightwear.com.br").replace(/\/+$/, "");

export type WaChat = {
  id: string;
  remote_jid: string;
  phone_normalized: string | null;
  name: string | null;
  customer_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_from_me: boolean | null;
  unread_count: number;
  tags: string[];
  archived: boolean;
  follow_up_at: string | null;
  follow_up_note: string | null;
  customer: { id: string; full_name: string; company: string | null; phone: string | null } | null;
};

export type WaMessage = {
  id: string;
  message_id: string;
  from_me: boolean;
  type: string;
  body: string | null;
  media_mime: string | null;
  media_name: string | null;
  quoted_body: string | null;
  status: string | null;
  sent_at: string;
};

const CHAT_COLUMNS =
  "id, remote_jid, phone_normalized, name, customer_id, last_message_at, last_message_preview, last_message_from_me, unread_count, tags, archived, follow_up_at, follow_up_note, customers(id, full_name, company, phone)";

type ChatRow = Omit<WaChat, "customer"> & { customers: WaChat["customer"] | WaChat["customer"][] };
const toChat = ({ customers, ...c }: ChatRow): WaChat => ({
  ...c,
  customer: Array.isArray(customers) ? (customers[0] ?? null) : customers,
});

async function chatById(id: string): Promise<WaChat> {
  const sb = await db();
  const { data, error } = await sb.from("whatsapp_chats").select(CHAT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Conversa não encontrada.");
  return toChat(data as unknown as ChatRow);
}

/* ------------------------------- Situação ------------------------------- */

/** Conexão do número, webhook ativo e quantas conversas já estão no admin. */
export const adminWaInboxStatus = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async () => {
    const evo = await import("@/lib/whatsapp/evolution.server");
    const sb = await db();
    const expected = `${siteUrl()}/api/public/hooks/whatsapp`;
    const { count } = await sb.from("whatsapp_chats").select("id", { count: "exact", head: true });
    if (!evo.evolutionConfig()) return { configured: false, connected: false, webhookActive: false, chats: count ?? 0, error: null as string | null };
    try {
      const [state, hook] = await Promise.all([evo.evolutionConnectionState(), evo.evolutionFindWebhook()]);
      return {
        configured: true,
        connected: state === "open",
        webhookActive: !!hook?.enabled && hook.url === expected,
        chats: count ?? 0,
        error: null as string | null,
      };
    } catch (err) {
      return { configured: true, connected: false, webhookActive: false, chats: count ?? 0, error: err instanceof Error ? err.message : String(err) };
    }
  });

/** Liga o webhook da instância da loja para este site (mensagens chegam no admin). */
export const adminWaActivateInbox = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .handler(async () => {
    const { evolutionSetWebhook } = await import("@/lib/whatsapp/evolution.server");
    const { webhookToken } = await import("@/lib/whatsapp/inbox.server");
    const token = await webhookToken();
    if (!token) throw new Error("WhatsApp não configurado (EVOLUTION_API_KEY).");
    await evolutionSetWebhook(`${siteUrl()}/api/public/hooks/whatsapp`, { "x-amt-token": token });
    return { ok: true };
  });

const IMPORT_DAYS = 90;
const IMPORT_MESSAGES = 40;
const IMPORT_BATCH = 8;

/**
 * Importa o histórico guardado na Evolution (conversas dos últimos 90 dias, até 40
 * mensagens cada), em lotes: o painel chama de novo com `cursor` até `done`.
 */
export const adminWaImportHistory = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ cursor: z.number().int().min(0).default(0) }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const evo = await import("@/lib/whatsapp/evolution.server");
    const inbox = await import("@/lib/whatsapp/inbox.server");
    const sb = await db();
    const since = new Date(Date.now() - IMPORT_DAYS * 86400000).toISOString();
    const chats = (await evo.evolutionFindChats())
      .filter((c) => c.remoteJid && !inbox.isIgnoredJid(c.remoteJid) && (c.updatedAt ?? "") >= since)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const slice = chats.slice(data.cursor, data.cursor + IMPORT_BATCH);
    let messages = 0;
    for (const c of slice) {
      const parsed = (await evo.evolutionFindMessages(c.remoteJid, IMPORT_MESSAGES))
        .map((r) => inbox.parseEvolutionMessage(r))
        .filter((p): p is NonNullable<typeof p> => !!p);
      const name = parsed.find((p) => p.push_name)?.push_name ?? (c.pushName && c.pushName !== "Você" ? c.pushName : null);
      const chatId = await inbox.upsertChat(c.remoteJid, { phone: parsed.find((p) => p.phone)?.phone ?? null, name });
      messages += await inbox.insertMessages(chatId, parsed);
      // Importar não é "mensagem nova": as não lidas seguem o que o WhatsApp mostra.
      await sb.from("whatsapp_chats").update({ unread_count: Math.max(0, Number(c.unreadCount ?? 0)) }).eq("id", chatId);
    }
    const next = data.cursor + slice.length;
    return { total: chats.length, next, done: next >= chats.length, messages };
  });

/* ------------------------------- Conversas ------------------------------- */

export const adminWaListChats = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({ filter: z.enum(["todas", "nao_lidas", "clientes", "sem_cliente", "retorno", "arquivadas"]).default("todas") })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    let q = sb.from("whatsapp_chats").select(CHAT_COLUMNS).order("last_message_at", { ascending: false, nullsFirst: false }).limit(400);
    q = data.filter === "arquivadas" ? q.eq("archived", true) : q.eq("archived", false);
    if (data.filter === "nao_lidas") q = q.gt("unread_count", 0);
    if (data.filter === "clientes") q = q.not("customer_id", "is", null);
    if (data.filter === "sem_cliente") q = q.is("customer_id", null);
    if (data.filter === "retorno") q = q.not("follow_up_at", "is", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => toChat(r as unknown as ChatRow));
  });

export const adminWaGetChat = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const chat = await chatById(data.id);
    const { data: msgs, error } = await sb
      .from("whatsapp_messages")
      .select("id, message_id, from_me, type, body, media_mime, media_name, quoted_body, status, sent_at")
      .eq("chat_id", data.id)
      .order("sent_at", { ascending: false })
      .limit(150);
    if (error) throw new Error(error.message);
    return { chat, messages: ((msgs ?? []) as WaMessage[]).reverse() };
  });

/** Zera as não lidas e marca como lidas no WhatsApp do cliente. */
export const adminWaMarkRead = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const chat = await chatById(data.id);
    if (!chat.unread_count) return { ok: true };
    await sb.from("whatsapp_chats").update({ unread_count: 0 }).eq("id", chat.id);
    const { data: unread } = await sb
      .from("whatsapp_messages")
      .select("message_id")
      .eq("chat_id", chat.id)
      .eq("from_me", false)
      .order("sent_at", { ascending: false })
      .limit(Math.min(chat.unread_count, 20));
    try {
      const { evolutionMarkRead } = await import("@/lib/whatsapp/evolution.server");
      await evolutionMarkRead(chat.remote_jid, (unread ?? []).map((m) => m.message_id));
    } catch (err) {
      console.error("[whatsapp] não marcou como lida no WhatsApp", err);
    }
    return { ok: true };
  });

export const adminWaSendText = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(4000) }).parse(i))
  .handler(async ({ data }) => {
    const chat = await chatById(data.id);
    const { sendWhatsAppText } = await import("@/lib/whatsapp/evolution.server");
    const r = await sendWhatsAppText(chat.remote_jid, data.text, 600);
    if (!r.ok) throw new Error(r.error);
    return { ok: true };
  });

const MAX_MEDIA_BYTES = 12 * 1024 * 1024;

export const adminWaSendMedia = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        base64: z.string().min(10),
        mimetype: z.string().max(120),
        fileName: z.string().trim().min(1).max(200),
        caption: z.string().max(1000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    if ((data.base64.length * 3) / 4 > MAX_MEDIA_BYTES) throw new Error("Arquivo maior que 12 MB.");
    const chat = await chatById(data.id);
    const { sendWhatsAppMedia } = await import("@/lib/whatsapp/evolution.server");
    const mediatype = data.mimetype.startsWith("image/") ? "image" : data.mimetype.startsWith("video/") ? "video" : "document";
    const r = await sendWhatsAppMedia(chat.remote_jid, {
      mediatype,
      mimetype: data.mimetype,
      fileName: data.fileName,
      base64: data.base64,
      caption: data.caption,
    });
    if (!r.ok) throw new Error(r.error);
    return { ok: true };
  });

/** Foto/áudio/documento de uma mensagem, para exibir no admin. */
export const adminWaMedia = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ message_id: z.string().min(4).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const { evolutionMediaBase64 } = await import("@/lib/whatsapp/evolution.server");
    const m = await evolutionMediaBase64(data.message_id);
    return { dataUrl: `data:${m.mimetype ?? "application/octet-stream"};base64,${m.base64}`, fileName: m.fileName };
  });

export const adminWaUpdateChat = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
        archived: z.boolean().optional(),
        follow_up_at: z.string().max(10).nullable().optional(),
        follow_up_note: z.string().max(300).nullable().optional(),
        customer_id: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { id, ...patch } = data;
    const update: typeof patch & { phone_normalized?: string } = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    if (update.follow_up_at === "") update.follow_up_at = null;
    // Vincular a um cliente com telefone também ensina o telefone desta conversa.
    if (patch.customer_id) {
      const { data: c } = await sb.from("customers").select("phone_normalized").eq("id", patch.customer_id).maybeSingle();
      const chat = await chatById(id);
      if (c?.phone_normalized && !chat.phone_normalized) update.phone_normalized = c.phone_normalized;
    }
    const { error } = await sb.from("whatsapp_chats").update(update).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cadastra o contato da conversa como cliente e já vincula. */
export const adminWaCreateCustomer = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(1).max(160),
        company: z.string().trim().max(160).optional(),
        phone: z.string().trim().max(40).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const chat = await chatById(data.id);
    const phone = data.phone || chat.phone_normalized || null;
    const { data: row, error } = await sb
      .from("customers")
      .insert({ full_name: data.full_name, company: data.company || null, phone, origin: "whatsapp", segment: "lead" })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um cliente com este telefone. Use \"Vincular cliente\".");
      throw new Error(error.message);
    }
    await sb.from("whatsapp_chats").update({ customer_id: row.id }).eq("id", chat.id);
    return { id: row.id };
  });

/* ---------------------------- Respostas rápidas ---------------------------- */

export type QuickReply = { id: string; title: string; body: string };
const QUICK_KEY = "whatsapp_quick_replies";
const DEFAULT_QUICK: QuickReply[] = [
  { id: "saudacao", title: "Saudação", body: "Olá, {nome}! Aqui é da AMT Fight Wear. Como posso te ajudar?" },
  { id: "orcamento", title: "Pedir dados do orçamento", body: "Para eu montar seu orçamento, me diga: modelo, cor, tamanhos e quantidade de cada um." },
  { id: "prazo", title: "Prazo de produção", body: "Nosso prazo de produção é de até 10 dias úteis após a confirmação do pagamento, mais o frete." },
  { id: "andamento", title: "Andamento do pedido", body: "{nome}, seu pedido está em produção. Assim que for despachado te envio o código de rastreio por aqui." },
];

export const adminWaQuickReplies = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async (): Promise<QuickReply[]> => {
    const sb = await db();
    const { data } = await sb.from("app_settings").select("value").eq("key", QUICK_KEY).maybeSingle();
    const list = z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).safeParse(data?.value);
    return list.success && list.data.length ? list.data : DEFAULT_QUICK;
  });

export const adminWaSaveQuickReplies = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .array(z.object({ id: z.string().min(1).max(40), title: z.string().trim().min(1).max(60), body: z.string().trim().min(1).max(1000) }))
      .max(40)
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { error } = await sb
      .from("app_settings")
      .upsert({ key: QUICK_KEY, value: data as never, updated_by: context.userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
