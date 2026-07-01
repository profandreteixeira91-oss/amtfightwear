import { supabase } from "@/integrations/supabase/client";

export type AppSetting = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export const settingsService = {
  async get(key: string): Promise<AppSetting | null> {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data as AppSetting | null;
  },

  async upsert(key: string, value: Record<string, unknown>) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings").upsert({
      key,
      value: value as never,
      updated_by: userData.user?.id ?? null,
    });
    if (error) throw error;
  },
};
