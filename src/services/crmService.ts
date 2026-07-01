import { supabase } from "@/integrations/supabase/client";

export type Deal = {
  id: string;
  title: string;
  customer_id: string | null;
  stage: string;
  value: number;
  probability: number;
  expected_close_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const crmService = {
  async list(): Promise<Deal[]> {
    const { data, error } = await supabase
      .from("crm_deals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Deal[];
  },
  async create(deal: Partial<Deal>) {
    const { data, error } = await supabase.from("crm_deals").insert(deal as never).select().single();
    if (error) throw error;
    return data as Deal;
  },
  async update(id: string, patch: Partial<Deal>) {
    const { data, error } = await supabase
      .from("crm_deals")
      .update(patch as never)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Deal;
  },
  async remove(id: string) {
    const { error } = await supabase.from("crm_deals").delete().eq("id", id);
    if (error) throw error;
  },
};
