import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownRight, ArrowUpRight, Landmark, TrendingUp, Clock, ShieldAlert, Plus, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import {
  getWalletDashboard,
  getWalletChart,
  listWalletTransactions,
  getPrimaryBankAccount,
  getGatewayCapabilities,
} from "@/lib/dojo/amtpay.functions";
import { BankAccountDialog } from "./BankAccountDialog";
import { WithdrawDialog } from "./WithdrawDialog";

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function WalletPanel() {
  const qc = useQueryClient();
  const dashFn = useServerFn(getWalletDashboard);
  const chartFn = useServerFn(getWalletChart);
  const txFn = useServerFn(listWalletTransactions);
  const bankFn = useServerFn(getPrimaryBankAccount);
  const capsFn = useServerFn(getGatewayCapabilities);

  const dashQ = useQuery({ queryKey: ["amtpay-dashboard"], queryFn: () => dashFn() });
  const chartQ = useQuery({ queryKey: ["amtpay-chart"], queryFn: () => chartFn() });
  const txQ = useQuery({ queryKey: ["amtpay-tx", "wallet-recent"], queryFn: () => txFn({ data: { limit: 8 } }) });
  const bankQ = useQuery({ queryKey: ["amtpay-bank"], queryFn: () => bankFn() });
  const capsQ = useQuery({ queryKey: ["amtpay-caps"], queryFn: () => capsFn() });

  const [bankOpen, setBankOpen] = useState(false);
  const [wdOpen, setWdOpen] = useState(false);

  const d = dashQ.data;
  const bal = d?.balance;
  const caps = capsQ.data;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["amtpay-dashboard"] });
    qc.invalidateQueries({ queryKey: ["amtpay-chart"] });
    qc.invalidateQueries({ queryKey: ["amtpay-tx"] });
    qc.invalidateQueries({ queryKey: ["amtpay-balance"] });
  }

  return (
    <div className="space-y-6">
      {/* Header carteira */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="font-semibold">Minha Carteira</div>
                <Badge variant="outline" className="text-[10px]">AMT Pay</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Saldo consolidado da sua academia</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBankOpen(true)}>
                <Landmark className="h-4 w-4 mr-2" />
                {bankQ.data ? "Editar conta bancária" : "Cadastrar conta"}
              </Button>
              <Button onClick={() => setWdOpen(true)}>
                <ArrowDownRight className="h-4 w-4 mr-2" /> Solicitar saque
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <BalanceCard label="Disponível" value={bal?.available ?? 0} tone="primary" />
            <BalanceCard label="Em processamento" value={bal?.pending ?? 0} tone="warning" />
            <BalanceCard label="Bloqueado" value={bal?.blocked ?? 0} tone="danger" />
            <BalanceCard label="Saldo total" value={bal?.total ?? 0} tone="muted" />
          </div>
        </div>
      </Card>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Últimos 30 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartQ.data ?? []}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: any) => brl(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="in" name="Entradas" stroke="hsl(var(--primary))" fill="url(#colorIn)" />
                <Area type="monotone" dataKey="out" name="Saídas" stroke="#ef4444" fill="url(#colorOut)" />
                <Area type="monotone" dataKey="balance" name="Saldo" stroke="#0ea5e9" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Info extras + últimas movimentações */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Próximo repasse
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="text-muted-foreground">{d?.nextPayoutAt ?? "Modo manual — solicite quando desejar"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" /> Último saque
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {d?.lastWithdrawal ? (
              <div>
                <div className="font-semibold">{brl(Number(d.lastWithdrawal.amount))}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(d.lastWithdrawal.requested_at).toLocaleDateString("pt-BR")} · {d.lastWithdrawal.status}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Nenhum saque realizado.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="text-xl font-semibold">{brl(d?.overdueAmount ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Total em atraso</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Extrato resumido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(txQ.data ?? []).map((t: any) => (
              <TxRow key={t.id} tx={t} />
            ))}
            {(txQ.data ?? []).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Plus className="h-4 w-4 inline mr-1" /> Nenhuma movimentação registrada.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <BankAccountDialog open={bankOpen} onOpenChange={setBankOpen} />
      <WithdrawDialog open={wdOpen} onOpenChange={setWdOpen} onNeedBankAccount={() => setBankOpen(true)} />
    </div>
  );
}

function BalanceCard({ label, value, tone }: { label: string; value: number; tone: "primary" | "warning" | "danger" | "muted" }) {
  const colors: Record<string, string> = {
    primary: "text-primary",
    warning: "text-amber-600",
    danger: "text-red-600",
    muted: "text-foreground",
  };
  return (
    <div className="rounded-xl bg-background/80 backdrop-blur border p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl md:text-2xl font-bold tracking-tight mt-1 ${colors[tone]}`}>{brl(value)}</div>
    </div>
  );
}

function TxRow({ tx }: { tx: any }) {
  const positive = tx.direction === 1;
  return (
    <div className="py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {positive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{tx.description ?? tx.kind}</div>
          <div className="text-[11px] text-muted-foreground">
            {new Date(tx.occurred_at).toLocaleString("pt-BR")} · {tx.method} · {tx.status}
          </div>
        </div>
      </div>
      <div className={`text-sm font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
        {positive ? "+" : "-"} {brl(Number(tx.net_amount))}
      </div>
    </div>
  );
}
