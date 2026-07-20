import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { generateMonthlyInvoices, markDojoInvoicePaid, deleteDojoInvoice } from "@/lib/dojo/dojo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Zap } from "lucide-react";
import { useInvoices, type InvoiceRow } from "./shared";
import { TuitionByStudent, type TuitionInvoice } from "./TuitionList";

export function FinanceTuition() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [refMonth, setRefMonth] = useState(defaultMonth);
  const [q, setQ] = useState("");
  const invs = useInvoices("all");
  const genFn = useServerFn(generateMonthlyInvoices);
  const payFn = useServerFn(markDojoInvoicePaid);
  const delFn = useServerFn(deleteDojoInvoice);
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dojo-invoices"] });
    qc.invalidateQueries({ queryKey: ["dojo-finance"] });
    qc.invalidateQueries({ queryKey: ["dojo-student"] });
  };

  const rows = ((invs.data ?? []) as InvoiceRow[]) as unknown as TuitionInvoice[];
  const term = q.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) => (r.student?.full_name ?? "").toLowerCase().includes(term))
    : rows;

  const handleGenerate = async () => {
    try {
      const r = await genFn({ data: { reference_month: refMonth } });
      toast.success(`${r.created} cobranças geradas`);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };
  const handlePay = async (id: string) => {
    try { await payFn({ data: { id, method: "cash" } }); toast.success("Mensalidade recebida"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta mensalidade?")) return;
    try { await delFn({ data: { id } }); toast.success("Excluída"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <div className="font-semibold text-sm">Gerar mensalidades (matrículas manuais)</div>
              <div className="text-xs text-muted-foreground">
                Assinaturas Asaas são cobradas automaticamente pelo gateway.
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input type="month" value={refMonth} onChange={(e) => setRefMonth(e.target.value)} className="w-40 h-9" />
            <Button onClick={handleGenerate}>Gerar</Button>
          </div>
        </div>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Buscar aluno…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
      </div>

      {invs.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <TuitionByStudent invoices={filtered} onMarkPaid={handlePay} onDelete={handleDelete} />
      )}
    </div>
  );
}
