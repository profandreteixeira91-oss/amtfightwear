import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Endpoint público (sem auth) para renderizar a página branded /pay/:id.
 * Retorna apenas dados seguros da fatura + identidade visual do dojo +
 * configuração de métodos de pagamento aceitos (plano + status AMT Pay).
 */
export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("dojo_invoices")
      .select(
        "id, description, amount, due_date, status, paid_at, asaas_invoice_url, asaas_pix_qrcode, asaas_pix_copypaste, asaas_charge_id, owner_id, enrollment_id",
      )
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Cobrança não encontrada");

    const { loadInvoiceIdentity } = await import("@/lib/dojo/invoice-branding.functions");
    const identity = await loadInvoiceIdentity(supabaseAdmin, (inv as any).owner_id);

    // Carrega o plano vinculado à matrícula desta fatura (se houver) para
    // descobrir quais métodos o dono do dojo habilitou.
    let planMethods: any[] = [];
    if ((inv as any).enrollment_id) {
      const { data: enr } = await supabaseAdmin
        .from("dojo_enrollments")
        .select("plan:dojo_plans(payment_methods)")
        .eq("id", (inv as any).enrollment_id)
        .maybeSingle();
      const raw = (enr as any)?.plan?.payment_methods;
      if (Array.isArray(raw)) planMethods = raw;
    }

    // Descobre se o AMT Pay está ativo no dojo (subconta aprovada ou wallet
    // externa vinculada). Central-only = AMT Pay ainda não ativado.
    const { data: profile } = await supabaseAdmin
      .from("dojo_academy_profile")
      .select(
        "asaas_subaccount_id, asaas_subaccount_api_key, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status",
      )
      .eq("owner_id", (inv as any).owner_id)
      .maybeSingle();

    const { resolveDojoAsaasCredentials } = await import("@/lib/asaas/enrollment.server");
    const { mode } = resolveDojoAsaasCredentials((profile ?? {}) as any);
    const amtPayLinked = mode === "subaccount" || mode === "external_wallet";
    const hasCharge = Boolean((inv as any).asaas_charge_id);
    // Só oferece pagamento online quando existe um charge OU o dojo tem
    // AMT Pay ativado (para gerar um novo charge on-demand).
    const amtPayActive = hasCharge || amtPayLinked;

    // Interpreta o array de métodos aceitando os dois formatos usados no app:
    //   canônico  → { code: "pix"|"card_machine"|"payment_link"|"cash", enabled }
    //   legado    → { method: "pix"|"credit_card"|"boleto"|..., enabled }
    const codes = new Set<string>();
    for (const m of planMethods) {
      if (!m || m.enabled === false) continue;
      const c = String(m.code ?? m.method ?? "").toLowerCase();
      if (c) codes.add(c);
    }
    // Se o plano não tem nenhum método configurado, assume o padrão histórico
    // (para não travar cobranças criadas antes da feature de métodos).
    const planHasConfig = codes.size > 0;

    const planAllowsPix = !planHasConfig || codes.has("pix");
    const planAllowsCard =
      !planHasConfig || codes.has("payment_link") || codes.has("credit_card");
    const planAllowsBoleto =
      !planHasConfig || codes.has("payment_link") || codes.has("boleto");

    const allowPix = amtPayActive && planAllowsPix;
    const allowCard = amtPayActive && planAllowsCard;
    const allowBoleto = amtPayActive && planAllowsBoleto;

    // Métodos "offline" para instruções ao pagador quando o online não está
    // disponível (ou como complemento).
    const OFFLINE_LABEL: Record<string, string> = {
      cash: "Dinheiro (presencial)",
      card_machine: "Maquininha de cartão (débito ou crédito)",
      pix: "PIX manual com o dojo",
      payment_link: "Link de pagamento enviado pelo dojo",
    };
    const offlineMethods: Array<{ code: string; label: string }> = [];
    if (planHasConfig) {
      for (const code of codes) {
        // Se o online está desativado ou o método é sempre offline, listamos.
        const isOffline = code === "cash" || code === "card_machine";
        const isOnline = code === "pix" || code === "payment_link" || code === "credit_card" || code === "boleto";
        if (isOffline) offlineMethods.push({ code, label: OFFLINE_LABEL[code] ?? code });
        else if (isOnline && !amtPayActive) {
          offlineMethods.push({
            code,
            label: OFFLINE_LABEL[code] ?? code,
          });
        }
      }
    }

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
        has_charge: hasCharge,
      },
      identity,
      payment: {
        amtPayActive,
        allowPix,
        allowCard,
        allowBoleto,
        anyOnline: allowPix || allowCard || allowBoleto,
        offlineMethods,
      },
    };
  });
