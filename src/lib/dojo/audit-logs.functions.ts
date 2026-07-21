// Server fns de leitura dos logs de auditoria financeira (dojo_audit_logs).
// A escrita é feita internamente pelo motor (server-only helpers).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        eventType: z.string().max(60).optional(),
        entityType: z.string().max(30).optional(),
        entityId: z.string().uuid().optional(),
        gateway: z.string().max(30).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_audit_logs")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.eventType) q = q.eq("event_type", data.eventType);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    if (data.entityId) q = q.eq("entity_id", data.entityId);
    if (data.gateway) q = q.eq("gateway", data.gateway);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
