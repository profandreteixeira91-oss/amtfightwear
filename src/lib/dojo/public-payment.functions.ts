/**
 * Server functions públicas para checkout embutido do Dojo Manager.
 *
 * Objetivo: permitir que o cliente pague uma cobrança (Pix / Boleto / Cartão)
 * inteiramente dentro da página /dojo/pay/:id, sem qualquer redirecionamento
 * para o Asaas. Todas as chamadas para o gateway acontecem server-side.
 *
 * A fatura é protegida por RLS; usamos supabaseAdmin porque o UUID já
 * funciona como capability token não enumerável.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Todas as cobranças do AMT Pay são criadas na conta central da AMT
 * (`ASAAS_PRODUCTION_API_KEY`) — ver `resolveDojoAsaasCredentials` em
 * `src/lib/asaas/enrollment.server.ts`. Portanto, para consultar/receber a
 * mesma cobrança precisamos usar a mesma credencial central. Usar a chave
 * do dojo (`asaas_api_key_encrypted`) provoca `Asaas API 404: Not Found`
 * porque o charge não existe naquela subconta.
 */
async function resolveOwnerAsaasKey(
  _supabaseAdmin: any,
  _ownerId: string,
): Promise<string | undefined> {
  return process.env.ASAAS_PRODUCTION_API_KEY;
}

async function loadInvoiceForPayment(supabaseAdmin: any, invoiceId: string) {
  const { data, error } = await supabaseAdmin
    .from("dojo_invoices")
    .select(
      "id, owner_id, amount, status, paid_at, asaas_charge_id, asaas_pix_qrcode, asaas_pix_copypaste, method",
    )
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cobrança não encontrada");
  if (data.status === "canceled") throw new Error("Esta cobrança foi cancelada");
  if (!data.asaas_charge_id) {
    throw new Error(
      "Cobrança ainda não foi processada. Peça ao dojo para reenviar o link.",
    );
  }
  return data as {
    id: string;
    owner_id: string;
    amount: number;
    status: string;
    paid_at: string | null;
    asaas_charge_id: string;
    asaas_pix_qrcode: string | null;
    asaas_pix_copypaste: string | null;
    method: string | null;
  };
}

// ============ PIX ============
export const getInvoicePix = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inv = await loadInvoiceForPayment(supabaseAdmin, data.invoiceId);
    if (inv.status === "paid") {
      return { paid: true as const };
    }
    const apiKey = await resolveOwnerAsaasKey(supabaseAdmin, inv.owner_id);
    const { asaasGetChargePix } = await import("@/lib/asaas/client.server");
    const pix = await asaasGetChargePix(inv.asaas_charge_id, apiKey);
    await supabaseAdmin
      .from("dojo_invoices")
      .update({
        asaas_pix_qrcode: pix.encodedImage,
        asaas_pix_copypaste: pix.payload,
        method: "pix",
      })
      .eq("id", inv.id);
    return {
      paid: false as const,
      qr: pix.encodedImage,
      copypaste: pix.payload,
      expirationDate: pix.expirationDate ?? null,
      amount: Number(inv.amount),
    };
  });

// ============ BOLETO ============
export const getInvoiceBoleto = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inv = await loadInvoiceForPayment(supabaseAdmin, data.invoiceId);
    if (inv.status === "paid") return { paid: true as const };

    const apiKey = await resolveOwnerAsaasKey(supabaseAdmin, inv.owner_id);
    const { asaasGetCharge } = await import("@/lib/asaas/client.server");
    const charge = await asaasGetCharge(inv.asaas_charge_id, apiKey);

    // Se o boleto ainda não foi materializado (billingType=UNDEFINED), o Asaas
    // pode não retornar bankSlipUrl. Tentamos buscar o boleto explicitamente.
    const bankSlipUrl = (charge as any).bankSlipUrl as string | null | undefined;
    let identificationField: string | null = null;
    let barCode: string | null = null;
    try {
      const { asaasFetch } = await import("@/lib/asaas/client.server").then((m) => ({
        asaasFetch: (m as any).asaasFetch,
      }));
      // asaasFetch é interno; usamos endpoint público via getCharge somente.
      identificationField = (charge as any).identificationField ?? null;
      barCode = (charge as any).nossoNumero ?? null;
      void asaasFetch;
    } catch {
      // ignore
    }

    await supabaseAdmin.from("dojo_invoices").update({ method: "boleto" }).eq("id", inv.id);
    return {
      paid: false as const,
      bankSlipUrl: bankSlipUrl ?? null,
      identificationField,
      barCode,
      amount: Number(inv.amount),
    };
  });

