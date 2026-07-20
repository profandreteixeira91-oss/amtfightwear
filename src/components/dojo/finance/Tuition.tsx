import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { generateMonthlyInvoices, markDojoInvoicePaid } from "@/lib/dojo/dojo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Zap, CheckCircle2, Send } from "lucide-react";
import { brl, daysBetween, isoDate, useInvoices, type InvoiceRow } from "./shared";

export function FinanceTuition() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [refMonth, setRefMonth] = useState(defaultMonth);
  const [q, setQ] = useState("");
  const invs = useInvoices("all");
  const genFn = useServerFn(generateMonthlyInvoices);
  const payFn = useServerFn(markDojoInvoicePaid);
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dojo-invoices"] });
    qc.invalidateQueries({ queryKey: ["dojo-finance"] });
  };

  // Agrupa faturas por aluno
  const byStudent = useMemo(() => {
    const rows = (invs.data ?? []) as InvoiceRow[];
    const map = new Map<string, { name: string; rows: InvoiceRow[] }>();
    for (const r of rows) {
      const key = r.student_id ?? "sem-aluno";
      if (!map.has(key))
        map.set(key, { name: r.student?.full_name ?? "Sem aluno vinculado", rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.entries()).map(([id, v]) => {
      const sorted = v.rows.slice().sort((a, b) => (a.due_date < b.due_date ? 1 : -1));
      const last = sorted.find((r) => r.status === "paid") ?? null;
      const next = sorted
        .filter((r) => r.status !== "paid" && r.status !== "cancelled")
        .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0] ?? null;
      const overdue = next && new Date(next.due_date) < new Date(isoDate());
      const totalPaid = v.rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
      return { id, name: v.name, rows: sorted, last, next, overdue, count: v.rows.length, totalPaid };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [invs.data]);

  const filtered = q.trim()
    ? byStudent.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
    : byStudent;

  const handleGenerate = async () => {
    try {
      const r = await genFn({ data: { reference_month: refMonth } });
      toast.success(`${r.created} cobranças geradas`);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePay = async (id: string) => {
    try {
      await payFn({ data: { id, method: "cash" } });
      toast.success("Mensalidade recebida");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <div className="font-semibold text-sm">Geração automática de mensalidades</div>
              <div className="text-xs text-muted-foreground">
                Cria cobranças para cada matrícula ativa no mês selecionado.
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input type="month" value={refMonth} onChange={(e) => setRefMonth(e.target.value)} className="w-40 h-9" />
            <Button onClick={handleGenerate}>Gerar mensalidades</Button>
          </div>
        </div>
      </Card>

      <Card className="p-3 border border-[color:var(--dojo-border)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </Card>

      {invs.isLoading ? (
        <Card className="border border-[color:var(--dojo-border)] p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-[color:var(--dojo-border)] p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma mensalidade encontrada.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const overdueDays = s.next && new Date(s.next.due_date) < new Date(isoDate()) ? daysBetween(s.next.due_date, isoDate()) : 0;
            return (
              <Card key={s.id} className="p-4 border border-[color:var(--dojo-border)]">
                <div className="grid gap-3 items-start md:items-center md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.count} lançamento(s) · Recebido total {brl(s.totalPaid)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Último pagamento</div>
                    <div className="text-xs font-medium truncate">
                      {s.last ? `${s.last.paid_at?.slice(0, 10) ?? s.last.due_date} · ${brl(s.last.amount)}` : "—"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Próximo vencimento</div>
                    <div className="text-xs font-medium truncate">
                      {s.next ? `${s.next.due_date} · ${brl(s.next.amount)}` : "—"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Situação</div>
                    {!s.next ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Em dia
                      </Badge>
                    ) : overdueDays > 0 ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Atrasado {overdueDays}d
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 md:justify-end">
                    {s.next && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => handlePay(s.next!.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Receber
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => toast.info("Envio via WhatsApp em breve.")}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
