// Helper server-only para gravar entradas de auditoria a partir do motor
// financeiro (webhooks, saques, cobranças). Nunca importar em client bundles.
export type AuditInput = {
  ownerId: string;
  actorId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  gateway?: string | null;
  status?: "success" | "error" | "pending" | null;
  message?: string | null;
  ip?: string | null;
  payload?: unknown;
  metadata?: Record<string, unknown>;
};

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("dojo_audit_logs").insert({
      owner_id: input.ownerId,
      actor_id: input.actorId ?? null,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      gateway: input.gateway ?? null,
      status: input.status ?? null,
      message: input.message ?? null,
      ip: input.ip ?? null,
      payload: (input.payload ?? {}) as any,
      metadata: (input.metadata ?? {}) as any,
    });
  } catch (err) {
    // Auditoria nunca deve derrubar a operação principal
    console.error("[audit] failed:", err);
  }
}
