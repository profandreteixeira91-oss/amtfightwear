// Server fns para personalização da cobrança AMT Pay (nome/logo/contato do dojo).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const brandingSchema = z
  .object({
    invoice_business_name: z.string().max(120).nullable().optional(),
    invoice_document: z.string().max(32).nullable().optional(),
    invoice_logo_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
    invoice_phone: z.string().max(40).nullable().optional(),
    invoice_email: z.string().email().max(120).nullable().optional().or(z.literal("")),
    invoice_address: z.string().max(240).nullable().optional(),
    invoice_footer_note: z.string().max(280).nullable().optional(),
  })
  .strict();

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

/** Carrega branding + fallback do perfil da academia. */
export const getInvoiceBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await ensureRow(context.supabase, context.userId);
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select(
        "academy_name, trade_name, legal_name, logo_url, cnpj, phone, email, address, city, state",
      )
      .eq("owner_id", context.userId)
      .maybeSingle();

    return {
      settings: {
        invoice_business_name: row.invoice_business_name ?? null,
        invoice_document: row.invoice_document ?? null,
        invoice_logo_url: row.invoice_logo_url ?? null,
        invoice_phone: row.invoice_phone ?? null,
        invoice_email: row.invoice_email ?? null,
        invoice_address: row.invoice_address ?? null,
        invoice_footer_note: row.invoice_footer_note ?? null,
      },
      defaults: {
        name:
          profile?.trade_name ??
          profile?.academy_name ??
          profile?.legal_name ??
          "",
        document: profile?.cnpj ?? "",
        logo_url: profile?.logo_url ?? "",
        phone: profile?.phone ?? "",
        email: profile?.email ?? "",
        address: [profile?.address, profile?.city, profile?.state]
          .filter(Boolean)
          .join(", "),
      },
    };
  });

export const updateInvoiceBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => brandingSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureRow(context.supabase, context.userId);
    const normalized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
    );
    const { error } = await context.supabase
      .from("dojo_payment_settings")
      .update(normalized)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Carrega o "cartão de visita" que deve aparecer na cobrança para um determinado dono.
 * Prioriza os overrides salvos em dojo_payment_settings; se vazios, usa o perfil da academia.
 * Server-only: consumido pelo pipeline de criação de cobranças e lembretes.
 */
export async function loadInvoiceIdentity(
  supabase: any,
  ownerId: string,
): Promise<{
  name: string;
  document: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  footerNote: string | null;
}> {
  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase
      .from("dojo_payment_settings")
      .select(
        "invoice_business_name, invoice_document, invoice_logo_url, invoice_phone, invoice_email, invoice_address, invoice_footer_note",
      )
      .eq("owner_id", ownerId)
      .maybeSingle(),
    supabase
      .from("dojo_academy_profile")
      .select(
        "academy_name, trade_name, legal_name, logo_url, cnpj, phone, email, address, city, state",
      )
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);

  const pick = (a: string | null | undefined, b: string | null | undefined) =>
    (a && String(a).trim()) || (b && String(b).trim()) || null;

  const name =
    pick(settings?.invoice_business_name, profile?.trade_name) ??
    pick(null, profile?.academy_name) ??
    pick(null, profile?.legal_name) ??
    "Academia";

  const address =
    pick(
      settings?.invoice_address,
      [profile?.address, profile?.city, profile?.state].filter(Boolean).join(", "),
    );

  return {
    name,
    document: pick(settings?.invoice_document, profile?.cnpj),
    logoUrl: pick(settings?.invoice_logo_url, profile?.logo_url),
    phone: pick(settings?.invoice_phone, profile?.phone),
    email: pick(settings?.invoice_email, profile?.email),
    address,
    footerNote: settings?.invoice_footer_note?.trim() || null,
  };
}

/** Monta o texto de descrição que aparece na cobrança Asaas com identidade do dojo. */
export function buildBrandedChargeDescription(
  identity: { name: string; document: string | null; phone: string | null; email: string | null; footerNote: string | null },
  base: string,
): string {
  const header = identity.document
    ? `${identity.name} — ${identity.document}`
    : identity.name;
  const contact = [identity.phone, identity.email].filter(Boolean).join(" · ");
  const footer = identity.footerNote ? `\n${identity.footerNote}` : "";
  const contactLine = contact ? `\n${contact}` : "";
  // Ordem: quem cobra → o que → contato → observação. Nunca "AMT".
  return `${header}\n${base}${contactLine}${footer}`.slice(0, 500);
}
