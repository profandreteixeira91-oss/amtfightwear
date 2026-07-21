// Server fns de chaves PIX cadastradas para saque (dojo_pix_keys).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const keyTypeSchema = z.enum(["cpf", "cnpj", "email", "phone", "random"]);

export const listPixKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_pix_keys")
      .select("*")
      .eq("owner_id", context.userId)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        key_type: keyTypeSchema,
        key_value: z.string().min(3).max(140),
        holder_name: z.string().min(2).max(140),
        holder_document: z.string().max(20).optional().nullable(),
        is_default: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    if (data.is_default) {
      await context.supabase
        .from("dojo_pix_keys")
        .update({ is_default: false })
        .eq("owner_id", context.userId);
    }
    const { data: row, error } = await context.supabase
      .from("dojo_pix_keys")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setDefaultPixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("dojo_pix_keys")
      .update({ is_default: false })
      .eq("owner_id", context.userId);
    const { error } = await context.supabase
      .from("dojo_pix_keys")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_pix_keys")
      .update({ active: false })
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
