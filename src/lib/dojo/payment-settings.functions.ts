// Server fns para o cadastro de taxas do AMT Pay (dojo_payment_settings).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULTS = {
  pix_fee_percent: 0.0099,
  pix_fee_fixed: 0,
  boleto_fee_percent: 0,
  boleto_fee_fixed: 1.99,
  card_upfront_percent: 0.0299,
  card_upfront_fixed: 0.49,
  card_inst_percent: 0.0349,
  card_inst_fixed: 0.49,
  card_extra_per_inst: 0,
  platform_fee_percent: 0.02,
  platform_fee_fixed: 0,
  currency: "BRL",
  default_gateway: "asaas",
};

async function ensure(supabase: any, ownerId: string) {
  const { data } = await supabase
    .from("dojo_payment_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("dojo_payment_settings")
    .insert({ owner_id: ownerId, ...DEFAULTS })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ensure(context.supabase, context.userId));

const updateSchema = z
  .object({
    pix_fee_percent: z.number().min(0).max(1).optional(),
    pix_fee_fixed: z.number().min(0).optional(),
    boleto_fee_percent: z.number().min(0).max(1).optional(),
    boleto_fee_fixed: z.number().min(0).optional(),
    card_upfront_percent: z.number().min(0).max(1).optional(),
    card_upfront_fixed: z.number().min(0).optional(),
    card_inst_percent: z.number().min(0).max(1).optional(),
    card_inst_fixed: z.number().min(0).optional(),
    card_extra_per_inst: z.number().min(0).max(1).optional(),
    default_gateway: z.enum(["asaas", "mercadopago", "efi", "pagbank", "stripe", "pagarme"]).optional(),
  })
  .strict();

export const updatePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensure(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("dojo_payment_settings")
      .update(data)
      .eq("owner_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Calcula o breakdown (bruto → taxa gateway → taxa AMT 2% → líquido)
 * a partir das configurações atuais. A taxa AMT é FIXA em 2%.
 */
export type FeeBreakdown = {
  gross: number;
  gatewayFee: number;
  platformFee: number;
  net: number;
};

export function calcFees(
  amount: number,
  method: "pix" | "boleto" | "card",
  settings: any,
  installments = 1,
): FeeBreakdown {
  const s = settings ?? DEFAULTS;
  let gatewayFee = 0;
  if (method === "pix") {
    gatewayFee = amount * Number(s.pix_fee_percent) + Number(s.pix_fee_fixed);
  } else if (method === "boleto") {
    gatewayFee = amount * Number(s.boleto_fee_percent) + Number(s.boleto_fee_fixed);
  } else if (method === "card") {
    if (installments > 1) {
      gatewayFee =
        amount * Number(s.card_inst_percent) +
        Number(s.card_inst_fixed) +
        amount * Number(s.card_extra_per_inst) * (installments - 1);
    } else {
      gatewayFee = amount * Number(s.card_upfront_percent) + Number(s.card_upfront_fixed);
    }
  }
  const platformFee =
    amount * Number(s.platform_fee_percent ?? 0.02) + Number(s.platform_fee_fixed ?? 0);
  const gross = Number(amount.toFixed(2));
  const gw = Number(gatewayFee.toFixed(2));
  const pl = Number(platformFee.toFixed(2));
  return {
    gross,
    gatewayFee: gw,
    platformFee: pl,
    net: Number((gross - gw - pl).toFixed(2)),
  };
}

/** Preview público (server fn) para a UI mostrar o cálculo em tempo real. */
export const previewFees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        amount: z.number().positive(),
        method: z.enum(["pix", "boleto", "card"]),
        installments: z.number().int().min(1).max(24).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const settings = await ensure(context.supabase, context.userId);
    return calcFees(data.amount, data.method, settings, data.installments ?? 1);
  });
