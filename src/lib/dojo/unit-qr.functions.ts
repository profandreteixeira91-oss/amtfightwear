import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "UUID inválido",
  );

// Token opaco de alta entropia (32 bytes hex = 64 chars) — não adivinhável.
function generateUnitToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ============ Owner: lista tokens de QR das suas unidades ============
export const listUnitQrTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Todas as unidades do dono
    const { data: units, error: uErr } = await context.supabase
      .from("dojo_units")
      .select("id, name, active")
      .order("name");
    if (uErr) throw new Error(uErr.message);

    // Tokens ativos existentes
    const { data: tokens, error: tErr } = await context.supabase
      .from("dojo_unit_qr_tokens")
      .select("id, unit_id, token, label, created_at, active")
      .eq("active", true);
    if (tErr) throw new Error(tErr.message);

    const byUnit = new Map<string, any>();
    for (const t of tokens ?? []) byUnit.set(t.unit_id as string, t);

    return (units ?? []).map((u: any) => ({
      unit_id: u.id as string,
      unit_name: u.name as string,
      unit_active: u.active as boolean | null,
      token: (byUnit.get(u.id)?.token as string | undefined) ?? null,
      token_id: (byUnit.get(u.id)?.id as string | undefined) ?? null,
      created_at: (byUnit.get(u.id)?.created_at as string | undefined) ?? null,
    }));
  });

// ============ Owner: gera ou regenera o QR de uma unidade ============
// Regeneração invalida imediatamente o token anterior.
export const regenerateUnitQrToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ unitId: uuidSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Confirma que a unidade pertence ao dono autenticado.
    const { data: unit, error: uErr } = await context.supabase
      .from("dojo_units")
      .select("id, owner_id")
      .eq("id", data.unitId)
      .maybeSingle();
    if (uErr) throw new Error(uErr.message);
    if (!unit || unit.owner_id !== context.userId) {
      throw new Error("Unidade não encontrada.");
    }

    // Revoga qualquer token ativo desta unidade.
    const { error: rErr } = await context.supabase
      .from("dojo_unit_qr_tokens")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("owner_id", context.userId)
      .eq("unit_id", data.unitId)
      .eq("active", true);
    if (rErr) throw new Error(rErr.message);

    // Gera novo token com colisão-segura (retry até 3x, chance ínfima).
    let attempt = 0;
    let inserted: any = null;
    while (attempt < 3 && !inserted) {
      const token = generateUnitToken();
      const { data: row, error: iErr } = await context.supabase
        .from("dojo_unit_qr_tokens")
        .insert({
          owner_id: context.userId,
          unit_id: data.unitId,
          token,
          active: true,
        })
        .select("id, token, unit_id, created_at")
        .single();
      if (!iErr) {
        inserted = row;
        break;
      }
      // Conflito improvável de token/índice ativo → tenta de novo.
      attempt++;
    }
    if (!inserted) throw new Error("Não foi possível gerar o QR agora. Tente novamente.");
    return inserted;
  });

// ============ Owner: revoga o QR de uma unidade ============
export const revokeUnitQrToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ unitId: uuidSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_unit_qr_tokens")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("owner_id", context.userId)
      .eq("unit_id", data.unitId)
      .eq("active", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
