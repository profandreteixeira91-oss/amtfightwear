// Sistema NATIVO de cobrança — independente do AMT Pay.
// O dono configura a chave PIX exibida ao aluno e/ou um link fixo de pagamento
// (ex.: PagSeguro, InfinitePay, etc.). O aluno visualiza os dados e paga
// por fora; o dono confirma o recebimento manualmente pelo módulo financeiro.
//
// Persistência: dojo_payment_settings.extras.native_billing
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePixKey, validatePixKey } from "@/lib/pix/brcode";

export type NativeBillingConfig = {
  pix_enabled: boolean;
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random";
  pix_holder_name: string;
  payment_link_enabled: boolean;
  payment_link_url: string;
  payment_link_label: string;
  instructions: string;
};

export const DEFAULT_NATIVE_BILLING: NativeBillingConfig = {
  pix_enabled: false,
  pix_key: "",
  pix_key_type: "email",
  pix_holder_name: "",
  payment_link_enabled: false,
  payment_link_url: "",
  payment_link_label: "",
  instructions: "",
};

const schema = z.object({
  pix_enabled: z.boolean(),
  pix_key: z.string().max(200),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]),
  pix_holder_name: z.string().max(200),
  payment_link_enabled: z.boolean(),
  payment_link_url: z.string().max(500),
  payment_link_label: z.string().max(120),
  instructions: z.string().max(1000),
});

async function ensureRow(supabase: any, ownerId: string) {
  const { data } = await supabase
    .from("dojo_payment_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("dojo_payment_settings")
    .insert({ owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

function normalize(raw: any): NativeBillingConfig {
  const cfg = { ...DEFAULT_NATIVE_BILLING, ...(raw ?? {}) } as NativeBillingConfig;
  // Chaves salvas antes da validação podem conter máscara; normaliza na leitura
  // para que o QR funcione em qualquer conta de dono de dojo.
  if (cfg.pix_key) cfg.pix_key = normalizePixKey(cfg.pix_key, cfg.pix_key_type);
  return cfg;
}

export const getNativeBillingConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await ensureRow(context.supabase, context.userId);
    return normalize(row?.extras?.native_billing);
  });

export const saveNativeBillingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => {
    const parsed = schema.parse(i);
    if (parsed.pix_enabled) {
      const problem = validatePixKey(parsed.pix_key, parsed.pix_key_type);
      if (problem) throw new Error(problem);
      // Guarda a chave já sem máscara: é o formato aceito no BR Code.
      parsed.pix_key = normalizePixKey(parsed.pix_key, parsed.pix_key_type);
    }
    return parsed;
  })
  .handler(async ({ data, context }) => {
    const row = await ensureRow(context.supabase, context.userId);
    const extras = { ...(row.extras ?? {}), native_billing: data };
    const { error } = await context.supabase
      .from("dojo_payment_settings")
      .update({ extras })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return data;
  });

/**
 * Retorna a configuração de cobrança nativa do DONO da fatura informada.
 * Usado pela tela do aluno para mostrar PIX/link sem expor o owner_id.
 */
export const getNativeBillingForInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        invoice_id: z
          .string()
          .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    // RLS garante que o aluno só enxerga suas próprias faturas.
    const { data: inv, error } = await context.supabase
      .from("dojo_invoices")
      .select("id, owner_id")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Cobrança não encontrada");

    // Configurações do dono não são acessíveis via RLS ao aluno; usa admin
    // após confirmar (via RLS acima) que a fatura pertence ao chamador.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("dojo_payment_settings")
      .select("extras")
      .eq("owner_id", (inv as any).owner_id)
      .maybeSingle();
    return normalize((row as any)?.extras?.native_billing);
  });
