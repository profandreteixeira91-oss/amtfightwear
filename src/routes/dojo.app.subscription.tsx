import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, XCircle, Clock, Zap, QrCode, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startMySubscription, getMySubscription, cancelMySubscription, syncMySubscription, PLAN_AMOUNT, TRIAL_DAYS } from "@/lib/dojo/subscription.functions";
import { NativePixCheckout } from "@/components/dojo/NativePixCheckout";

export const Route = createFileRoute("/dojo/app/subscription")({
  head: () => ({ meta: [{ title: "Assinatura — AMT Dojo Manager" }] }),
  component: SubscriptionPage,
});

const statusLabel: Record<string, { label: string; className: string; Icon: any }> = {
  trialing: { label: "Período de teste", className: "bg-blue-100 text-blue-800", Icon: Clock },
  pending: { label: "Aguardando pagamento", className: "bg-amber-100 text-amber-800", Icon: Clock },
  active: { label: "Ativa", className: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  paused: { label: "Pausada", className: "bg-neutral-100 text-neutral-700", Icon: Clock },
  suspended: { label: "Suspensa", className: "bg-red-100 text-red-800", Icon: AlertCircle },
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
  const [showPix, setShowPix] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOwnerEmail(data.user?.email ?? undefined));
  }, []);

  // Sincronização automática para refletir status de pagamento
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("mp") === "return" || showPix) {
      const interval = setInterval(() => {
        void sync({ data: {} })
          .then((res) => {
            if (res.status === "active") {
              qc.invalidateQueries({ queryKey: ["dojo", "subscription"] });
              clearInterval(interval);
            }
          })
          .catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sync, qc, showPix]);

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
    status === "trialing" || status === "pending" || status === "cancelled" || status === "paused" || status === "suspended";

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Carregando assinatura...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Assinatura</h1>
        <p className="text-neutral-500">
          Gerencie seu plano e formas de pagamento do AMT Dojo Manager.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Lado Esquerdo: Detalhes do Plano */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="overflow-hidden border-none shadow-xl ring-1 ring-neutral-200">
            <CardHeader className="bg-neutral-50/50 pb-8">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-white text-neutral-600 font-medium">Plano Profissional</Badge>
                <Badge className={cn("h-7 px-3 text-xs font-bold uppercase tracking-wider", s.className)}>
                  <s.Icon className="mr-1.5 h-3.5 w-3.5" /> {s.label}
                </Badge>
              </div>
              <CardTitle className="text-4xl font-black">
                R$ {PLAN_AMOUNT.toFixed(2).replace(".", ",")}
                <span className="text-lg font-normal text-neutral-400 ml-1">/mês</span>
              </CardTitle>
              <CardDescription className="text-neutral-500 mt-2">
                Acesso total a todas as ferramentas de gestão do seu Dojo.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Alunos e Graduações ilimitados",
                  "App do Aluno White-label",
                  "Gestão Financeira e Mensalidades",
                  "Agenda e Check-ins Inteligentes",
                  "Emissão de Certificados",
                  "Notificações Push ilimitadas"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-neutral-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>

              {trialActive && trialEnds && (
                <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100 flex gap-3 items-start">
                  <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 leading-relaxed">
                    Você está aproveitando o <strong>período de teste gratuito</strong>. 
                    Sua conta expira em <strong>{trialEnds.toLocaleDateString("pt-BR")}</strong>.
                  </div>
                </div>
              )}

              {status === "active" && sub?.current_period_end && (
                <div className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <RefreshCw className="h-4 w-4" />
                  Próxima renovação em: <strong>{new Date(sub.current_period_end).toLocaleDateString("pt-BR")}</strong>
                </div>
              )}
            </CardContent>
          </Card>

          {status === "active" && (
            <div className="flex justify-end">
              <Button onClick={doCancel} disabled={busy} variant="ghost" className="text-neutral-400 hover:text-red-600 text-xs">
                Desejo cancelar minha assinatura
              </Button>
            </div>
          )}
        </div>

        {/* Lado Direito: Checkout/Pagamento */}
        <div className="lg:col-span-5">
          {canActivate ? (
            <Card className="shadow-2xl border-none ring-1 ring-neutral-200 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Ativar Assinatura</CardTitle>
                <CardDescription>Escolha como deseja pagar</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="card" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-neutral-100/50">
                    <TabsTrigger value="card" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <CreditCard className="mr-2 h-4 w-4" /> Cartão
                    </TabsTrigger>
                    <TabsTrigger value="pix" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <QrCode className="mr-2 h-4 w-4" /> PIX
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="card" className="space-y-6">
                    <div className="space-y-4 text-center py-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <CreditCard className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-neutral-900">Assinatura Recorrente</p>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          O valor será debitado automaticamente todos os meses do seu cartão de crédito.
                        </p>
                      </div>
                    </div>
                    
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
                      disabled={busy}
                      className="w-full h-12 bg-neutral-900 hover:bg-black text-white text-base font-bold transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Assinar com Cartão"}
                    </Button>
                    <p className="text-[10px] text-center text-neutral-400">
                      Pagamento processado com segurança via Mercado Pago.
                    </p>
                  </TabsContent>

                  <TabsContent value="pix">
                    <NativePixCheckout 
                      defaultEmail={ownerEmail} 
                      onSuccess={() => {
                        setShowPix(false);
                        qc.invalidateQueries({ queryKey: ["dojo", "subscription"] });
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-emerald-900">Tudo pronto!</p>
                  <p className="text-xs text-emerald-700">
                    Sua assinatura está ativa e seu acesso está liberado.
                  </p>
                </div>
                {sub?.subscription_type === 'pix' && sub?.last_qr_code && status === 'pending' && (
                  <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={() => setShowPix(true)}>
                    Ver QR Code do PIX
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Seção PIX aberta manualmente */}
          {showPix && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
               <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                 <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <CardTitle>Pagamento PIX</CardTitle>
                   <Button variant="ghost" size="icon" onClick={() => setShowPix(false)}>
                     <XCircle className="h-5 w-5 text-neutral-400" />
                   </Button>
                 </CardHeader>
                 <CardContent>
                   <NativePixCheckout 
                      defaultEmail={ownerEmail} 
                      onSuccess={() => {
                        setShowPix(false);
                        qc.invalidateQueries({ queryKey: ["dojo", "subscription"] });
                      }}
                    />
                 </CardContent>
               </Card>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}


