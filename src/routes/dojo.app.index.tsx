import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  dojoFinanceOverview,
  listDojoStudents,
} from "@/lib/dojo/dojo.functions";
import { dojoFinanceDashboard } from "@/lib/dojo/finance-dashboard.functions";
import { attendanceStats } from "@/lib/dojo/attendance.functions";
import { listClasses } from "@/lib/dojo/schedule.functions";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import { formatBeltFull } from "@/lib/dojo/degree-label";

import { useUnitScope } from "@/components/dojo/UnitScope";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  Award,
  UserPlus,
  QrCode,
  ClipboardList,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  Repeat2,
  Target,
  Trophy,
  CalendarClock,
  Activity,
  CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/dojo/app/")({
  head: () => ({
    meta: [
      { title: "Painel Executivo — AMT Dojo Manager" },
      { name: "description", content: "Visão premium da sua academia: receita, alunos, check-ins e AMT Pay em tempo real." },
    ],
  }),
  component: DojoDashboard,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compact = (n: number) =>
  n >= 1000
    ? n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })
    : n.toLocaleString("pt-BR");
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const methodLabel: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
  cash: "Dinheiro",
  wallet: "Carteira",
  outros: "Outros",
};

const PIE_COLORS = ["#dc2626", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

/* ---------------------------- Bits ---------------------------- */

function BentoCard({
  className = "",
  style,
  children,
  premium = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  premium?: boolean;
}) {
  if (!premium) {
    return (
      <div
        className={`dojo-card relative overflow-hidden p-4 md:p-5 flex flex-col gap-3 ${className}`}
        style={style}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35),0_2px_8px_-4px_rgba(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_28px_70px_-25px_rgba(0,0,0,0.45),0_4px_14px_-6px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 p-5 md:p-6 flex flex-col gap-3 ${className}`}
      style={style}
    >
      {/* fio hairline superior editorial */}
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-rose-700/25 to-transparent" />
      {children}
    </div>
  );
}


function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-0.5">
            {eyebrow}
          </div>
        )}
        <h3 className="font-display text-base font-bold leading-tight truncate">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

function DeltaBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        up
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-red-500/10 text-red-700"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {pct(value)}
    </span>
  );
}

/* --------------------------- HERO ---------------------------- */

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function HeroHeader({
  studentsCount,
  activeCount,
  balance,
  overdueCount,
  userName,
  academyName,
  logoUrl,
}: {
  studentsCount: number;
  activeCount: number;
  balance: number;
  overdueCount: number;
  userName?: string | null;
  academyName?: string | null;
  logoUrl?: string | null;
}) {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const greeting = greetingFor();
  const fullName = (userName ?? "").trim();
  const initials =
    (academyName || userName || "A")
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--dojo-border)] bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950 text-white shadow-lg">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/40 blur-3xl" />
      <div className="absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="relative px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] items-end">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-[11px] uppercase tracking-widest">
            <Sparkles className="h-3 w-3" /> Painel executivo
          </div>
          <p className="mt-3 text-sm md:text-base text-white/85 font-medium">
            {greeting}
            {fullName ? <>, <span className="text-white">{fullName}</span></> : null}
          </p>
          <div className="mt-2 flex items-center gap-3 md:gap-4">
            <Link
              to="/dojo/app/account"
              search={{ tab: "profile", onboarding: undefined }}
              className="relative shrink-0 group"
              aria-label="Editar logotipo em Minha conta"
              title={academyName ?? "Minha conta"}
            >
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white/95 ring-2 ring-white/40 shadow-xl overflow-hidden flex items-center justify-center transition group-hover:ring-white/70">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={academyName ?? "Logotipo da academia"}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="font-display font-black text-neutral-900 text-lg md:text-xl">
                    {initials}
                  </span>
                )}
              </div>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-black leading-tight truncate">
                Bom te ver por aqui.
              </h1>
              <p className="mt-1 text-sm text-white/70 capitalize">{today}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 min-w-0">
          <div className="min-w-0 rounded-xl bg-white/8 backdrop-blur border border-white/10 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/60">Alunos</div>
            <div className="font-display text-lg sm:text-xl font-bold">{activeCount}</div>
            <div className="text-[10px] text-white/60">de {studentsCount}</div>
          </div>
          <div className="min-w-0 rounded-xl bg-white/8 backdrop-blur border border-white/10 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/60">AMT Pay</div>
            <div className="font-display text-base sm:text-xl font-bold tabular-nums truncate">
              {brl(balance)}
            </div>
            <div className="text-[10px] text-white/60">saldo total</div>
          </div>
          <div className="min-w-0 rounded-xl bg-white/8 backdrop-blur border border-white/10 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/60">Atrasos</div>
            <div className="font-display text-lg sm:text-xl font-bold">
              {overdueCount}
            </div>
            <div className="text-[10px] text-white/60">faturas</div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ------------------------ Chart tooltip ---------------------- */

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white/95 shadow-lg px-3 py-2 text-xs backdrop-blur">
      {label && <div className="font-semibold capitalize mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">
            {p.name ?? p.dataKey}:
          </span>
          <span className="font-semibold">
            {typeof p.value === "number" && p.value >= 100
              ? brl(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- PAGE ---------------------------- */

function DojoDashboard() {
  const finFn = useServerFn(dojoFinanceOverview);
  const finDashFn = useServerFn(dojoFinanceDashboard);
  const stuFn = useServerFn(listDojoStudents);
  const attFn = useServerFn(attendanceStats);
  const classesFn = useServerFn(listClasses);

  const fin = useQuery({ queryKey: ["dojo-finance"], queryFn: () => finFn({ data: {} }) });
  const finDash = useQuery({
    queryKey: ["dojo-finance-dash"],
    queryFn: () => finDashFn({ data: {} }),
  });
  const stu = useQuery({ queryKey: ["dojo-students"], queryFn: () => stuFn() });
  const att = useQuery({ queryKey: ["dojo-att-stats"], queryFn: () => attFn() });
  const classes = useQuery({ queryKey: ["dojo-classes-list"], queryFn: () => classesFn() });

  const meQ = useQuery({
    queryKey: ["dojo-hero-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return { userName: null, academyName: null, logoUrl: null };
      const [{ data: profile }, { data: academy }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
        supabase
          .from("dojo_academy_profile")
          .select("trade_name, legal_name, logo_url")
          .eq("owner_id", uid)
          .maybeSingle(),
      ]);
      return {
        userName:
          profile?.full_name ||
          (u.user?.user_metadata as any)?.full_name ||
          (u.user?.email ? u.user.email.split("@")[0] : null),
        academyName: academy?.trade_name || academy?.legal_name || null,
        logoUrl: academy?.logo_url || null,
      };
    },
    staleTime: 60_000,
  });

  const { unitId } = useUnitScope();
  const allStudents = stu.data ?? [];
  const students = unitId ? allStudents.filter((s: any) => !s.unit_id || s.unit_id === unitId) : allStudents;
  const active = students.filter((s: any) => s.status === "active").length;
  const inactive = students.length - active;
  const recent = [...students]
    .sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5);

  const received = fin.data?.received ?? 0;
  const receivable = fin.data?.receivable ?? 0;
  const balance = fin.data?.balance ?? 0;

  const dash = finDash.data;
  const monthPoints = dash?.months ?? [];
  const currentMonth = monthPoints[monthPoints.length - 1];
  const prevMonth = monthPoints[monthPoints.length - 2];
  const revenueDelta = useMemo(() => {
    if (!currentMonth || !prevMonth || !prevMonth.net) return 0;
    return ((currentMonth.net - prevMonth.net) / prevMonth.net) * 100;
  }, [currentMonth, prevMonth]);

  const classesTotal = classes.data?.length ?? 0;

  const paymentPie = (dash?.paymentMethods ?? []).map((m: any) => ({
    name: methodLabel[m.name] ?? m.name,
    value: m.value,
  }));
  const paymentTotal = paymentPie.reduce((s: number, m: any) => s + m.value, 0);

  const attData = [
    { label: "Hoje", value: att.data?.today ?? 0 },
    { label: "Semana", value: att.data?.week ?? 0 },
    { label: "Mês", value: att.data?.month ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <HeroHeader
        studentsCount={students.length}
        activeCount={active}
        balance={dash?.wallet.total ?? 0}
        overdueCount={dash?.pipeline.overdueCount ?? 0}
        userName={meQ.data?.userName ?? null}
        academyName={meQ.data?.academyName ?? null}
        logoUrl={meQ.data?.logoUrl ?? null}
      />

      {/* Bento grid */}
      <section className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-6 auto-rows-[minmax(140px,auto)]">
        {/* MRR — hero KPI */}
        <BentoCard
          premium={false}
          className="md:col-span-2 md:row-span-2 text-white border-transparent"
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            color: "#fff",
            borderColor: "transparent",
          }}
        >

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/80 font-semibold">
              <Repeat2 className="h-3 w-3" /> MRR estimado
            </div>
            <Link
              to="/dojo/app/finance"
              className="text-white/80 hover:text-white"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="font-display text-4xl md:text-5xl font-black leading-none tracking-tight">
            {brl(dash?.mrr ?? 0)}
          </div>
          <div className="text-xs text-white/80">
            Receita recorrente mensal projetada
          </div>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-white/15">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/70">
                Ticket médio
              </div>
              <div className="font-display text-lg font-bold">
                {brl(dash?.month.avgTicket ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/70">
                Pagantes
              </div>
              <div className="font-display text-lg font-bold">
                {dash?.month.payersCount ?? 0}
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Receita líquida do mês + delta */}
        <BentoCard className="md:col-span-2">
          <SectionHead eyebrow="Receita líquida" title={brl(dash?.month.net ?? received)} />
          <div className="flex items-center gap-2">
            <DeltaBadge value={revenueDelta} />
            <span className="text-[11px] text-muted-foreground">vs. mês anterior</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Bruto {brl(dash?.month.gross ?? 0)}</span>
            <span>Taxas {brl(dash?.month.totalFees ?? 0)}</span>
          </div>
        </BentoCard>

        {/* Check-ins */}
        <BentoCard className="md:col-span-2">
          <SectionHead
            eyebrow="Check-ins"
            title={`${att.data?.month ?? 0} no mês`}
            action={
              <Link
                to="/dojo/app/checkin"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Abrir
              </Link>
            }
          />
          <div className="h-16 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attData}>
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(220,38,38,0.06)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Hoje</span>
            <span>Semana</span>
            <span>Mês</span>
          </div>
        </BentoCard>

        {/* Evolução 12 meses */}
        <BentoCard className="md:col-span-4 md:row-span-2">
          <SectionHead
            eyebrow="Últimos 12 meses"
            title="Evolução de receita"
            action={
              <div className="hidden sm:flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Líquido
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-neutral-400" /> Bruto
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Despesas
                </span>
              </div>
            }
          />
          <div className="h-56 md:h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthPoints} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3a3a3" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#a3a3a3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#737373", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => (v ? compact(v) : "0")}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: "#737373", fontSize: 11 }}
                />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="gross"
                  name="Bruto"
                  stroke="#a3a3a3"
                  strokeWidth={1.5}
                  fill="url(#grossGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="Líquido"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  fill="url(#netGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Despesas"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Carteira AMT Pay */}
        <BentoCard className="md:col-span-2">
          <SectionHead
            eyebrow="AMT Pay"
            title="Carteira"
            action={
              <Link to="/dojo/app/sales" className="text-[11px] font-semibold text-primary hover:underline">
                Sacar
              </Link>
            }
          />
          <div className="font-display text-2xl font-bold">
            {brl(dash?.wallet.available ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground">Disponível para saque</div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[color:var(--dojo-border)] text-[11px]">
            <div>
              <div className="text-muted-foreground">A liberar</div>
              <div className="font-semibold">{brl(dash?.wallet.pending ?? 0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Bloqueado</div>
              <div className="font-semibold">{brl(dash?.wallet.blocked ?? 0)}</div>
            </div>
          </div>
        </BentoCard>

        {/* Projeção de fluxo */}
        <BentoCard className="md:col-span-3">
          <SectionHead eyebrow="Fluxo de caixa" title="Projeção próxima" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {(dash?.projection ?? []).map((p: any) => (
              <div
                key={p.label}
                className="min-w-0 rounded-lg border border-[color:var(--dojo-border)] bg-neutral-50 p-2.5 text-center"
              >
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {p.label}
                </div>
                <div className="font-display text-sm md:text-base font-bold text-foreground mt-0.5 tabular-nums truncate">
                  {brl(p.amount)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between pt-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              A receber
            </span>
            <span className="font-semibold">{brl(dash?.pipeline.pendingReceivables ?? receivable)}</span>
          </div>
        </BentoCard>

        {/* Métodos de pagamento — donut */}
        <BentoCard className="md:col-span-3">
          <SectionHead eyebrow="Recebimentos do mês" title="Por método" />
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 items-center">
            <div className="h-[120px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPie.length ? paymentPie : [{ name: "—", value: 1 }]}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={55}
                    paddingAngle={paymentPie.length > 1 ? 2 : 0}
                    stroke="none"
                  >
                    {(paymentPie.length ? paymentPie : [{ name: "—", value: 1 }]).map((_: any, i: number) => (
                      <Cell key={i} fill={paymentPie.length ? PIE_COLORS[i % PIE_COLORS.length] : "#e5e5e5"} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Total</div>
                  <div className="font-display text-xs font-bold">{brl(paymentTotal)}</div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              {paymentPie.length === 0 && (
                <div className="text-xs text-muted-foreground">Sem recebimentos no mês.</div>
              )}
              {paymentPie.slice(0, 5).map((m: any, i: number) => (
                <div key={m.name} className="flex items-center gap-2 text-xs min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="font-semibold tabular-nums">{brl(m.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Faturas em atraso */}
        <BentoCard className="md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Atenção
              </div>
              <div className="font-display text-2xl font-bold mt-1">
                {brl(dash?.pipeline.overdueAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {dash?.pipeline.overdueCount ?? 0} faturas em atraso
              </div>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-700">
              <ClipboardList className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-auto">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Inadimplência</span>
              <span className="font-semibold text-amber-700">
                {(dash?.pipeline.overdueRate ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{
                  width: `${Math.min(100, dash?.pipeline.overdueRate ?? 0)}%`,
                }}
              />
            </div>
          </div>
        </BentoCard>

        {/* Alunos: composição */}
        <BentoCard className="md:col-span-2">
          <SectionHead eyebrow="Base ativa" title={`${active} alunos`} />
          <div className="relative h-2 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500"
              style={{
                width: `${students.length ? (active / students.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ativos {active}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-neutral-300" /> Inativos {inactive}
            </span>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-neutral-50 border border-[color:var(--dojo-border)] p-2">
              <div className="text-muted-foreground">Turmas</div>
              <div className="font-display font-bold text-sm">{classesTotal}</div>
            </div>
            <div className="rounded-lg bg-neutral-50 border border-[color:var(--dojo-border)] p-2">
              <div className="text-muted-foreground">Check-ins/dia</div>
              <div className="font-display font-bold text-sm">{att.data?.today ?? 0}</div>
            </div>
          </div>
        </BentoCard>

        {/* Top 5 alunos */}
        <BentoCard className="md:col-span-2 md:row-span-2">
          <SectionHead
            eyebrow="Ranking financeiro"
            title="Top alunos do mês"
            action={<Trophy className="h-4 w-4 text-amber-500" />}
          />
          <div className="space-y-2">
            {(dash?.topStudents ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground py-6 text-center">
                Nenhum pagamento registrado no mês.
              </div>
            )}
            {(dash?.topStudents ?? []).map((s: any, i: number) => (
              <Link
                key={s.id}
                to="/dojo/app/students/$id"
                params={{ id: s.id }}
                className="flex items-center gap-3 rounded-lg p-2 -mx-1 hover:bg-neutral-50 transition-colors"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    i === 0
                      ? "bg-amber-400 text-amber-950"
                      : i === 1
                      ? "bg-neutral-300 text-neutral-800"
                      : i === 2
                      ? "bg-amber-700/70 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{s.name}</span>
                <span className="font-display text-sm font-bold tabular-nums">{brl(s.amount)}</span>
              </Link>
            ))}
          </div>
        </BentoCard>

        {/* Alunos recentes — premium ivory card sobre */}
        <div className="md:col-span-4 overflow-hidden rounded-2xl bg-[#faf7f2] text-slate-900 ring-1 ring-black/5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.55),0_4px_14px_-6px_rgba(0,0,0,0.35)]">
          {/* Cabeçalho editorial */}
          <div className="relative px-4 pt-5 pb-4 sm:px-7 sm:pt-6 sm:pb-5">
            <div className="absolute inset-x-4 sm:inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-rose-700/40 to-transparent" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.28em] text-rose-800/80 uppercase">
                  Últimas matrículas
                </p>
                <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
                  Alunos recentes
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Registro cronológico das novas entradas no dojo.
                </p>
              </div>
              <Link
                to="/dojo/app/students"
                className="group inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:border-rose-700/40 hover:text-rose-800 transition-colors"
              >
                Ver todos
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Divisor com serifa hairline */}
          <div className="mx-4 sm:mx-7 h-px bg-slate-900/10" />

          <ol className="divide-y divide-slate-900/[0.07]">
            {recent.length === 0 && (
              <li className="px-4 sm:px-7 py-10 text-sm text-slate-500 text-center">
                Nenhum aluno cadastrado ainda.{" "}
                <Link to="/dojo/app/students" className="font-semibold text-rose-800 hover:underline underline-offset-2">
                  Cadastrar primeiro aluno
                </Link>
              </li>
            )}
            {recent.map((s: any, idx: number) => {
              // current_belts pode conter modalidades sem graduação (belt: null)
              // quando o aluno só está matriculado em turmas. Filtramos antes
              // de qualquer acesso a `belt.*` para não quebrar a tela.
              const beltsRaw: any[] =
                Array.isArray(s.current_belts) && s.current_belts.length > 0
                  ? s.current_belts.filter((b: any) => b?.belt)
                  : [];
              const belts =
                beltsRaw.length > 0
                  ? beltsRaw
                  : s.belt
                  ? [{ modality: s.belt.modality, belt: s.belt, degree: s.current_degree ?? 0 }]
                  : [];
              const isActive = s.status === "active";
              return (
                <li key={s.id}>
                  <Link
                    to="/dojo/app/students/$id"
                    params={{ id: s.id }}
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 sm:gap-4 px-4 sm:px-7 py-3 sm:py-4 transition-colors hover:bg-white"
                  >
                    {/* Índice tipográfico */}
                    <span className="hidden sm:block w-6 font-display text-[11px] tabular-nums text-slate-400 group-hover:text-rose-800/70 transition-colors">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Avatar + status */}
                    <div className="relative shrink-0">
                      <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-900/10 shadow-sm">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.full_name ?? "Aluno"}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-sm font-bold text-slate-800">
                            {(s.full_name?.[0] ?? "A").toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span
                        title={isActive ? "Ativo" : "Inativo"}
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#faf7f2] ${
                          isActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                    </div>

                    {/* Nome + faixa */}
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold text-slate-900 truncate tracking-tight">
                        {s.full_name}
                      </h3>
                      <p className="text-[11.5px] text-slate-500 truncate">
                        {belts.length
                          ? belts
                              .map((b: any) => formatBeltFull(b.belt?.name ?? "Sem faixa", b.belt?.modality, b.degree))
                              .join(" • ")
                          : "Sem faixa"}
                      </p>
                    </div>

                    {/* Ilustração da faixa — largura fixa idêntica para todas as cores */}
                    <div
                      className="hidden sm:flex w-[180px] shrink-0 items-center justify-center overflow-hidden [&_>div]:!w-full [&_>div]:!inline-flex [&_>div>div]:!w-full [&_>div>div]:!min-w-0"
                    >
                      {belts[0] ? (
                        <BeltAuto
                          belt={belts[0].belt}
                          degree={belts[0].degree ?? 0}
                          className="!flex w-full"
                        />
                      ) : (
                        <div className="h-8 w-full rounded-sm border border-dashed border-slate-300" />
                      )}
                    </div>



                    {/* Badge status */}
                    <span
                      className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] shrink-0 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                          : "bg-slate-100 text-slate-500 ring-1 ring-slate-900/10"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {isActive ? "Ativo" : "Inativo"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {/* Rodapé com carimbo editorial */}
          {recent.length > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-7 py-3.5 border-t border-slate-900/[0.07] bg-white/60">
              <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                {recent.length} {recent.length === 1 ? "registro" : "registros"} • ordem cronológica
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-700/70" />
            </div>
          )}
        </div>




      </section>

      {/* Ações rápidas */}
      <section>
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-2">
          Ações rápidas
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {[
            { to: "/dojo/app/students", label: "Novo aluno", icon: UserPlus },
            { to: "/dojo/app/checkin", label: "Check-in", icon: QrCode },
            { to: "/dojo/app/graduations", label: "Graduação", icon: Award },
            { to: "/dojo/app/finance", label: "Cobrança", icon: Wallet },
            { to: "/dojo/app/schedule", label: "Agenda", icon: Activity },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="dojo-card group p-3 flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium">{label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
