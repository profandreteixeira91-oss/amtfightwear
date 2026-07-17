import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GRAPH = "https://graph.facebook.com/v21.0";

// ============= HELPERS =============

type MetaConn = {
  id: string;
  page_id: string;
  page_access_token: string;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  token_expires_at: string | null;
};

async function getActiveConnection(supabase: any): Promise<MetaConn | null> {
  const { data } = await supabase
    .from("meta_connections")
    .select("id, page_id, page_access_token, instagram_business_account_id, instagram_username, token_expires_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: token }).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const j = await res.json();
  if (!res.ok) throw new Error((j as { error?: { message: string } })?.error?.message || `Graph API error: ${res.status}`);
  return j as T;
}

async function graphPost<T>(path: string, token: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error((j as { error?: { message: string } })?.error?.message || `Graph API error: ${res.status}`);
  return j as T;
}

// ============= ACCOUNT =============

export const getIgAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: account } = await context.supabase
      .from("ig_accounts")
      .select("*")
      .order("last_synced_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const conn = await getActiveConnection(context.supabase as any);
    return { account, hasConnection: !!conn, connection: conn ? { id: conn.id, username: conn.instagram_username, expiresAt: conn.token_expires_at } : null };
  });

export const subscribeIgWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await getActiveConnection(context.supabase as any);
    if (!conn) throw new Error("Nenhuma conexão ativa do Instagram. Conecte primeiro.");

    // Página do Facebook — só assina se o token tiver 'pages_messaging'.
    // Como o fluxo do Instagram (DMs, comments, mentions) usa o endpoint do
    // IG Business, tornamos este passo tolerante a falhas.
    const pageFields = [
      "messages",
      "messaging_postbacks",
      "message_reactions",
      "message_reads",
      "message_deliveries",
      "message_echoes",
    ].join(",");

    let pageResp: any = null;
    let pageWarning: string | null = null;
    try {
      pageResp = await graphPost<{ success?: boolean }>(
        `${conn.page_id}/subscribed_apps`,
        conn.page_access_token,
        { subscribed_fields: pageFields },
      );
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      pageResp = { error: msg };
      if (/pages_messaging/i.test(msg)) {
        pageWarning =
          "Assinatura da Página ignorada: token sem 'pages_messaging'. As DMs, comentários e menções continuam funcionando pelo endpoint do Instagram Business abaixo. Para habilitar também no nível da Página, adicione 'pages_messaging' às permissões do app no Meta e reconecte o Instagram.";
      } else {
        pageWarning = `Assinatura da Página falhou: ${msg}`;
      }
    }

    // Instagram Business — endpoint principal para DMs/comments/mentions.
    let igResp: any = null;
    if (conn.instagram_business_account_id) {
      const igFields = [
        "messages",
        "messaging_postbacks",
        "message_reactions",
        "message_reads",
        "comments",
        "mentions",
        "story_insights",
      ].join(",");
      try {
        igResp = await graphPost(
          `${conn.instagram_business_account_id}/subscribed_apps`,
          conn.page_access_token,
          { subscribed_fields: igFields },
        );
      } catch (e: any) {
        igResp = { error: e?.message ?? String(e) };
      }
    }

    return { ok: true, page: pageResp, pageWarning, instagram: igResp };
  });

