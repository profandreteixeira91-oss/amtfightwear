import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { qrToDataURL } from "@/lib/qrcode-lazy";
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  QrCode as QrIcon,
  Link as LinkIcon,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/pay-demo")({
  head: () => ({
    meta: [
      { title: "Prévia — Cobrança do Aluno" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

const DEMO = {
  description: "Mensalidade — Jiu-Jitsu Adulto (Agosto/2026)",
  amount: 170,
  due_date: "2026-08-15",
  pix_key: "contato@rochajiujitsu.com.br",
  pix_key_type: "E-mail",
  pix_holder_name: "Rocha Jiu-Jitsu Ilhéus",
  payment_link_url: "https://pag.ae/rocha-jiujitsu-mensalidade",
  payment_link_label: "Pagar via PagSeguro",
  instructions:
    "Após o pagamento, envie o comprovante pelo WhatsApp (82) 92001-6732 para confirmarmos a sua matrícula.",
};

function DemoPage() {
  const [qr, setQr] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    qrToDataURL(DEMO.pix_key, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Header estilo portal do aluno */}
      <div
        className="px-4 pt-6 pb-8 text-white"
        style={{ background: "linear-gradient(135deg,#dc2626,#7f1d1d)" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">
              Rocha Jiu-Jitsu Ilhéus
            </div>
            <h1 className="text-lg font-black">Pagamento</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-5 max-w-md space-y-4 px-4">
        {/* Card resumo */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
          <div className="text-xs text-neutral-500">{DEMO.description}</div>
          <div className="mt-1 text-2xl font-black tracking-tight">
            R$ {DEMO.amount.toFixed(2).replace(".", ",")}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Vencimento: {new Date(DEMO.due_date).toLocaleDateString("pt-BR")}
          </div>
        </div>

        {paid ? (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
            <span>Cobrança já paga. Obrigado!</span>
          </div>
        ) : (
          <>
            {/* PIX nativo */}
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              <div className="flex items-center gap-2">
                <QrIcon className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold">Pagar com PIX</h2>
              </div>
              {qr && (
                <img
                  src={qr}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded-lg ring-1 ring-neutral-200"
                />
              )}
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {DEMO.pix_key_type} do favorecido
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={DEMO.pix_key}
                      className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs ring-1 ring-neutral-200"
                    />
                    <button
                      className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-900 text-white"
                      aria-label="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-neutral-600">
                  <span className="font-semibold">Titular:</span>{" "}
                  {DEMO.pix_holder_name}
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 ring-1 ring-amber-100">
                  <Info className="mr-1 inline h-3 w-3 -translate-y-0.5" />
                  Após pagar, o professor confirmará manualmente o recebimento.
                </div>
              </div>
            </div>

            {/* Divisor OU */}
            <div className="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              ou
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            {/* Link de pagamento */}
            <button
              onClick={() => setPaid(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm"
              style={{ background: "#dc2626" }}
            >
              <LinkIcon className="h-4 w-4" />
              {DEMO.payment_link_label}
            </button>

            {/* Instruções */}
            <div className="rounded-2xl bg-white p-4 text-xs text-neutral-700 shadow-sm ring-1 ring-neutral-100">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Instruções do dojo
              </div>
              <p className="whitespace-pre-wrap">{DEMO.instructions}</p>
            </div>

            <p className="pt-2 text-center text-[11px] text-neutral-400">
              Página de demonstração — sem cobrança real.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
