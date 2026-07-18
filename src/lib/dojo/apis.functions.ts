// API Keys & Webhooks para o Dojo Manager
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes, createHmac } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

// ============== API KEYS ==============

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_api_keys")
      .select("id, name, prefix, scopes, last_used_at, revoked_at, created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      name: z.string().min(1).max(80),
      scopes: z.array(z.enum(["read", "write", "webhook"])).min(1),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const raw = `dojo_${randomBytes(24).toString("hex")}`;
    const prefix = raw.slice(0, 12);
    const hashed = sha256(raw);
    const { data: inserted, error } = await context.supabase
      .from("dojo_api_keys")
      .insert({
        owner_id: context.userId,
        name: data.name,
        prefix,
        hashed_key: hashed,
        scopes: data.scopes,
      })
      .select("id, name, prefix, scopes, created_at")
      .single();
    if (error) throw new Error(error.message);
    // Retorna a chave em claro APENAS uma vez.
    return { ...inserted, key: raw };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_api_keys")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== WEBHOOK ENDPOINTS ==============

export const listWebhookEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_webhook_endpoints")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const EVENT_LIST = [
  "student.created",
  "student.updated",
  "invoice.created",
  "invoice.paid",
  "invoice.overdue",
  "checkin.created",
  "graduation.awarded",
  "chat.message_received",
] as const;

export const upsertWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      url: z.string().url(),
      events: z.array(z.enum(EVENT_LIST)).min(1),
      secret: z.string().optional().nullable(),
      active: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload: any = {
      owner_id: context.userId,
      url: data.url,
      events: data.events,
      secret: data.secret || null,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("dojo_webhook_endpoints")
        .update(payload)
        .eq("id", data.id)
        .eq("owner_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    // gera secret automaticamente se não fornecido
    if (!payload.secret) payload.secret = `whsec_${randomBytes(24).toString("hex")}`;
    const { data: row, error } = await context.supabase
      .from("dojo_webhook_endpoints")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, secret: payload.secret };
  });

export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_webhook_endpoints")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: ep, error } = await context.supabase
      .from("dojo_webhook_endpoints")
      .select("*")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .single();
    if (error || !ep) throw new Error("Endpoint não encontrado");

    const payload = {
      event: "webhook.test",
      sent_at: new Date().toISOString(),
      owner_id: context.userId,
      message: "Este é um evento de teste do AMT Dojo Manager.",
    };
    const body = JSON.stringify(payload);
    const signature = ep.secret ? createHmac("sha256", ep.secret).update(body).digest("hex") : "";

    let status = 0;
    let responseText = "";
    try {
      const r = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dojo-Event": "webhook.test",
          "X-Dojo-Signature": signature,
        },
        body,
      });
      status = r.status;
      responseText = (await r.text()).slice(0, 500);
    } catch (e: any) {
      responseText = e.message ?? "Falha de rede";
    }

    await context.supabase.from("dojo_webhook_deliveries").insert({
      owner_id: context.userId,
      endpoint_id: ep.id,
      event: "webhook.test",
      payload,
      status: status || null,
      response: responseText,
    });
    await context.supabase
      .from("dojo_webhook_endpoints")
      .update({ last_delivery_at: new Date().toISOString(), last_status: status || null })
      .eq("id", ep.id);

    return { ok: status >= 200 && status < 300, status, response: responseText };
  });

export const listWebhookDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_webhook_deliveries")
      .select("id, endpoint_id, event, status, response, attempt, created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const AVAILABLE_WEBHOOK_EVENTS = EVENT_LIST;
