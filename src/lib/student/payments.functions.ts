// Pagamentos in-app do App do Aluno — Pix via Mercado Pago para mensalidades (dojo_invoices).
// Usa o Access Token do Mercado Pago **do dono do dojo** (não da AMT).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";
import { requireOwnerMpToken } from "@/lib/dojo/payment-gateway.server";

const MP_BASE = "https://api.mercadopago.com";

async function mpWithToken<T = any>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg =
      (body && (body.message || body?.cause?.[0]?.description || body.error)) ||
      `Mercado Pago ${res.status}`;
    throw new Error(String(msg));
  }
  return body as T;
}

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export const payMyInvoicePix = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ invoice_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    // Carrega a fatura via RLS (aluno só vê as próprias)
    const { data: invoice, error } = await context.supabase
      .from("dojo_invoices")
      .select("id, student_id, owner_id, amount, description, status, payment_id, payment_link")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) throw new Error("Cobrança não encontrada");
    if (invoice.status === "paid") throw new Error("Esta cobrança já foi paga");
    if (!invoice.student_id) throw new Error("Cobrança sem aluno vinculado");

    // Token do MP do dono do dojo (não o da AMT).
    const mpToken = await requireOwnerMpToken((invoice as any).owner_id);

    const { data: student } = await context.supabase
      .from("dojo_students")
      .select("id, full_name, email, cpf, phone")
      .eq("id", invoice.student_id)
      .maybeSingle();
    if (!student) throw new Error("Aluno não encontrado");

    // Se já existe um Pix ativo, reutiliza
    if (invoice.payment_id) {
      try {
        const existing = await mpWithToken<any>(mpToken, `/v1/payments/${invoice.payment_id}`);
        const s = String(existing.status ?? "").toLowerCase();
        if (["pending", "in_process", "authorized"].includes(s)) {
          const poi = existing?.point_of_interaction?.transaction_data ?? {};
          return {
            payment_id: String(existing.id),
            status: s,
            qr_code_base64: poi.qr_code_base64
              ? `data:image/png;base64,${poi.qr_code_base64}`
              : null,
            copy_paste: poi.qr_code ?? null,
            expires_at: existing.date_of_expiration ?? null,
            amount: Number(invoice.amount),
          };
        }
      } catch {
        /* segue e cria novo */
      }
    }

    const nameParts = (student.full_name || "Aluno").trim().split(/\s+/);
    const firstName = nameParts[0] || "Aluno";
    const lastName = nameParts.slice(1).join(" ") || "AMT";
    const cpf = onlyDigits(student.cpf);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const payment = await mpWithToken<any>(mpToken, "/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": `inv-${invoice.id}-${Date.now()}` },
      body: JSON.stringify({
        transaction_amount: Math.round(Number(invoice.amount) * 100) / 100,
        description: invoice.description || "Mensalidade AMT Dojo",
        external_reference: `dojo_invoice:${invoice.id}`,
        payment_method_id: "pix",
        date_of_expiration: expires.toISOString(),
        notification_url: "https://amtfightwear.com.br/api/public/hooks/mercadopago",
        payer: {
          email: student.email || "aluno@amtfightwear.com.br",
          first_name: firstName,
          last_name: lastName,
          identification: cpf ? { type: "CPF", number: cpf } : undefined,
        },
      }),
    });

    const poi = payment?.point_of_interaction?.transaction_data ?? {};
    const paymentId = String(payment.id ?? "");
    const ticketUrl = poi.ticket_url ?? null;

    await context.supabase
      .from("dojo_invoices")
      .update({
        payment_provider: "mercadopago",
        method: "PIX",
        payment_id: paymentId,
        payment_link: ticketUrl,
        status: invoice.status === "overdue" ? "overdue" : "pending",
      } as never)
      .eq("id", invoice.id);

    return {
      payment_id: paymentId,
      status: String(payment.status ?? "").toLowerCase(),
      qr_code_base64: poi.qr_code_base64 ? `data:image/png;base64,${poi.qr_code_base64}` : null,
      copy_paste: poi.qr_code ?? null,
      expires_at: payment.date_of_expiration ?? null,
      amount: Number(invoice.amount),
    };
  });

export const syncMyInvoicePayment = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ invoice_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: invoice } = await context.supabase
      .from("dojo_invoices")
      .select("id, owner_id, payment_id, status")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (!invoice?.payment_id) return { status: invoice?.status ?? "pending" };

    const mpToken = await requireOwnerMpToken((invoice as any).owner_id);
    const payment = await mpWithToken<any>(mpToken, `/v1/payments/${invoice.payment_id}`);
    const status = String(payment.status ?? "").toLowerCase();
    const patch: Record<string, any> = {};
    if (status === "approved") {
      patch.status = "paid";
      patch.paid_at = new Date().toISOString();
    } else if (["cancelled", "rejected"].includes(status)) {
      patch.status = "canceled";
    }
    if (Object.keys(patch).length) {
      await context.supabase.from("dojo_invoices").update(patch as never).eq("id", invoice.id);
    }
    return { status: patch.status ?? invoice.status ?? status };
  });

export const getMyInvoice = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("dojo_invoices")
      .select("id, description, amount, due_date, status, payment_id, method, payment_link")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return inv;
  });