export const syncIgProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const t0 = Date.now();
    const conn = await getActiveConnection(context.supabase as any);
    if (!conn || !conn.instagram_business_account_id) {
      throw new Error("Nenhuma conta Instagram Business conectada. Vá em Conexões e APIs.");
    }
    try {
      const profile = await graphGet<{
        id: string; username?: string; name?: string; biography?: string; website?: string;
        profile_picture_url?: string; followers_count?: number; follows_count?: number;
        media_count?: number;
      }>(
        conn.instagram_business_account_id,
        conn.page_access_token,
        { fields: "id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count" },
      );

      const { data: upserted, error } = await context.supabase
        .from("ig_accounts")
        .upsert(
          {
            user_id: context.userId,
            connection_id: conn.id,
            ig_user_id: profile.id,
            username: profile.username ?? null,
            name: profile.name ?? null,
            biography: profile.biography ?? null,
            website: profile.website ?? null,
            profile_picture_url: profile.profile_picture_url ?? null,
            followers_count: profile.followers_count ?? 0,
            follows_count: profile.follows_count ?? 0,
            media_count: profile.media_count ?? 0,
            account_type: null,
            status: "connected",
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,ig_user_id" },
        )
        .select()
        .single();
      if (error) throw new Error(error.message);

      await (context.supabase as any).from("ig_sync_log").insert({
        user_id: context.userId,
        ig_account_id: upserted.id,
        sync_type: "profile",
        status: "success",
        items_count: 1,
        duration_ms: Date.now() - t0,
      });

      return upserted;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await (context.supabase as any).from("ig_sync_log").insert({
        user_id: context.userId,
        sync_type: "profile",
        status: "error",
        error: msg,
        duration_ms: Date.now() - t0,
      });
      throw e;
    }
  });

