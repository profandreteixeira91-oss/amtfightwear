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
    const { error } = await supabaseAdmin.from("sales_messages").insert({
      conversation_id: data.conversation_id,
      role: "assistant",
      parts: { text: data.text, source: "human" },
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("sales_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.conversation_id);
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
