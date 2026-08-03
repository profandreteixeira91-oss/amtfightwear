import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMacroDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: totalLeads } = await (supabase as any).from("prospect_companies").select("id").eq("owner_id", userId);
    const { data: igContacts } = await (supabase as any).from("prospect_contacts").select("company_id").eq("owner_id", userId).eq("channel", "instagram");
    const igLeadIds = new Set((igContacts || []).map((c: any) => c.company_id));
    const { data: queues } = await (supabase as any).from("macro_dm_queues").select("*").eq("owner_id", userId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const { count: sentToday } = await (supabase as any).from("macro_dm_logs").select("id", { count: "exact" }).eq("owner_id", userId).eq("level", "success").gte("created_at", todayStart);
    return { totalLeads: totalLeads?.length || 0, igLeads: igLeadIds.size, queues: (queues || []) as any[], sentToday: sentToday || 0 };
  });

export const listMacroQueues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("macro_dm_queues").select("*, campaign:macro_dm_campaigns(name)").eq("owner_id", context.userId).order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  });

const createQueueInput = z.object({
  name: z.string(),
  campaignId: z.string().uuid().optional(),
  filters: z.record(z.any()),
});

export const createMacroQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => createQueueInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: queue, error: qError } = await (supabase as any).from("macro_dm_queues").insert({ owner_id: userId, campaign_id: data.campaignId, name: data.name, filters: data.filters as any, status: "waiting" }).select().single();
    if (qError) throw qError;
    let query = (supabase as any).from("prospect_companies").select("id").eq("owner_id", userId);
    if (data.filters.state) query = query.eq("state", String(data.filters.state));
    if (data.filters.category) query = query.eq("category", String(data.filters.category));
    const { data: leadsResult } = await query;
    if (leadsResult && leadsResult.length > 0) {
      const items = leadsResult.map((l: { id: string }) => ({ owner_id: userId, queue_id: (queue as any).id, lead_id: l.id, status: "pending" }));
      await (supabase as any).from("macro_dm_queue_items").insert(items);
      await (supabase as any).from("macro_dm_queues").update({ total_leads: items.length }).eq("id", (queue as any).id);
    }
    return queue;
  });

export const listMacroCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("macro_dm_campaigns").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  });
