import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Endpoint público (sem auth) para renderizar a página branded /pay/:id.
 * Retorna apenas dados seguros da fatura + identidade visual do dojo.
 * Usa supabaseAdmin porque a fatura é protegida por RLS mas o id UUID
 * já funciona como "capability token" (não enumerável).
 */
export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("dojo_invoices")
      .select(
        "id, description, amount, due_date, status, paid_at, asaas_invoice_url, asaas_pix_qrcode, asaas_pix_copypaste, owner_id",
      )
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Cobrança não encontrada");

    const { loadInvoiceIdentity } = await import("@/lib/dojo/invoice-branding.functions");
    const identity = await loadInvoiceIdentity(supabaseAdmin, (inv as any).owner_id);

    return {
      invoice: {
        id: (inv as any).id,
        description: (inv as any).description,
        amount: Number((inv as any).amount),
        due_date: (inv as any).due_date,
        status: (inv as any).status,
        paid_at: (inv as any).paid_at,
        asaas_invoice_url: (inv as any).asaas_invoice_url,
        pix_qrcode: (inv as any).asaas_pix_qrcode,
        pix_copypaste: (inv as any).asaas_pix_copypaste,
      },
      identity,
    };
  });
