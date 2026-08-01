import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Wrench, ShoppingCart, ExternalLink, Copy } from "lucide-react";
import {
  listSalesProducts,
  saveSalesProduct,
  deleteSalesProduct,
  listSales,
  createSale,
  deleteSale,
  updateSaleStatus,
  listStudentsLite,
} from "@/lib/dojo/sales.functions";
import { getMyAsaasConfig } from "@/lib/asaas/asaas.functions";
import { isAsaasReady } from "@/lib/dojo/amt-pay-status";
import { Link } from "@tanstack/react-router";
import { todayISO } from "@/lib/dates";

export const Route = createFileRoute("/dojo/app/sales")({
  head: () => ({ meta: [{ title: "Vendas — AMT Dojo Manager" }] }),
  component: SalesPage,
});

type Product = Awaited<ReturnType<typeof listSalesProducts>>[number];
type Sale = Awaited<ReturnType<typeof listSales>>[number];
type Student = Awaited<ReturnType<typeof listStudentsLite>>[number];

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  // AMT Pay (gera cobrança no gateway)
  pix: "Pix — AMT Pay",
  credit_card: "Cartão de crédito — AMT Pay",
  boleto: "Boleto — AMT Pay",
  debit_card: "Cartão de débito — AMT Pay",
  payment_link: "Link de pagamento — AMT Pay",
  // Direto com a academia (apenas registro, marca como pago)
  pix_direct: "Pix direto com a academia",
  debit_direct: "Débito direto com a academia",
  cash: "Dinheiro",
  credit_direct: "Crédito direto com a academia",
  manual: "Outro (manual)",
};

const PAYMENT_METHOD_GROUPS: { label: string; hint: string; options: string[] }[] = [
  {
    label: "AMT Pay",
    hint: "Gera cobrança online (PIX, Cartão ou Boleto). Cliente paga pelo link.",
    options: ["pix", "credit_card", "boleto"],
  },
  {
    label: "Direto com a academia",
    hint: "Somente registro da venda — marcada como paga automaticamente.",
    options: ["pix_direct", "debit_direct", "cash", "credit_direct"],
  },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
};

