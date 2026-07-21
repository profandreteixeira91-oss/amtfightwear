import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook Asaas — sincroniza cobranças de Subscriptions com `dojo_invoices`.
 *
 * Eventos tratados:
 *  - PAYMENT_CREATED / PAYMENT_UPDATED / PAYMENT_AWAITING_RISK_ANALYSIS  → upsert como "pending"
 *  - PAYMENT_CONFIRMED / PAYMENT_RECEIVED / PAYMENT_RECEIVED_IN_CASH     → "paid"
 *  - PAYMENT_OVERDUE                                                     → "overdue"
 *  - PAYMENT_DELETED / PAYMENT_REFUNDED / PAYMENT_CHARGEBACK_REQUESTED   → "canceled"
 *
 * Segurança: valida token Asaas via header `asaas-access-token`
 * (a chave `ASAAS_WEBHOOK_TOKEN` é configurada no painel do Asaas).
 */
export const Route = createFileRoute("/api/public/hooks/asaas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("asaas-access-token") ?? "";
        const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
        if (!expected || token !== expected) {
          return new Response("Invalid token", { status: 401 });
        }

        let body: any = null;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event: string = String(body?.event ?? "");
        const payment = body?.payment ?? null;
        if (!event || !payment?.id) {
          return Response.json({ ignored: true, reason: "no-payment" });
        }

        // Só nos interessa cobrança pertencente a uma Subscription (recorrência).
        const subscriptionId: string | null = payment.subscription ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Encontra a matrícula: por subscription, ou por externalReference (fallback).
        let enrollmentId: string | null = null;
        let ownerId: string | null = null;
        let studentId: string | null = null;
        let unitId: string | null = null;

        // Cobranças avulsas criadas pelo sistema carregam o UUID local.
        if (typeof payment.externalReference === "string") {
          const invoiceMatch = /^dojo_invoice:([0-9a-fA-F-]{36})$/.exec(payment.externalReference);
          if (invoiceMatch) {
            const { data: invoice } = await supabaseAdmin
              .from("dojo_invoices")
              .select("id, owner_id, student_id, enrollment_id, unit_id")
              .eq("id", invoiceMatch[1])
              .maybeSingle();
            if (invoice) {
              enrollmentId = (invoice as any).enrollment_id ?? null;
              ownerId = (invoice as any).owner_id;
              studentId = (invoice as any).student_id;
              unitId = (invoice as any).unit_id ?? null;
            }
          }
        }

        if (!ownerId && subscriptionId) {
          const { data: enr } = await supabaseAdmin
            .from("dojo_enrollments")
            .select("id, owner_id, student_id, student:dojo_students(unit_id)")
            .eq("asaas_subscription_id", subscriptionId)
            .maybeSingle();
          if (enr) {
            enrollmentId = (enr as any).id;
            ownerId = (enr as any).owner_id;
            studentId = (enr as any).student_id;
            unitId = (enr as any).student?.unit_id ?? null;
          }
        }
        if (!ownerId && typeof payment.externalReference === "string") {
          const m = /^dojo_enrollment:([0-9a-fA-F-]{36})$/.exec(payment.externalReference);
          if (m) {
            const { data: enr } = await supabaseAdmin
              .from("dojo_enrollments")
              .select("id, owner_id, student_id, student:dojo_students(unit_id)")
              .eq("id", m[1])
              .maybeSingle();
            if (enr) {
              enrollmentId = (enr as any).id;
              ownerId = (enr as any).owner_id;
              studentId = (enr as any).student_id;
              unitId = (enr as any).student?.unit_id ?? null;
            }
          }
        }

        if (!ownerId || !studentId) {
          return Response.json({ ignored: true, reason: "no-local-charge", event });
        }

        // Mapeia status
        let status: "pending" | "paid" | "overdue" | "canceled" = "pending";
        let paidAt: string | null = null;
        switch (event) {
          case "PAYMENT_CONFIRMED":
          case "PAYMENT_RECEIVED":
          case "PAYMENT_RECEIVED_IN_CASH":
            status = "paid";
            paidAt = payment.paymentDate
              ? new Date(payment.paymentDate).toISOString()
              : new Date().toISOString();
            break;
          case "PAYMENT_OVERDUE":
            status = "overdue";
            break;
          case "PAYMENT_DELETED":
          case "PAYMENT_REFUNDED":
          case "PAYMENT_CHARGEBACK_REQUESTED":
          case "PAYMENT_REFUND_IN_PROGRESS":
            status = "canceled";
            break;
          default:
            status = "pending";
        }

        // Upsert por asaas_charge_id
        const chargeId = String(payment.id);
        const { data: existing } = await supabaseAdmin
          .from("dojo_invoices")
          .select("id")
          .eq("asaas_charge_id", chargeId)
          .maybeSingle();

        const method: string | null =
          payment.billingType === "PIX"
            ? "pix"
            : payment.billingType === "BOLETO"
              ? "boleto"
              : payment.billingType === "CREDIT_CARD"
                ? "credit_card"
                : null;

        const patch: Record<string, any> = {
          status,
          amount: Number(payment.value ?? 0),
          due_date: payment.dueDate ?? undefined,
          description: payment.description ?? `Mensalidade — ${payment.dueDate ?? ""}`.trim(),
          payment_provider: "asaas",
          provider: "asaas",
          method,
          payment_link: payment.invoiceUrl ?? undefined,
          asaas_invoice_url: payment.invoiceUrl ?? undefined,
          paid_at: paidAt,
        };

        let invoiceIdForLedger: string | null = null;
        if (existing) {
          await supabaseAdmin
            .from("dojo_invoices")
            .update(patch as never)
            .eq("id", (existing as any).id);
          invoiceIdForLedger = (existing as any).id;
        } else {
          const { data: inserted } = await supabaseAdmin
            .from("dojo_invoices")
            .insert({
              student_id: studentId,
              enrollment_id: enrollmentId,
              unit_id: unitId,
              owner_id: ownerId,
              asaas_charge_id: chargeId,
              asaas_subscription_id: subscriptionId,
              ...patch,
            } as never)
            .select("id")
            .single();
          invoiceIdForLedger = (inserted as any)?.id ?? null;
        }

        // ------------------------------------------------------------
        // Fase 3: conciliação automática — grava ledger + líquido
        // ------------------------------------------------------------
        if (invoiceIdForLedger && (status === "paid" || status === "canceled")) {
          try {
            const installments = Number(payment.installmentNumber ?? payment.installmentCount ?? 1);
            const ledgerMethod: "pix" | "boleto" | "card" | "link" =
              method === "pix" || method === "boleto" || method === "credit_card"
                ? method === "credit_card"
                  ? "card"
                  : (method as "pix" | "boleto")
                : "link";
            const paidAtDate = paidAt ? new Date(paidAt) : new Date();

            if (status === "paid") {
              const { recordInvoicePaymentToLedger } = await import(
                "@/lib/dojo/payments/ledger.server"
              );
              await recordInvoicePaymentToLedger(supabaseAdmin, {
                ownerId,
                invoiceId: invoiceIdForLedger,
                studentId,
                gross: Number(payment.value ?? 0),
                method: ledgerMethod,
                installments,
                provider: "asaas",
                providerTxId: chargeId,
                description: payment.description ?? null,
                paidAt: paidAtDate,
              });
            } else if (
              event === "PAYMENT_REFUNDED" ||
              event === "PAYMENT_CHARGEBACK_REQUESTED" ||
              event === "PAYMENT_REFUND_IN_PROGRESS"
            ) {
              const { recordInvoiceRefundToLedger } = await import(
                "@/lib/dojo/payments/ledger.server"
              );
              await recordInvoiceRefundToLedger(supabaseAdmin, {
                ownerId,
                invoiceId: invoiceIdForLedger,
                studentId,
                gross: Number(payment.value ?? 0),
                method: ledgerMethod,
                provider: "asaas",
                providerTxId: chargeId,
                description: `Estorno — ${payment.description ?? ""}`.trim(),
                paidAt: new Date(),
              });
            }
          } catch (err) {
            // Não bloqueia o webhook; loga para auditoria
            console.error("[asaas-webhook] ledger error", err);
          }
        }

        return Response.json({
          ok: true,
          action: existing ? "updated" : "created",
          event,
          status,
        });
      },
    },
  },
});
