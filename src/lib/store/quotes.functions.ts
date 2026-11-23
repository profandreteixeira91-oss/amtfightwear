import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { QUOTE_STATUSES } from "./quote-status";

import { requireStoreOwner } from "@/lib/auth/owner-middleware";
const itemSchema = z.object({
  product_id: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  image_url: z.string().trim().max(2000).nullable().optional(),
  quantity: z.number().min(0.01).max(1000000),
  unit_price: z.number().min(0).max(10000000),
});

const addressSchema = z.object({
  zip: z.string().trim().max(20).optional().default(""),
  street: z.string().trim().max(200).optional().default(""),
  number: z.string().trim().max(30).optional().default(""),
  complement: z.string().trim().max(120).optional().default(""),
  neighborhood: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(40).optional().default(""),
});

const quoteSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  quote_number: z.string().trim().max(40).optional().default(""),
  status: z.enum(QUOTE_STATUSES).default("draft"),
  customer_name: z.string().trim().min(1, "Informe o nome do cliente").max(160),
  customer_company: z.string().trim().max(160).nullable().optional(),
  customer_document: z.string().trim().max(40).nullable().optional(),
  customer_email: z.string().trim().max(200).nullable().optional(),
  customer_phone: z.string().trim().max(40).nullable().optional(),
  customer_address: addressSchema.optional().default(() => ({
    zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  })),
  items: z.array(itemSchema).max(200).default([]),
  discount: z.number().min(0).max(10000000).default(0),
  shipping_cost: z.number().min(0).max(10000000).default(0),
  valid_until: z.string().trim().max(20).nullable().optional(),
  payment_terms: z.string().trim().max(600).nullable().optional(),
  delivery_terms: z.string().trim().max(600).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  signer_name: z.string().trim().max(160).nullable().optional(),
  signer_role: z.string().trim().max(160).nullable().optional(),
  signature_image: z.string().trim().max(600000).nullable().optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

