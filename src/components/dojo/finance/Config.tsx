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
export function FinanceReports() {
  const k = useFinanceKpis();

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = (kind: "invoices" | "expenses") => {
    const rows = kind === "invoices" ? k.invoices : k.expenses;
    const header = kind === "invoices"
      ? "aluno,descricao,valor,vencimento,status,pagamento"
      : "descricao,categoria,valor,vencimento,status,pagamento";
    const lines = rows.map((r: any) =>
      kind === "invoices"
        ? [r.student?.full_name ?? "", r.description ?? "", r.amount, r.due_date, r.status, r.paid_at ?? ""].join(",")
        : [r.description, r.category ?? "", r.amount, r.due_date, r.status, r.paid_at ?? ""].join(","),
    );
    download(`${kind}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines].join("\n"), "text/csv");
    toast.success("Relatório exportado");
  };

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

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-sm">Exportar dados</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportCsv("invoices")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Cobranças (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCsv("expenses")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Despesas (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {reports.map((r) => (
          <Card key={r.id} className="p-4 border border-[color:var(--dojo-border)] hover:border-[color:var(--dojo-border-strong)] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">{r.name}</h4>
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => exportCsv("invoices")}>
              Gerar relatório
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-[color:var(--dojo-border)]">
        <h3 className="font-display font-bold text-sm mb-3">Resumo executivo</h3>
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
            {["PIX", "Cartão", "Boleto", "Asaas", "Mercado Pago", "PagSeguro", "Stripe", "Outra API"].map((g) => (
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
