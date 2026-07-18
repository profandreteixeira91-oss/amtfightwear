import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getMySubscription,
  startMySubscription,
  cancelMySubscription,
  syncMySubscription,
  PLAN_AMOUNT,
  TRIAL_DAYS,
} from "@/lib/dojo/subscription.functions";

export const Route = createFileRoute("/dojo/app/subscription")({
  head: () => ({ meta: [{ title: "Assinatura — AMT Dojo Manager" }] }),
  component: SubscriptionPage,
});

const statusLabel: Record<string, { label: string; className: string; Icon: any }> = {
  trialing: { label: "Período de teste", className: "bg-blue-100 text-blue-800", Icon: Clock },
  pending: { label: "Aguardando autorização", className: "bg-amber-100 text-amber-800", Icon: Clock },
  active: { label: "Ativa", className: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  paused: { label: "Pausada", className: "bg-neutral-100 text-neutral-700", Icon: Clock },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800", Icon: XCircle },
};

function SubscriptionPage() {
  const qc = useQueryClient();
  const get = useServerFn(getMySubscription);
  const start = useServerFn(startMySubscription);
  const cancel = useServerFn(cancelMySubscription);
  const sync = useServerFn(syncMySubscription);

  const { data: sub, isLoading } = useQuery({
    queryKey: ["dojo", "subscription"],
    queryFn: () => get({}),
  });
  const [busy, setBusy] = useState(false);

  // Se voltou do checkout, sincroniza uma vez
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("mp") === "return") {
      void sync({ data: {} })
        .then(() => qc.invalidateQueries({ queryKey: ["dojo", "subscription"] }))
        .catch(() => {});
    }
  }, [sync, qc]);

  const status = sub?.status ?? "pending";
  const s = statusLabel[status] ?? statusLabel.pending;

  const trialActive =
    sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date() && status === "trialing";
  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;

  async function activate() {
    setBusy(true);
    try {
      const { init_point } = await start({});
      if (init_point) {
        window.location.href = `${init_point}${init_point.includes("?") ? "&" : "?"}back_url=${encodeURIComponent(window.location.origin + "/dojo/app/subscription?mp=return")}`;
      } else {
        toast.error("Mercado Pago não retornou link de checkout");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao iniciar assinatura");
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    if (!confirm("Cancelar a assinatura? Você perderá o acesso ao final do período atual.")) return;
    setBusy(true);
    try {
      await cancel({});
      await qc.invalidateQueries({ queryKey: ["dojo", "subscription"] });
      toast.success("Assinatura cancelada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao cancelar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Assinatura</h1>
          <p className="text-sm text-neutral-500">Plano AMT Dojo Manager — cobrado via Mercado Pago</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Plano Único</span>
            <Badge className={s.className}>
              <s.Icon className="mr-1 h-3.5 w-3.5" /> {s.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">R$ {PLAN_AMOUNT.toFixed(2).replace(".", ",")}</span>
            <span className="text-sm text-neutral-500">/ mês</span>
          </div>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>• Alunos, agenda, avaliações e certificados</li>
            <li>• App do aluno white-label + notificações push</li>
            <li>• Cobrança dos alunos com o seu próprio gateway (MP, Asaas, PagSeguro)</li>
            <li>• Integrações Gympass / TotalPass / WhatsApp</li>
          </ul>

          {trialActive && trialEnds && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              🎁 Você está no período de teste de {TRIAL_DAYS} dias. Fim do teste:{" "}
              <strong>{trialEnds.toLocaleDateString("pt-BR")}</strong>. Ative a assinatura para
              continuar após essa data.
            </div>
          )}

          {sub?.current_period_end && (
            <div className="text-xs text-neutral-500">
              Próxima cobrança: {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {(status === "trialing" || status === "pending" || status === "cancelled") && (
              <Button onClick={activate} disabled={busy || isLoading} className="bg-red-600 hover:bg-red-700">
                <ExternalLink className="mr-2 h-4 w-4" />
                {status === "cancelled" ? "Reativar assinatura" : "Ativar assinatura no Mercado Pago"}
              </Button>
            )}
            {status === "active" && (
              <Button onClick={doCancel} disabled={busy} variant="outline">
                Cancelar assinatura
              </Button>
            )}
          </div>

          <p className="pt-2 text-[11px] text-neutral-400">
            Pagamento recorrente processado com segurança pelo Mercado Pago. Você pode pagar com{" "}
            <strong>cartão de crédito</strong> ou com <strong>saldo da sua conta Mercado Pago</strong>.
            Cancele a qualquer momento — nenhum dado do cartão é armazenado no AMT Dojo Manager.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
