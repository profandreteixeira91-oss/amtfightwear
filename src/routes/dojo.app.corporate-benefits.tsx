import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CorporateBenefitsWizard } from "@/components/dojo/corporate-benefits/CorporateBenefitsWizard";
import {
  Building2, Ticket, ShieldCheck, RefreshCw, LinkIcon, Unplug, Plus, Users,
  CheckCircle2, XCircle, Clock, History, ListChecks, Activity, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCorporateOverview,
  listCorporateCatalog,
  listCorporateHistory,
  listCorporateSyncLogs,
  listMyCorporateBeneficiaries,
  syncCorporateProvider,
  disconnectCorporateIntegration,
  providerLabel,
  type CorporateProvider,
} from "@/lib/dojo/corporate-benefits.functions";

export const Route = createFileRoute("/dojo/app/corporate-benefits")({
  head: () => ({ meta: [{ title: "Benefícios Corporativos — AMT Dojo Manager" }] }),
  component: CorporateBenefitsPage,
});

const providerIcon: Record<CorporateProvider, typeof Building2> = {
  gympass: Building2,
  totalpass: Ticket,
};

function CorporateBenefitsPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getCorporateOverview);
  const catalogFn = useServerFn(listCorporateCatalog);
  const benefFn = useServerFn(listMyCorporateBeneficiaries);
  const historyFn = useServerFn(listCorporateHistory);
  const logsFn = useServerFn(listCorporateSyncLogs);
  const syncFn = useServerFn(syncCorporateProvider);
  const disconnectFn = useServerFn(disconnectCorporateIntegration);

  const overview = useQuery({ queryKey: ["corporate-benefits", "overview"], queryFn: () => overviewFn() });
  const catalog = useQuery({ queryKey: ["corporate-benefits", "catalog"], queryFn: () => catalogFn() });
  const beneficiaries = useQuery({ queryKey: ["corporate-benefits", "beneficiaries"], queryFn: () => benefFn({ data: {} }) });
  const history = useQuery({ queryKey: ["corporate-benefits", "history"], queryFn: () => historyFn({ data: {} }) });
  const logs = useQuery({ queryKey: ["corporate-benefits", "logs"], queryFn: () => logsFn({ data: {} }) });

  const [wizardProvider, setWizardProvider] = useState<CorporateProvider | null>(null);

  const integrationsByProvider = useMemo(() => {
    const map: Record<string, any> = {};
    for (const i of (overview.data?.integrations ?? []) as any[]) map[i.provider] = i;
    return map;
  }, [overview.data]);

  const connectedCount = useMemo(
    () =>
      Object.values(integrationsByProvider).filter((i: any) => i.status === "connected").length,
    [integrationsByProvider],
  );

  const syncMut = useMutation({
    mutationFn: async (provider: CorporateProvider) => syncFn({ data: { provider } }),
    onSuccess: (r) => {
      toast.success(`Sincronização concluída (${(r as any).count} beneficiários).`);
      qc.invalidateQueries({ queryKey: ["corporate-benefits"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao sincronizar."),
  });

  const disconnectMut = useMutation({
    mutationFn: async (provider: CorporateProvider) => disconnectFn({ data: { provider } }),
    onSuccess: () => {
      toast.success("Integração desconectada.");
      qc.invalidateQueries({ queryKey: ["corporate-benefits"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao desconectar."),
  });

  const hasAnyConnected = connectedCount > 0;

  return (
    <DojoPageShell
      title="Benefícios Corporativos"
      description="Gerencie integrações com plataformas de benefícios corporativos."
    >
      {/* Empty state: nenhuma integração */}
      {!overview.isLoading && !hasAnyConnected && (
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold mb-2">Benefícios Corporativos</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              Conecte sua academia às principais plataformas de benefícios corporativos para permitir que alunos
              realizem check-ins utilizando seus planos.
            </p>
            <Button size="lg" onClick={() => document.getElementById("providers-list")?.scrollIntoView({ behavior: "smooth" })}>
              <Plus className="h-4 w-4 mr-2" /> Conectar Plataforma
            </Button>
            <div className="text-xs text-muted-foreground mt-3">Leva apenas alguns minutos.</div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Alunos Gympass" value={overview.data?.counts.gympass ?? 0} icon={Building2} tone="orange" />
        <KpiCard label="Alunos TotalPass" value={overview.data?.counts.totalpass ?? 0} icon={Ticket} tone="blue" />
        <KpiCard label="Check-ins hoje" value={overview.data?.checkinsToday ?? 0} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Check-ins do mês" value={overview.data?.checkinsMonth ?? 0} icon={Activity} tone="violet" />
        <KpiCard label="Benefícios ativos" value={overview.data?.counts.active ?? 0} icon={ShieldCheck} tone="emerald" />
        <KpiCard label="Expirados" value={overview.data?.counts.expired ?? 0} icon={XCircle} tone="red" />
        <KpiCard label="Pendentes" value={overview.data?.counts.pending ?? 0} icon={Clock} tone="amber" />
        <KpiCard
          label="Última sincronização"
          value={overview.data?.lastSyncAt ? new Date(overview.data.lastSyncAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
          icon={RefreshCw}
          tone="slate"
          isText
        />
      </div>

      <Tabs defaultValue="platforms" className="w-full">
        <TabsList>
          <TabsTrigger value="platforms">Plataformas</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiários</TabsTrigger>
          <TabsTrigger value="sync">Sincronizações</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Plataformas */}
        <TabsContent value="platforms" className="mt-4 space-y-4" id="providers-list">
          {/* Integrações ativas primeiro */}
          {hasAnyConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["gympass", "totalpass"] as CorporateProvider[]).map((prov) => {
                const integ = integrationsByProvider[prov];
                if (!integ || integ.status !== "connected") return null;
                const Icon = providerIcon[prov];
                const students = (beneficiaries.data ?? []).filter((b: any) => b.provider === prov);
                return (
                  <Card key={prov} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              {providerLabel[prov]}
                              <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">🟢 Conectada</Badge>
                            </CardTitle>
                            <div className="text-xs text-muted-foreground">
                              Última sync: {integ.last_sync_at ? new Date(integ.last_sync_at).toLocaleString("pt-BR") : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <Info label="Academia">{integ.academy_snapshot?.name ?? "—"}</Info>
                        <Info label="Cidade">{integ.academy_snapshot?.city ?? "—"}</Info>
                        <Info label="Beneficiários">{students.length}</Info>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" onClick={() => syncMut.mutate(prov)} disabled={syncMut.isPending}>
                          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncMut.isPending ? "animate-spin" : ""}`} /> Sincronizar Agora
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setWizardProvider(prov)}>
                          <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Reconfigurar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive">
                              <Unplug className="h-3.5 w-3.5 mr-1.5" /> Desconectar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Desconectar {providerLabel[prov]}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Os alunos deixarão de conseguir check-in via esta plataforma. O histórico é preservado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => disconnectMut.mutate(prov)}>
                                Desconectar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Catálogo */}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Plataformas disponíveis</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(catalog.data ?? []).map((p: any) => {
                const connected = ["gympass", "totalpass"].includes(p.id) && integrationsByProvider[p.id]?.status === "connected";
                const soon = p.status === "soon";
                return (
                  <Card key={p.id} className={cn("relative overflow-hidden transition hover:shadow-md", soon && "opacity-70")}>
                    <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", p.accent)} />
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm">{p.name}</div>
                        {soon ? (
                          <Badge variant="outline">Em breve</Badge>
                        ) : connected ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Conectada</Badge>
                        ) : (
                          <Badge variant="outline">Disponível</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.subtitle}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{p.description}</div>
                      {!soon && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          variant={connected ? "outline" : "default"}
                          onClick={() => setWizardProvider(p.id)}
                        >
                          {connected ? "Reconfigurar" : "Conectar"}
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Beneficiários */}
        <TabsContent value="beneficiaries" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> Beneficiários vinculados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última sync</TableHead>
                      <TableHead>Última validação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((beneficiaries.data ?? []) as any[]).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.dojo_students?.full_name ?? "—"}</TableCell>
                        <TableCell>{providerLabel[b.provider as CorporateProvider]}</TableCell>
                        <TableCell className="font-mono text-xs">{b.beneficiary_code ?? "—"}</TableCell>
                        <TableCell>{b.plan_name ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.last_sync_at ? new Date(b.last_sync_at).toLocaleString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.last_check_at ? (
                            <>
                              {new Date(b.last_check_at).toLocaleString("pt-BR")}
                              {" · "}
                              {b.last_check_result === "authorized" ? (
                                <span className="text-emerald-600">autorizado</span>
                              ) : (
                                <span className="text-destructive">negado</span>
                              )}
                            </>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!beneficiaries.data || beneficiaries.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                          Nenhum beneficiário vinculado. Cadastre pelo perfil do aluno na aba "Benefícios".
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="sync" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Logs de sincronização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Início</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="text-right">Processados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((logs.data ?? []) as any[]).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{new Date(l.started_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{providerLabel[l.provider as CorporateProvider] ?? l.provider}</TableCell>
                        <TableCell className="text-xs">{l.kind}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              l.status === "success" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                              l.status === "error" && "bg-red-500/10 text-red-700 border-red-500/30",
                            )}
                          >
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.message ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{l.items_processed}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs.data || logs.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                          Nenhuma sincronização registrada ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico permanente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {((history.data ?? []) as any[]).map((h) => (
                  <div key={h.id} className="flex items-start gap-3 border-l-2 border-primary/30 pl-3 py-1">
                    <div className="text-[11px] text-muted-foreground min-w-[130px]">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{providerLabel[h.provider as CorporateProvider] ?? h.provider}</span>
                        {" · "}
                        <span className="text-muted-foreground">{h.event}</span>
                      </div>
                      {h.details && Object.keys(h.details).length > 0 && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {JSON.stringify(h.details)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!history.data || history.data.length === 0) && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Nenhum evento registrado ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CorporateBenefitsWizard
        open={wizardProvider !== null}
        provider={wizardProvider}
        onOpenChange={(o) => !o && setWizardProvider(null)}
        onCompleted={() => qc.invalidateQueries({ queryKey: ["corporate-benefits"] })}
      />
    </DojoPageShell>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  isText,
}: {
  label: string;
  value: number | string;
  icon: typeof Building2;
  tone: "orange" | "blue" | "emerald" | "violet" | "red" | "amber" | "slate";
  isText?: boolean;
}) {
  const toneMap: Record<string, string> = {
    orange: "bg-orange-500/10 text-orange-600",
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    violet: "bg-violet-500/10 text-violet-600",
    red: "bg-red-500/10 text-red-600",
    amber: "bg-amber-500/10 text-amber-600",
    slate: "bg-slate-500/10 text-slate-600",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", toneMap[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
      <div className={cn("font-semibold", isText ? "text-sm" : "text-2xl")}>{value}</div>
    </Card>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    inactive: "bg-slate-500/15 text-slate-700 border-slate-500/30",
    pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    blocked: "bg-red-500/15 text-red-700 border-red-500/30",
    expired: "bg-red-500/15 text-red-700 border-red-500/30",
  };
  const label: Record<string, string> = {
    active: "Ativo", inactive: "Inativo", pending: "Pendente", blocked: "Bloqueado", expired: "Expirado",
  };
  return <Badge variant="outline" className={map[status]}>{label[status] ?? status}</Badge>;
}
