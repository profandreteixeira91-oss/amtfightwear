import { supabase } from "@/integrations/supabase/client";

export type Lead = {
  id: string;
  name: string;
  responsible: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  modality: string | null;
  lead_type: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NewLead = Omit<Lead, "id" | "created_at" | "updated_at">;

export const leadsService = {
  async list(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Lead[];
  },
  async create(lead: Partial<NewLead>) {
    const { data, error } = await supabase.from("leads").insert(lead as never).select().single();
    if (error) throw error;
    return data as Lead;
  },
  async update(id: string, patch: Partial<NewLead>) {
    const { data, error } = await supabase
      .from("leads")
      .update(patch as never)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Lead;
  },
  async remove(id: string) {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
  },
};