export const adminListQuotes = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetQuote = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("store_quotes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminSaveQuote = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => quoteSchema.parse(i))
  .handler(async ({ data, context }) => {
    const subtotal = data.items.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
    const total = Math.max(0, subtotal - (data.discount ?? 0) + (data.shipping_cost ?? 0));

    let quoteNumber = data.quote_number?.trim();
    if (!quoteNumber) {
      const { count } = await context.supabase
        .from("store_quotes")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", context.userId);
      const year = new Date().getFullYear();
      quoteNumber = `ORC-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
    }

    const payload = {
      owner_id: context.userId,
      quote_number: quoteNumber,
      status: data.status,
      customer_name: data.customer_name,
      customer_company: data.customer_company || null,
      customer_document: data.customer_document || null,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      customer_address: data.customer_address ?? {},
      items: data.items,
      discount: data.discount ?? 0,
      shipping_cost: data.shipping_cost ?? 0,
      subtotal,
      total,
      valid_until: data.valid_until || null,
      payment_terms: data.payment_terms || null,
      delivery_terms: data.delivery_terms || null,
      notes: data.notes || null,
      signer_name: data.signer_name || null,
      signer_role: data.signer_role || null,
      signature_image: data.signature_image || null,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("store_quotes")
        .update(payload)
        .eq("id", data.id)
        .eq("owner_id", context.userId)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (row) await (await import("./quote-sync.server")).syncQuoteEverywhere(context.supabase, row as never);
      return row;
    }

    const { data: row, error } = await context.supabase
      .from("store_quotes")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (row) await (await import("./quote-sync.server")).syncQuoteEverywhere(context.supabase, row as never);
    return row;
  });

export const adminDeleteQuote = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await (await import("./quote-sync.server")).syncQuoteEverywhere(context.supabase, { id: data.id, status: "rejected", total: 0 });
    const { error } = await context.supabase
      .from("store_quotes")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(QUOTE_STATUSES),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("store_quotes")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (row) await (await import("./quote-sync.server")).syncQuoteEverywhere(context.supabase, row as never);
    return { ok: true };
  });

/** Dados do emissor (AMT Fight Wear) usados no cabeçalho do PDF. */
export const adminGetQuoteSettings = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("app_settings")
      .select("value")
      .eq("key", "quote_settings")
      .maybeSingle();
    return (data?.value ?? {}) as Record<string, string>;
  });

export const adminSaveQuoteSettings = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z.object({
      company_name: z.string().trim().max(160).default("AMT Fight Wear"),
      cnpj: z.string().trim().max(40).default(""),
      address: z.string().trim().max(300).default(""),
      phone: z.string().trim().max(60).default(""),
      email: z.string().trim().max(160).default(""),
      site: z.string().trim().max(160).default(""),
      signer_name: z.string().trim().max(160).default(""),
      signer_role: z.string().trim().max(160).default(""),
      signature_image: z.string().trim().max(600000).default(""),
      payment_terms: z.string().trim().max(600).default(""),
      delivery_terms: z.string().trim().max(600).default(""),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("app_settings")
      .upsert({ key: "quote_settings", value: data }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------- Envio pelo WhatsApp da loja ----------------------- */

/** WhatsApp da loja (Evolution) pronto para enviar? */
export const adminQuoteWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async () => {
    const { evolutionConfig, evolutionConnectionState } =
      await import("@/lib/whatsapp/evolution.server");
    if (!evolutionConfig()) return { configured: false, connected: false };
    const state = await evolutionConnectionState().catch(() => null);
    return { configured: true, connected: state === "open" };
  });

/**
 * Envia o PDF do orçamento direto para o WhatsApp do cliente, com a mensagem
 * como legenda. Grava o telefone no orçamento (se faltava) e, se pedido,
 * marca o rascunho como "Enviado" (o CRM acompanha).
 */
export const adminSendQuoteWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        chat_id: z.string().uuid("Escolha a conversa do cliente"),
        message: z.string().trim().max(1000).default(""),
        pdf_base64: z.string().min(100).max(15_000_000),
        file_name: z.string().trim().min(1).max(160),
        mark_sent: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: quote, error } = await context.supabase
      .from("store_quotes")
      .select("id, status, customer_phone")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("Orçamento não encontrado");

    const { sendWhatsAppMedia, evolutionConfig } = await import("@/lib/whatsapp/evolution.server");
    if (!evolutionConfig()) throw new Error("O WhatsApp da loja não está configurado.");
    // Só para quem já conversou com a loja: o destino é a conversa da caixa de entrada.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: chat } = await supabaseAdmin
      .from("whatsapp_chats")
      .select("id, remote_jid, phone_normalized")
      .eq("id", data.chat_id)
      .maybeSingle();
    if (!chat) throw new Error("Conversa não encontrada.");
    const number = (chat as { phone_normalized: string | null }).phone_normalized;

    const base64 = data.pdf_base64.replace(/^data:[^,]*,/, "");
    const fileName = /\.pdf$/i.test(data.file_name) ? data.file_name : `${data.file_name}.pdf`;
    const sent = await sendWhatsAppMedia((chat as { remote_jid: string }).remote_jid, {
      mediatype: "document",
      mimetype: "application/pdf",
      fileName,
      base64,
      caption: data.message,
    });
    if (!sent.ok) throw new Error(`O WhatsApp não enviou: ${sent.error}`);

    const patch: { customer_phone?: string; status?: "sent" } = {};
    if (number && !String((quote as { customer_phone: string | null }).customer_phone ?? "").trim())
      patch.customer_phone = `+${number}`;
    const markSent = data.mark_sent && (quote as { status: string }).status === "draft";
    if (markSent) patch.status = "sent";
    if (Object.keys(patch).length) {
      const { data: row } = await context.supabase
        .from("store_quotes")
        .update(patch)
        .eq("id", data.id)
        .eq("owner_id", context.userId)
        .select("*")
        .maybeSingle();
      if (row && markSent) {
        await (
          await import("./quote-sync.server")
        ).syncQuoteEverywhere(context.supabase, row as never);
        // Oportunidade do CRM ligada a este orçamento avança para "orçamento enviado".
        await context.supabase
          .from("crm_deals")
          .update({
            stage: "orcamento_enviado",
            stage_changed_at: new Date().toISOString(),
          } as never)
          .eq("quote_id", data.id)
          .eq("stage", "orcamento_preparacao");
      }
    }
    return { ok: true, to: number ? `+${number}` : null, markedSent: markSent };
  });
