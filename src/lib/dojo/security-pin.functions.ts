import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, timingSafeEqual } from "node:crypto";

const PIN_RE = /^\d{6}$/;

function hashPin(userId: string, pin: string): string {
  return createHash("sha256")
    .update(`dojo-pin:v1:${userId}:${pin}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const getSecurityPinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("dojo_academy_profile")
      .select("security_pin_hash, security_pin_updated_at")
      .eq("owner_id", userId)
      .maybeSingle();
    return {
      hasPin: !!data?.security_pin_hash,
      updatedAt: data?.security_pin_updated_at ?? null,
    };
  });

export const createSecurityPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string; confirm: string }) => {
    if (!PIN_RE.test(input.pin)) throw new Error("O PIN deve conter 6 dígitos numéricos.");
    if (input.pin !== input.confirm) throw new Error("Os PINs digitados não coincidem.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("dojo_academy_profile")
      .select("owner_id, security_pin_hash")
      .eq("owner_id", userId)
      .maybeSingle();

    if (existing?.security_pin_hash) {
      throw new Error("PIN já configurado. Use a opção de alteração.");
    }

    const hash = hashPin(userId, data.pin);
    if (existing) {
      const { error } = await supabase
        .from("dojo_academy_profile")
        .update({ security_pin_hash: hash, security_pin_updated_at: new Date().toISOString() })
        .eq("owner_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("dojo_academy_profile")
        .insert({
          owner_id: userId,
          security_pin_hash: hash,
          security_pin_updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }
    return { ok: true };
  });

export const verifySecurityPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string }) => {
    if (!PIN_RE.test(input.pin)) throw new Error("PIN inválido.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("dojo_academy_profile")
      .select("security_pin_hash")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row?.security_pin_hash) {
      throw new Error("Nenhum PIN configurado ainda.");
    }
    const attempt = hashPin(userId, data.pin);
    if (!safeEqual(attempt, row.security_pin_hash)) {
      throw new Error("PIN incorreto.");
    }
    return { ok: true, verifiedAt: new Date().toISOString() };
  });

export const changeSecurityPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { currentPin: string; newPin: string; confirmPin: string }) => {
    if (!PIN_RE.test(input.currentPin)) throw new Error("PIN atual inválido.");
    if (!PIN_RE.test(input.newPin)) throw new Error("O novo PIN deve conter 6 dígitos numéricos.");
    if (input.newPin !== input.confirmPin) throw new Error("Os novos PINs não coincidem.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("dojo_academy_profile")
      .select("security_pin_hash")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row?.security_pin_hash) throw new Error("Nenhum PIN configurado.");
    const current = hashPin(userId, data.currentPin);
    if (!safeEqual(current, row.security_pin_hash)) {
      throw new Error("PIN atual incorreto.");
    }
    const next = hashPin(userId, data.newPin);
    const { error } = await supabase
      .from("dojo_academy_profile")
      .update({ security_pin_hash: next, security_pin_updated_at: new Date().toISOString() })
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });
