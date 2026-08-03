import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMacroDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    
    // Total leads e leads com instagram
    const { data: totalLeads } = await supabase
      .from("prospect_companies")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId);

    const { data: igContacts } = await supabase
      .from("prospect_contacts")
      .select("company_id")
      .eq("owner_id", userId)
      .eq("channel", "instagram");

    const igLeadIds = new Set((igContacts || []).map(c => c.company_id));

    // Estatísticas de filas
    const { data: queues } = await supabase
      .from("macro_dm_queues")
      .select("*")
      .eq("owner_id", userId);

    // Estatísticas de envios (logs de sucesso)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    const { count: sentToday } = await supabase
      .from("macro_dm_logs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("level", "success")
      .gte("created_at", todayStart);

    return {
      totalLeads: totalLeads?.length || 0,
      igLeads: igLeadIds.size,
      queues: queues || [],
      sentToday: sentToday || 0,
    };
  });

export const listMacroQueues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("macro_dm_queues")
      .select("*, campaign:macro_dm_campaigns(name)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  });

export const createMacroQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string(),
    campaignId: z.string().uuid().optional(),
    filters: z.record(z.any()),
  }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    // 1. Criar a fila
    const { data: queue, error: qError } = await supabase
      .from("macro_dm_queues")
      .insert({
        owner_id: userId,
        campaign_id: data.campaignId,
        name: data.name,
        filters: data.filters,
        status: "waiting"
      })
      .select()
      .single();

    if (qError) throw qError;

    // 2. Buscar leads que batem com os filtros (simplificado para MVP da refatoração)
    let query = supabase.from("prospect_companies").select("id").eq("owner_id", userId);
    
    if (data.filters.state) query = query.eq("state", data.filters.state);
    if (data.filters.category) query = query.eq("category", data.filters.category);
    
    const { data: leads } = await query;
    
    if (leads && leads.length > 0) {
      // Inserir itens na fila
      const items = leads.map(l => ({
        owner_id: userId,
        queue_id: queue.id,
        lead_id: l.id,
        status: "pending"
      }));
      
      await supabase.from("macro_dm_queue_items").insert(items);
      
      // Atualizar total
      await supabase
        .from("macro_dm_queues")
        .update({ total_leads: items.length })
        .eq("id", queue.id);
    }

    return queue;
  });

export const listMacroCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("macro_dm_campaigns")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  });
