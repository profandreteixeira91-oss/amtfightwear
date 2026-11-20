import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Chat do site da loja ("Fale conosco"), ligado ao WhatsApp da loja (instância amt-loja).
 *
 * Mesmo funcionamento do chat da AMT Sistemas: o visitante informa nome, WhatsApp e mensagem; o número da loja
 * manda uma confirmação para o WhatsApp dele, citando a mensagem, e a conversa segue no WhatsApp (celular da loja
 * e /admin/whatsapp). A janela do site mostra a conversa ao vivo e as respostas também chegam no WhatsApp do
 * visitante. O visitante entra no CRM como lead (cliente + oportunidade "novo contato", origem chat-site).
 *
 * Público, sem login: limitado por IP e por sessão. A sessão do visitante é um token aleatório guardado só como
 * hash. A janela mostra apenas as mensagens trocadas a partir do início da sessão, nunca o histórico anterior
 * daquele número (quem digita o telefone de outra pessoa não vê as conversas dela).
 */

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

const STARTS_PER_IP_HOUR = 3;
const STARTS_PER_HOUR = 60;
const MESSAGES_PER_10_MIN = 15;

export type SiteChatMessage = {
  id: string;
  from_me: boolean;
  type: string;
  body: string | null;
  sent_at: string;
};

