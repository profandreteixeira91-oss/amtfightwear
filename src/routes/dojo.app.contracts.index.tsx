import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, FileSignature, AlertTriangle, Clock, Files, ArrowRight,
  CheckCircle2, XCircle, Archive,
} from "lucide-react";
import {
  contractsDashboardStats,
  listIssuedContracts,
  CONTRACT_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/dojo/contracts.functions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/dojo/app/contracts/")({
  head: () => ({
    meta: [
      { title: "Dashboard Jurídico — AMT Dojo Manager" },
      { name: "description", content: "Painel de KPIs, gráficos e alertas do módulo jurídico do dojo." },
    ],
  }),
  component: ContractsDashboardPage,
});

const PIE_COLORS = ["#dc2626", "#f59e0b", "#0ea5e9", "#22c55e", "#a855f7", "#64748b", "#f43f5e", "#14b8a6"];

function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: any) {
  const toneCls =
    tone === "danger" ? "bg-destructive/10 text-destructive"
      : tone === "warning" ? "bg-amber-500/10 text-amber-600"
      : tone === "success" ? "bg-emerald-500/10 text-emerald-600"
      : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
            {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneCls}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractsDashboardPage() {
  const statsFn = useServerFn(contractsDashboardStats);
  const recentFn = useServerFn(listIssuedContracts);

  const stats = useQuery({ queryKey: ["contracts-stats"], queryFn: () => statsFn() });
  const recent = useQuery({ queryKey: ["contracts-issued-recent"], queryFn: () => recentFn({ data: {} }) });

  const s = stats.data as any;
  const cats = s?.templates?.byCategory ?? {};
  const catData = Object.entries(cats).map(([k, v]) => ({ name: CONTRACT_CATEGORY_LABELS[k] ?? k, value: v as number }));

  const totalPending = (s?.issued?.students?.pending_signature ?? 0) + (s?.issued?.affiliates?.pending ?? 0);
  const totalSigned = (s?.issued?.students?.signed ?? 0) + (s?.issued?.affiliates?.signed ?? 0);
  const totalCancelled = (s?.issued?.students?.cancelled ?? 0) + (s?.issued?.affiliates?.cancelled ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Files} label="Modelos" value={s?.templates?.total ?? "—"} hint={`${s?.templates?.active ?? 0} ativos`} />
        <KpiCard icon={FileText} label="Contratos emitidos" value={s?.issued?.total ?? "—"} hint="Aluno + filial" tone="default" />
        <KpiCard icon={CheckCircle2} label="Assinados" value={totalSigned} tone="success" />
        <KpiCard icon={Clock} label="Pendentes" value={totalPending} hint="Aguardando assinatura" tone="warning" />
        <KpiCard icon={AlertTriangle} label="Vencendo (30d)" value={s?.alerts?.expiring ?? 0} tone="warning" />
        <KpiCard icon={XCircle} label="Expirados" value={s?.alerts?.expired ?? 0} tone="danger" />
        <KpiCard icon={Archive} label="Cancelados" value={totalCancelled} tone="danger" />
        <KpiCard icon={FileSignature} label="Rascunhos" value={(s?.issued?.students?.draft ?? 0) + (s?.issued?.affiliates?.draft ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Emitidos por mês</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s?.monthly ?? []}>
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Modelos por categoria</CardTitle></CardHeader>
          <CardContent className="h-64">
            {catData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                    {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Últimos emitidos</CardTitle>
          <Link to="/dojo/app/contracts/issued" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {(recent.data ?? []).slice(0, 10).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum contrato emitido ainda.</div>
          ) : (
            <div className="divide-y">
              {(recent.data ?? []).slice(0, 10).map((r: any) => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  to="/dojo/app/contracts/issued/$kind/$id"
                  params={{ kind: r.kind, id: r.id }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.number ? <span className="font-mono">{r.number}</span> : null}
                      {r.number && r.target ? " · " : ""}
                      {r.target}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{r.kind === "student" ? "Aluno" : "Filial"}</Badge>
                    <Badge className="text-xs">{CONTRACT_STATUS_LABELS[r.status] ?? r.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
