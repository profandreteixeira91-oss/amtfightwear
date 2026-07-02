import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GRAPH = "https://graph.facebook.com/v21.0";

// ============= HELPERS =============

type MetaConn = {
  id: string;
  page_access_token: string;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  token_expires_at: string | null;
};

async function getActiveConnection(supabase: any): Promise<MetaConn | null> {
  const { data } = await supabase
    .from("meta_connections")
    .select("id, page_access_token, instagram_business_account_id, instagram_username, token_expires_at")
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
        media_count?: number; account_type?: string;
      }>(
        conn.instagram_business_account_id,
        conn.page_access_token,
        { fields: "id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,account_type" },
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
            account_type: profile.account_type ?? null,
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

    let lead = null;
    if (conv.lead_id) {
      const { data: l } = await context.supabase
        .from("leads").select("*").eq("id", conv.lead_id).maybeSingle();
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

    const resp = await graphPost<{ message_id?: string }>(
      `${conn.instagram_business_account_id}/messages`,
      conn.page_access_token,
      { recipient: { id: conv.participant_igsid }, message: { text: data.text } },
    );

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

    const { data: lead, error } = await (context.supabase as any).from("leads").insert({
      user_id: context.userId,
      name: conv.participant_name ?? conv.participant_username ?? "Contato Instagram",
      instagram_handle: conv.participant_username ?? null,
      instagram_url: conv.participant_username ? `https://instagram.com/${conv.participant_username}` : null,
      source: "Instagram Direct",
      status: "Novo",
      pipeline_stage: "novo",
      ig_conversation_id: conv.id,
    }).select().single();
    if (error) throw new Error(error.message);

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
      (context.supabase as any).from("leads").select("id, status, created_at").eq("user_id", context.userId).eq("source", "Instagram Direct"),
    ]);

    const conversations = convs.data ?? [];
    const messages = msgs.data ?? [];
    const igLeads = leads.data ?? [];
    const now = Date.now();

    return {
      accounts: (accs.data ?? []).length,
      totalFollowers: (accs.data ?? []).reduce((s, a) => s + (a.followers_count ?? 0), 0),
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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompts[data.action] }],
      }),
    });
    if (!res.ok) throw new Error(`Falha na IA: ${res.status}`);
    const j = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = j.choices?.[0]?.message?.content ?? "";

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
