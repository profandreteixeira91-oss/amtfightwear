import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getAffiliate,
  saveAffiliate,
  listAffiliateInvoices,
  createAffiliateInvoice,
  listAffiliateContracts,
  saveAffiliateContract,
  deleteAffiliateContract,
} from "@/lib/dojo/affiliates.functions";
import { listCertificateTemplates } from "@/lib/dojo/dojo.functions";
import { getMyAcademyBranding } from "@/lib/dojo/academy-public.functions";
import {
  AFFILIATE_CONTRACT_PRESET_HTML,
  buildAffiliateContractVariables,
  renderAffiliateContract,
} from "@/lib/dojo/affiliate-contract-preset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/dojo/RichTextEditor";
import { openBrandedPrintDocument } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, FileText, DollarSign, Award, Plus, Printer, Save, Trash2, FileBadge,
  Pencil, Eye, X, CheckCircle2,
} from "lucide-react";
} from "lucide-react";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";

export const Route = createFileRoute("/dojo/app/units/affiliates/$id")({
  head: () => ({ meta: [{ title: "Filial — AMT Dojo Manager" }] }),
  component: AffiliateDetailPage,
});

const STATUS_LABEL: Record<string, string> = {
  em_analise: "Em análise", ativo: "Ativo", suspenso: "Suspenso", cancelado: "Cancelado",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  em_analise: "secondary", ativo: "default", suspenso: "outline", cancelado: "destructive",
};

