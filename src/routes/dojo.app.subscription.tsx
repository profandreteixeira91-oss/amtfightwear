import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startMySubscription, getMySubscription, cancelMySubscription, syncMySubscription, PLAN_AMOUNT, TRIAL_DAYS } from "@/lib/dojo/subscription.functions";

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
  const cancel = useServerFn(cancelMySubscription);
  const sync = useServerFn(syncMySubscription);

  const { data: sub, isLoading } = useQuery({
    queryKey: ["dojo", "subscription"],
    queryFn: () => get({}),
  });
  const [busy, setBusy] = useState(false);
  const startSubscription = useServerFn(startMySubscription);
  const [ownerEmail, setOwnerEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOwnerEmail(data.user?.email ?? undefined));
  }, []);

  // Retorno de eventual checkout externo antigo — sincroniza uma vez.
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

  const canActivate =
    status === "trialing" || status === "pending" || status === "cancelled" || status === "paused";

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 sm:h-11 sm:w-11">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Assinatura</h1>
          <p className="truncate text-xs text-neutral-500 sm:text-sm">
            Plano AMT Dojo Manager — Mercado Pago
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 sm:pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="truncate text-base sm:text-lg">Plano Único</span>
            <Badge className={cn("shrink-0 h-6 px-2 text-[10px] sm:text-xs", s.className)}>
              <s.Icon className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> {s.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-3xl font-black sm:text-4xl">
              R$ {PLAN_AMOUNT.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-[11px] text-neutral-500 sm:text-sm">/ mês</span>
          </div>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>• Alunos, agenda, avaliações e certificados</li>
            <li>• App do aluno white-label + notificações push</li>
            <li>• Cobrança dos alunos com o seu próprio gateway (MP, AMT Pay, PagSeguro)</li>
            <li>• Integrações Gympass / TotalPass / WhatsApp</li>
          </ul>

          {trialActive && trialEnds && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              🎁 Você está no período de teste de {TRIAL_DAYS} dias. Fim do teste:{" "}
              <strong>{trialEnds.toLocaleDateString("pt-BR")}</strong>. Ative a assinatura para
              continuar após essa data.
            </div>
          )}

          {status === "active" && sub?.current_period_end && (
            <div className="text-xs text-neutral-500">
              Próxima cobrança: {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {canActivate && (
              <Button
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await startSubscription({});
                    if (res.init_point) {
                      window.location.href = res.init_point;
                    } else {
                      toast.error("URL de checkout não disponível");
                    }
                  } catch (e: any) {
                    toast.error(e?.message ?? "Falha ao iniciar assinatura");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={isLoading || busy}
                className="bg-red-600 hover:bg-red-700"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {status === "cancelled" ? "Reativar assinatura" : "Ativar assinatura"}
              </Button>
            )}
            {status === "active" && (
              <Button onClick={doCancel} disabled={busy} variant="outline">
                Cancelar assinatura
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