function SalesPage() {
  const [tab, setTab] = useState("sales");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const fetchProducts = useServerFn(listSalesProducts);
  const fetchSales = useServerFn(listSales);
  const fetchStudents = useServerFn(listStudentsLite);

  const reload = async () => {
    const [p, s, st] = await Promise.all([fetchProducts(), fetchSales(), fetchStudents()]);
    setProducts(p);
    setSales(s);
    setStudents(st);
  };

  useEffect(() => {
    reload().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:gap-7 md:p-6">
      {/* ============ HERO — ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">Vendas</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-300">
              Cobrança avulsa (uma vez). Para mensalidades e planos recorrentes, use <b className="text-white">Mensalidades</b> ou <b className="text-white">Planos</b> no menu.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-red-500/15 bg-neutral-950/60 p-1 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)]">
          <TabsList className="flex w-max min-w-full flex-nowrap gap-1 bg-transparent p-0">
            <TabsTrigger value="sales" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white">
              <ShoppingCart className="mr-2 h-4 w-4" /> Vendas
            </TabsTrigger>
            <TabsTrigger value="catalog" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white">
              <Package className="mr-2 h-4 w-4" /> Produtos & Serviços
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales" className="mt-4">
          <SalesTab sales={sales} products={products} students={students} onChanged={reload} />
        </TabsContent>
        <TabsContent value="catalog" className="mt-4">
          <CatalogTab products={products} onChanged={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================== SALES TAB ================== */

function SalesTab({
  sales,
  products,
  students,
  onChanged,
}: {
  sales: Sale[];
  products: Product[];
  students: Student[];
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const delSale = useServerFn(deleteSale);
  const setStatus = useServerFn(updateSaleStatus);

  const kpis = useMemo(() => {
    const paid = sales.filter((s) => s.status === "paid");
    const pending = sales.filter((s) => s.status === "pending");
    const totalPaid = paid.reduce((a, s) => a + Number(s.total || 0), 0);
    const totalPending = pending.reduce((a, s) => a + Number(s.total || 0), 0);
    return { count: sales.length, totalPaid, totalPending };
  }, [sales]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Vendas registradas" value={String(kpis.count)} tone="neutral" />
        <KpiCard label="Recebido" value={brl(kpis.totalPaid)} tone="success" />
        <KpiCard label="A receber" value={brl(kpis.totalPending)} tone="warning" />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="min-w-0 truncate">Vendas</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Nova venda
              </Button>
            </DialogTrigger>
            <NewSaleDialog
              products={products}
              students={students}
              onDone={async () => {
                setOpen(false);
                await onChanged();
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda registrada ainda. Clique em "Nova venda" para começar.
            </p>
          ) : (
            <div className="-mx-2 overflow-x-auto sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(s.sold_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {s.student?.full_name || s.customer_name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {(s.items ?? []).map((it: any) => `${Number(it.quantity)}x ${it.name}`).join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{brl(Number(s.total))}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[s.payment_method] ?? s.payment_method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "paid" ? "default" : s.status === "pending" ? "secondary" : "outline"
                        }
                      >
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {s.payment_link ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Abrir link de pagamento"
                              onClick={() => window.open(s.payment_link!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Copiar link"
                              onClick={() => {
                                navigator.clipboard.writeText(s.payment_link!);
                                toast.success("Link copiado");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        {s.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await setStatus({ data: { id: s.id, status: "paid" } });
                                toast.success("Marcada como paga");
                                await onChanged();
                              } catch (e: any) {
                                toast.error(e.message);
                              }
                            }}
                          >
                            Marcar paga
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={async () => {
                            if (!confirm("Excluir esta venda?")) return;
                            try {
                              await delSale({ data: { id: s.id } });
                              toast.success("Venda excluída");
                              await onChanged();
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  const accent =
    tone === "success"
      ? "from-emerald-500/20 to-emerald-500/0 text-emerald-300"
      : tone === "warning"
      ? "from-amber-500/20 to-amber-500/0 text-amber-300"
      : "from-red-500/20 to-red-500/0 text-red-300";
  return (
    <div className="group relative overflow-hidden rounded-xl border border-red-500/15 bg-gradient-to-br from-neutral-950 to-neutral-900 p-4 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)] transition hover:border-red-500/30">
      <div aria-hidden className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-70`} />
      <p className="relative text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="relative mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

/* ================== NEW SALE DIALOG ================== */

type Line = {
  key: string;
  product_id: string | null;
  name: string;
  kind: "product" | "service";
  quantity: number;
  unit_price: number;
};

function NewSaleDialog({
  products,
  students,
  onDone,
}: {
  products: Product[];
  students: Student[];
  onDone: () => Promise<void> | void;
}) {
  const [lines, setLines] = useState<Line[]>([
    { key: crypto.randomUUID(), product_id: null, name: "", kind: "product", quantity: 1, unit_price: 0 },
  ]);
  const [studentId, setStudentId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerDoc, setCustomerDoc] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<string>("cash");
  const [dueDate, setDueDate] = useState<string>(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [amtPayReady, setAmtPayReady] = useState<boolean | null>(null);
  const save = useServerFn(createSale);
  const fetchAsaas = useServerFn(getMyAsaasConfig);

  useEffect(() => {
    fetchAsaas()
      .then((cfg) => setAmtPayReady(isAsaasReady(cfg?.onboardingStatus)))
      .catch(() => setAmtPayReady(false));
  }, [fetchAsaas]);

  const subtotal = lines.reduce((a, l) => a + l.quantity * l.unit_price, 0);
  const total = Math.max(0, subtotal - (discount || 0));
  const isGateway = ["pix", "boleto", "credit_card", "debit_card", "payment_link"].includes(method);

  const addLine = () =>
    setLines((l) => [
      ...l,
      { key: crypto.randomUUID(), product_id: null, name: "", kind: "product", quantity: 1, unit_price: 0 },
    ]);
  const removeLine = (key: string) => setLines((l) => l.filter((x) => x.key !== key));
  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const selectProduct = (key: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    patchLine(key, {
      product_id: p.id,
      name: p.name,
      kind: (p.kind as "product" | "service") ?? "product",
      unit_price: Number(p.price),
    });
  };

  const submit = async () => {
    const validItems = lines
      .filter((l) => l.name.trim() && l.quantity > 0)
      .map((l) => ({
        product_id: l.product_id,
        name: l.name.trim(),
        kind: l.kind,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      }));
    if (!validItems.length) {
      toast.error("Adicione ao menos um item válido.");
      return;
    }
    if (isGateway && !amtPayReady) {
      toast.error("Ative o AMT Pay para gerar cobranças online. Use uma forma direta com a academia.");
      return;
    }
    if (isGateway && !studentId) {
      toast.error("Selecione o aluno para cobrar pelo AMT Pay.");
      return;
    }
    setSaving(true);
    try {
      const res = await save({
        data: {
          student_id: studentId || null,
          customer_name: customerName || null,
          customer_document: customerDoc || null,
          discount: Number(discount || 0),
          payment_method: method as any,
          due_date: isGateway ? dueDate : undefined,
          notes: notes || null,
          items: validItems,
        },
      });
      if (res.payment_link) {
        toast.success("Venda registrada. Link de pagamento gerado.");
      } else {
        toast.success("Venda registrada.");
      }
      await onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
      <DialogHeader className="px-6 pt-6">
        <DialogTitle>Nova venda</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 overflow-y-auto px-6 py-4 flex-1 min-h-0">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Aluno (opcional)</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar aluno..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente avulso (se não for aluno)</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome" />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto/Serviço</TableHead>
                <TableHead className="w-24">Qtd</TableHead>
                <TableHead className="w-32">Preço unit.</TableHead>
                <TableHead className="w-28 text-right">Subtotal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.key}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Select value={l.product_id ?? "__manual__"} onValueChange={(v) => (v === "__manual__" ? patchLine(l.key, { product_id: null }) : selectProduct(l.key, v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar do catálogo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">— Item avulso —</SelectItem>
                          {products
                            .filter((p) => p.active !== false)
                            .map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} · {brl(Number(p.price))}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={l.name}
                        onChange={(e) => patchLine(l.key, { name: e.target.value })}
                        placeholder="Descrição do item"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.quantity}
                      onChange={(e) => patchLine(l.key, { quantity: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) => patchLine(l.key, { unit_price: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">{brl(l.quantity * l.unit_price)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => removeLine(l.key)} disabled={lines.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-2">
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar item
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Desconto (R$)</Label>
            <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_GROUPS.map((g, gi) => {
                  const isAmtPayGroup = g.label === "AMT Pay";
                  const disableGroup = isAmtPayGroup && !amtPayReady;
                  return (
                    <div key={g.label}>
                      {gi > 0 ? <div className="my-1 border-t" /> : null}
                      <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {g.label}
                        </span>
                        {disableGroup ? (
                          <span className="text-[10px] font-medium text-amber-600">Não ativado</span>
                        ) : null}
                      </div>
                      {g.options.map((k) => (
                        <SelectItem key={k} value={k} disabled={disableGroup}>
                          {PAYMENT_METHOD_LABELS[k] ?? k}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isGateway
                ? PAYMENT_METHOD_GROUPS[0].hint
                : PAYMENT_METHOD_GROUPS[1].hint}
            </p>
            {amtPayReady === false ? (
              <p className="mt-1 text-[11px] text-amber-600">
                AMT Pay ainda não está ativado. {" "}
                <Link to="/dojo/app/integrations" className="underline font-medium">
                  Ativar agora
                </Link>{" "}
                — enquanto isso, use uma forma direta com a academia.
              </p>
            ) : null}
          </div>
          {isGateway ? (
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          ) : (
            <div>
              <Label>Documento (opcional)</Label>
              <Input value={customerDoc} onChange={(e) => setCustomerDoc(e.target.value)} placeholder="CPF/CNPJ" />
            </div>
          )}
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
          <div className="text-sm">
            Subtotal: <strong>{brl(subtotal)}</strong>
            {discount ? <span className="ml-3">Desconto: <strong>-{brl(discount)}</strong></span> : null}
          </div>
          <div className="text-lg font-semibold">Total: {brl(total)}</div>
        </div>

        {isGateway ? (
          <p className="text-xs text-muted-foreground">
            Uma cobrança será gerada no AMT Pay e vinculada ao aluno selecionado. O link de pagamento fica disponível na lista.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Recebimento fora da plataforma — a venda será registrada e marcada como <b>paga</b> automaticamente.
          </p>
        )}
      </div>
      <DialogFooter className="px-6 pb-6 pt-2 border-t">
        <Button onClick={submit} disabled={saving}>
          {saving ? "Salvando..." : "Registrar venda"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ================== CATALOG TAB ================== */

function CatalogTab({ products, onChanged }: { products: Product[]; onChanged: () => Promise<void> | void }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const del = useServerFn(deleteSalesProduct);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Produtos e serviços</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo item
          </Button>
          <ProductDialog
            product={editing}
            onDone={async () => {
              setOpen(false);
              await onChanged();
            }}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum produto ou serviço cadastrado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    {p.kind === "service" ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Wrench className="h-3 w-3" /> Serviço
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Package className="h-3 w-3" /> Produto
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{brl(Number(p.price))}</TableCell>
                  <TableCell>{p.track_stock ? p.stock ?? 0 : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "outline"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Excluir "${p.name}"?`)) return;
                        try {
                          await del({ data: { id: p.id } });
                          toast.success("Item excluído");
                          await onChanged();
                        } catch (e: any) {
                          toast.error(e.message);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProductDialog({ product, onDone }: { product: Product | null; onDone: () => Promise<void> | void }) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: (product as any)?.description ?? "",
    kind: ((product as any)?.kind as "product" | "service") ?? "product",
    price: Number(product?.price ?? 0),
    cost: Number((product as any)?.cost ?? 0),
    sku: (product as any)?.sku ?? "",
    stock: Number((product as any)?.stock ?? 0),
    track_stock: Boolean((product as any)?.track_stock),
    active: product ? Boolean((product as any).active) : true,
  });
  const save = useServerFn(saveSalesProduct);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: product?.id,
          name: form.name.trim(),
          description: form.description || null,
          kind: form.kind,
          price: form.price,
          cost: form.cost || null,
          sku: form.sku || null,
          stock: form.track_stock ? form.stock : null,
          track_stock: form.track_stock,
          active: form.active,
        },
      });
      toast.success(product ? "Item atualizado" : "Item criado");
      await onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
      <DialogHeader>
        <DialogTitle>{product ? "Editar item" : "Novo item"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>SKU (opcional)</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>
        </div>
        <div>
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Preço de venda (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Custo (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
            />
          </div>
        </div>

        {form.kind === "product" ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Controlar estoque</p>
              <p className="text-xs text-muted-foreground">Descontar automaticamente a cada venda</p>
            </div>
            <Switch checked={form.track_stock} onCheckedChange={(v) => setForm({ ...form, track_stock: v })} />
          </div>
        ) : null}

        {form.track_stock ? (
          <div>
            <Label>Estoque atual</Label>
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-md border p-3">
          <p className="text-sm font-medium">Item ativo</p>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