export const syncIgMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const t0 = Date.now();
    const conn = await getActiveConnection(context.supabase as any);
    if (!conn?.instagram_business_account_id) throw new Error("Conta Instagram não conectada.");
    const { data: acc } = await context.supabase
      .from("ig_accounts").select("id").eq("user_id", context.userId).limit(1).maybeSingle();

    try {
      const resp = await graphGet<{ data?: Array<{
        id: string; media_type?: string; caption?: string; permalink?: string;
        thumbnail_url?: string; media_url?: string; timestamp?: string;
        like_count?: number; comments_count?: number;
      }> }>(
        `${conn.instagram_business_account_id}/media`,
        conn.page_access_token,
        { fields: "id,media_type,caption,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count", limit: "25" },
      );
      const items = resp.data ?? [];
      if (items.length) {
        await (context.supabase as any).from("ig_media_cache").upsert(
          items.map((m) => ({
            user_id: context.userId,
            ig_account_id: acc?.id ?? null,
            media_id: m.id,
            media_type: m.media_type ?? null,
            caption: m.caption ?? null,
            permalink: m.permalink ?? null,
            thumbnail_url: m.thumbnail_url ?? null,
            media_url: m.media_url ?? null,
            timestamp: m.timestamp ?? null,
            like_count: m.like_count ?? 0,
            comments_count: m.comments_count ?? 0,
            synced_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,media_id" },
        );
      }
      await (context.supabase as any).from("ig_sync_log").insert({
        user_id: context.userId, ig_account_id: acc?.id ?? null,
        sync_type: "media", status: "success", items_count: items.length, duration_ms: Date.now() - t0,
      });
      return { count: items.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await (context.supabase as any).from("ig_sync_log").insert({
        user_id: context.userId, sync_type: "media", status: "error", error: msg, duration_ms: Date.now() - t0,
      });
      throw e;
    }
  });

// ============= FULL INBOX SYNC =============
// Puxa TODAS as conversas + TODAS as mensagens do perfil, paginando os cursores
// da Graph API — como se fosse a Inbox nativa do Instagram.

async function graphGetAbs<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const j = await res.json();
  if (!res.ok) throw new Error((j as { error?: { message: string } })?.error?.message || `Graph API error: ${res.status}`);
  return j as T;
}

type IgParticipant = { id: string; username?: string; name?: string };
type IgMessageRaw = {
  id: string;
  from?: { id: string; username?: string };
  to?: { data?: Array<{ id: string; username?: string }> };
  message?: string;
  created_time?: string;
  attachments?: { data?: Array<{ id?: string; mime_type?: string; name?: string; image_data?: { url?: string }; video_data?: { url?: string }; file_url?: string }> };
};
type IgPaged<T> = { data?: T[]; paging?: { cursors?: { after?: string }; next?: string } };

export const syncIgInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      maxConversations: z.number().min(1).max(2000).optional(),
      messagesPerConversation: z.number().min(1).max(2000).optional(),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const t0 = Date.now();
    const conn = await getActiveConnection(context.supabase as any);
    if (!conn?.instagram_business_account_id) throw new Error("Conta Instagram não conectada.");
    const pageId = conn.page_id;
    const token = conn.page_access_token;
    const maxConvs = data.maxConversations ?? 500;
    const maxMsgs = data.messagesPerConversation ?? 500;

    const { data: acc } = await context.supabase
      .from("ig_accounts").select("id, ig_user_id").eq("user_id", context.userId).limit(1).maybeSingle();
    // Fallback: se ig_accounts.ig_user_id não estiver preenchido, usar o instagram_business_account_id
    // da conexão. Sem isso, todas as mensagens caíam como direction="in" (inclusive as enviadas pela marca).
    const businessIgsid = (acc?.ig_user_id as string | undefined) ?? conn.instagram_business_account_id;

    let convCount = 0;
    let msgTotal = 0;
    let firstError: string | null = null;

    try {
      // 1) Paginar TODAS as conversas
      let nextConv: string | null =
        `${GRAPH}/${pageId}/conversations?platform=instagram&fields=id,updated_time,participants&limit=50&access_token=${token}`;
      const convs: Array<{
        id: string; updated_time?: string;
        participants?: { data?: IgParticipant[] };
      }> = [];
      while (nextConv && convs.length < maxConvs) {
        const page: IgPaged<{ id: string; updated_time?: string; participants?: { data?: IgParticipant[] } }> = await graphGetAbs(nextConv);
        convs.push(...(page.data ?? []));
        nextConv = page.paging?.next ?? null;
      }

      // 2) Para cada conversa, paginar TODAS as mensagens
      const bizUsernameLc = conn.instagram_username?.toLowerCase() ?? null;
      for (const conv of convs.slice(0, maxConvs)) {
        const participants = conv.participants?.data ?? [];
        // Enriquecer TODOS os participantes com username/name/profile_pic para identificar
        // corretamente quem é o negócio (por username) e quem é o "outro".
        const enrichedParticipants: Array<IgParticipant & { profile_pic?: string | null }> = [];
        for (const p of participants) {
          let uName = p.username ?? undefined;
          let pName = p.name ?? undefined;
          let profile_pic: string | null = null;
          try {
            const info = await graphGetAbs<{ username?: string; name?: string; profile_pic?: string }>(
              `${GRAPH}/${p.id}?fields=username,name,profile_pic&access_token=${token}`,
            );
            uName = info.username ?? uName;
            pName = info.name ?? pName;
            profile_pic = info.profile_pic ?? null;
          } catch { /* ignore */ }
          enrichedParticipants.push({ ...p, username: uName, name: pName, profile_pic });
        }
        // "outro" = qualquer participante que NÃO seja o negócio (por username OU por IGSID).
        const other = enrichedParticipants.find((p) => {
          const u = p.username?.toLowerCase();
          if (bizUsernameLc && u && u === bizUsernameLc) return false;
          if (p.id === businessIgsid) return false;
          return true;
        }) ?? enrichedParticipants.find((p) => p.id !== businessIgsid) ?? enrichedParticipants[0];
        if (!other) continue;
        const updated = conv.updated_time ?? new Date().toISOString();
        const windowExpires = new Date(new Date(updated).getTime() + 7 * 86400000).toISOString();
        const avatarUrl: string | null = other.profile_pic ?? null;
        const username: string | null = other.username ?? null;
        const name: string | null = other.name ?? null;

        // Paginar mensagens da conversa
        const msgs: IgMessageRaw[] = [];
        let nextMsg: string | null =
          `${GRAPH}/${conv.id}/messages?fields=id,from,to,message,created_time,attachments&limit=50&access_token=${token}`;
        while (nextMsg && msgs.length < maxMsgs) {
          const page: IgPaged<IgMessageRaw> = await graphGetAbs(nextMsg);
          const batch = page.data ?? [];
          // Alguns campos vêm apenas quando pedidos por ID; refetch se necessário
          const enriched: IgMessageRaw[] = [];
          for (const m of batch) {
            if (m.message !== undefined || m.attachments) { enriched.push(m); continue; }
            try {
              const full = await graphGetAbs<IgMessageRaw>(
                `${GRAPH}/${m.id}?fields=id,from,to,message,created_time,attachments&access_token=${token}`,
              );
              enriched.push({ ...m, ...full });
            } catch { enriched.push(m); }
          }
          msgs.push(...enriched);
          nextMsg = page.paging?.next ?? null;
        }

        const sortedByDate = [...msgs].sort((a, b) =>
          new Date(a.created_time ?? 0).getTime() - new Date(b.created_time ?? 0).getTime(),
        );
        const lastMsg = sortedByDate[sortedByDate.length - 1];
        const lastPreview = lastMsg?.message?.slice(0, 120) ?? (lastMsg?.attachments?.data?.length ? "[anexo]" : null);

        const { data: convRow } = await (context.supabase as any)
          .from("ig_conversations")
          .upsert({
            user_id: context.userId,
            ig_account_id: acc?.id ?? null,
            channel: "instagram",
            participant_igsid: other.id,
            participant_username: username,
            participant_name: name,
            participant_avatar_url: avatarUrl,
            last_message_at: lastMsg?.created_time ?? updated,
            last_message_preview: lastPreview,
            window_expires_at: windowExpires,
          }, { onConflict: "user_id,channel,participant_igsid" })
          .select("id, lead_id")
          .single();

        // Auto-link: se ainda não há lead_id e existe um prospect_contact com esse @, vincula.
        if (convRow && !convRow.lead_id && username) {
          const handleLc = username.toLowerCase();
          const { data: contactRow } = await (context.supabase as any)
            .from("prospect_contacts")
            .select("company_id")
            .eq("channel", "instagram")
            .ilike("value", handleLc)
            .limit(1)
            .maybeSingle();
          if (contactRow?.company_id) {
            await (context.supabase as any)
              .from("ig_conversations")
              .update({ lead_id: contactRow.company_id })
              .eq("id", convRow.id);
          }
        }

        if (convRow && msgs.length) {
          const bizUsername = conn.instagram_username?.toLowerCase();
          const rows = msgs.map((m) => {
            const att = m.attachments?.data ?? [];
            // Detecta a direção de forma robusta: compara IDs (IGSID/IG Business ID)
            // e faz fallback pelo username da conta (quando a Graph retorna apenas username).
            const fromId = m.from?.id;
            const fromUser = m.from?.username?.toLowerCase();
            const isOut =
              (!!fromId && fromId === businessIgsid) ||
              (!!bizUsername && !!fromUser && fromUser === bizUsername);
            return {
              user_id: context.userId,
              conversation_id: convRow.id,
              mid: m.id,
              direction: isOut ? "out" : "in",
              text: m.message ?? null,
              attachments: att.length ? att : null,
              sent_at: m.created_time ?? new Date().toISOString(),
            };
          });
          // upsert em lotes de 200
          for (let i = 0; i < rows.length; i += 200) {
            await (context.supabase as any).from("ig_messages")
              .upsert(rows.slice(i, i + 200), { onConflict: "conversation_id,mid" });
          }
          msgTotal += rows.length;
        }
        convCount++;
      }
    } catch (e) {
      firstError = e instanceof Error ? e.message : String(e);
    }

    await (context.supabase as any).from("ig_sync_log").insert({
      user_id: context.userId, ig_account_id: acc?.id ?? null,
      sync_type: "inbox_full",
      status: firstError ? "error" : "success",
      items_count: convCount + msgTotal,
      duration_ms: Date.now() - t0,
      error: firstError,
    });

    if (firstError && convCount === 0) throw new Error(firstError);
    return { conversations: convCount, messages: msgTotal, error: firstError };
  });