class SiteChatError extends Error {}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(): string {
  const h = getRequest().headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

type Session = { id: string; chat_id: string; phone_normalized: string | null; started_at: string };

async function sessionOf(token: string): Promise<Session> {
  const sb = await db();
  const { data } = await sb
    .from("whatsapp_site_sessions")
    .select("id, chat_id, phone_normalized, started_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();
  if (!data) throw new SiteChatError("Conversa expirada. Comece de novo.");
  await sb
    .from("whatsapp_site_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);
  return data;
}

/**
 * Mensagens da conversa desde o início da sessão. Inclui conversas do mesmo telefone: o WhatsApp às vezes
 * identifica o cliente por um código de privacidade (@lid) e a resposta chega numa conversa separada.
 */
async function messagesOf(s: Session): Promise<SiteChatMessage[]> {
  const sb = await db();
  const ids = new Set([s.chat_id]);
  if (s.phone_normalized) {
    const { data: same } = await sb
      .from("whatsapp_chats")
      .select("id")
      .eq("phone_normalized", s.phone_normalized)
      .limit(5);
    for (const c of same ?? []) ids.add(c.id);
  }
  const { data } = await sb
    .from("whatsapp_messages")
    .select("id, from_me, type, body, sent_at")
    .in("chat_id", [...ids])
    .eq("hidden", false)
    .gte("sent_at", s.started_at)
    .order("sent_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as SiteChatMessage[]).reverse();
}

/** Mensagem que o sistema mandou e não deve aparecer como resposta da loja (confirmação ou cópia). */
async function markSystemMessage(
  chatId: string,
  messageId: string | null,
  body: string,
  source: "auto" | "relay",
) {
  if (!messageId) return;
  const sb = await db();
  const hidden = source === "relay";
  await sb
    .from("whatsapp_messages")
    .upsert(
      {
        chat_id: chatId,
        message_id: messageId,
        from_me: true,
        type: "text",
        body,
        status: "sent",
        sent_at: new Date().toISOString(),
        source,
        hidden,
      },
      { onConflict: "message_id", ignoreDuplicates: true },
    );
  // O webhook pode ter gravado antes como mensagem comum: corrige a origem.
  await sb.from("whatsapp_messages").update({ source, hidden }).eq("message_id", messageId);
}

/** Depois de uma mensagem do visitante, a conversa mostra a mensagem dele e fica como não lida. */
async function touchFromVisitor(chatId: string, text: string, at: string) {
  const sb = await db();
  const { data } = await sb
    .from("whatsapp_chats")
    .select("unread_count")
    .eq("id", chatId)
    .maybeSingle();
  await sb
    .from("whatsapp_chats")
    .update({
      last_message_at: at,
      last_message_preview: text.slice(0, 160),
      last_message_from_me: false,
      unread_count: Math.max(1, Number(data?.unread_count ?? 0)),
      archived: false,
    })
    .eq("id", chatId);
}

/** Conversa do telefone: a que já existe (mesmo telefone) ou uma nova pelo jid do WhatsApp. */
async function chatFor(jid: string, phone: string, name: string): Promise<string> {
  const sb = await db();
  const { data: byPhone } = await sb
    .from("whatsapp_chats")
    .select("id")
    .eq("phone_normalized", phone)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (byPhone) return byPhone.id;
  const { upsertChat } = await import("@/lib/whatsapp/inbox.server");
  return upsertChat(jid, { phone, name });
}

/** Visitante → lead no CRM (cliente + oportunidade aberta). Nunca bloqueia o chat. */
async function registerLead(chatId: string, name: string, phone: string, message: string) {
  try {
    const sb = await db();
    const { data: customerId, error } = await sb.rpc("store_match_customer", {
      p_name: name,
      p_email: null as unknown as string,
      p_phone: phone,
      p_document: null as unknown as string,
      p_company: null as unknown as string,
      p_origin: "chat-site",
    });
    if (error || !customerId) {
      if (error) console.error("[chat-site] lead não registrado", error.message);
      return;
    }
    await sb
      .from("whatsapp_chats")
      .update({ customer_id: customerId as string })
      .eq("id", chatId)
      .is("customer_id", null);
    const { data: open } = await sb
      .from("crm_deals")
      .select("id")
      .eq("customer_id", customerId as string)
      .not("stage", "in", "(ganho,perdido)")
      .limit(1)
      .maybeSingle();
    if (open) return;
    const { error: dErr } = await sb.from("crm_deals").insert({
      title: `Chat do site · ${name}`,
      customer_id: customerId as string,
      stage: "novo_contato",
      origin: "chat-site",
      notes: `Conversa iniciada pelo chat do site:\n${message}`,
    });
    if (dErr) console.error("[chat-site] oportunidade não criada", dErr.message);
  } catch (err) {
    console.error("[chat-site] lead não registrado", err);
  }
}

function fail(err: unknown): never {
  if (err instanceof SiteChatError) throw new Error(err.message);
  console.error("[chat-site]", err);
  throw new Error("O atendimento não respondeu. Tente de novo em instantes.");
}

const tokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const siteChatStart = createServerFn({ method: "POST" })
  .validator((i: unknown) =>
    z
      .object({
        name: z.string().max(200),
        phone: z.string().max(60),
        message: z.string().max(4000),
        website: z.string().max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    try {
      const ev = await import("@/lib/whatsapp/evolution.server");
      if ((data.website ?? "").trim())
        throw new SiteChatError("Não foi possível iniciar a conversa.");
      const name = data.name.trim().replace(/\s+/g, " ").slice(0, 80);
      const phone = ev.normalizeWhatsAppNumber(data.phone);
      const text = data.message.trim().slice(0, 1000);
      if (name.length < 2) throw new SiteChatError("Informe o seu nome.");
      if (!phone) throw new SiteChatError("Informe um WhatsApp válido, com DDD.");
      if (text.length < 2) throw new SiteChatError("Escreva a sua mensagem.");

      const cfg = ev.evolutionConfig();
      if (!cfg)
        throw new SiteChatError(
          "O atendimento por WhatsApp está indisponível agora. Tente de novo mais tarde.",
        );
      const sb = await db();
      const ipHash = await sha256Hex(`${clientIp()}|${cfg.apiKey.slice(0, 12)}`);
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const [{ count: byIp }, { count: total }] = await Promise.all([
        sb
          .from("whatsapp_site_sessions")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", hourAgo),
        sb
          .from("whatsapp_site_sessions")
          .select("id", { count: "exact", head: true })
          .gte("created_at", hourAgo),
      ]);
      if ((byIp ?? 0) >= STARTS_PER_IP_HOUR || (total ?? 0) >= STARTS_PER_HOUR) {
        throw new SiteChatError(
          "Muitas conversas iniciadas agora. Tente de novo em alguns minutos.",
        );
      }
      if ((await ev.evolutionConnectionState()) !== "open") {
        throw new SiteChatError(
          "O atendimento por WhatsApp está indisponível agora. Tente de novo mais tarde.",
        );
      }

      // O número precisa ter WhatsApp: a conversa continua lá.
      const jidFound = await ev.evolutionCheckNumber(phone);
      if (!jidFound)
        throw new SiteChatError("Esse número não tem WhatsApp. Confira o DDD e o número.");

      // Antes do envio: a mensagem do visitante vem antes da confirmação, e a janela começa um pouco antes
      // (o WhatsApp grava a hora da confirmação em segundos inteiros).
      const at = new Date(Date.now() - 1000).toISOString();
      const startedAt = new Date(Date.now() - 3000).toISOString();
      const firstName = name.split(" ")[0];
      const greeting = `Olá, ${firstName}! Aqui é a AMT Fight Wear. Recebemos sua mensagem pelo site:\n\n“${text}”\n\nJá vamos te responder por aqui.`;
      const sent = await ev.sendWhatsAppText(phone, greeting, 0, { record: false });
      if (!sent.ok)
        throw new SiteChatError(
          "Não foi possível falar com o seu WhatsApp agora. Tente de novo em instantes.",
        );
      const chatId = await chatFor(sent.jid || jidFound, phone, name);
      const { data: chat } = await sb
        .from("whatsapp_chats")
        .select("tags, name")
        .eq("id", chatId)
        .maybeSingle();
      await sb
        .from("whatsapp_chats")
        .update({
          tags: [...new Set([...(chat?.tags ?? []), "Site"])],
          ...(chat?.name ? {} : { name }),
        })
        .eq("id", chatId);

      await sb.from("whatsapp_messages").insert({
        chat_id: chatId,
        message_id: `site-${crypto.randomUUID()}`,
        from_me: false,
        type: "text",
        body: text,
        sent_at: at,
        source: "site",
      });
      await markSystemMessage(chatId, sent.id, greeting, "auto");
      await touchFromVisitor(chatId, text, at);

      const token = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const session = { chat_id: chatId, phone_normalized: phone, started_at: startedAt };
      const { data: row, error } = await sb
        .from("whatsapp_site_sessions")
        .insert({
          ...session,
          token_hash: await sha256Hex(token),
          ip_hash: ipHash,
          visitor_name: name,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await registerLead(chatId, name, phone, text);
      return { token, messages: await messagesOf({ id: row.id, ...session }) };
    } catch (err) {
      fail(err);
    }
  });

export const siteChatPoll = createServerFn({ method: "POST" })
  .validator((i: unknown) => z.object({ token: tokenSchema }).parse(i))
  .handler(async ({ data }) => {
    try {
      return { messages: await messagesOf(await sessionOf(data.token)) };
    } catch (err) {
      fail(err);
    }
  });

export const siteChatSend = createServerFn({ method: "POST" })
  .validator((i: unknown) => z.object({ token: tokenSchema, text: z.string().max(4000) }).parse(i))
  .handler(async ({ data }) => {
    try {
      const session = await sessionOf(data.token);
      const text = data.text.trim().slice(0, 1000);
      if (!text) throw new SiteChatError("Escreva a mensagem.");
      const sb = await db();
      const since = new Date(Date.now() - 600_000).toISOString();
      const { count } = await sb
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("chat_id", session.chat_id)
        .eq("source", "site")
        .gte("sent_at", since);
      if ((count ?? 0) >= MESSAGES_PER_10_MIN) {
        throw new SiteChatError(
          "Muitas mensagens seguidas. Aguarde um pouco ou continue pelo WhatsApp.",
        );
      }
      const { data: chat } = await sb
        .from("whatsapp_chats")
        .select("remote_jid, phone_normalized")
        .eq("id", session.chat_id)
        .maybeSingle();
      if (!chat) throw new SiteChatError("Conversa expirada. Comece de novo.");
      const at = new Date().toISOString();
      await sb.from("whatsapp_messages").insert({
        chat_id: session.chat_id,
        message_id: `site-${crypto.randomUUID()}`,
        from_me: false,
        type: "text",
        body: text,
        sent_at: at,
        source: "site",
      });
      // Cópia no WhatsApp: é o único jeito de a mensagem do site aparecer no celular da loja, na mesma conversa.
      const relay = `📝 Mensagem enviada pelo site:\n“${text}”`;
      const { sendWhatsAppText } = await import("@/lib/whatsapp/evolution.server");
      const sent = await sendWhatsAppText(chat.phone_normalized ?? chat.remote_jid, relay, 0, {
        record: false,
      });
      if (sent.ok) await markSystemMessage(session.chat_id, sent.id, relay, "relay");
      else console.error("[chat-site] cópia da mensagem do site não enviada", sent.error);
      await touchFromVisitor(session.chat_id, text, at);
      return { messages: await messagesOf(session) };
    } catch (err) {
      fail(err);
    }
  });
