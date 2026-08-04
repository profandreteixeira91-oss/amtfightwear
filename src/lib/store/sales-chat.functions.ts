import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const adminListSalesConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("sales_conversations")
      .select("id, channel, external_id, customer_name, customer_email, customer_phone, status, last_message_at, created_at")
      .order("last_message_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminListSalesMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ conversation_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("sales_messages")
      .select("id, role, parts, created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true })
      .limit(500);
    return rows ?? [];
  });

export const adminSendSalesReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ conversation_id: z.string().uuid(), text: z.string().trim().min(1).max(4000) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Salva como 'assistant' para aparecer inline no widget do cliente,
    // mas marca origem humana no parts.source para o painel diferenciar.
    const { error, data: msg } = await supabaseAdmin.from("sales_messages").insert({
      conversation_id: data.conversation_id,
      role: "assistant",
      parts: { text: data.text, source: "human" },
    }).select("id").single();
    if (error) throw new Error(error.message);

    const { data: conv } = await supabaseAdmin
      .from("sales_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.conversation_id)
      .select("customer_name")
      .single();

    // Notificar outros admins (opcional, mas o pedido pede para garantir que mensagens recebidas funcionem)
    // No caso de RESPOSTA do admin, geralmente não notificamos os próprios admins, 
    // mas como o sistema é multi-admin, pode ser útil.
    // Porém, o foco é na mensagem RECEBIDA.

    return { ok: true };
  });

export const adminSetSalesConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      conversation_id: z.string().uuid(),
      status: z.enum(["active", "human", "closed"]),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sales_conversations")
      .update({ status: data.status })
      .eq("id", data.conversation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Configuração do agente ============

export const adminGetChatSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("sales_agent_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

const settingsSchema = z.object({
  id: z.string().uuid().optional(),
  tone: z.string().trim().min(1).max(200),
  greeting_web: z.string().trim().min(1).max(1000),
  greeting_wa: z.string().trim().min(1).max(1000),
  greeting_ig: z.string().trim().min(1).max(1000),
  channel_web_enabled: z.boolean(),
  channel_wa_enabled: z.boolean(),
  channel_ig_enabled: z.boolean(),
  offline_message: z.string().trim().min(1).max(1000),
  site_url: z.string().trim().url().max(300),
  cart_url_template: z.string().trim().min(1).max(500),
  business_hours_json: z
    .object({
      tz: z.string().default("America/Sao_Paulo"),
      always_on: z.boolean().default(true),
    })
    .passthrough(),
});

export const adminUpdateChatSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => settingsSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, business_hours_json: data.business_hours_json as never, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("sales_agent_settings")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("sales_agent_settings")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminListKbArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("sales_kb_articles")
      .select("id, title, body_md, tags, is_active, updated_at")
      .order("updated_at", { ascending: false });
    return data ?? [];
  });

export const adminUpsertKbArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(200),
        body_md: z.string().trim().min(1).max(20000),
        tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
        is_active: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("sales_kb_articles")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("sales_kb_articles")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteKbArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sales_kb_articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
