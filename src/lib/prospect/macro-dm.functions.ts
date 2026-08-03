import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMacroDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const supa = supabase as any;
    
    const { data: totalLeads } = await supa.from("prospect_companies").select("id").eq("owner_id", userId);
    
    const { data: igContacts } = await supa.from("prospect_contacts")
      .select("company_id")
      .eq("owner_id", userId)
      .eq("channel", "instagram");
    
    const igLeadIds = new Set((igContacts || []).map((c: any) => c.company_id));
    
    const { data: queues } = await supa.from("macro_dm_queues").select("*").eq("owner_id", userId);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    const { count: sentToday } = await supa.from("macro_dm_logs")
      .select("id", { count: "exact" })
      .eq("owner_id", userId)
      .eq("level", "success")
      .gte("created_at", todayStart);

    return { 
      totalLeads: totalLeads?.length || 0, 
      igLeads: igLeadIds.size, 
      queues: (queues || []) as any[], 
      sentToday: sentToday || 0 
    };
  });

export const listMacroQueues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("macro_dm_queues")
      .select("*, campaign:macro_dm_campaigns(name)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as any[];
  });

const createQueueInput = z.object({
  name: z.string(),
  campaignId: z.string().uuid().optional(),
  filters: z.record(z.string(), z.any()),
});

export const createMacroQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => createQueueInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const supa = supabase as any;

    const { data: queue, error: qError } = await supa.from("macro_dm_queues").insert({ 
      owner_id: userId, 
      campaign_id: data.campaignId, 
      name: data.name, 
      filters: data.filters as any, 
      status: "waiting" 
    }).select().single();
    
    if (qError) throw qError;

    let query = supa.from("prospect_companies").select("id").eq("owner_id", userId);
    
    if (data.filters.state) query = query.eq("state", String(data.filters.state));
    if (data.filters.city) query = query.eq("city", String(data.filters.city));
    if (data.filters.category) query = query.eq("category", String(data.filters.category));
    if (data.filters.origin) query = query.eq("origin", String(data.filters.origin));
    if (data.filters.status) query = query.eq("status", String(data.filters.status));
    
    const { data: leadsResult } = await query;

    if (leadsResult && leadsResult.length > 0) {
      const items = leadsResult.map((l: { id: string }) => ({ 
        owner_id: userId, 
        queue_id: (queue as any).id, 
        lead_id: l.id, 
        status: "pending" 
      }));
      
      await supa.from("macro_dm_queue_items").insert(items);
      await supa.from("macro_dm_queues").update({ total_leads: items.length }).eq("id", (queue as any).id);
    }

    return queue;
  });

export const listMacroCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("macro_dm_campaigns")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as any[];
  });

export const getTopLeadsForMacro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const supa = supabase as any;

    // Busca leads com Instagram (prospect_contacts channel='instagram')
    const { data: igContacts } = await supa.from("prospect_contacts")
      .select("company_id, value")
      .eq("owner_id", userId)
      .eq("channel", "instagram");

    if (!igContacts || igContacts.length === 0) return [];

    const leadIds = igContacts.map((c: any) => c.company_id);
    const igMap = new Map(igContacts.map((c: any) => [c.company_id, c.value]));

    // Busca as empresas e ordena por score
    const { data: companies, error } = await supa.from("prospect_companies")
      .select("*")
      .in("id", leadIds)
      .eq("owner_id", userId)
      .order("score", { ascending: false })
      .limit(50);

    if (error) throw error;

    return (companies || []).map((c: any) => ({
      ...c,
      instagram: igMap.get(c.id)
    }));
  });

export const buildAutoQueues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const supa = supabase as any;

    // Busca todos os leads com Instagram
    const { data: igContacts } = await supa.from("prospect_contacts")
      .select("company_id")
      .eq("owner_id", userId)
      .eq("channel", "instagram");

    if (!igContacts || igContacts.length === 0) return { created: 0 };

    const leadIds = igContacts.map((c: any) => c.company_id);

    // Agrupa por estado
    const { data: leads } = await supa.from("prospect_companies")
      .select("id, state")
      .in("id", leadIds)
      .eq("owner_id", userId)
      .not("state", "is", null);

    if (!leads) return { created: 0 };

    const byState = new Map<string, string[]>();
    for (const l of leads) {
      const state = l.state || "Outros";
      if (!byState.has(state)) byState.set(state, []);
      byState.get(state)!.push(l.id);
    }

    let createdCount = 0;
    for (const [state, ids] of byState.entries()) {
      const queueName = `Fila Automática - ${state}`;
      
      const { data: existing } = await supa.from("macro_dm_queues")
        .select("id, status")
        .eq("owner_id", userId)
        .eq("name", queueName)
        .single();

      if (existing) {
        if (existing.status === 'waiting') {
          const { count } = await supa.from("macro_dm_queue_items")
            .select("id", { count: 'exact' })
            .eq("queue_id", existing.id);
            
          if (!count || count === 0) {
            const items = ids.map(id => ({
              owner_id: userId,
              queue_id: existing.id,
              lead_id: id,
              status: "pending"
            }));
            await supa.from("macro_dm_queue_items").insert(items);
            await supa.from("macro_dm_queues")
              .update({ total_leads: items.length })
              .eq("id", existing.id);
          }
        }
        continue;
      }

      const { data: queue } = await supa.from("macro_dm_queues").insert({
        owner_id: userId,
        name: queueName,
        filters: { state },
        status: "waiting",
        total_leads: ids.length
      }).select().single();

      if (queue) {
        const items = ids.map(id => ({
          owner_id: userId,
          queue_id: queue.id,
          lead_id: id,
          status: "pending"
        }));
        await supa.from("macro_dm_queue_items").insert(items);
        createdCount++;
      }
    }

    return { created: createdCount };
  });

export const deleteMacroQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: id, context }) => {
    const { supabase, userId } = context;
    const supa = supabase as any;

    // A deleção cascade no banco cuida dos itens e logs se configurado,
    // mas vamos garantir a limpeza.
    await supa.from("macro_dm_queue_items").delete().eq("queue_id", id).eq("owner_id", userId);
    const { error } = await supa.from("macro_dm_queues").delete().eq("id", id).eq("owner_id", userId);
    
    if (error) throw error;
    return { success: true };
  });

export const startMacroQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { id } = data;
    const { supabase, userId } = context;
    const supa = supabase as any;

    const { error } = await supa.from("macro_dm_queues")
      .update({ status: "executing" })
      .eq("id", id)
      .eq("owner_id", userId);
    
    if (error) throw error;
    return { success: true };
  });

export const listMacroLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("macro_dm_logs")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data as any[];
  });

