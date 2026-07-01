import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSalesConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sales_conversations")
      .select("id, channel, external_id, customer_name, customer_email, customer_phone, status, last_message_at, created_at")
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSalesConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const [{ data: conv }, { data: messages }, { data: cart }] = await Promise.all([
      context.supabase.from("sales_conversations").select("*").eq("id", data.id).single(),
      context.supabase
        .from("sales_messages")
        .select("id, role, parts, created_at")
        .eq("conversation_id", data.id)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("sales_carts")
        .select("id, checkout_url, status, total_estimate, sales_cart_items(product_name, quantity, size, unit_price)")
        .eq("conversation_id", data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return { conv, messages: messages ?? [], cart };
  });

export const getSalesSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sales_agent_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const SettingsPatch = z.object({
  tone: z.string().max(120).optional(),
  greeting_web: z.string().max(500).optional(),
  greeting_wa: z.string().max(500).optional(),
  greeting_ig: z.string().max(500).optional(),
  channel_web_enabled: z.boolean().optional(),
  channel_wa_enabled: z.boolean().optional(),
  channel_ig_enabled: z.boolean().optional(),
  offline_message: z.string().max(500).optional(),
  site_url: z.string().url().optional(),
  cart_url_template: z.string().url().optional(),
});

export const updateSalesSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SettingsPatch.parse(i))
  .handler(async ({ data, context }) => {
    const { data: current } = await context.supabase
      .from("sales_agent_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!current) throw new Error("Configurações não encontradas");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("sales_agent_settings").update(data as any).eq("id", current.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listKbArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sales_kb_articles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const KbInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(120),
  body_md: z.string().min(3).max(8000),
  tags: z.array(z.string()).max(20).default([]),
  is_active: z.boolean().default(true),
});

export const upsertKbArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => KbInput.parse(i))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("sales_kb_articles")
        .update({ title: data.title, body_md: data.body_md, tags: data.tags, is_active: data.is_active })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("sales_kb_articles")
      .insert({ title: data.title, body_md: data.body_md, tags: data.tags, is_active: data.is_active })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: created.id };
  });

export const deleteKbArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sales_kb_articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSalesAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: convs }, { data: carts }] = await Promise.all([
      context.supabase.from("sales_conversations").select("id, channel, status, created_at").gte("created_at", since),
      context.supabase.from("sales_carts").select("id, status, total_estimate, created_at").gte("created_at", since),
    ]);
    const byChannel = { web: 0, whatsapp: 0, instagram: 0 } as Record<string, number>;
    for (const c of convs ?? []) byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1;
    const total = convs?.length ?? 0;
    const withCart = carts?.length ?? 0;
    const linksSent = (carts ?? []).filter((c) => c.status === "sent" || c.status === "purchased").length;
    const purchased = (carts ?? []).filter((c) => c.status === "purchased").length;
    const revenue = (carts ?? [])
      .filter((c) => c.status === "purchased")
      .reduce((a, c) => a + Number(c.total_estimate ?? 0), 0);
    return { total, withCart, linksSent, purchased, revenue, byChannel };
  });
