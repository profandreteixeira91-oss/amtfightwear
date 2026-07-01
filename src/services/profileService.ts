import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export const profileService = {
  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },

  async update(id: string, patch: Partial<Pick<Profile, "full_name" | "avatar_url">>) {
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async listAll(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  },
};
