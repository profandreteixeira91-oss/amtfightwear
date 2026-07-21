import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
import { getPublicInvoice } from "@/lib/dojo/public-invoice.functions";

export const Route = createFileRoute("/pay/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Pagamento — Dojo Manager" },
      { name: "description", content: "Página segura para pagamento da sua cobrança." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayPage,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function PayPage() {
  const { invoiceId } = Route.useParams();
  const fetchInvoice = useServerFn(getPublicInvoice);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: Awaited<ReturnType<typeof getPublicInvoice>> }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchInvoice({ data: { invoiceId } });
        if (alive) setState({ status: "ready", data });
      } catch (e: any) {
        if (alive) setState({ status: "error", message: e?.message ?? "Erro ao carregar cobrança" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [invoiceId, fetchInvoice]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Carregando cobrança…</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Não foi possível abrir a cobrança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice, identity } = state.data;
  const isPaid = invoice.status === "paid" || !!invoice.paid_at;
  const isCanceled = invoice.status === "canceled";

  const goToGateway = () => {
    if (invoice.asaas_invoice_url) window.location.href = invoice.asaas_invoice_url;
  };

  const copyPix = async () => {
    if (!invoice.pix_copypaste) return;
    await navigator.clipboard.writeText(invoice.pix_copypaste);
    toast.success("Código Pix copiado!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header branded */}
        <div className="flex items-center gap-3 pb-2">
          {identity.logoUrl ? (
            <img
              src={identity.logoUrl}
              alt={identity.name}
              className="h-14 w-14 rounded-lg object-cover border bg-white"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {identity.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Cobrança emitida por</p>
            <h1 className="text-xl font-semibold leading-tight">{identity.name}</h1>
            {identity.document ? (
              <p className="text-xs text-muted-foreground">{identity.document}</p>
            ) : null}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Detalhes da cobrança</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Vencimento{" "}
                  {new Date(invoice.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              {isPaid ? (
                <Badge className="bg-green-600 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                </Badge>
              ) : isCanceled ? (
                <Badge variant="destructive">Cancelada</Badge>
              ) : (
                <Badge variant="secondary">Aguardando pagamento</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {invoice.description || "Cobrança"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Valor total</span>
              <span className="text-3xl font-bold">{brl(invoice.amount)}</span>
            </div>

            {!isPaid && !isCanceled ? (
              <>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={goToGateway}
                  disabled={!invoice.asaas_invoice_url}
                >
                  Pagar agora <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Escolha Pix, boleto ou cartão na próxima etapa. Ambiente seguro.
                </p>

                {invoice.pix_copypaste ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-medium">Ou pague com Pix Copia e Cola</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={invoice.pix_copypaste}
                        className="flex-1 rounded-md border bg-muted/40 px-2 py-1 text-xs font-mono truncate"
                      />
                      <Button size="sm" variant="outline" onClick={copyPix}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Footer branded */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Pagamento processado com segurança
          </p>
          {identity.phone || identity.email ? (
            <p className="text-xs text-muted-foreground">
              Dúvidas? Fale com {identity.name}
              {identity.phone ? ` • ${identity.phone}` : ""}
              {identity.email ? ` • ${identity.email}` : ""}
            </p>
          ) : null}
          {identity.footerNote ? (
            <p className="text-xs text-muted-foreground">{identity.footerNote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
