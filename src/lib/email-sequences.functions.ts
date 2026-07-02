import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const StepSchema = z.object({
  day: z.number().int().min(0).max(120),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const listSequences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("email_sequences")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        steps: z.array(StepSchema).min(1).max(10),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      steps: data.steps,
      is_active: data.is_active,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("email_sequences")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("email_sequences")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("email_sequences")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startSequenceForLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ leadId: z.string().uuid(), sequenceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Cancel any existing running run for the lead
    await context.supabase
      .from("email_sequence_runs")
      .update({ status: "cancelled" })
      .eq("lead_id", data.leadId)
      .eq("status", "running");

    const { data: ins, error } = await context.supabase
      .from("email_sequence_runs")
      .insert({
        lead_id: data.leadId,
        sequence_id: data.sequenceId,
        current_step: 0,
        next_send_at: new Date().toISOString(),
        status: "running",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const cancelSequenceRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("email_sequence_runs")
      .update({ status: "cancelled" })
      .eq("id", data.runId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("email_sequence_runs")
      .select("*, leads(name, email, city), email_sequences(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });
