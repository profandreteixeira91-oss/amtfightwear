import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, X, Download, FileSpreadsheet, FileText, Upload, Sparkles, Building2, Tag } from "lucide-react";
import { brl, useFinanceKpis, useFinanceSettings } from "./shared";
import { openBrandedPrintDocument, escapeHtml } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";
import { brDate } from "@/lib/format";

function printFinanceReport(k: ReturnType<typeof useFinanceKpis>, branding: any) {
  const kpiCards = [
    ["Receitas do mês", brl(k.paidThisMonth)],
    ["Despesas do mês", brl(k.expensesThisMonth)],
    ["Lucro líquido", brl(k.netProfit)],
    ["MRR (30d)", brl(k.mrr)],
    ["A receber", brl(k.pendingReceivables)],
    ["A pagar", brl(k.pendingPayables)],
    ["Ticket médio", brl(k.avgTicket)],
    ["Inadimplência", `${k.overdueRate.toFixed(1)}%`],
  ]
    .map(([l, v]) => `<div class="kpi"><div class="label">${escapeHtml(l)}</div><div class="value">${escapeHtml(v)}</div></div>`)
    .join("");

  const monthsRows = k.months
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.label)}</td><td class="num">${escapeHtml(brl(m.receitas))}</td><td class="num">${escapeHtml(brl(m.despesas))}</td><td class="num" style="font-weight:700;color:${m.saldo >= 0 ? "#166534" : "#991b1b"}">${escapeHtml(brl(m.saldo))}</td></tr>`,
    )
    .join("");

  const methodsRows = k.paymentMethods.length
    ? k.paymentMethods
        .map(
          (p) =>
            `<tr><td>${escapeHtml(p.name)}</td><td class="num">${escapeHtml(brl(p.value))}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="color:#94a3b8;text-align:center">Sem pagamentos registrados</td></tr>`;

  openBrandedPrintDocument({
    branding,
    title: "Resumo Financeiro",
    subtitle: `Relatório executivo · ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
    sections: [
      { title: "Indicadores do mês", html: `<div class="kpi-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${kpiCards}</div>` },
      {
        title: "Evolução últimos 12 meses",
        html: `<table class="data"><thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th></tr></thead><tbody>${monthsRows}</tbody></table>`,
      },
      {
        title: "Formas de pagamento recebidas",
        html: `<table class="data"><thead><tr><th>Método</th><th class="num">Total</th></tr></thead><tbody>${methodsRows}</tbody></table>`,
      },
    ],
    footerLeft: "Relatório financeiro · uso interno",
    footerRight: "AMT Dojo Manager",
  });
}


// ============ Categorias + Centros de Custo ============
export function FinanceCategories() {
  const { settings, save } = useFinanceSettings();
  const [newCat, setNewCat] = useState("");
  const [newCc, setNewCc] = useState("");

  const addCat = () => {
    if (!newCat.trim()) return;
    save({ ...settings, categories: [...new Set([...settings.categories, newCat.trim()])] });
    setNewCat("");
  };
  const removeCat = (c: string) => save({ ...settings, categories: settings.categories.filter((x) => x !== c) });
  const addCc = () => {
    if (!newCc.trim()) return;
    save({ ...settings, costCenters: [...new Set([...settings.costCenters, newCc.trim()])] });
    setNewCc("");
  };
  const removeCc = (c: string) => save({ ...settings, costCenters: settings.costCenters.filter((x) => x !== c) });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-sm">Categorias financeiras</h3>
        </div>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Nova categoria…" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-9" />
          <Button onClick={addCat} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.categories.map((c) => (
            <Badge key={c} variant="outline" className="pl-2 pr-1 py-1 gap-1">
              {c}
              <button onClick={() => removeCat(c)} className="ml-1 rounded hover:bg-destructive/10 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-sm">Centros de custo</h3>
        </div>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Novo centro…" value={newCc} onChange={(e) => setNewCc(e.target.value)} className="h-9" />
          <Button onClick={addCc} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.costCenters.map((c) => (
            <Badge key={c} variant="outline" className="pl-2 pr-1 py-1 gap-1">
              {c}
              <button onClick={() => removeCc(c)} className="ml-1 rounded hover:bg-destructive/10 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ Relatórios ============
type ReportDataset = {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; num?: boolean; money?: boolean }[];
  rows: Record<string, any>[];
  summary?: { label: string; value: string }[];
};

function buildReport(id: string, k: ReturnType<typeof useFinanceKpis>): ReportDataset {
  const today = new Date();
  const inv = k.invoices as any[];
  const exp = k.expenses as any[];
  const fmtDate = (d: any) => (d ? brDate(d) : "");
  const statusLabel = (s: string) =>
    ({ paid: "Paga", pending: "Pendente", overdue: "Atrasada", cancelled: "Cancelada" } as any)[s] ?? s;

  switch (id) {
    case "receitas": {
      const rows = inv
        .filter((r) => r.status === "paid")
        .map((r) => ({
          aluno: r.student?.full_name ?? "",
          descricao: r.description ?? "",
          valor: Number(r.amount || 0),
          vencimento: fmtDate(r.due_date),
          pagamento: fmtDate(r.paid_at),
          metodo: r.payment_method ?? "",
        }));
      return {
        title: "Relatório de Receitas",
        subtitle: "Cobranças recebidas",
        columns: [
          { key: "aluno", label: "Aluno" },
          { key: "descricao", label: "Descrição" },
          { key: "valor", label: "Valor", num: true, money: true },
          { key: "vencimento", label: "Vencimento" },
          { key: "pagamento", label: "Pagamento" },
          { key: "metodo", label: "Método" },
        ],
        rows,
        summary: [
          { label: "Total recebido", value: brl(rows.reduce((s, r) => s + r.valor, 0)) },
          { label: "Nº de cobranças", value: String(rows.length) },
        ],
      };
    }
    case "despesas": {
      const rows = exp.map((r) => ({
        descricao: r.description,
        categoria: r.category ?? "",
        valor: Number(r.amount || 0),
        vencimento: fmtDate(r.due_date),
        status: statusLabel(r.status),
        pagamento: fmtDate(r.paid_at),
      }));
      return {
        title: "Relatório de Despesas",
        subtitle: "Saídas por categoria",
        columns: [
          { key: "descricao", label: "Descrição" },
          { key: "categoria", label: "Categoria" },
          { key: "valor", label: "Valor", num: true, money: true },
          { key: "vencimento", label: "Vencimento" },
          { key: "pagamento", label: "Pagamento" },
          { key: "status", label: "Status" },
        ],
        rows,
        summary: [
          { label: "Total pago", value: brl(rows.filter((r) => r.status === "Paga").reduce((s, r) => s + r.valor, 0)) },
          { label: "Total pendente", value: brl(rows.filter((r) => r.status !== "Paga" && r.status !== "Cancelada").reduce((s, r) => s + r.valor, 0)) },
        ],
      };
    }
    case "fluxo": {
      const rows = k.months.map((m) => ({
        mes: m.label,
        receitas: m.receitas,
        despesas: m.despesas,
        saldo: m.saldo,
      }));
      return {
        title: "Fluxo de Caixa",
        subtitle: "Entradas × saídas nos últimos 12 meses",
        columns: [
          { key: "mes", label: "Mês" },
          { key: "receitas", label: "Receitas", num: true, money: true },
          { key: "despesas", label: "Despesas", num: true, money: true },
          { key: "saldo", label: "Saldo", num: true, money: true },
        ],
        rows,
      };
    }
    case "inadim": {
      const rows = inv
        .filter((r) => r.status !== "paid" && r.status !== "cancelled" && r.due_date && new Date(r.due_date) < today)
        .map((r) => {
          const diasAtraso = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000);
          return {
            aluno: r.student?.full_name ?? "",
            descricao: r.description ?? "",
            valor: Number(r.amount || 0),
            vencimento: fmtDate(r.due_date),
            dias_atraso: diasAtraso,
          };
        })
        .sort((a, b) => b.dias_atraso - a.dias_atraso);
      return {
        title: "Inadimplência",
        subtitle: "Alunos com cobranças em atraso",
        columns: [
          { key: "aluno", label: "Aluno" },
          { key: "descricao", label: "Descrição" },
          { key: "valor", label: "Valor", num: true, money: true },
          { key: "vencimento", label: "Vencimento" },
          { key: "dias_atraso", label: "Dias em atraso", num: true },
        ],
        rows,
        summary: [
          { label: "Total em atraso", value: brl(rows.reduce((s, r) => s + r.valor, 0)) },
          { label: "Cobranças atrasadas", value: String(rows.length) },
          { label: "Índice de inadimplência", value: `${k.overdueRate.toFixed(1)}%` },
        ],
      };
    }
    case "modalidade":
    case "professor":
    case "turma": {
      const keyMap: any = {
        modalidade: (r: any) => r.student?.anamnesis?.modality ?? r.plan?.name ?? "—",
        professor: (r: any) => r.class?.teacher?.full_name ?? r.teacher?.full_name ?? "—",
        turma: (r: any) => r.class?.name ?? r.enrollment?.class?.name ?? "—",
      };
      const label: any = { modalidade: "Modalidade", professor: "Professor", turma: "Turma" };
      const getKey = keyMap[id];
      const agg = new Map<string, { total: number; count: number }>();
      inv.filter((r) => r.status === "paid").forEach((r) => {
        const k2 = String(getKey(r));
        const cur = agg.get(k2) ?? { total: 0, count: 0 };
        cur.total += Number(r.amount || 0);
        cur.count += 1;
        agg.set(k2, cur);
      });
      const rows = Array.from(agg.entries())
        .map(([nome, v]) => ({ nome, cobrancas: v.count, total: v.total }))
        .sort((a, b) => b.total - a.total);
      return {
        title: `Receita por ${label[id]}`,
        subtitle: "Baseado em cobranças pagas",
        columns: [
          { key: "nome", label: label[id] },
          { key: "cobrancas", label: "Cobranças", num: true },
          { key: "total", label: "Total recebido", num: true, money: true },
        ],
        rows,
      };
    }
    case "cc": {
      const agg = new Map<string, number>();
      exp.forEach((r) => {
        const k2 = String((r as any).cost_center ?? r.category ?? "—");
        agg.set(k2, (agg.get(k2) ?? 0) + Number(r.amount || 0));
      });
      const rows = Array.from(agg.entries())
        .map(([centro, total]) => ({ centro, total }))
        .sort((a, b) => b.total - a.total);
      return {
        title: "Rateio por Centro de Custo",
        subtitle: "Distribuição de despesas",
        columns: [
          { key: "centro", label: "Centro de custo" },
          { key: "total", label: "Total", num: true, money: true },
        ],
        rows,
      };
    }
    default:
      return { title: "Relatório", columns: [], rows: [] };
  }
}

function downloadFile(name: string, content: string | Blob, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v: any) {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportReportCsv(ds: ReportDataset, fileName: string) {
  const header = ds.columns.map((c) => csvCell(c.label)).join(";");
  const lines = ds.rows.map((r) =>
    ds.columns
      .map((c) => {
        const v = r[c.key];
        if (c.money && typeof v === "number") return csvCell(v.toFixed(2).replace(".", ","));
        return csvCell(v);
      })
      .join(";"),
  );
  const bom = "\uFEFF"; // Excel/BRL friendly
  downloadFile(`${fileName}.csv`, bom + [header, ...lines].join("\n"), "text/csv;charset=utf-8");
}

function exportReportPdf(ds: ReportDataset, branding: any) {
  const summaryHtml = ds.summary?.length
    ? `<div class="kpi-grid" style="grid-template-columns:repeat(${Math.min(4, ds.summary.length)},minmax(0,1fr))">${ds.summary
        .map((s) => `<div class="kpi"><div class="label">${escapeHtml(s.label)}</div><div class="value">${escapeHtml(s.value)}</div></div>`)
        .join("")}</div>`
    : "";
  const thead = ds.columns
    .map((c) => `<th${c.num ? ' class="num"' : ""}>${escapeHtml(c.label)}</th>`)
    .join("");
  const tbody = ds.rows.length
    ? ds.rows
        .map(
          (r) =>
            `<tr>${ds.columns
              .map((c) => {
                const v = r[c.key];
                const disp = c.money && typeof v === "number" ? brl(v) : v == null ? "" : String(v);
                return `<td${c.num ? ' class="num"' : ""}>${escapeHtml(disp)}</td>`;
              })
              .join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${ds.columns.length}" style="text-align:center;color:#94a3b8;padding:12px">Sem registros no período.</td></tr>`;

  openBrandedPrintDocument({
    branding,
    title: ds.title,
    subtitle: ds.subtitle ?? new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    sections: [
      ...(summaryHtml ? [{ title: "Resumo", html: summaryHtml }] : []),
      {
        title: "Detalhamento",
        html: `<table class="data"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`,
      },
    ],
    footerLeft: "Relatório financeiro · uso interno",
    footerRight: "AMT Dojo Manager",
  });
}

export function FinanceReports() {
  const k = useFinanceKpis();
  const { data: branding } = useDojoBranding();

  const reports = [
    { id: "receitas", name: "Receitas", desc: "Cobranças recebidas por período" },
    { id: "despesas", name: "Despesas", desc: "Saídas por categoria" },
    { id: "fluxo", name: "Fluxo de caixa", desc: "Entradas × saídas consolidado" },
    { id: "inadim", name: "Inadimplência", desc: "Alunos com atraso" },
    { id: "modalidade", name: "Modalidade", desc: "Receita por modalidade" },
    { id: "professor", name: "Professor", desc: "Receita por professor" },
    { id: "turma", name: "Turma", desc: "Receita por turma" },
    { id: "cc", name: "Centro de custo", desc: "Rateio entre unidades" },
  ];

  const runReport = (id: string, format: "pdf" | "csv") => {
    const ds = buildReport(id, k);
    if (format === "csv") {
      const fname = `${id}-${new Date().toISOString().slice(0, 10)}`;
      exportReportCsv(ds, fname);
      toast.success("CSV exportado");
    } else {
      exportReportPdf(ds, branding);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-sm">Resumo executivo</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => printFinanceReport(k, branding)}>
            <FileText className="h-4 w-4 mr-1" /> PDF completo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ds: ReportDataset = {
                title: "Resumo executivo",
                columns: [
                  { key: "indicador", label: "Indicador" },
                  { key: "valor", label: "Valor" },
                ],
                rows: [
                  { indicador: "Receitas do mês", valor: brl(k.paidThisMonth) },
                  { indicador: "Despesas do mês", valor: brl(k.expensesThisMonth) },
                  { indicador: "Lucro líquido", valor: brl(k.netProfit) },
                  { indicador: "MRR (30d)", valor: brl(k.mrr) },
                  { indicador: "A receber", valor: brl(k.pendingReceivables) },
                  { indicador: "A pagar", valor: brl(k.pendingPayables) },
                  { indicador: "Ticket médio", valor: brl(k.avgTicket) },
                  { indicador: "Inadimplência", valor: `${k.overdueRate.toFixed(1)}%` },
                ],
              };
              exportReportCsv(ds, `resumo-executivo-${new Date().toISOString().slice(0, 10)}`);
              toast.success("CSV exportado");
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Resumo (CSV)
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {reports.map((r) => (
          <Card
            key={r.id}
            className="p-4 border border-[color:var(--dojo-border)] hover:border-[color:var(--dojo-border-strong)] transition-colors flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">{r.name}</h4>
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex-1">{r.desc}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-2"
                onClick={() => runReport(r.id, "pdf")}
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-2"
                onClick={() => runReport(r.id, "csv")}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <h3 className="font-display font-bold text-sm mb-3">Indicadores</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Kv label="Receitas mês" value={brl(k.paidThisMonth)} />
          <Kv label="Despesas mês" value={brl(k.expensesThisMonth)} />
          <Kv label="Lucro líquido" value={brl(k.netProfit)} />
          <Kv label="MRR (30d)" value={brl(k.mrr)} />
        </div>
      </Card>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--dojo-border)] p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-lg mt-1">{value}</div>
    </div>
  );
}

// ============ Conciliação ============
export function FinanceReconciliation() {
  return (
    <Card className="border border-[color:var(--dojo-border)] p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-lg bg-muted grid place-items-center mb-3">
        <Upload className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-display font-bold text-base mb-1">Conciliação bancária</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Estrutura preparada para importação de extratos <strong>OFX</strong> e <strong>CSV</strong>, com conciliação
        automática ou manual entre lançamentos e movimentações bancárias.
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Upload className="h-4 w-4 mr-1" /> Importar OFX
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Upload className="h-4 w-4 mr-1" /> Importar CSV
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-4">Disponível em breve.</p>
    </Card>
  );
}

// ============ Configurações ============
export function FinanceSettings() {
  const { settings, save } = useFinanceSettings();
  const [draft, setDraft] = useState(settings);

  const persist = () => {
    save(draft);
    toast.success("Configurações salvas");
  };

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Geral</TabsTrigger>
        <TabsTrigger value="charges">Cobranças</TabsTrigger>
        <TabsTrigger value="gateways">Gateways</TabsTrigger>
        <TabsTrigger value="permissions">Permissões</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-3">
        <Card className="p-4 border border-[color:var(--dojo-border)] grid gap-3 md:grid-cols-3">
          <Field label="Moeda">
            <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
          </Field>
          <Field label="Casas decimais">
            <Input type="number" min={0} max={4} value={draft.decimals} onChange={(e) => setDraft({ ...draft, decimals: Number(e.target.value) })} />
          </Field>
          <Field label="Dia padrão de vencimento">
            <Input type="number" min={1} max={28} value={draft.defaultDueDay} onChange={(e) => setDraft({ ...draft, defaultDueDay: Number(e.target.value) })} />
          </Field>
        </Card>
        <div className="flex justify-end">
          <Button onClick={persist}>Salvar alterações</Button>
        </div>
      </TabsContent>

      <TabsContent value="charges" className="space-y-3">
        <Card className="p-4 border border-[color:var(--dojo-border)] grid gap-3 md:grid-cols-3">
          <Field label="Multa (%)">
            <Input type="number" step="0.1" value={draft.latePenaltyPct} onChange={(e) => setDraft({ ...draft, latePenaltyPct: Number(e.target.value) })} />
          </Field>
          <Field label="Juros mensal (%)">
            <Input type="number" step="0.1" value={draft.monthlyInterestPct} onChange={(e) => setDraft({ ...draft, monthlyInterestPct: Number(e.target.value) })} />
          </Field>
          <Field label="Desconto pontualidade (%)">
            <Input type="number" step="0.1" value={draft.earlyDiscountPct} onChange={(e) => setDraft({ ...draft, earlyDiscountPct: Number(e.target.value) })} />
          </Field>
          <Field label="Lembrete antes do vencimento (dias)">
            <Input type="number" value={draft.reminderBeforeDays} onChange={(e) => setDraft({ ...draft, reminderBeforeDays: Number(e.target.value) })} />
          </Field>
          <Field label="Lembrete após vencimento (dias)">
            <Input type="number" value={draft.reminderAfterDays} onChange={(e) => setDraft({ ...draft, reminderAfterDays: Number(e.target.value) })} />
          </Field>
          <Field label="Bloquear certificados em inadimplência">
            <div className="flex items-center h-9">
              <Switch checked={draft.blockCertsWhenOverdue} onCheckedChange={(v) => setDraft({ ...draft, blockCertsWhenOverdue: v })} />
              <span className="ml-2 text-xs text-muted-foreground">{draft.blockCertsWhenOverdue ? "Ativo" : "Inativo"}</span>
            </div>
          </Field>
        </Card>
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
            Mensagem padrão de cobrança
          </Label>
          <Textarea rows={3} value={draft.chargeMessage} onChange={(e) => setDraft({ ...draft, chargeMessage: e.target.value })} />
          <p className="text-[11px] text-muted-foreground mt-2">
            Variáveis: <code>{"{{aluno}}"}</code>, <code>{"{{valor}}"}</code>, <code>{"{{vencimento}}"}</code>.
          </p>
        </Card>
        <div className="flex justify-end">
          <Button onClick={persist}>Salvar alterações</Button>
        </div>
      </TabsContent>

      <TabsContent value="gateways">
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <h3 className="font-display font-bold text-sm mb-3">Integrações de pagamento</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Arquitetura modular preparada. Ative apenas os gateways que sua academia utiliza.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {["PIX", "Cartão", "Boleto", "AMT Pay", "Mercado Pago", "PagSeguro", "Stripe", "Outra API"].map((g) => (
              <div key={g} className="flex items-center justify-between rounded-lg border border-[color:var(--dojo-border)] p-3">
                <span className="text-sm font-medium">{g}</span>
                <Badge variant="outline" className="text-[10px]">Preparado</Badge>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="permissions">
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <h3 className="font-display font-bold text-sm mb-3">Permissões financeiras</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              "Visualizar financeiro",
              "Cadastrar lançamentos",
              "Editar lançamentos",
              "Excluir lançamentos",
              "Receber cobranças",
              "Cancelar cobranças",
              "Exportar dados",
              "Emitir relatórios",
              "Gerenciar configurações",
            ].map((p) => (
              <div key={p} className="flex items-center justify-between rounded-lg border border-[color:var(--dojo-border)] p-3">
                <span className="text-sm">{p}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
