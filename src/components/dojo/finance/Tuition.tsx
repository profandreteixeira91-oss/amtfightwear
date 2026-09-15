import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { markDojoInvoicePaid, deleteDojoInvoice } from "@/lib/dojo/dojo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Search, Info, CalendarIcon, CheckCircle2, CalendarClock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listDojoPlans } from "@/lib/dojo/dojo.functions";
import { useInvoices, type InvoiceRow } from "./shared";
import { TuitionByStudent, type TuitionInvoice } from "./TuitionList";
import { PrepayDialog } from "./PrepayDialog";

const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceTuition() {
  const [q, setQ] = useState("");
  const [payTarget, setPayTarget] = useState<TuitionInvoice | null>(null);
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [paying, setPaying] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const invs = useInvoices("all");
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

  const openPay = (id: string) => {
    const row = rows.find((r) => r.id === id) ?? null;
    if (!row) return;
    setPayTarget(row);
    setPayDate(new Date());
    setPayMethod(row.method || "cash");
  };
  const confirmPay = async () => {
    if (!payTarget) return;
    setPaying(true);
    try {
      const d = new Date(payDate);
      d.setHours(12, 0, 0, 0);
      await payFn({ data: { id: payTarget.id, method: payMethod, paid_at: d.toISOString() } });
      toast.success("Mensalidade recebida");
      setPayTarget(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta mensalidade?")) return;
    try { await delFn({ data: { id } }); toast.success("Excluída"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 border border-[color:var(--dojo-border)]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            As mensalidades são geradas automaticamente conforme a periodicidade do plano. Aqui você apenas confirma o
            recebimento.
          </span>
        </div>
      </Card>



      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Buscar aluno…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
      </div>

      {invs.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <TuitionByStudent invoices={filtered} onMarkPaid={openPay} onDelete={handleDelete} />
      )}

      <Dialog open={!!payTarget} onOpenChange={(v) => { if (!v && !paying) setPayTarget(null); }}>
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
