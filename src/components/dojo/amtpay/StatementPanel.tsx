import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Filter, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { listWalletTransactions } from "@/lib/dojo/amtpay.functions";
import { todayISO } from "@/lib/dates";

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const KIND_LABEL: Record<string, string> = {
  receipt: "Recebimento",
  fee: "Taxa",
  refund: "Estorno",
  withdrawal: "Saque",
  withdrawal_reversal: "Devolução de saque",
  adjustment: "Ajuste",
  transfer_in: "Transferência recebida",
  transfer_out: "Transferência enviada",
};

export function StatementPanel() {
  const listFn = useServerFn(listWalletTransactions);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");

  const filters = useMemo(() => ({
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(new Date(to).getTime() + 24 * 3600 * 1000 - 1).toISOString() : undefined,
    kind: kind !== "all" ? (kind as any) : undefined,
    method: method !== "all" ? (method as any) : undefined,
    limit: 500,
  }), [from, to, kind, method]);

  const txQ = useQuery({
    queryKey: ["amtpay-tx", "statement", filters],
    queryFn: () => listFn({ data: filters }),
  });

  const rows = txQ.data ?? [];

  function exportCSV() {
    const header = ["Data", "Tipo", "Método", "Status", "Descrição", "Valor", "Referência"];
    const lines = [header.join(";")];
    for (const t of rows) {
      const sign = t.direction === 1 ? "+" : "-";
      lines.push([
        new Date(t.occurred_at).toLocaleString("pt-BR"),
        KIND_LABEL[t.kind] ?? t.kind,
        t.method,
        t.status,
        (t.description ?? "").replace(/;/g, ","),
        `${sign}${Number(t.net_amount).toFixed(2)}`,
        (t as any).provider_tx_id ?? "",
      ].join(";"));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato-amtpay-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" /> Extrato financeiro
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Tipo</label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Forma</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-[10px] sm:text-xs text-muted-foreground border-b uppercase tracking-wider">
              <tr className="text-left">
                <th className="py-2 pr-3">Data</th>
                <th className="pr-3">Tipo</th>
                <th className="pr-3">Descrição</th>
                <th className="pr-3">Forma</th>
                <th className="pr-3">Status</th>
                <th className="pr-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t: any) => {
                const positive = t.direction === 1;
                return (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(t.occurred_at).toLocaleString("pt-BR")}</td>
                    <td className="pr-3">{KIND_LABEL[t.kind] ?? t.kind}</td>
                    <td className="pr-3">{t.description ?? "—"}</td>
                    <td className="pr-3 text-xs uppercase">{t.method}</td>
                    <td className="pr-3"><Badge variant="outline" className="text-[10px]">{t.status}</Badge></td>
                    <td className={`pr-3 text-right font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        {positive ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {brl(Number(t.net_amount))}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
