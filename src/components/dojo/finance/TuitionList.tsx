import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, ExternalLink, Copy, QrCode, Trash2, ChevronDown, ChevronUp,
  Zap, Wallet, Calendar, CreditCard, Link2,
} from "lucide-react";

const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Datas "YYYY-MM-DD" precisam ser lidas literalmente: `new Date("2026-08-05")`
// é UTC e, no fuso do Brasil (UTC-3), exibiria 04/08 (um dia antes).
const fmtDate = (v?: string | null) => brDate(v);
const isoDate = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};


export type TuitionInvoice = {
  id: string;
  student_id?: string | null;
  student?: { full_name?: string | null } | null;
  description?: string | null;
  amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string;
  paid_at?: string | null;
  method?: string | null;
  asaas_charge_id?: string | null;
  asaas_subscription_id?: string | null;
  asaas_invoice_url?: string | null;
  asaas_pix_copypaste?: string | null;
  payment_link?: string | null;
  payment_provider?: string | null;
  provider?: string | null;
};

const DUE_SOON_DAYS = 5;

function effectiveStatus(i: TuitionInvoice) {
  if (i.status === "paid" || i.status === "cancelled") return i.status;
  const today = new Date(isoDate());
  const due = new Date(i.due_date);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_DAYS) return "due_soon";
  return "pending";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    overdue: { label: "Vencida", cls: "bg-red-100 text-red-800 border-red-200" },
    due_soon: { label: "Próxima ao vencimento", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    pending: { label: "A vencer", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-transparent" },
  };
  const cfg = map[status] ?? map.pending;
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
}

function copy(text: string, label = "Copiado") {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

/**
 * Linha compacta de mensalidade com dados Asaas integrados.
 * showStudent: exibe o nome do aluno (usado no financeiro).
 */
export function TuitionRow({
  inv, showStudent, onMarkPaid, onDelete,
}: {
  inv: TuitionInvoice;
  showStudent?: boolean;
  onMarkPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const st = effectiveStatus(inv);
  const provider = inv.payment_provider || inv.provider;
  const isAsaas = !!(inv.asaas_charge_id || inv.asaas_subscription_id) || provider === "asaas";
  const link = inv.asaas_invoice_url || inv.payment_link;
  const hasDetails = !!(link || inv.asaas_pix_copypaste || inv.asaas_subscription_id || inv.method);

  return (
    <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {showStudent && (
              <div className="text-sm font-semibold truncate">
                {inv.student?.full_name ?? "Sem aluno"}
              </div>
            )}
            <StatusBadge status={st} />
            {isAsaas && (
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 gap-1">
                {inv.asaas_subscription_id ? "Assinatura Asaas" : "Asaas"}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{inv.description || "Mensalidade"}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Vence {fmtDate(inv.due_date)}</span>
            {inv.paid_at && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Pago {fmtDate(inv.paid_at)}</span>}
          </div>
        </div>

        <div className="text-right">
          <div className="font-semibold tabular-nums">{brl(inv.amount)}</div>
          {inv.method && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{inv.method}</div>}
        </div>

        <div className="flex items-center gap-1">
          {link && (
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Fatura</a>
            </Button>
          )}
          {inv.asaas_pix_copypaste && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => copy(inv.asaas_pix_copypaste!, "PIX copiado")}>
              <QrCode className="h-3.5 w-3.5 mr-1" /> PIX
            </Button>
          )}
          {st !== "paid" && onMarkPaid && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onMarkPaid(inv.id)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Receber
            </Button>
          )}
          {hasDetails && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen((v) => !v)} aria-label="Detalhes">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {onDelete && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(inv.id)} aria-label="Excluir">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {open && hasDetails && (
        <div className="border-t border-[color:var(--dojo-border)] bg-slate-50/60 px-3 py-2 text-xs">
          <div className="grid gap-2 sm:grid-cols-2">
            {inv.asaas_charge_id && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Cobrança AMT Pay:</span>
                <code className="rounded bg-white px-1.5 py-0.5 text-[11px] font-mono truncate">{inv.asaas_charge_id}</code>
                <button className="text-primary hover:underline" onClick={() => copy(inv.asaas_charge_id!, "ID copiado")}><Copy className="h-3 w-3" /></button>
              </div>
            )}
            {inv.asaas_subscription_id && (
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Assinatura:</span>
                <code className="rounded bg-white px-1.5 py-0.5 text-[11px] font-mono truncate">{inv.asaas_subscription_id}</code>
                <button className="text-primary hover:underline" onClick={() => copy(inv.asaas_subscription_id!, "ID copiado")}><Copy className="h-3 w-3" /></button>
              </div>
            )}
            {link && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{link}</a>
                <button className="text-primary hover:underline" onClick={() => copy(link!, "Link copiado")}><Copy className="h-3 w-3" /></button>
              </div>
            )}
            {inv.asaas_pix_copypaste && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <QrCode className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground">PIX copia e cola:</div>
                  <code className="mt-0.5 block break-all rounded bg-white px-1.5 py-1 text-[10px] font-mono">{inv.asaas_pix_copypaste}</code>
                </div>
                <button className="shrink-0 text-primary hover:underline" onClick={() => copy(inv.asaas_pix_copypaste!, "PIX copiado")}><Copy className="h-3 w-3" /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Agrupa mensalidades por aluno para o Financeiro.
 * Mostra sempre a próxima em aberto + expansão para o histórico.
 */
export function TuitionByStudent({
  invoices, onMarkPaid, onDelete,
}: {
  invoices: TuitionInvoice[];
  onMarkPaid: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rows: TuitionInvoice[] }>();
    for (const r of invoices) {
      const key = r.student_id ?? "sem-aluno";
      if (!map.has(key)) map.set(key, { name: r.student?.full_name ?? "Sem aluno vinculado", rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.entries()).map(([id, v]) => {
      const sorted = v.rows.slice().sort((a, b) => (a.due_date < b.due_date ? 1 : -1));
      const next = sorted.filter((r) => r.status !== "paid" && r.status !== "cancelled").sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0] ?? null;
      const totalPaid = v.rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
      return { id, name: v.name, rows: sorted, next, count: v.rows.length, totalPaid };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  if (groups.length === 0) {
    return (
      <Card className="border border-[color:var(--dojo-border)] p-8 text-center">
        <Wallet className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma mensalidade encontrada.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isOpen = expanded.has(g.id);
        const primary = g.next ?? g.rows[0];
        return (
          <div key={g.id}>
            <div className="mb-1 flex items-center justify-between px-1">
              <div>
                <div className="font-semibold text-sm">{g.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {g.count} lançamento(s) · Recebido {brl(g.totalPaid)}
                </div>
              </div>
              {g.rows.length > 1 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggle(g.id)}>
                  {isOpen ? "Ocultar" : `Ver histórico (${g.rows.length - 1})`}
                </Button>
              )}
            </div>
            {primary && (
              <TuitionRow inv={primary} onMarkPaid={onMarkPaid} onDelete={onDelete} />
            )}
            {isOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {g.rows.filter((r) => r.id !== primary?.id).map((r) => (
                  <TuitionRow key={r.id} inv={r} onMarkPaid={onMarkPaid} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
