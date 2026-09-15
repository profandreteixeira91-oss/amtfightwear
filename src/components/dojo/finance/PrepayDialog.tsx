import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listDojoStudents, markDojoInvoicePaid } from "@/lib/dojo/dojo.functions";
import { getStudentPrepayContext, createPrepaidInvoice } from "@/lib/dojo/prepay.functions";
import { brDate } from "@/lib/dates";

const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthLabel = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

const METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência bancária" },
  { value: "payment_link", label: "Link de pagamento" },
  { value: "other", label: "Outro" },
];

export function PrepayDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const studentsFn = useServerFn(listDojoStudents);
  const contextFn = useServerFn(getStudentPrepayContext);
  const createFn = useServerFn(createPrepaidInvoice);
  const payFn = useServerFn(markDojoInvoicePaid);

  const [studentId, setStudentId] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [method, setMethod] = useState<string>("cash");
  const [saving, setSaving] = useState(false);

  const students = useQuery({
    queryKey: ["dojo-students", "prepay"],
    queryFn: () => studentsFn(),
    enabled: open,
  });

  const ctx = useQuery({
    queryKey: ["dojo-prepay-context", studentId],
    queryFn: () => contextFn({ data: { studentId } }),
    enabled: open && !!studentId,
  });

  const months = useMemo(
    () => (ctx.data?.months ?? []).filter((m) => m.status !== "paid"),
    [ctx.data],
  );
  const selected = months.find((m) => m.month === month) ?? null;

  const reset = () => {
    setStudentId("");
    setMonth("");
    setMethod("cash");
  };

  const confirm = async () => {
    if (!studentId || !selected || !ctx.data) return;
    setSaving(true);
    try {
      if (selected.invoiceId) {
        await payFn({
          data: { id: selected.invoiceId, method, paid_at: new Date().toISOString() },
        });
      } else {
        await createFn({
          data: {
            studentId,
            enrollmentId: ctx.data.enrollmentId,
            dueDate: selected.dueDate,
            amount: selected.amount,
            description: `Mensalidade ${monthLabel(selected.month)} (antecipada)`,
            method,
          },
        });
      }
      toast.success("Mensalidade antecipada e marcada como paga");
      reset();
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error("Falha ao antecipar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (saving) return;
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Antecipar mensalidade
          </DialogTitle>
          <DialogDescription>
            Escolha o aluno e o mês. A mensalidade é marcada como paga e, se ainda não existir,
            é gerada já quitada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Aluno</Label>
            <Select
              value={studentId}
              onValueChange={(v) => {
                setStudentId(v);
                setMonth("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={students.isLoading ? "Carregando…" : "Selecione o aluno"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(students.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {studentId && ctx.isLoading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando plano do aluno…
            </p>
          )}

          {studentId && ctx.data && !ctx.data.allowPrepay && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
              {ctx.data.reason ?? "Antecipação indisponível para este aluno."}
            </p>
          )}

          {studentId && ctx.data?.allowPrepay && (
            <div className="space-y-1.5">
              <Label>Mês a antecipar</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {months.map((m) => (
                    <SelectItem key={m.month} value={m.month}>
                      {monthLabel(m.month)} · {brl(m.amount)}
                      {m.invoiceId ? " · já gerada" : " · será gerada"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && (
                <p className="text-[11px] text-muted-foreground">
                  Vencimento original: {brDate(selected.dueDate)}
                  {ctx.data.planName ? ` · Plano: ${ctx.data.planName}` : ""}
                </p>
              )}
            </div>
          )}

          {studentId && ctx.data?.allowPrepay && (
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={saving || !selected || !ctx.data?.allowPrepay}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {saving ? "Antecipando…" : "Antecipar e marcar como paga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
