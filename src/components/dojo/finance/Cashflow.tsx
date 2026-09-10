import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { brl, useFinanceKpis } from "./shared";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import {
  todayISO,
  monthStartISO,
  monthEndISO,
  addDaysISO,
  eachDayISO,
  isoToDate,
  ymd,
} from "@/lib/dates";

type Range = "today" | "week" | "month" | "year" | "custom";

export function FinanceCashflow() {
  const k = useFinanceKpis();
  const [range, setRange] = useState<Range>("month");
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const period = useMemo(() => {
    const today = todayISO();
    if (range === "today") return { from: today, to: today };
    if (range === "week") return { from: addDaysISO(today, -6), to: today };
    if (range === "month") return { from: monthStartISO(today), to: monthEndISO(today) };
    if (range === "year") {
      const year = isoToDate(today).getUTCFullYear();
      return { from: ymd(year, 1, 1), to: ymd(year, 12, 31) };
    }
    return { from, to };
  }, [range, from, to]);

  const days = useMemo(() => {
    const arr: { day: string; label: string; entradas: number; saidas: number; saldo: number }[] = [];
    for (const day of eachDayISO(period.from, period.to)) {
      const [, mm, dd] = day.split("-");
      const label = `${dd}/${mm}`;
      const entradas = k.invoices
        .filter((i) => i.status === "paid" && (i.paid_at?.slice(0, 10) ?? i.due_date) === day)
        .reduce((s, i) => s + Number(i.amount || 0), 0);
      const saidas = k.expenses
        .filter((e) => e.status === "paid" && (e.paid_at?.slice(0, 10) ?? e.due_date) === day)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      arr.push({ day, label, entradas, saidas, saldo: entradas - saidas });
    }
    return arr;
  }, [period.from, period.to, k.invoices, k.expenses]);

  const totalIn = days.reduce((s, d) => s + d.entradas, 0);
  const totalOut = days.reduce((s, d) => s + d.saidas, 0);
  const saldoFinal = totalIn - totalOut;

  return (
    <div className="space-y-4">
      <Card className="p-3 border border-[color:var(--dojo-border)]">
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "week", "month", "year", "custom"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setRange(r)}
            >
              {r === "today" ? "Hoje" : r === "week" ? "Semana" : r === "month" ? "Mês" : r === "year" ? "Ano" : "Personalizado"}
            </Button>
          ))}
          {range === "custom" && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Entradas</span>
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="font-display text-2xl font-bold text-emerald-600">{brl(totalIn)}</div>
        </Card>
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Saídas</span>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </div>
          <div className="font-display text-2xl font-bold text-red-600">{brl(totalOut)}</div>
        </Card>
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Saldo do período</span>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`font-display text-2xl font-bold ${saldoFinal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {brl(saldoFinal)}
          </div>
        </Card>
      </div>

      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <h3 className="font-display font-bold text-sm mb-3">Fluxo diário</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={days}>
            <defs>
              <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dojo-border)" />
            <XAxis dataKey="label" fontSize={10} />
            <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => brl(v)} />
            <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} fill="url(#gIn)" />
            <Area type="monotone" dataKey="saidas" stroke="#dc2626" strokeWidth={2} fill="url(#gOut)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="border border-[color:var(--dojo-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[110px_repeat(3,minmax(0,1fr))] px-4 py-2 bg-[color:var(--dojo-surface-2)] border-b border-[color:var(--dojo-border)] text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Data</span>
              <span>Entradas</span>
              <span>Saídas</span>
              <span>Saldo</span>
            </div>
            <div className="divide-y divide-[color:var(--dojo-border)] max-h-[400px] overflow-y-auto">
              {days
                .filter((d) => d.entradas || d.saidas)
                .map((d) => (
                  <div key={d.day} className="grid grid-cols-[110px_repeat(3,minmax(0,1fr))] px-4 py-2 text-sm">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{d.label}</span>
                    <span className="text-emerald-600 font-medium whitespace-nowrap">{brl(d.entradas)}</span>
                    <span className="text-red-600 font-medium whitespace-nowrap">{brl(d.saidas)}</span>
                    <span className={`font-semibold whitespace-nowrap ${d.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {brl(d.saldo)}
                    </span>
                  </div>
                ))}
              {days.filter((d) => d.entradas || d.saidas).length === 0 && (
                <div className="p-6 text-center">
                  <Badge variant="outline">Sem movimentações no período</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
