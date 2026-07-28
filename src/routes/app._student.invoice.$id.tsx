import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { ArrowLeft, Copy, RefreshCw, CheckCircle2, Clock, QrCode as QrIcon, Link as LinkIcon, Info } from "lucide-react";
import {
  getMyInvoice,
  payMyInvoicePix,
  syncMyInvoicePayment,
} from "@/lib/student/payments.functions";
import { getNativeBillingForInvoice } from "@/lib/dojo/native-billing.functions";
import { buildPixBrCode } from "@/lib/pix/brcode";

export const Route = createFileRoute("/app/_student/invoice/$id")({
  head: () => ({ meta: [{ title: "Pagamento — Portal do Aluno" }] }),
  component: InvoicePage,
});

const PIX_TYPE_LABEL: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Chave aleatória",
};

function InvoicePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getInv = useServerFn(getMyInvoice);
  const pay = useServerFn(payMyInvoicePix);
  const sync = useServerFn(syncMyInvoicePayment);
  const getNb = useServerFn(getNativeBillingForInvoice);

  const { data: invoice, refetch } = useQuery({
    queryKey: ["student", "invoice", id],
    queryFn: () => getInv({ data: { id } }),
  });

  const { data: nb } = useQuery({
    queryKey: ["student", "invoice-native", id],
    queryFn: () => getNb({ data: { invoice_id: id } }),
  });

  const [pix, setPix] = useState<{
    qr_code_base64: string | null;
    copy_paste: string | null;
    expires_at: string | null;
    amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [nativeQr, setNativeQr] = useState<string | null>(null);
  const [nativeCopyPaste, setNativeCopyPaste] = useState<string | null>(null);

  const paid = invoice?.status === "paid";

  const hasNativePix = Boolean(nb?.pix_enabled && nb?.pix_key);
  const hasPaymentLink = Boolean(nb?.payment_link_enabled && nb?.payment_link_url);
  const hasAmtPay = Boolean((invoice as any)?.payment_id) || (!hasNativePix && !hasPaymentLink && nb?.pix_enabled);

  // Gera QR PIX no padrão BR Code (EMV) para leitura por apps bancários
  useEffect(() => {
    if (!hasNativePix || !nb?.pix_key || !invoice) {
      setNativeQr(null);
      setNativeCopyPaste(null);
      return;
    }
    try {
      const payload = buildPixBrCode({
        pixKey: nb.pix_key,
        merchantName: nb.pix_holder_name || "RECEBEDOR",
        merchantCity: "BRASIL",
        amount: Number(invoice.amount) || 0,
        txid: (invoice.id ?? "").replace(/-/g, "").slice(0, 25),
        description: invoice.description ?? undefined,
      });
      setNativeCopyPaste(payload);
      QRCode.toDataURL(payload, { width: 320, margin: 1, errorCorrectionLevel: "M" })
        .then((url) => setNativeQr(url))
        .catch(() => setNativeQr(null));
    } catch {
      setNativeQr(null);
      setNativeCopyPaste(null);
    }
  }, [hasNativePix, nb?.pix_key, nb?.pix_holder_name, invoice?.id, invoice?.amount, invoice?.description]);

  async function generateAmtPay() {
    setLoading(true);
    try {
      const r = await pay({ data: { invoice_id: id } });
      setPix({
        qr_code_base64: r.qr_code_base64,
        copy_paste: r.copy_paste,
        expires_at: r.expires_at,
        amount: r.amount,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar Pix");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pix || paid) return;
    const t = setInterval(async () => {
      try {
        const r = await sync({ data: { invoice_id: id } });
        if (r.status === "paid") {
          toast.success("Pagamento confirmado!");
          await qc.invalidateQueries({ queryKey: ["student", "invoices"] });
          await refetch();
        }
      } catch {
        /* noop */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [pix, paid, id, sync, refetch, qc]);

  if (!invoice) {
    return <p className="text-sm text-neutral-500">Carregando…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/app/finance"
          className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 hover:bg-neutral-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Pagamento</h1>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="text-xs text-neutral-500">{invoice.description ?? "Mensalidade"}</div>
        <div className="mt-1 text-2xl font-black">R$ {Number(invoice.amount).toFixed(2)}</div>
        <div className="mt-1 text-xs text-neutral-500">
          Vencimento: {new Date(invoice.due_date).toLocaleDateString("pt-BR")}
        </div>
      </div>

      {paid && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-5 w-5" />
          <span>Cobrança já paga. Obrigado!</span>
        </div>
      )}

      {!paid && (
        <>
          {/* Cobrança nativa — PIX */}
          {hasNativePix && (
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              <div className="flex items-center gap-2">
                <QrIcon className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold">Pagar com PIX</h2>
              </div>
              {nativeQr && (
                <img
                  src={nativeQr}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded-lg ring-1 ring-neutral-200"
                />
              )}
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {PIX_TYPE_LABEL[nb!.pix_key_type] ?? "Chave"} do favorecido
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={nb!.pix_key}
                      className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs ring-1 ring-neutral-200"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(nb!.pix_key);
                        toast.success("Chave copiada");
                      }}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-900 text-white"
                      aria-label="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {nb!.pix_holder_name && (
                  <div className="text-xs text-neutral-600">
                    <span className="font-semibold">Titular:</span> {nb!.pix_holder_name}
                  </div>
                )}
                <div className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 ring-1 ring-amber-100">
                  <Info className="mr-1 inline h-3 w-3 -translate-y-0.5" />
                  Após pagar, o professor confirmará manualmente o recebimento.
                </div>
              </div>
            </div>
          )}

          {/* Link fixo de pagamento */}
          {hasPaymentLink && (
            <a
              href={nb!.payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: "var(--sa-primary, #dc2626)" }}
            >
              <LinkIcon className="h-4 w-4" />
              {nb!.payment_link_label || "Pagar agora"}
            </a>
          )}

          {/* Instruções extras */}
          {nb?.instructions && (
            <div className="rounded-2xl bg-white p-4 text-xs text-neutral-700 shadow-sm ring-1 ring-neutral-100">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Instruções do dojo
              </div>
              <p className="whitespace-pre-wrap">{nb.instructions}</p>
            </div>
          )}

          {/* Fallback / AMT Pay (Mercado Pago) */}
          {hasAmtPay && !pix && (invoice.status !== "paid") && (
            <button
              onClick={generateAmtPay}
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--sa-primary, #dc2626)" }}
            >
              {loading ? "Gerando Pix…" : "Gerar Pix via AMT Pay"}
            </button>
          )}
          
          {!hasNativePix && !hasPaymentLink && !nb?.pix_enabled && !paid && (
            <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 ring-1 ring-amber-100">
              <Info className="mr-1 inline h-4 w-4 -translate-y-0.5" />
              O pagamento para este dojo deve ser combinado diretamente com o professor. 
              Nenhum método de pagamento online foi configurado pelo administrador.
            </div>
          )}

          {hasAmtPay && pix && (
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              {pix.qr_code_base64 && (
                <img
                  src={pix.qr_code_base64}
                  alt="QR Code Pix"
                  className="mx-auto h-56 w-56 rounded-lg ring-1 ring-neutral-200"
                />
              )}
              {pix.copy_paste && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Pix Copia e Cola
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={pix.copy_paste}
                      className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs ring-1 ring-neutral-200"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pix.copy_paste ?? "");
                        toast.success("Código copiado");
                      }}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-900 text-white"
                      aria-label="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {pix.expires_at && (
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <Clock className="h-3.5 w-3.5" />
                  Expira em {new Date(pix.expires_at).toLocaleString("pt-BR")}
                </div>
              )}
              <button
                onClick={async () => {
                  const r = await sync({ data: { invoice_id: id } });
                  if (r.status === "paid") {
                    toast.success("Pagamento confirmado!");
                    await qc.invalidateQueries({ queryKey: ["student", "invoices"] });
                    await refetch();
                  } else {
                    toast.info("Ainda não recebemos. Estamos verificando automaticamente.");
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Já paguei — verificar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
