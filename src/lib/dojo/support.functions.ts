import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type SupportTicket = {
  id: string;
  owner_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  last_message_at: string;
  unread_by_client: number;
  unread_by_admin: number;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: "client" | "support";
  body: string;
  created_at: string;
};

async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "amt_admin",
  });
  return Boolean(data);
}

// ---------- Client-facing (owner) ----------

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_support_tickets")
      .select("*")
      .eq("owner_id", context.userId)
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SupportTicket[];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { subject: string; category: string; body: string; priority?: string }) =>
    z
      .object({
        subject: z.string().trim().min(3).max(200),
        category: z.enum(["duvida", "solicitacao", "modulo", "sugestao", "bug", "outro"]),
        body: z.string().trim().min(3).max(4000),
        priority: z.enum(["baixa", "normal", "alta", "urgente"]).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("dojo_support_tickets")
      .insert({
        owner_id: context.userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority ?? "normal",
        status: "aberto",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { error: mErr } = await context.supabase.from("dojo_support_messages").insert({
      ticket_id: ticket.id,
      author_id: context.userId,
      author_role: "client",
      body: data.body,
    });
    if (mErr) throw new Error(mErr.message);

    // Notificar admins sobre o novo ticket
    try {
      const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
      await sendPushToAmtAdmins({
        title: "Novo Ticket de Suporte",
        body: `${data.subject}: ${data.body.slice(0, 100)}...`,
        url: `/admin/atendimento/suporte?id=${ticket.id}`,
        tag: `ticket-${ticket.id}`,
      }, "dojo_support.new");
    } catch (e) {
      console.warn("Falha ao notificar admins sobre ticket:", e);
    }

    return ticket as SupportTicket;
  });

export const getTicketWithMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticketId: string }) => z.object({ ticketId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("dojo_support_tickets")
      .select("*")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Chamado não encontrado");

    const { data: messages, error: mErr } = await context.supabase
      .from("dojo_support_messages")
      .select("*")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    // Mark as read for whichever side is viewing
    const admin = await isAdmin(context);
    const patch = admin ? { unread_by_admin: 0 } : { unread_by_client: 0 };
    await context.supabase.from("dojo_support_tickets").update(patch).eq("id", data.ticketId);

    return { ticket: ticket as SupportTicket, messages: (messages ?? []) as SupportMessage[] };
  });

export const postMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticketId: string; body: string }) =>
    z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const role: "client" | "support" = admin ? "support" : "client";
    const { data: msg, error } = await context.supabase
      .from("dojo_support_messages")
      .insert({
        ticket_id: data.ticketId,
        author_id: context.userId,
        author_role: role,
        body: data.body,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Se for mensagem do CLIENTE, notificar admin
    if (role === "client") {
      try {
        const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
        const { data: ticket } = await context.supabase.from("dojo_support_tickets").select("subject").eq("id", data.ticketId).single();
        await sendPushToAmtAdmins({
          title: "Nova mensagem de suporte",
          body: `${ticket?.subject ?? "Suporte"}: ${data.body.slice(0, 100)}...`,
          url: `/admin/atendimento/suporte?id=${data.ticketId}`,
          tag: `ticket-msg-${data.ticketId}`,
        }, "dojo_support.new");
      } catch (e) {
        console.warn("Falha ao notificar admins sobre mensagem:", e);
      }
    }

    return msg as SupportMessage;
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticketId: string; status: string }) =>
    z
      .object({
        ticketId: z.string().uuid(),
        status: z.enum(["aberto", "em_atendimento", "resolvido", "fechado"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_support_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin-facing ----------

export const adminListTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tickets, error } = await supabaseAdmin
      .from("dojo_support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ownerIds = Array.from(new Set((tickets ?? []).map((t: any) => t.owner_id)));
    let profiles: Record<string, { email?: string | null; full_name?: string | null; trade_name?: string | null }> = {};
    if (ownerIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("dojo_academy_profile")
        .select("owner_id, trade_name, legal_name")
        .in("owner_id", ownerIds);
      for (const p of (profs ?? []) as Array<{ owner_id: string; trade_name: string | null; legal_name: string | null }>) {
        profiles[p.owner_id] = { trade_name: p.trade_name ?? p.legal_name };
      }
      const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of users?.users ?? []) {
        if (ownerIds.includes(u.id)) {
          profiles[u.id] = { ...profiles[u.id], email: u.email, full_name: (u.user_metadata as any)?.full_name };
        }
      }
    }
    return (tickets ?? []).map((t: any) => ({
      ...t,
      owner_email: profiles[t.owner_id]?.email ?? null,
      owner_name: profiles[t.owner_id]?.trade_name ?? profiles[t.owner_id]?.full_name ?? null,
    })) as (SupportTicket & { owner_email: string | null; owner_name: string | null })[];
  });