// ============= CONVERSATIONS =============

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(200).optional(),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("ig_conversations")
      .select("*")
      .eq("user_id", context.userId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`participant_username.ilike.${s},participant_name.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from("ig_conversations").select("*").eq("id", data.id).eq("user_id", context.userId).single();
    if (error) throw new Error(error.message);

    const { data: messages } = await context.supabase
      .from("ig_messages").select("*").eq("conversation_id", data.id).order("sent_at", { ascending: true }).limit(500);

    const { data: events } = await context.supabase
      .from("ig_events").select("*").eq("conversation_id", data.id).order("created_at", { ascending: false }).limit(50);

    let lead: { id: string; name: string; city: string | null; phone: string | null } | null = null;
    if (conv.lead_id) {
      const { data: l } = await (context.supabase as any)
        .from("prospect_companies").select("id, name, city, phone").eq("id", conv.lead_id).maybeSingle();
      lead = l;
    }

    // reset unread
    if (conv.unread_count > 0) {
      await (context.supabase as any).from("ig_conversations").update({ unread_count: 0 }).eq("id", data.id);
    }

    return { conversation: conv, messages: messages ?? [], events: events ?? [], lead };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ conversationId: z.string().uuid(), text: z.string().min(1).max(1000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: conv, error: cErr } = await context.supabase
      .from("ig_conversations").select("*").eq("id", data.conversationId).eq("user_id", context.userId).single();
    if (cErr || !conv) throw new Error("Conversa não encontrada.");

    // 7-day window check
    if (conv.window_expires_at && new Date(conv.window_expires_at) < new Date()) {
      throw new Error("Janela de 7 dias da Meta expirou. Use o botão 'Abrir Direct manualmente' para responder.");
    }

    const conn = await getActiveConnection(context.supabase as any);
    if (!conn?.instagram_business_account_id) throw new Error("Conta Instagram não conectada.");

    // Envia via Messenger Platform (Page endpoint) — usa pages_messaging + instagram_manage_messages.
    // O endpoint /{ig-user-id}/messages requer a capability "Instagram messaging" (Instagram Login API),
    // que dispara o erro (#3) "Application does not have the capability to make this API call".
    let resp: { message_id?: string };
    try {
      resp = await graphPost<{ message_id?: string }>(
        `${conn.page_id}/messages`,
        conn.page_access_token,
        {
          recipient: { id: conv.participant_igsid },
          message: { text: data.text },
          messaging_type: "RESPONSE",
        },
      );
    } catch (e: any) {
      // Fallback: se a Page não puder enviar, tenta o endpoint do IG Business (Instagram Login API)
      const msg = String(e?.message ?? e);
      if (/capability|#3|#10|#200/i.test(msg)) {
        resp = await graphPost<{ message_id?: string }>(
          `${conn.instagram_business_account_id}/messages`,
          conn.page_access_token,
          { recipient: { id: conv.participant_igsid }, message: { text: data.text } },
        );
      } else {
        throw e;
      }
    }

    await (context.supabase as any).from("ig_messages").insert({
      user_id: context.userId,
      conversation_id: conv.id,
      mid: resp.message_id ?? null,
      direction: "out",
      text: data.text,
      sent_at: new Date().toISOString(),
    });
    await (context.supabase as any).from("ig_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: data.text.slice(0, 120),
      status: conv.status === "novo_lead" ? "em_atendimento" : conv.status,
    }).eq("id", conv.id);
    await (context.supabase as any).from("ig_events").insert({
      user_id: context.userId, conversation_id: conv.id, lead_id: conv.lead_id,
      event_type: "message_sent", payload: { text: data.text.slice(0, 200) }, actor_id: context.userId,
    });

    return { ok: true, message_id: resp.message_id ?? null };
  });

export const updateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.string().optional(),
      assignee_id: z.string().uuid().nullable().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.assignee_id !== undefined) patch.assignee_id = data.assignee_id;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { data: row, error } = await (context.supabase as any)
      .from("ig_conversations").update(patch).eq("id", data.id).eq("user_id", context.userId).select().single();
    if (error) throw new Error(error.message);

    if (data.status) {
      await (context.supabase as any).from("ig_events").insert({
        user_id: context.userId, conversation_id: data.id, lead_id: row.lead_id,
        event_type: "status_changed", payload: { status: data.status }, actor_id: context.userId,
      });
    }
    return row;
  });

export const promoteConversationToLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ conversationId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: conv } = await context.supabase
      .from("ig_conversations").select("*").eq("id", data.conversationId).eq("user_id", context.userId).single();
    if (!conv) throw new Error("Conversa não encontrada.");
    if (conv.lead_id) return { lead_id: conv.lead_id, created: false };

    const { data: lead, error } = await (context.supabase as any).from("prospect_companies").insert({
      owner_id: context.userId,
      name: conv.participant_name ?? conv.participant_username ?? "Contato Instagram",
      normalized_name: (conv.participant_username ?? conv.participant_name ?? "contato").toLowerCase().trim(),
      origin: "Instagram Direct",
      status: "ativo",
      pipeline_stage: "novo",
      tags: ["instagram"],
    }).select("id").single();
    if (error) throw new Error(error.message);
    if (conv.participant_username) {
      await (context.supabase as any).from("prospect_contacts").insert({
        owner_id: context.userId, company_id: lead.id,
        channel: "instagram", value: conv.participant_username, is_primary: true, source: "ig_direct",
      });
    }

    await (context.supabase as any).from("ig_conversations").update({ lead_id: lead.id }).eq("id", conv.id);
    await (context.supabase as any).from("ig_events").insert({
      user_id: context.userId, conversation_id: conv.id, lead_id: lead.id,
      event_type: "lead_created", actor_id: context.userId,
    });
    return { lead_id: lead.id, created: true };
  });

// ============= DASHBOARD =============

export const getDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [accs, convs, msgs, leads] = await Promise.all([
      (context.supabase as any).from("ig_accounts").select("id, status, followers_count").eq("user_id", context.userId),
      (context.supabase as any).from("ig_conversations").select("id, status, unread_count, created_at, last_message_at").eq("user_id", context.userId),
      (context.supabase as any).from("ig_messages").select("id, direction, sent_at").eq("user_id", context.userId).gte("sent_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      (context.supabase as any).from("prospect_companies").select("id, status, created_at").eq("owner_id", context.userId).eq("origin", "Instagram Direct"),
    ]);

    const conversations = (convs.data ?? []) as Array<{ status: string; unread_count: number; created_at: string }>;
    const messages = (msgs.data ?? []) as Array<{ direction: string; sent_at: string }>;
    const igLeads = (leads.data ?? []) as Array<{ status: string; created_at: string }>;
    const accounts = (accs.data ?? []) as Array<{ followers_count: number }>;
    const now = Date.now();

    return {
      accounts: accounts.length,
      totalFollowers: accounts.reduce((s, a) => s + (a.followers_count ?? 0), 0),
      activeConversations: conversations.filter((c) => c.status === "em_atendimento" || c.status === "aguardando").length,
      newLeadsToday: conversations.filter((c) => new Date(c.created_at).getTime() > now - 86400000).length,
      pending: conversations.filter((c) => c.unread_count > 0).length,
      sent7d: messages.filter((m) => m.direction === "out").length,
      received7d: messages.filter((m) => m.direction === "in").length,
      customers: igLeads.filter((l) => l.status === "Cliente").length,
      totalIgLeads: igLeads.length,
    };
  });

// ============= COMMENTS =============

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ig_comments").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

// ============= AUTOMATIONS =============

const AutomationInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  trigger: z.enum(["new_conversation", "new_comment", "keyword_match", "mention"]),
  conditions: z.record(z.string(), z.unknown()).default({}),
  actions: z.array(z.record(z.string(), z.unknown())).default([]),
  enabled: z.boolean().default(true),
});

export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ig_automations").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AutomationInput.parse(i))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { data: row, error } = await (context.supabase as any).from("ig_automations")
        .update({ name: data.name, trigger: data.trigger, conditions: data.conditions, actions: data.actions, enabled: data.enabled })
        .eq("id", data.id).eq("user_id", context.userId).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await (context.supabase as any).from("ig_automations").insert({
      user_id: context.userId,
      name: data.name, trigger: data.trigger, conditions: data.conditions, actions: data.actions, enabled: data.enabled,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("ig_automations").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= ADMIN =============

export const getIgAdminInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [syncLogs, webhookLogs, connections] = await Promise.all([
      (context.supabase as any).from("ig_sync_log").select("*").order("created_at", { ascending: false }).limit(50),
      (context.supabase as any).from("ig_webhook_log").select("*").order("received_at", { ascending: false }).limit(50),
      (context.supabase as any).from("meta_connections").select("id, instagram_username, status, token_expires_at, created_at").order("created_at", { ascending: false }),
    ]);
    return {
      syncLogs: syncLogs.data ?? [],
      webhookLogs: webhookLogs.data ?? [],
      connections: connections.data ?? [],
      webhookUrl: "https://marketing.amtfightwear.com.br/api/public/hooks/ig-webhook",
    };
  });

// ============= AI TOOLS =============

const AiInput = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(["summarize", "suggest_reply", "classify_intent", "next_steps", "score"]),
});

export const aiConversationTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AiInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: conv } = await context.supabase
      .from("ig_conversations").select("*").eq("id", data.conversationId).eq("user_id", context.userId).single();
    if (!conv) throw new Error("Conversa não encontrada.");
    const { data: msgs } = await context.supabase
      .from("ig_messages").select("direction, text, sent_at")
      .eq("conversation_id", data.conversationId).order("sent_at", { ascending: true }).limit(50);

    const transcript = (msgs ?? [])
      .map((m: { direction: string; text: string | null }) => `${m.direction === "in" ? conv.participant_username ?? "Lead" : "AMT"}: ${m.text ?? ""}`)
      .join("\n");

    const prompts: Record<string, string> = {
      summarize: `Resuma em 3 bullets curtos a conversa abaixo, foco em interesse comercial e próximos passos:\n\n${transcript}`,
      suggest_reply: `Você é atendimento comercial B2B da AMT Fight Wear (fabricante de kimonos BJJ/Judô, karategis, faixas e patches). Sugira UMA resposta institucional, formal, curta (máx 3 linhas), sem elogios e sem emojis, para dar continuidade a esta conversa:\n\n${transcript}\n\nResposta:`,
      classify_intent: `Classifique a intenção principal deste lead em UMA palavra (duvida, orcamento, reclamacao, elogio, spam, indefinido). Responda apenas a palavra.\n\n${transcript}`,
      next_steps: `Liste em 3 bullets os próximos passos comerciais recomendados para esta conversa. Seja específico:\n\n${transcript}`,
      score: `Dê um score de 0 a 100 sobre a probabilidade deste lead virar cliente da AMT. Responda apenas o número seguido de : e uma justificativa curta em uma linha.\n\n${transcript}`,
    };

    const { openrouterChat } = await import("./ai-gateway.server");
    const content = await openrouterChat({
      messages: [{ role: "user", content: prompts[data.action] }],
    });


    // Persist relevant fields
    const patch: Record<string, unknown> = {};
    if (data.action === "summarize") patch.ai_summary = content;
    if (data.action === "classify_intent") patch.ai_intent = content.trim().toLowerCase();
    if (data.action === "score") {
      const num = parseInt(content, 10);
      if (!Number.isNaN(num)) patch.ai_priority = Math.min(100, Math.max(0, num));
    }
    if (Object.keys(patch).length) {
      await (context.supabase as any).from("ig_conversations").update(patch).eq("id", conv.id);
    }
    return { result: content };
  });