function AffiliateDetailPage() {
  const { id } = useParams({ from: "/dojo/app/units/affiliates/$id" });
  const fetchFn = useServerFn(getAffiliate);
  const q = useQuery({ queryKey: ["affiliate", id], queryFn: () => fetchFn({ data: { id } }) });
  const a = q.data;

  if (q.isLoading) return <DojoPageShell><div className="p-8 text-center">Carregando…</div></DojoPageShell>;
  if (!a) return <DojoPageShell><div className="p-8 text-center text-muted-foreground">Filial não encontrada.</div></DojoPageShell>;

  return (
    <DojoPageShell
      description={a.affiliation_number}
      actions={
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/dojo/app/units">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-4">
        {a.logo_url ? (
          <img src={a.logo_url} alt={a.academy_name} className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-primary/10 grid place-items-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold truncate">{a.trade_name || a.academy_name}</h2>
          <div className="text-sm text-muted-foreground">
            {a.city && `${a.city} / `}{a.state} · <span className="font-mono">{a.affiliation_number}</span>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[a.status] ?? "outline"} className="text-sm">
          {STATUS_LABEL[a.status] ?? a.status}
        </Badge>
      </div>

      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dados</TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Contrato</TabsTrigger>
          <TabsTrigger value="certificate" className="gap-1.5"><Award className="h-3.5 w-3.5" /> Certificado</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4"><DataTab a={a} /></TabsContent>
        <TabsContent value="finance" className="mt-4"><FinanceTab affiliate={a} /></TabsContent>
        <TabsContent value="contract" className="mt-4"><ContractTab affiliate={a} /></TabsContent>
        <TabsContent value="certificate" className="mt-4"><CertificateTab affiliate={a} /></TabsContent>
      </Tabs>
    </DojoPageShell>
  );
}

function DataTab({ a }: { a: any }) {
  const address = [a.street, a.number, a.neighborhood].filter(Boolean).join(", ");
  const t = a.teacher ?? {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Academia">
        <Info label="Razão social" value={a.legal_name} />
        <Info label="CNPJ" value={a.cnpj} />
        <Info label="Nº filiação" value={a.affiliation_number} mono />
        <Info label="Data filiação" value={a.joined_at ? new Date(a.joined_at).toLocaleDateString("pt-BR") : null} />
      </Card>
      <Card title="Responsável">
        <Info label="Nome" value={a.manager_name} />
        <Info label="CPF" value={a.manager_cpf} />
        <Info label="E-mail" value={a.manager_email} />
        <Info label="Telefone" value={a.manager_phone} />
      </Card>
      <Card title="Endereço">
        <Info label="Logradouro" value={address} />
        <Info label="Bairro" value={a.neighborhood} />
        <Info label="Cidade / UF" value={[a.city, a.state].filter(Boolean).join(" / ")} />
        <Info label="CEP" value={a.zip} />
      </Card>
      <Card title="Contato">
        <Info label="Telefone" value={a.phone} />
        <Info label="WhatsApp" value={a.whatsapp} />
        <Info label="E-mail" value={a.email} />
        <Info label="Site" value={a.website} />
      </Card>
      <Card title="Professor responsável">
        <Info label="Nome" value={t.name} />
        <Info label="Modalidade" value={t.modality} />
        <Info label="Faixa" value={t.belt} />
        <Info label="Grau / Dan" value={t.degree} />
      </Card>
      {a.notes && (
        <Card title="Anotações"><div className="text-sm whitespace-pre-wrap">{a.notes}</div></Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}

/* ============ FINANCE ============ */
function FinanceTab({ affiliate }: { affiliate: any }) {
  const listFn = useServerFn(listAffiliateInvoices);
  const createFn = useServerFn(createAffiliateInvoice);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["affiliate-invoices", affiliate.id],
    queryFn: () => listFn({ data: { affiliate_id: affiliate.id } }),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "", amount: 0, due_date: "", kind: "monthly" as "monthly" | "annual" | "single",
  });

  const onCreate = async () => {
    try {
      if (!form.description || !form.due_date || form.amount <= 0) {
        toast.error("Preencha descrição, valor e vencimento");
        return;
      }
      await createFn({ data: { affiliate_id: affiliate.id, ...form } });
      toast.success("Cobrança gerada");
      setOpen(false);
      setForm({ description: "", amount: 0, due_date: "", kind: "monthly" });
      qc.invalidateQueries({ queryKey: ["affiliate-invoices", affiliate.id] });
    } catch (e: any) { toast.error(e.message); }
  };

  const totals = useMemo(() => {
    const rows = q.data ?? [];
    const paid = rows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const pending = rows.filter((r: any) => r.status !== "paid").reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    return { paid, pending, count: rows.length };
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <KPI label="Recebido" value={brl(totals.paid)} tone="ok" />
        <KPI label="A receber" value={brl(totals.pending)} tone="warn" />
        <KPI label="Cobranças" value={String(totals.count)} />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          As cobranças aparecem automaticamente no módulo Financeiro (Origem: Filiação).
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova cobrança</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cobrança de filiação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensalidade</SelectItem>
                    <SelectItem value="annual">Anuidade</SelectItem>
                    <SelectItem value="single">Avulsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Mensalidade Novembro/2026" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vencimento</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={onCreate}>Gerar cobrança</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Descrição</th>
              <th className="text-left px-3 py-2">Vencimento</th>
              <th className="text-right px-3 py-2">Valor</th>
              <th className="text-right px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.description}</td>
                <td className="px-3 py-2">{r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-3 py-2 text-right font-medium">{brl(Number(r.amount ?? 0))}</td>
                <td className="px-3 py-2 text-right">
                  <Badge variant={r.status === "paid" ? "default" : r.status === "overdue" ? "destructive" : "outline"}>
                    {r.status === "paid" ? "Pago" : r.status === "overdue" ? "Atrasado" : "Pendente"}
                  </Badge>
                </td>
              </tr>
            ))}
            {(q.data ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Nenhuma cobrança gerada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const cls = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ============ CONTRACT ============ */
function ContractTab({ affiliate }: { affiliate: any }) {
  const listFn = useServerFn(listAffiliateContracts);
  const saveFn = useServerFn(saveAffiliateContract);
  const delFn = useServerFn(deleteAffiliateContract);
  const brandFn = useServerFn(getMyAcademyBranding);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["affiliate-contracts", affiliate.id],
    queryFn: () => listFn({ data: { affiliate_id: affiliate.id } }),
  });
  const bq = useQuery({ queryKey: ["dojo-branding-me"], queryFn: () => brandFn(), staleTime: 5 * 60 * 1000 });
  const [editing, setEditing] = useState<any | null>(null);

  const startNew = () => {
    setEditing({
      affiliate_id: affiliate.id,
      title: "Contrato de Filiação",
      html_content: AFFILIATE_CONTRACT_PRESET_HTML,
      signature_status: "draft",
    });
  };

  const onSave = async () => {
    try {
      await saveFn({
        data: {
          id: editing.id,
          affiliate_id: affiliate.id,
          title: editing.title || "Contrato de Filiação",
          html_content: editing.html_content,
          signature_status: editing.signature_status ?? "draft",
        },
      });
      toast.success("Contrato salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["affiliate-contracts", affiliate.id] });
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["affiliate-contracts", affiliate.id] });
  };

  const printContract = (c: any) => {
    const vars = buildAffiliateContractVariables({
      organization_name: bq.data?.trade_name || bq.data?.legal_name || "",
      organization_cnpj: (bq.data as any)?.cnpj || "",
      affiliate,
    });
    const html = renderAffiliateContract(c.html_content, vars);
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${c.title}</title>
      <meta charset="utf-8"/>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Inter', system-ui, sans-serif; color: #111; line-height: 1.6; max-width: 780px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-top: 16px; }
        p { margin: 8px 0; font-size: 12px; text-align: justify; }
      </style>
    </head><body>${html}<script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            className="max-w-sm font-semibold"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={onSave} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <Label className="text-xs mb-2 block">
            Conteúdo HTML — variáveis suportadas: {"{{organization_name}}"}, {"{{affiliate_name}}"}, {"{{cnpj}}"}, {"{{address}}"}, {"{{city}}"}, {"{{state}}"}, {"{{manager_name}}"}, {"{{cpf}}"}, {"{{affiliation_number}}"}, {"{{signed_at}}"}
          </Label>
          <Textarea
            value={editing.html_content}
            onChange={(e) => setEditing({ ...editing, html_content: e.target.value })}
            rows={22}
            className="font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Contratos de filiação com modelo base pronto. Personalize e imprima em A4.
        </p>
        <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Novo contrato</Button>
      </div>
      <div className="rounded-xl border bg-white overflow-hidden">
        {(q.data ?? []).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between p-3 border-b last:border-0">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString("pt-BR")} · {c.signature_status}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => printContract(c)} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum contrato gerado. Clique em "Novo contrato" para começar com o modelo base.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ CERTIFICATE ============ */
function CertificateTab({ affiliate }: { affiliate: any }) {
  const listFn = useServerFn(listCertificateTemplates);
  const q = useQuery({ queryKey: ["cert-templates-all"], queryFn: () => listFn() });
  const templates = (q.data ?? []).filter((t: any) => (t.category ?? "").toLowerCase() === "afiliado");
  const allTemplates = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <FileBadge className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Emitir certificado de filiação</div>
            <p className="text-sm text-muted-foreground">
              Use o Studio de Certificados para criar um modelo com categoria <strong>"afiliado"</strong> e emita
              certificados para esta filial com variáveis institucionais.
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="font-semibold text-foreground mb-1">Variáveis disponíveis para esta filial:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 font-mono">
            <span>{"{{affiliate_name}}"} → {affiliate.trade_name || affiliate.academy_name}</span>
            <span>{"{{academy_name}}"} → {affiliate.academy_name}</span>
            <span>{"{{city}}"} → {affiliate.city || "—"}</span>
            <span>{"{{state}}"} → {affiliate.state || "—"}</span>
            <span>{"{{affiliation_number}}"} → {affiliate.affiliation_number}</span>
            <span>{"{{issued_at}}"} → hoje</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/dojo/app/certificates">
              <FileBadge className="h-4 w-4" /> Abrir Studio de Certificados
            </Link>
          </Button>
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Modelos de categoria "afiliado"
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {templates.map((t: any) => (
              <div key={t.id} className="rounded-lg border bg-white p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.width}×{t.height}px</div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/dojo/certificate-editor/$id" params={{ id: t.id }}>Editar</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && allTemplates.length > 0 && (
        <div className="rounded-lg border-2 border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
          Nenhum modelo com categoria "afiliado" ainda. Abra o Studio, edite um modelo e defina a categoria como "afiliado".
        </div>
      )}
    </div>
  );
}