// ============ CARTÃO ============
const cardSchema = z.object({
  invoiceId: z.string().uuid(),
  holderName: z.string().min(2).max(60),
  number: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{13,19}$/)),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^\d{4}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
  holderInfo: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    cpfCnpj: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{11}$|^\d{14}$/)),
    postalCode: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{8}$/)),
    addressNumber: z.string().min(1).max(10),
    addressComplement: z.string().max(80).optional(),
    phone: z.string().optional(),
    mobilePhone: z.string().optional(),
  }),
});

export const payInvoiceWithCard = createServerFn({ method: "POST" })
  .inputValidator((i) => cardSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inv = await loadInvoiceForPayment(supabaseAdmin, data.invoiceId);
    if (inv.status === "paid") return { paid: true as const, status: "paid" };

    const apiKey = await resolveOwnerAsaasKey(supabaseAdmin, inv.owner_id);
    const { asaasChargeCreditCard } = await import("@/lib/asaas/client.server");

    let result;
    try {
      result = await asaasChargeCreditCard(
        inv.asaas_charge_id,
        {
          creditCard: {
            holderName: data.holderName.trim(),
            number: data.number,
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            ccv: data.ccv,
          },
          creditCardHolderInfo: {
            name: data.holderInfo.name.trim(),
            email: data.holderInfo.email,
            cpfCnpj: data.holderInfo.cpfCnpj,
            postalCode: data.holderInfo.postalCode,
            addressNumber: data.holderInfo.addressNumber,
            addressComplement: data.holderInfo.addressComplement,
            phone: data.holderInfo.phone,
            mobilePhone: data.holderInfo.mobilePhone,
          },
        },
        apiKey,
      );
    } catch (e: any) {
      // Extrai mensagem amigável (sem expor detalhes internos do gateway)
      const raw = String(e?.message ?? "");
      const friendly = raw.includes("400") || raw.includes("invalid")
        ? "Dados do cartão inválidos ou recusados. Verifique número, validade, CVV e nome."
        : "Não foi possível processar o cartão. Tente novamente ou use outra forma de pagamento.";
      return { paid: false as const, status: "refused", error: friendly };
    }

    const okStatuses = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];
    if (okStatuses.includes((result.status || "").toUpperCase())) {
      await supabaseAdmin
        .from("dojo_invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          method: "credit_card",
        })
        .eq("id", inv.id);
      return { paid: true as const, status: "paid" };
    }

    return {
      paid: false as const,
      status: (result.status || "pending").toLowerCase(),
      error: result.errorDescription || null,
    };
  });

// ============ POLL STATUS ============
export const pollInvoiceStatus = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("dojo_invoices")
      .select("id, owner_id, status, paid_at, asaas_charge_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Cobrança não encontrada");
    if (inv.status === "paid") return { status: "paid" as const, paidAt: inv.paid_at };
    if (!inv.asaas_charge_id) return { status: inv.status as string, paidAt: null };

    try {
      const apiKey = await resolveOwnerAsaasKey(supabaseAdmin, inv.owner_id);
      const { asaasGetCharge } = await import("@/lib/asaas/client.server");
      const charge = await asaasGetCharge(inv.asaas_charge_id, apiKey);
      const okStatuses = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];
      if (okStatuses.includes((charge.status || "").toUpperCase())) {
        const now = new Date().toISOString();
        await supabaseAdmin
          .from("dojo_invoices")
          .update({ status: "paid", paid_at: now })
          .eq("id", inv.id);
        return { status: "paid" as const, paidAt: now };
      }
    } catch {
      // silencioso — mantém status atual
    }
    return { status: inv.status as string, paidAt: null };
  });
