import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  markDojoInvoicePaid,
  deleteDojoInvoice,
} from "@/lib/dojo/dojo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Search, CheckCircle2, Trash2, Eye, AlertCircle, CalendarIcon } from "lucide-react";
import { brl, daysBetween, isoDate, useInvoices, type InvoiceRow } from "./shared";
import { EntryDrawer } from "./EntryDrawer";
import { ShareInvoiceMenu } from "./ShareInvoice";

const STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  pending: "A vencer",
  due_soon: "Próxima ao vencimento",
  overdue: "Vencida",
  cancelled: "Cancelado",
};

const DUE_SOON_DAYS = 5;

function daysUntilDue(dueDate: string) {
  const today = new Date(isoDate());
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function effectiveKey(r: InvoiceRow): "paid" | "overdue" | "due_soon" | "pending" | "cancelled" {
  if (r.status === "paid") return "paid";
  if (r.status === "cancelled") return "cancelled";
  const d = daysUntilDue(r.due_date);
  if (d < 0) return "overdue";
  if (d <= DUE_SOON_DAYS) return "due_soon";
  return "pending";
}

function statusClasses(key: string) {
  switch (key) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "overdue":
      return "bg-red-50 text-red-700 border-red-200";
    case "due_soon":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "pending":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled":
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function FinanceReceivables() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InvoiceRow | null>(null);
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [paying, setPaying] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const invs = useInvoices(status);
  const payFn = useServerFn(markDojoInvoicePaid);
  const delFn = useServerFn(deleteDojoInvoice);
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dojo-invoices"] });
    qc.invalidateQueries({ queryKey: ["dojo-finance"] });
  };

  const items = useMemo(() => {
    const rows = (invs.data ?? []) as InvoiceRow[];
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.student?.full_name?.toLowerCase().includes(t) ||
        (r.description ?? "").toLowerCase().includes(t) ||
        String(r.amount).includes(t),
    );
  }, [invs.data, q]);

  const paid = items.filter((i) => effectiveKey(i) === "paid");
  const pending = items.filter((i) => effectiveKey(i) === "pending");
  const dueSoon = items.filter((i) => effectiveKey(i) === "due_soon");
  const overdue = items.filter((i) => effectiveKey(i) === "overdue");
  const cancelled = items.filter((i) => effectiveKey(i) === "cancelled");

  const openPay = (row: InvoiceRow) => {
    setPayTarget(row);
    setPayDate(new Date());
    setPayMethod((row as any).method || "cash");
  };
  const confirmPay = async () => {
    if (!payTarget) return;
    setPaying(true);
    try {
      // paid_at as noon ISO to avoid timezone drift on the selected day
      const d = new Date(payDate);
      d.setHours(12, 0, 0, 0);
      await payFn({ data: { id: payTarget.id, method: payMethod, paid_at: d.toISOString() } });
      toast.success("Cobrança recebida");
      setPayTarget(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta cobrança?")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluída");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 border border-[color:var(--dojo-border)]">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno, descrição ou valor…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">A vencer</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs defaultValue="all">
        <div className="-mx-1 overflow-x-auto">
          <TabsList className="w-max min-w-full flex-nowrap">
            <TabsTrigger value="all" className="whitespace-nowrap">Todas · {items.length}</TabsTrigger>
            <TabsTrigger value="pending" className="whitespace-nowrap">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              A vencer · {pending.length}
            </TabsTrigger>
            <TabsTrigger value="due_soon" className="whitespace-nowrap">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
              Próxima ao vencimento · {dueSoon.length}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="whitespace-nowrap">
              <AlertCircle className="h-3 w-3 mr-1 text-red-600" />
              Vencidas · {overdue.length}
            </TabsTrigger>
            <TabsTrigger value="paid" className="whitespace-nowrap">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Pagas · {paid.length}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="whitespace-nowrap">Canceladas · {cancelled.length}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all">
          <InvoiceList rows={items} loading={invs.isLoading} onOpen={setSelected} onPay={openPay} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="pending">
          <InvoiceList rows={pending} loading={invs.isLoading} onOpen={setSelected} onPay={openPay} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="due_soon">
          <InvoiceList rows={dueSoon} loading={invs.isLoading} onOpen={setSelected} onPay={openPay} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="overdue">
          <InvoiceList rows={overdue} loading={invs.isLoading} onOpen={setSelected} onPay={openPay} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="paid">
          <InvoiceList rows={paid} loading={invs.isLoading} onOpen={setSelected} onPay={openPay} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="cancelled">
          <InvoiceList rows={cancelled} loading={invs.isLoading} onOpen={setSelected} onPay={openPay} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>

      <EntryDrawer open={!!selected} onOpenChange={(v) => !v && setSelected(null)} entry={selected} kind="invoice" />

      <Dialog open={!!payTarget} onOpenChange={(v) => !v && !paying && setPayTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
            <DialogDescription>
              {payTarget ? (
                <>
                  <span className="font-medium text-foreground">{payTarget.student?.full_name ?? "—"}</span>
                  {" · "}
                  <span className="text-foreground">{brl(payTarget.amount)}</span>
                  {payTarget.description ? <> · {payTarget.description}</> : null}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Data do recebimento</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !payDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {payDate ? format(payDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={payDate}
                    onSelect={(d) => { if (d) { setPayDate(d); setCalOpen(false); } }}
                    initialFocus
                    locale={ptBR}
                    disabled={(d) => d > new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="debit_card">Cartão de débito</SelectItem>
                  <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transfer">Transferência bancária</SelectItem>
                  <SelectItem value="payment_link">Link de pagamento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={paying}>
              Cancelar
            </Button>
            <Button onClick={confirmPay} disabled={paying || !payDate}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {paying ? "Registrando…" : "Confirmar recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceList({
  rows,
  loading,
  onOpen,
  onPay,
  onDelete,
}: {
  rows: InvoiceRow[];
  loading: boolean;
  onOpen: (r: InvoiceRow) => void;
  onPay: (r: InvoiceRow) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <Card className="border border-[color:var(--dojo-border)] p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card className="border border-[color:var(--dojo-border)] p-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma cobrança nesta visão.</p>
      </Card>
    );
  }
  return (
    <Card className="border border-[color:var(--dojo-border)] overflow-hidden">

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_110px_120px_110px_210px] gap-3 px-4 py-2 bg-[color:var(--dojo-surface-2)] border-b border-[color:var(--dojo-border)] text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Aluno / descrição</span>
            <span>Valor</span>
            <span>Vencimento</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-[color:var(--dojo-border)]">
            {rows.map((r) => {
              const overdueDays = r.status !== "paid" && r.status !== "cancelled" ? Math.max(0, daysBetween(r.due_date, isoDate())) : 0;
              return (
                <div
                  key={r.id}
                  className="grid md:grid-cols-[minmax(0,1fr)_110px_120px_110px_210px] gap-3 px-4 py-3 items-center hover:bg-[color:var(--dojo-surface-2)]/60 transition-colors"
                >
                  <button className="text-left min-w-0" onClick={() => onOpen(r)}>
                    <div className="font-medium text-sm truncate">{r.student?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.description ?? "Cobrança"}</div>
                  </button>
                  <div className="text-sm font-semibold whitespace-nowrap">{brl(r.amount)}</div>
                  <div className="text-xs min-w-0">
                    <div className="truncate">{r.due_date}</div>
                    {overdueDays > 0 && <div className="text-red-600 truncate">{overdueDays}d atraso</div>}
                  </div>
                  <div className="min-w-0">
                    {(() => {
                      const key = effectiveKey(r);
                      return (
                        <Badge variant="outline" className={statusClasses(key)}>
                          {STATUS_LABEL[key] ?? r.status}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-end gap-1 flex-nowrap">
                    <Button size="icon" variant="ghost" title="Detalhes" onClick={() => onOpen(r)} className="shrink-0 h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {r.status !== "paid" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0"
                          title="Marcar como recebido"
                          onClick={() => onPay(r)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Receber
                        </Button>
                        <ShareInvoiceMenu invoice={r} />
                      </>
                    )}
                    {r.status === "paid" && (
                      <ShareInvoiceMenu invoice={r} />
                    )}
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => onDelete(r.id)} className="shrink-0 h-8 w-8">
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
  );
}
