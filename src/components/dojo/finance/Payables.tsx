import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { saveDojoExpense, deleteDojoExpense } from "@/lib/dojo/dojo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, CheckCircle2, Trash2, Eye } from "lucide-react";
import { brl, brDate, daysBetween, isoDate, useExpenses, useFinanceSettings, type ExpenseRow } from "./shared";
import { EntryDrawer } from "./EntryDrawer";

export function FinancePayables() {
  const { settings } = useFinanceSettings();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    due_date: isoDate(),
    category: "",
    recurrence: "none" as "none" | "monthly" | "quarterly" | "yearly",
    installments: "12",
  });

  const exps = useExpenses();
  const saveFn = useServerFn(saveDojoExpense);
  const delFn = useServerFn(deleteDojoExpense);
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dojo-expenses"] });
    qc.invalidateQueries({ queryKey: ["dojo-finance"] });
  };

  const rows = useMemo(() => {
    let list = (exps.data ?? []) as ExpenseRow[];
    if (status !== "all") list = list.filter((r) => r.status === status);
    const t = q.trim().toLowerCase();
    if (t)
      list = list.filter(
        (r) =>
          r.description.toLowerCase().includes(t) ||
          (r.category ?? "").toLowerCase().includes(t) ||
          String(r.amount).includes(t),
      );
    return list;
  }, [exps.data, q, status]);

  const handleAdd = async () => {
    if (!form.description || !form.amount) return toast.error("Preencha descrição e valor");
    try {
      const res = await saveFn({
        data: {
          description: form.description,
          amount: Number(form.amount),
          due_date: form.due_date,
          category: form.category || null,
          recurrence: form.recurrence,
          installments: form.recurrence === "none" ? 1 : Math.max(1, Number(form.installments) || 12),
        },
      });
      const created = (res as any)?.created ?? 1;
      toast.success(created > 1 ? `${created} lançamentos criados` : "Despesa cadastrada");
      setForm({ description: "", amount: "", due_date: isoDate(), category: "", recurrence: "none", installments: "12" });
      setOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePay = async (r: ExpenseRow) => {
    try {
      await saveFn({
        data: {
          id: r.id,
          description: r.description,
          amount: Number(r.amount),
          due_date: r.due_date,
          status: "paid",
          paid_at: new Date().toISOString(),
        },
      });
      toast.success("Despesa paga");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta despesa?")) return;
    await delFn({ data: { id } });
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 border border-[color:var(--dojo-border)]">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, categoria ou valor…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-9">
                <Plus className="h-4 w-4 mr-1" /> Nova despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova despesa</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Recorrência</Label>
                    <Select
                      value={form.recurrence}
                      onValueChange={(v: "none" | "monthly" | "quarterly" | "yearly") =>
                        setForm({ ...form, recurrence: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem recorrência</SelectItem>
                        <SelectItem value="monthly">Mensal (ex.: aluguel, imposto)</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.recurrence !== "none" && (
                    <div className="grid gap-1.5">
                      <Label>Quantidade de lançamentos</Label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={form.installments}
                        onChange={(e) => setForm({ ...form, installments: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                {form.recurrence !== "none" && (
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Serão gerados {Math.max(1, Number(form.installments) || 1)} lançamentos a partir de {brDate(form.due_date)}, um por{" "}
                    {form.recurrence === "monthly" ? "mês" : form.recurrence === "quarterly" ? "trimestre" : "ano"}.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleAdd}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {exps.isLoading ? (
        <Card className="border border-[color:var(--dojo-border)] p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border border-[color:var(--dojo-border)] p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>
        </Card>
      ) : (
        <Card className="border border-[color:var(--dojo-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_140px_110px_120px_110px_170px] gap-3 px-4 py-2 bg-[color:var(--dojo-surface-2)] border-b border-[color:var(--dojo-border)] text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Descrição</span>
                <span>Categoria</span>
                <span>Valor</span>
                <span>Vencimento</span>
                <span>Status</span>
                <span className="text-right">Ações</span>
              </div>
              <div className="divide-y divide-[color:var(--dojo-border)]">
                {rows.map((r) => {
                  const overdueDays = r.status !== "paid" ? Math.max(0, daysBetween(r.due_date, todayISO())) : 0;
                  return (
                    <div
                      key={r.id}
                      className="grid md:grid-cols-[minmax(0,1fr)_140px_110px_120px_110px_170px] gap-3 px-4 py-3 items-center hover:bg-[color:var(--dojo-surface-2)]/60 transition-colors"
                    >
                      <button className="text-left min-w-0" onClick={() => setSelected(r)}>
                        <div className="font-medium text-sm truncate">{r.description}</div>
                      </button>
                      <div className="text-xs text-muted-foreground truncate min-w-0">{r.category ?? "—"}</div>
                      <div className="text-sm font-semibold whitespace-nowrap">{brl(r.amount)}</div>
                      <div className="text-xs min-w-0">
                        <div className="truncate">{brDate(r.due_date)}</div>
                        {overdueDays > 0 && <div className="text-red-600 truncate">{overdueDays}d atraso</div>}
                      </div>
                      <div className="min-w-0">
                        <Badge
                          variant="outline"
                          className={
                            r.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : overdueDays > 0
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {r.status === "paid" ? "Pago" : overdueDays > 0 ? "Atrasado" : "Pendente"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-end gap-1 flex-nowrap">
                        <Button size="icon" variant="ghost" title="Detalhes" onClick={() => setSelected(r)} className="shrink-0 h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {r.status !== "paid" && (
                          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => handlePay(r)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pagar
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)} className="shrink-0 h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <EntryDrawer open={!!selected} onOpenChange={(v) => !v && setSelected(null)} entry={selected} kind="expense" />
    </div>
  );
}
