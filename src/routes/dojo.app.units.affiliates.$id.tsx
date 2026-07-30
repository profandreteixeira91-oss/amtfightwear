import { brDate } from "@/lib/format";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
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
import { DojoPageShell } from "@/components/dojo/DojoPageShell";
import { PinGate } from "@/components/dojo/PinGate";

export const Route = createFileRoute("/dojo/app/units/affiliates/$id")({
  head: () => ({ meta: [{ title: "Filial — AMT Dojo Manager" }] }),
  component: () => (
    <PinGate moduleName="Unidades e Filiais">
      <AffiliateDetailPage />
    </PinGate>
  ),
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
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[92vh] overflow-y-auto">
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

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
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
                <td className="px-3 py-2">{r.due_date ? brDate(r.due_date) : "—"}</td>
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
const AFFIL_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  signed: "Assinado",
  cancelled: "Cancelado",
};

function ContractTab({ affiliate }: { affiliate: any }) {
  const listFn = useServerFn(listAffiliateContracts);
  const saveFn = useServerFn(saveAffiliateContract);
  const delFn = useServerFn(deleteAffiliateContract);
  const brandFn = useServerFn(getMyAcademyBranding);
  const branding = useDojoBranding();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["affiliate-contracts", affiliate.id],
    queryFn: () => listFn({ data: { affiliate_id: affiliate.id } }),
  });
  const bq = useQuery({ queryKey: ["dojo-branding-me"], queryFn: () => brandFn(), staleTime: 5 * 60 * 1000 });

  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);

  const openNew = () => {
    setCurrent({
      affiliate_id: affiliate.id,
      title: "Contrato de Filiação",
      html_content: AFFILIATE_CONTRACT_PRESET_HTML,
      signature_status: "draft",
    });
    setOpen(true);
  };

  const openEdit = (row: any) => { setCurrent({ ...row }); setOpen(true); };
  const openPreview = (row: any) => { setCurrent(row); setPreviewOpen(true); };

  const save = async () => {
    if (!current?.title?.trim()) { toast.error("Informe o título"); return; }
    try {
      await saveFn({
        data: {
          id: current.id,
          affiliate_id: affiliate.id,
          title: current.title,
          html_content: current.html_content ?? "",
          signature_status: current.signature_status ?? "draft",
        },
      });
      toast.success("Contrato salvo");
      qc.invalidateQueries({ queryKey: ["affiliate-contracts", affiliate.id] });
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Excluir contrato "${row.title}"?`)) return;
    try {
      await delFn({ data: { id: row.id } });
      toast.success("Contrato excluído");
      qc.invalidateQueries({ queryKey: ["affiliate-contracts", affiliate.id] });
    } catch (e: any) { toast.error(e.message); }
  };

  const markSigned = async (row: any) => {
    try {
      await saveFn({
        data: {
          id: row.id,
          affiliate_id: affiliate.id,
          title: row.title,
          html_content: row.html_content,
          signature_status: "signed",
        },
      });
      toast.success("Marcado como assinado");
      qc.invalidateQueries({ queryKey: ["affiliate-contracts", affiliate.id] });
    } catch (e: any) { toast.error(e.message); }
  };

  const vars = useMemo(() => buildAffiliateContractVariables({
    organization_name: bq.data?.trade_name || bq.data?.legal_name || "",
    organization_cnpj: (bq.data as any)?.cnpj || "",
    affiliate,
  }), [bq.data, affiliate]);

  const previewHtml = current ? renderAffiliateContract(current.html_content ?? "", vars) : "";

  const printContract = (row: any) => {
    const html = renderAffiliateContract(row.html_content ?? "", vars);
    openBrandedPrintDocument({
      branding: branding.data as any,
      title: row.title,
      subtitle: affiliate?.name ?? "",
      bodyHtml: `<div style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;">${html}</div>`,
      footerLeft: `Contrato nº ${String(row.id ?? "").slice(0, 8).toUpperCase()}`,
      footerRight: (bq.data as any)?.trade_name ?? "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Contratos de filiação com modelo base pronto. Personalize e imprima em A4.
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo contrato</Button>
      </div>

      {q.isLoading ? (
        <div className="rounded border p-6 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Nenhum contrato gerado.</div>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Criar contrato</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-2 text-left">Título</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Criado</th>
                <th className="p-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((row: any) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="p-2 font-medium">{row.title}</td>
                  <td className="p-2">
                    <Badge variant={row.signature_status === "signed" ? "default" : "outline"}>
                      {AFFIL_STATUS_LABEL[row.signature_status] ?? row.signature_status}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => openPreview(row)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => printContract(row)} title="Imprimir"><Printer className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(row)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      {row.signature_status !== "signed" && (
                        <Button size="icon" variant="ghost" onClick={() => markSigned(row)} title="Marcar como assinado"><CheckCircle2 className="h-4 w-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {current?.id ? "Editar contrato" : "Novo contrato"}
              </DialogTitle>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Título</label>
                <Input value={current?.title ?? ""} onChange={(e) => setCurrent({ ...current, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={current?.signature_status ?? "draft"} onValueChange={(v) => setCurrent({ ...current, signature_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="signed">Assinado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md border p-3 bg-muted/20 text-[11px] text-muted-foreground">
              Variáveis suportadas: <code>{"{{organization_name}}"}</code>, <code>{"{{affiliate_name}}"}</code>, <code>{"{{cnpj}}"}</code>, <code>{"{{address}}"}</code>, <code>{"{{city}}"}</code>, <code>{"{{state}}"}</code>, <code>{"{{manager_name}}"}</code>, <code>{"{{cpf}}"}</code>, <code>{"{{affiliation_number}}"}</code>, <code>{"{{signed_at}}"}</code>.
            </div>
            <RichTextEditor
              value={current?.html_content ?? ""}
              onChange={(html) => setCurrent((c: any) => ({ ...c, html_content: html }))}
              placeholder="Escreva o conteúdo do contrato de filiação."
            />
          </div>
          <DialogFooter className="px-6 py-3 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar contrato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                {current?.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => current && printContract(current)}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
                <button onClick={() => setPreviewOpen(false)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
            <div
              className="bg-white text-black shadow-lg mx-auto max-w-3xl p-12 prose prose-sm max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg"
              style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
            />
          </div>
        </DialogContent>
      </Dialog>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 font-mono break-words">
            <span className="min-w-0 break-all">{"{{affiliate_name}}"} → {affiliate.trade_name || affiliate.academy_name}</span>
            <span className="min-w-0 break-all">{"{{academy_name}}"} → {affiliate.academy_name}</span>
            <span className="min-w-0 break-all">{"{{city}}"} → {affiliate.city || "—"}</span>
            <span className="min-w-0 break-all">{"{{state}}"} → {affiliate.state || "—"}</span>
            <span className="min-w-0 break-all">{"{{affiliation_number}}"} → {affiliate.affiliation_number}</span>
            <span className="min-w-0 break-all">{"{{issued_at}}"} → hoje</span>
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
