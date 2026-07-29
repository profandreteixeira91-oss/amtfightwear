import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { brl, brDate, daysBetween, isoDate, type InvoiceRow, type ExpenseRow } from "./shared";
import { Calendar, CreditCard, FileText, Clock, Tag, User, Paperclip, History } from "lucide-react";

export type EntryKind = "invoice" | "expense";

export function EntryDrawer({
  open,
  onOpenChange,
  entry,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: InvoiceRow | ExpenseRow | null;
  kind: EntryKind;
}) {
  if (!entry) return null;
  const isInvoice = kind === "invoice";
  const inv = entry as InvoiceRow;
  const exp = entry as ExpenseRow;

  const status = entry.status;
  const overdueDays =
    status !== "paid" && status !== "cancelled" ? Math.max(0, daysBetween(entry.due_date, isoDate())) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">
            {isInvoice ? inv.student?.full_name ?? "Lançamento" : exp.description}
          </SheetTitle>
          <SheetDescription>
            {isInvoice ? inv.description ?? "Cobrança" : exp.category ?? "Despesa"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[color:var(--dojo-border)] p-4 bg-[color:var(--dojo-surface-2)]">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Valor</div>
            <div className="font-display text-2xl font-bold">{brl(entry.amount)}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "overdue" || overdueDays > 0
                    ? "bg-red-50 text-red-700 border-red-200"
                    : status === "cancelled"
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }
              >
                {status === "paid"
                  ? "Pago"
                  : status === "cancelled"
                  ? "Cancelado"
                  : overdueDays > 0
                  ? `Atrasado ${overdueDays}d`
                  : "Pendente"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <Row icon={Calendar} label="Vencimento" value={brDate(entry.due_date)} />
            {entry.paid_at && <Row icon={Clock} label="Recebido/Pago em" value={new Date(entry.paid_at).toLocaleString("pt-BR")} />}
            {isInvoice && inv.method && <Row icon={CreditCard} label="Forma" value={inv.method} />}
            {!isInvoice && exp.category && <Row icon={Tag} label="Categoria" value={exp.category} />}
            {isInvoice && inv.student?.full_name && <Row icon={User} label="Aluno" value={inv.student.full_name} />}
          </div>

          <Separator />

          <Section title="Histórico" icon={History}>
            <TimelineItem label="Lançamento criado" date={entry.due_date} />
            {entry.paid_at && <TimelineItem label={isInvoice ? "Pagamento registrado" : "Despesa paga"} date={entry.paid_at} tone="ok" />}
            {overdueDays > 0 && <TimelineItem label={`${overdueDays} dias em atraso`} date={isoDate()} tone="warn" />}
          </Section>

          <Section title="Anexos" icon={Paperclip}>
            <p className="text-xs text-muted-foreground">Nenhum anexo. Estrutura preparada para upload em breve.</p>
          </Section>

          <Section title="Observações" icon={FileText}>
            <p className="text-xs text-muted-foreground italic">
              {isInvoice ? inv.description ?? "—" : exp.description ?? "—"}
            </p>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground w-32">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  );
}

function TimelineItem({ label, date, tone = "default" }: { label: string; date: string; tone?: "default" | "ok" | "warn" }) {
  const dotClass = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-muted-foreground";
  return (
    <div className="flex items-start gap-2 py-1">
      <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{date.length <= 10 ? brDate(date) : new Date(date).toLocaleString("pt-BR")}</div>
      </div>
    </div>
  );
}
