import { supabase } from "@/integrations/supabase/client";

export type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  level: string;
  created_at: string;
};

export const logsService = {
  async list(limit = 100): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ActivityLog[];
  },

  async record(input: {
    action: string;
    entity?: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
    level?: "info" | "warning" | "error" | "success";
  }) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("activity_logs").insert({
      user_id: userData.user?.id ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entity_id ?? null,
      metadata: (input.metadata ?? {}) as never,
      level: input.level ?? "info",
    });
    if (error) throw error;
  },
};
