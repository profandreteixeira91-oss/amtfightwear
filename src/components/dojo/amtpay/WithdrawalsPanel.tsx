import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, X, RefreshCw } from "lucide-react";
import { listWithdrawals, cancelWithdrawal, getPrimaryBankAccount, retryWithdrawal } from "@/lib/dojo/amtpay.functions";
import { WithdrawDialog } from "./WithdrawDialog";
import { BankAccountDialog } from "./BankAccountDialog";

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  requested: { label: "Solicitado", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" },
  in_review: { label: "Em análise", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  processing: { label: "Em processamento", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300" },
  paid: { label: "Pago", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
  cancelled: { label: "Cancelado", color: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" },
};

export function WithdrawalsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listWithdrawals);
  const cancelFn = useServerFn(cancelWithdrawal);
  const retryFn = useServerFn(retryWithdrawal);
  const bankFn = useServerFn(getPrimaryBankAccount);
  const wQ = useQuery({ queryKey: ["amtpay-withdrawals"], queryFn: () => listFn() });
  const bankQ = useQuery({ queryKey: ["amtpay-bank"], queryFn: () => bankFn() });

  const [wdOpen, setWdOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  async function onCancel(id: string) {
    if (!confirm("Cancelar esta solicitação de saque?")) return;
    try {
      await cancelFn({ data: { id } });
      toast.success("Saque cancelado.");
      qc.invalidateQueries({ queryKey: ["amtpay-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["amtpay-balance"] });
      qc.invalidateQueries({ queryKey: ["amtpay-dashboard"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function onRetry(id: string) {
    try {
      const r = await retryFn({ data: { id } });
      toast.success(r.status === "paid" ? "Transferência confirmada!" : "Saque enviado ao AMT Pay.");
      qc.invalidateQueries({ queryKey: ["amtpay-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["amtpay-balance"] });
      qc.invalidateQueries({ queryKey: ["amtpay-dashboard"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const rows = wQ.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowDownRight className="h-4 w-4" /> Saques
        </CardTitle>
        <div className="flex gap-2">
          {!bankQ.data && (
            <Button size="sm" variant="outline" onClick={() => setBankOpen(true)}>
              Cadastrar conta
            </Button>
          )}
          <Button size="sm" onClick={() => setWdOpen(true)}>Solicitar saque</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-xs text-muted-foreground border-b">
              <tr className="text-left">
                <th className="py-2 pr-3">Data</th>
                <th className="pr-3">Valor</th>
                <th className="pr-3">Destino</th>
                <th className="pr-3">Chave PIX</th>
                <th className="pr-3">Status</th>
                <th className="pr-3">Código</th>
                <th className="pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any) => {
                const st = STATUS_LABEL[r.status] ?? { label: r.status, color: "bg-muted" };
                const bank = r.bank_account;
                return (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.requested_at).toLocaleString("pt-BR")}</td>
                    <td className="pr-3 font-medium">{brl(Number(r.amount))}</td>
                    <td className="pr-3 text-xs">
                      {bank?.bank_name ?? "—"}<br />
                      <span className="text-muted-foreground">Ag {bank?.branch ?? "—"} · Cc {bank?.account_number ?? "—"}</span>
                    </td>
                    <td className="pr-3 text-xs font-mono truncate max-w-[140px]">{r.pix_key ?? "—"}</td>
                    <td className="pr-3"><Badge className={st.color}>{st.label}</Badge></td>
                    <td className="pr-3 text-xs font-mono">{r.provider_tx_id ?? "—"}</td>
                    <td className="pr-3 text-right space-x-1">
                      {r.status === "requested" && (
                        <Button size="sm" variant="outline" onClick={() => onRetry(r.id)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reenviar
                        </Button>
                      )}
                      {["requested", "in_review"].includes(r.status) && (
                        <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum saque registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      <WithdrawDialog open={wdOpen} onOpenChange={setWdOpen} onNeedBankAccount={() => setBankOpen(true)} />
      <BankAccountDialog open={bankOpen} onOpenChange={setBankOpen} />
    </Card>
  );
}
