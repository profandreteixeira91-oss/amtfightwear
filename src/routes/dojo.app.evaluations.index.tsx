import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { evalDashboardStats } from "@/lib/dojo/evaluations.functions";
import { CheckCircle2, XCircle, Clock, CalendarClock, Percent, FileText, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/dojo/app/evaluations/")({
  component: EvaluationsDashboard,
});

type Tone = "emerald" | "amber" | "sky" | "red" | "violet" | "slate" | "rose";
const TONE: Record<Tone, { grad: string; ring: string; glow: string; text: string }> = {
  emerald: { grad: "from-emerald-500 to-teal-500", ring: "ring-emerald-400/40", glow: "shadow-[0_10px_25px_-12px_rgba(16,185,129,0.7)]", text: "text-emerald-200" },
  amber:   { grad: "from-amber-500 to-orange-500", ring: "ring-amber-400/40",   glow: "shadow-[0_10px_25px_-12px_rgba(245,158,11,0.7)]", text: "text-amber-200" },
  sky:     { grad: "from-sky-500 to-cyan-500",     ring: "ring-sky-400/40",     glow: "shadow-[0_10px_25px_-12px_rgba(56,189,248,0.7)]",  text: "text-sky-200" },
  red:     { grad: "from-red-500 to-rose-600",     ring: "ring-red-400/40",     glow: "shadow-[0_10px_25px_-12px_rgba(239,68,68,0.7)]",   text: "text-red-200" },
  violet:  { grad: "from-violet-500 to-fuchsia-500", ring: "ring-violet-400/40", glow: "shadow-[0_10px_25px_-12px_rgba(139,92,246,0.7)]", text: "text-violet-200" },
  slate:   { grad: "from-slate-500 to-neutral-600", ring: "ring-slate-400/40",  glow: "shadow-[0_10px_25px_-12px_rgba(100,116,139,0.6)]", text: "text-slate-200" },
  rose:    { grad: "from-rose-500 to-red-600",     ring: "ring-rose-400/40",    glow: "shadow-[0_10px_25px_-12px_rgba(244,63,94,0.7)]",   text: "text-rose-200" },
};

function EvaluationsDashboard() {
  const statsFn = useServerFn(evalDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["eval-stats"],
    queryFn: () => statsFn(),
  });

  const kpis: Array<{ label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; tone: Tone }> = [
    { label: "Realizadas", value: data?.total_done ?? 0, icon: CheckCircle2, tone: "emerald" },
    { label: "Pendentes", value: data?.pending ?? 0, icon: Clock, tone: "amber" },
    { label: "Agendadas", value: data?.scheduled ?? 0, icon: CalendarClock, tone: "sky" },
    { label: "Aprovados", value: data?.approved ?? 0, icon: CheckCircle2, tone: "emerald" },
    { label: "Reprovados", value: data?.failed ?? 0, icon: XCircle, tone: "red" },
    { label: "Média geral", value: `${data?.avg_percentage ?? 0}%`, icon: Percent, tone: "violet" },
    { label: "Modelos", value: data?.templates_count ?? 0, icon: FileText, tone: "slate" },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => {
          const Icon = k.icon;
          const t = TONE[k.tone];
          return (
            <div key={k.label} className="relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md">
              <div aria-hidden className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${t.grad} opacity-20 blur-2xl`} />
              <div className={`relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${t.grad} text-white ring-1 ${t.ring} ${t.glow}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="relative mt-3 text-2xl font-black tracking-tight text-neutral-900">{isLoading ? "—" : k.value}</div>
              <div className="relative mt-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/15 blur-3xl" />
        <div className="relative mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_10px_25px_-12px_rgba(220,38,38,0.9)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">Evolução mensal</div>
            <div className="text-base font-semibold text-neutral-900">Avaliações concluídas por mês</div>
          </div>
        </div>
        <div className="relative h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.monthly ?? []}>
              <defs>
                <linearGradient id="evalBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="month" fontSize={11} stroke="rgba(0,0,0,0.45)" tickLine={false} axisLine={false} dy={10} />
              <YAxis fontSize={11} allowDecimals={false} stroke="rgba(0,0,0,0.45)" tickLine={false} axisLine={false} dx={-10} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 12,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#dc2626", fontWeight: 700 }}
              />
              <Bar dataKey="count" fill="url(#evalBar)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
