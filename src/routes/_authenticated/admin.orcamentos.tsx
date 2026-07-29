import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Plus, Trash2, Download, Search, Pencil, Settings2, Save, X,
  Package, Users, CheckCircle2, Clock,
} from "lucide-react";
import {
  adminListQuotes, adminSaveQuote, adminDeleteQuote,
  adminGetQuoteSettings, adminSaveQuoteSettings,
} from "@/lib/store/quotes.functions";
import { adminListStoreProducts } from "@/lib/store/store.functions";
import { buildQuotePdf } from "@/lib/store/quote-pdf";

export const Route = createFileRoute("/_authenticated/admin/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — AMT Fight Wear" },
      { name: "description", content: "Monte orçamentos com produtos, quantidades e valores e gere um PDF assinado com a logo da AMT Fight Wear." },
      { property: "og:title", content: "Orçamentos — AMT Fight Wear" },
      { property: "og:description", content: "Módulo de orçamentos comerciais da AMT Fight Wear com emissão de PDF assinado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotesPage,
});

const BRL = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (v?: string | null) => {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-neutral-100 text-neutral-600" },
  sent: { label: "Enviado", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Recusado", cls: "bg-red-100 text-red-700" },
  expired: { label: "Expirado", cls: "bg-amber-100 text-amber-700" },
};

type Item = {
  product_id: string | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
};

const emptyForm = () => ({
  id: null as string | null,
  quote_number: "",
  status: "draft" as const,
  customer_name: "",
  customer_company: "",
  customer_document: "",
  customer_email: "",
  customer_phone: "",
  customer_address: { zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  items: [] as Item[],
  discount: 0,
  shipping_cost: 0,
  valid_until: new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10),
  payment_terms: "",
  delivery_terms: "",
  notes: "",
  signer_name: "",
  signer_role: "",
  signature_image: "",
});

function QuotesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListQuotes);
  const saveFn = useServerFn(adminSaveQuote);
  const delFn = useServerFn(adminDeleteQuote);
  const productsFn = useServerFn(adminListStoreProducts);
  const getSettingsFn = useServerFn(adminGetQuoteSettings);
  const saveSettingsFn = useServerFn(adminSaveQuoteSettings);

  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm());

  const quotes = useQuery({ queryKey: ["store", "quotes"], queryFn: () => listFn() });
  const products = useQuery({ queryKey: ["store", "products-min"], queryFn: () => productsFn() });
  const settings = useQuery({ queryKey: ["store", "quote-settings"], queryFn: () => getSettingsFn() });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (quotes.data ?? []).filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;
      return [r.quote_number, r.customer_name, r.customer_company, r.customer_email]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [quotes.data, q, statusFilter]);

  const kpis = useMemo(() => {
    const all = quotes.data ?? [];
    return {
      total: all.length,
      approved: all.filter((r: any) => r.status === "approved").length,
      open: all.filter((r: any) => r.status === "draft" || r.status === "sent").length,
      value: all.filter((r: any) => r.status === "approved").reduce((a: number, r: any) => a + Number(r.total || 0), 0),
    };
  }, [quotes.data]);

  const subtotal = form.items.reduce((a, it) => a + it.quantity * it.unit_price, 0);
  const total = Math.max(0, subtotal - Number(form.discount || 0) + Number(form.shipping_cost || 0));

  const openNew = () => {
    const s: any = settings.data ?? {};
    setForm({
      ...emptyForm(),
      payment_terms: s.payment_terms || "",
      delivery_terms: s.delivery_terms || "",
      signer_name: s.signer_name || "",
      signer_role: s.signer_role || "",
      signature_image: s.signature_image || "",
    });
    setEditorOpen(true);
  };

  const openEdit = (r: any) => {
    setForm({
      id: r.id,
      quote_number: r.quote_number ?? "",
      status: r.status ?? "draft",
      customer_name: r.customer_name ?? "",
      customer_company: r.customer_company ?? "",
      customer_document: r.customer_document ?? "",
      customer_email: r.customer_email ?? "",
      customer_phone: r.customer_phone ?? "",
      customer_address: { zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", ...(r.customer_address ?? {}) },
      items: (r.items ?? []).map((it: any) => ({ ...it, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })),
      discount: Number(r.discount ?? 0),
      shipping_cost: Number(r.shipping_cost ?? 0),
      valid_until: r.valid_until ?? "",
      payment_terms: r.payment_terms ?? "",
      delivery_terms: r.delivery_terms ?? "",
      notes: r.notes ?? "",
      signer_name: r.signer_name ?? "",
      signer_role: r.signer_role ?? "",
      signature_image: r.signature_image ?? "",
    });
    setEditorOpen(true);
  };

  const addProduct = (id: string) => {
    const p: any = (products.data ?? []).find((x: any) => x.id === id);
    if (!p) return;
    setForm((f) => {
      const idx = f.items.findIndex((i) => i.product_id === id);
      if (idx >= 0) {
        const items = [...f.items];
        items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 };
        return { ...f, items };
      }
      return {
        ...f,
        items: [...f.items, {
          product_id: p.id, name: p.name, sku: p.slug ?? null, description: "",
          image_url: p.image_url ?? null, quantity: 1, unit_price: Number(p.price ?? 0),
        }],
      };
    });
  };

  const addBlank = () =>
    setForm((f) => ({ ...f, items: [...f.items, { product_id: null, name: "", quantity: 1, unit_price: 0, description: "" }] }));

  const updItem = (i: number, patch: Partial<Item>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, ix) => (ix === i ? { ...it, ...patch } : it)) }));

  const rmItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, ix) => ix !== i) }));

  const save = async () => {
    if (!form.customer_name.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (!form.items.length) { toast.error("Adicione ao menos um produto"); return; }
    if (form.items.some((i) => !i.name.trim())) { toast.error("Todos os itens precisam de descrição"); return; }
    setBusy(true);
    try {
      const saved: any = await saveFn({ data: { ...form, valid_until: form.valid_until || null } as any });
      toast.success("Orçamento salvo");
      qc.invalidateQueries({ queryKey: ["store", "quotes"] });
      setEditorOpen(false);
      return saved;
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const generatePdf = async (r: any) => {
    const s: any = settings.data ?? {};
    try {
      const { url, filename } = await buildQuotePdf({
        quote_number: r.quote_number,
        created_at: r.created_at,
        valid_until: r.valid_until,
        customer_name: r.customer_name,
        customer_company: r.customer_company,
        customer_document: r.customer_document,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        customer_address: r.customer_address,
        items: (r.items ?? []).map((it: any) => ({
          name: it.name, sku: it.sku, description: it.description,
          quantity: Number(it.quantity), unit_price: Number(it.unit_price),
        })),
        discount: Number(r.discount ?? 0),
        shipping_cost: Number(r.shipping_cost ?? 0),
        subtotal: Number(r.subtotal ?? 0),
        total: Number(r.total ?? 0),
        payment_terms: r.payment_terms,
        delivery_terms: r.delivery_terms,
        notes: r.notes,
        signer_name: r.signer_name || s.signer_name,
        signer_role: r.signer_role || s.signer_role,
        signature_image: r.signature_image || s.signature_image,
        company: s,
      });
      setPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { url, filename };
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PDF");
    }
  };

  const closePreview = () => {
    setPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const downloadPreview = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = preview.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("PDF baixado");
  };


  const saveAndPdf = async () => {
    const saved = await save();
    if (saved) await generatePdf(saved);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await delFn({ data: { id: toDelete.id } });
      toast.success("Orçamento removido");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["store", "quotes"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50/50">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-neutral-800/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-6 text-white shadow-xl md:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> AMT Fight Wear
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Orçamentos</h1>
              <p className="mt-1.5 text-sm text-white/60">
                Selecione produtos, ajuste quantidades e valores e emita um PDF assinado para enviar ao cliente.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" className="h-10 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="mr-1.5 h-4 w-4" /> Dados do emissor
              </Button>
              <Button className="h-10 rounded-full bg-red-600 hover:bg-red-500" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Novo orçamento
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={FileText} label="Orçamentos" value={kpis.total} />
          <Kpi icon={Clock} label="Em aberto" value={kpis.open} />
          <Kpi icon={CheckCircle2} label="Aprovados" value={kpis.approved} />
          <Kpi icon={Users} label="Valor aprovado" value={BRL(kpis.value)} />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input className="h-9 pl-8" placeholder="Buscar por número, cliente ou empresa..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {quotes.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 font-semibold text-neutral-700">Nenhum orçamento por aqui</p>
            <p className="mt-1 text-sm text-neutral-500">Crie o primeiro orçamento e gere o PDF assinado em segundos.</p>
            <Button className="mt-4 rounded-full bg-red-600 hover:bg-red-500" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo orçamento
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r: any) => (
              <Card key={r.id} className="group overflow-hidden border-neutral-200 transition hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{r.customer_name}</CardTitle>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {r.quote_number}{r.customer_company ? ` · ${r.customer_company}` : ""}
                      </p>
                    </div>
                    <Badge className={`shrink-0 border-0 ${STATUS[r.status]?.cls ?? ""}`}>{STATUS[r.status]?.label ?? r.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400">Total</div>
                      <div className="text-xl font-black tabular-nums">{BRL(Number(r.total))}</div>
                    </div>
                    <div className="text-right text-xs text-neutral-500">
                      <div>{(r.items ?? []).length} item(ns)</div>
                      <div>Validade {brDate(r.valid_until)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" className="h-8 rounded-full bg-neutral-900 hover:bg-neutral-800" onClick={() => generatePdf(r)}>
                      <Download className="mr-1 h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => openEdit(r)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0 text-red-600 hover:text-red-700" onClick={() => setToDelete(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? `Editar ${form.quote_number}` : "Novo orçamento"}</DialogTitle>
            <DialogDescription>Preencha os dados do cliente, escolha os produtos e ajuste valores.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cliente */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Dados do cliente</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome *" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} />
                <Field label="Empresa" value={form.customer_company} onChange={(v) => setForm({ ...form, customer_company: v })} />
                <Field label="CPF / CNPJ" value={form.customer_document} onChange={(v) => setForm({ ...form, customer_document: v })} />
                <Field label="Telefone" value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })} />
                <Field label="E-mail" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })} />
                <Field label="CEP" value={form.customer_address.zip} onChange={(v) => setForm({ ...form, customer_address: { ...form.customer_address, zip: v } })} />
                <Field label="Endereço" value={form.customer_address.street} onChange={(v) => setForm({ ...form, customer_address: { ...form.customer_address, street: v } })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Número" value={form.customer_address.number} onChange={(v) => setForm({ ...form, customer_address: { ...form.customer_address, number: v } })} />
                  <Field label="Bairro" value={form.customer_address.neighborhood} onChange={(v) => setForm({ ...form, customer_address: { ...form.customer_address, neighborhood: v } })} />
                </div>
                <Field label="Cidade" value={form.customer_address.city} onChange={(v) => setForm({ ...form, customer_address: { ...form.customer_address, city: v } })} />
                <Field label="UF" value={form.customer_address.state} onChange={(v) => setForm({ ...form, customer_address: { ...form.customer_address, state: v } })} />
              </div>
            </section>

            {/* Itens */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Produtos</h3>
                <div className="flex gap-2">
                  <Select value="" onValueChange={addProduct}>
                    <SelectTrigger className="h-9 w-[230px]">
                      <SelectValue placeholder="Adicionar produto do catálogo" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(products.data ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="h-9" onClick={addBlank}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Item livre
                  </Button>
                </div>
              </div>

              {form.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                  <Package className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
                  Nenhum produto adicionado
                </div>
              ) : (
                <div className="space-y-2">
                  {form.items.map((it, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_90px_120px_110px_36px] sm:items-end">
                        <div>
                          <Label className="text-[10px] uppercase text-neutral-500">Produto</Label>
                          <Input className="h-9" value={it.name} onChange={(e) => updItem(i, { name: e.target.value })} placeholder="Nome do item" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-neutral-500">Qtd</Label>
                          <Input className="h-9" type="number" min={1} value={it.quantity}
                            onChange={(e) => updItem(i, { quantity: Math.max(0.01, Number(e.target.value) || 0) })} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-neutral-500">Valor unit.</Label>
                          <Input className="h-9" type="number" min={0} step="0.01" value={it.unit_price}
                            onChange={(e) => updItem(i, { unit_price: Math.max(0, Number(e.target.value) || 0) })} />
                        </div>
                        <div className="text-right">
                          <Label className="text-[10px] uppercase text-neutral-500">Total</Label>
                          <div className="flex h-9 items-center justify-end text-sm font-bold tabular-nums">
                            {BRL(it.quantity * it.unit_price)}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-600" onClick={() => rmItem(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input className="mt-2 h-8 text-xs" placeholder="Detalhes / personalização (opcional)"
                        value={it.description ?? ""} onChange={(e) => updItem(i, { description: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-[10px] uppercase text-neutral-500">Desconto (R$)</Label>
                  <Input className="h-9" type="number" min={0} step="0.01" value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-neutral-500">Frete (R$)</Label>
                  <Input className="h-9" type="number" min={0} step="0.01" value={form.shipping_cost}
                    onChange={(e) => setForm({ ...form, shipping_cost: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
                <div className="rounded-xl bg-neutral-900 p-3 text-white">
                  <div className="text-[10px] uppercase tracking-wider text-white/60">Total do orçamento</div>
                  <div className="text-xl font-black tabular-nums">{BRL(total)}</div>
                  <div className="text-[10px] text-white/50">Subtotal {BRL(subtotal)}</div>
                </div>
              </div>
            </section>

            {/* Condições */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Condições e assinatura</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] uppercase text-neutral-500">Validade</Label>
                  <Input className="h-9" type="date" value={form.valid_until ?? ""} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-neutral-500">Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Assinado por" value={form.signer_name} onChange={(v) => setForm({ ...form, signer_name: v })} />
                <Field label="Cargo" value={form.signer_role} onChange={(v) => setForm({ ...form, signer_role: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] uppercase text-neutral-500">Condições de pagamento</Label>
                  <Textarea rows={3} value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-neutral-500">Prazo de entrega</Label>
                  <Textarea rows={3} value={form.delivery_terms} onChange={(e) => setForm({ ...form, delivery_terms: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-neutral-500">Observações</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </section>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-white pt-3">
              <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={busy}>Cancelar</Button>
              <Button variant="outline" onClick={save} disabled={busy}>
                <Save className="mr-1.5 h-4 w-4" /> Salvar
              </Button>
              <Button className="bg-red-600 hover:bg-red-500" onClick={saveAndPdf} disabled={busy}>
                <Download className="mr-1.5 h-4 w-4" /> Salvar e gerar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initial={settings.data ?? {}}
        onSave={async (v) => {
          await saveSettingsFn({ data: v as any });
          toast.success("Dados do emissor salvos");
          qc.invalidateQueries({ queryKey: ["store", "quote-settings"] });
          setSettingsOpen(false);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O orçamento <strong>{toDelete?.quote_number}</strong> será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); doDelete(); }} className="bg-red-600 hover:bg-red-500">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) closePreview(); }}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="border-b px-5 py-3">
            <DialogTitle className="text-base">Visualizar orçamento</DialogTitle>
            <DialogDescription className="truncate text-xs">{preview?.filename}</DialogDescription>
          </DialogHeader>
          <div className="h-[70vh] w-full bg-neutral-100">
            {preview ? (
              <iframe src={preview.url} title="Pré-visualização do orçamento" className="h-full w-full" />
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Button variant="ghost" onClick={closePreview}>Fechar</Button>
            <Button className="bg-red-600 hover:bg-red-500" onClick={downloadPreview}>
              <Download className="mr-1.5 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}

function Field({ label, value, onChange }: { label: string; value?: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-neutral-500">{label}</Label>
      <Input className="h-9" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
          <div className="truncate text-lg font-black tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SettingsDialog({
  open, onOpenChange, initial, onSave,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial: Record<string, any>; onSave: (v: Record<string, string>) => Promise<void> }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const val = (k: string) => v[k] ?? initial[k] ?? "";
  const set = (k: string, x: string) => setV((s) => ({ ...s, [k]: x }));

  const upload = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => set("signature_image", String(fr.result));
    fr.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados do emissor</DialogTitle>
          <DialogDescription>Informações e assinatura que aparecem em todos os PDFs de orçamento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Razão / Nome" value={val("company_name") || "AMT Fight Wear"} onChange={(x) => set("company_name", x)} />
          <Field label="CNPJ" value={val("cnpj")} onChange={(x) => set("cnpj", x)} />
          <Field label="Endereço" value={val("address")} onChange={(x) => set("address", x)} />
          <Field label="Telefone" value={val("phone")} onChange={(x) => set("phone", x)} />
          <Field label="E-mail" value={val("email")} onChange={(x) => set("email", x)} />
          <Field label="Site" value={val("site")} onChange={(x) => set("site", x)} />
          <Field label="Responsável (assinatura)" value={val("signer_name")} onChange={(x) => set("signer_name", x)} />
          <Field label="Cargo" value={val("signer_role")} onChange={(x) => set("signer_role", x)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[10px] uppercase text-neutral-500">Condições de pagamento padrão</Label>
            <Textarea rows={3} value={val("payment_terms")} onChange={(e) => set("payment_terms", e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-neutral-500">Prazo de entrega padrão</Label>
            <Textarea rows={3} value={val("delivery_terms")} onChange={(e) => set("delivery_terms", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase text-neutral-500">Imagem da assinatura (PNG com fundo transparente)</Label>
          <div className="mt-1 flex items-center gap-3">
            <Input type="file" accept="image/png,image/jpeg" className="h-9"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {val("signature_image") ? (
              <img src={val("signature_image")} alt="Assinatura" className="h-12 rounded border bg-white object-contain px-2" />
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-red-600 hover:bg-red-500"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({
                  company_name: val("company_name") || "AMT Fight Wear",
                  cnpj: val("cnpj"), address: val("address"), phone: val("phone"),
                  email: val("email"), site: val("site"),
                  signer_name: val("signer_name"), signer_role: val("signer_role"),
                  signature_image: val("signature_image"),
                  payment_terms: val("payment_terms"), delivery_terms: val("delivery_terms"),
                });
              } catch (e: any) {
                toast.error(e?.message ?? "Erro ao salvar");
              } finally {
                setBusy(false);
              }
            }}
          >
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
