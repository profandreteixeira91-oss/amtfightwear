import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { dojoFinanceOverview, listDojoStudents } from "@/lib/dojo/dojo.functions";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { Users, TrendingUp, TrendingDown, Wallet, Award, UserPlus, QrCode, ClipboardList, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dojo/app/")({
  head: () => ({ meta: [{ title: "Painel — AMT Dojo Manager" }] }),
  component: DojoDashboard,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function KPI({
  label, value, hint, icon: Icon, tone = "default", trend,
}: {
  label: string; value: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "accent" | "success" | "warn";
  trend?: { dir: "up" | "down"; value: string };
}) {
  const toneClass =
    tone === "accent" ? "dojo-kpi-accent border-transparent"
    : "dojo-card";
  const labelClass = tone === "accent" ? "text-white/80" : "text-muted-foreground";
  const valueClass = tone === "accent" ? "text-white"
    : tone === "success" ? "text-emerald-600"
    : tone === "warn" ? "text-amber-600"
    : "text-foreground";
  const iconWrap = tone === "accent"
    ? "bg-white/15 text-white"
    : "bg-primary/10 text-primary";
  return (
    <div className={`${toneClass} p-4 md:p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] uppercase tracking-widest font-medium ${labelClass}`}>{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-md ${iconWrap}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className={`font-display text-2xl md:text-3xl font-bold leading-none tracking-tight ${valueClass}`}>{value}</div>
      <div className="flex items-center justify-between gap-2">
        {hint && <span className={`text-xs ${tone === "accent" ? "text-white/70" : "text-muted-foreground"}`}>{hint}</span>}
        {trend && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            trend.dir === "up"
              ? (tone === "accent" ? "text-emerald-200" : "text-emerald-600")
              : (tone === "accent" ? "text-red-200" : "text-red-600")
          }`}>
            {trend.dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link
      to={to}
      className="dojo-card p-4 flex items-center gap-3 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}

function DojoDashboard() {
  const finFn = useServerFn(dojoFinanceOverview);
  const stuFn = useServerFn(listDojoStudents);
  const fin = useQuery({ queryKey: ["dojo-finance"], queryFn: () => finFn({ data: {} }) });
  const stu = useQuery({ queryKey: ["dojo-students"], queryFn: () => stuFn() });

  const students = stu.data ?? [];
  const active = students.filter((s: any) => s.status === "active").length;
  const inactive = students.length - active;
  const recent = [...students]
    .sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 6);

  const received = fin.data?.received ?? 0;
  const receivable = fin.data?.receivable ?? 0;
  const balance = fin.data?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <KPI label="Alunos ativos" value={String(active)} hint={`${inactive} inativos`} icon={Users} tone="accent" />
        <KPI label="Recebido no mês" value={brl(received)} hint="Pagamentos confirmados" icon={Wallet} tone="success" trend={{ dir: "up", value: "MTD" }} />
        <KPI label="A receber" value={brl(receivable)} hint="Mensalidades em aberto" icon={ClipboardList} tone="warn" />
        <KPI label="Saldo do mês" value={brl(balance)} hint="Recebido − a receber" icon={TrendingUp} />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Ações rápidas</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/dojo/app/students" label="Novo aluno" icon={UserPlus} />
          <QuickAction to="/dojo/app/checkin" label="Fazer check-in" icon={QrCode} />
          <QuickAction to="/dojo/app/graduations" label="Nova graduação" icon={Award} />
          <QuickAction to="/dojo/app/finance" label="Registrar recebimento" icon={Wallet} />
        </div>
      </section>

      {/* Two-column: recent students + finance snapshot */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="dojo-card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-[color:var(--dojo-border)]">
            <div>
              <h3 className="font-display text-base font-bold">Alunos recentes</h3>
              <p className="text-xs text-muted-foreground">Últimas matrículas registradas</p>
            </div>
            <Link to="/dojo/app/students" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[color:var(--dojo-border)]">
            {recent.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                Nenhum aluno cadastrado ainda.{" "}
                <Link to="/dojo/app/students" className="text-primary font-medium hover:underline">Cadastrar primeiro aluno</Link>
              </div>
            )}
            {recent.map((s: any) => (
              <Link
                key={s.id}
                to="/dojo/app/students/$id"
                params={{ id: s.id }}
                className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold shadow-sm">
                  {(s.full_name?.[0] ?? "A").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.full_name}</div>
                  {(() => {
                    const belts = (s.current_belts && s.current_belts.length > 0)
                      ? s.current_belts
                      : (s.belt ? [{ modality: s.belt.modality, belt: s.belt, degree: s.current_degree ?? 0 }] : []);
                    if (belts.length === 0) {
                      return <div className="text-xs text-muted-foreground truncate">Sem faixa</div>;
                    }
                    return (
                      <div className="text-xs text-muted-foreground truncate">
                        {belts.map((b: any) => `${b.belt.name}${b.degree ? ` · ${b.degree}º` : ""}`).join(" • ")}
                      </div>
                    );
                  })()}
                </div>
                <div className="hidden sm:flex shrink-0 flex-col gap-1 items-end">
                  {(() => {
                    const belts = (s.current_belts && s.current_belts.length > 0)
                      ? s.current_belts
                      : (s.belt?.color_hex ? [{ modality: s.belt.modality, belt: s.belt, degree: s.current_degree ?? 0 }] : []);
                    return belts.slice(0, 3).map((b: any, i: number) => (
                      <BeltVisual
                        key={i}
                        modality={b.belt.modality}
                        name={b.belt.name}
                        colorHex={b.belt.color_hex}
                        stripeHex={b.belt.stripe_hex}
                        degree={b.degree ?? 0}
                        maxDegrees={b.belt?.max_degrees ?? 4}
                        className="w-[220px]"
                      />
                    ));
                  })()}
                </div>

                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0 ${
                  s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}>
                  {s.status === "active" ? "Ativo" : "Inativo"}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="dojo-card overflow-hidden">
          <div className="px-4 md:px-5 py-3 border-b border-[color:var(--dojo-border)]">
            <h3 className="font-display text-base font-bold">Financeiro</h3>
            <p className="text-xs text-muted-foreground">Resumo do mês</p>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Recebido</span>
                <span className="font-semibold text-emerald-600">{brl(received)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, (received / Math.max(1, received + receivable)) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">A receber</span>
                <span className="font-semibold text-amber-600">{brl(receivable)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, (receivable / Math.max(1, received + receivable)) * 100)}%` }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-[color:var(--dojo-border)] flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Saldo</span>
              <span className="font-display text-xl font-bold">{brl(balance)}</span>
            </div>
            <Link
              to="/dojo/app/finance"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Abrir financeiro <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
