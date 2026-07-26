import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  computePayrollPreview,
  closePayrollMonth,
  listPayments,
  markPaymentPaid,
  deletePayment,
  upsertPayment,
} from "@/lib/dojo/team.functions";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CheckCircle2, Clock, Calculator, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { openBrandedPrintDocument } from "@/lib/dojo/print-document";

export const Route = createFileRoute("/dojo/app/team/payroll")({
  head: () => ({
    meta: [
      { title: "Folha de Pagamento — AMT Dojo Manager" },
      { name: "description", content: "Fechamento mensal, adiantamentos, bônus e recibos da equipe da academia." },
    ],
  }),
  component: PayrollPage,
});

const KIND_LABELS: Record<string, string> = {
  salary: "Salário",
  advance: "Adiantamento",
  discount: "Desconto",
  bonus: "Bônus",
  commission: "Comissão",
  overtime: "Hora extra",
  reimbursement: "Reembolso",
  other: "Outro",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  canceled: "bg-gray-100 text-gray-600 border-gray-200",
};

function brl(v: number) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function PayrollPage() {
  const previewFn = useServerFn(computePayrollPreview);
  const closeFn = useServerFn(closePayrollMonth);
  const listFn = useServerFn(listPayments);
  const markPaidFn = useServerFn(markPaymentPaid);
  const deleteFn = useServerFn(deletePayment);
  const upsertFn = useServerFn(upsertPayment);
  const qc = useQueryClient();

  const [month, setMonth] = useState(currentMonth());

  const preview = useQuery({
    queryKey: ["payroll-preview", month],
    queryFn: () => previewFn({ data: { month } }),
  });
  const payments = useQuery({
    queryKey: ["team-payments", month],
    queryFn: () => listFn({ data: { month } }),
  });

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const rows = preview.data ?? [];

  const eligible = useMemo(
    () => rows.filter((r: any) => !r.already_closed && r.net > 0 && r.has_config),
    [rows],
  );
  const chosen = useMemo(() => eligible.filter((r: any) => selected[r.member_id]), [eligible, selected]);
  const chosenTotal = chosen.reduce((s: number, r: any) => s + Number(r.net || 0), 0);

  const closeMut = useMutation({
    mutationFn: async () => {
      if (chosen.length === 0) throw new Error("Selecione ao menos um colaborador");
      return closeFn({
        data: {
          month,
          entries: chosen.map((r: any) => ({
            member_id: r.member_id,
            amount: r.net,
            description: `Folha ${month}`,
            hours_worked: r.hours || null,
            classes_count: r.classes || null,
          })),
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success(`Folha fechada: ${res.created} colaborador(es).`);
      setSelected({});
      qc.invalidateQueries({ queryKey: ["team-payments", month] });
      qc.invalidateQueries({ queryKey: ["payroll-preview", month] });
      qc.invalidateQueries({ queryKey: ["team-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao fechar folha"),
  });

  const totals = useMemo(() => {
    const list = payments.data ?? [];
    const totalGross = list
      .filter((p: any) => p.status !== "canceled" && !["discount", "advance"].includes(p.kind))
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const paid = list.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pending = list
      .filter((p: any) => p.status === "pending")
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    return { totalGross, paid, pending, count: list.length };
  }, [payments.data]);

  // Adiantamento / Bônus / Desconto rápido
  const [extraOpen, setExtraOpen] = useState(false);
  const [extra, setExtra] = useState<{ member_id: string; kind: string; amount: string; description: string }>({
    member_id: "",
    kind: "advance",
    amount: "",
    description: "",
  });

  const onCreateExtra = async () => {
    if (!extra.member_id) return toast.error("Escolha um colaborador");
    const amt = Number(extra.amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Informe um valor válido");
    try {
      const monthStart = `${month}-01`;
      await upsertFn({
        data: {
          member_id: extra.member_id,
          kind: extra.kind as any,
          amount: amt,
          reference_month: monthStart,
          description: extra.description || KIND_LABELS[extra.kind],
          status: "pending",
        },
      });
      toast.success("Lançamento registrado");
      setExtraOpen(false);
      setExtra({ member_id: "", kind: "advance", amount: "", description: "" });
      qc.invalidateQueries({ queryKey: ["team-payments", month] });
      qc.invalidateQueries({ queryKey: ["payroll-preview", month] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const printReceipt = (p: any) => {
    const memberName = p.dojo_team_members?.full_name ?? "—";
    const kind = KIND_LABELS[p.kind] ?? p.kind;
    const ref = p.reference_month
      ? new Date(p.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : "—";
    openBrandedPrintDocument({
      title: `Recibo — ${memberName}`,
      subtitle: `${kind} · Referência ${ref}`,
      bodyHtml: `
        <div style="margin-top:24px;line-height:1.6">
          <p>Recebi da academia a importância de
          <strong>${brl(Number(p.amount))}</strong> referente a <strong>${kind}</strong>
          do período <strong>${ref}</strong>${p.description ? ` — ${p.description}` : ""}.</p>
          ${p.hours_worked ? `<p>Horas trabalhadas: <strong>${p.hours_worked}</strong></p>` : ""}
          ${p.classes_count ? `<p>Aulas ministradas: <strong>${p.classes_count}</strong></p>` : ""}
          <p style="margin-top:32px">Status: <strong>${p.status === "paid" ? "Pago" : "Pendente"}</strong>${p.paid_at ? ` em ${new Date(p.paid_at).toLocaleDateString("pt-BR")}` : ""}.</p>
          <div style="margin-top:80px;border-top:1px solid #333;width:60%;padding-top:8px">
            ${memberName}<br/><small>Assinatura do colaborador</small>
          </div>
        </div>
      `,
    });
  };

  const kpis = [
    { label: "Prévia do mês", value: brl(rows.reduce((s: number, r: any) => s + Number(r.net || 0), 0)), icon: Calculator, tone: "text-indigo-600" },
    { label: "Lançado (bruto)", value: brl(totals.totalGross), icon: Wallet, tone: "text-blue-600" },
    { label: "Pago no mês", value: brl(totals.paid), icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "A pagar", value: brl(totals.pending), icon: Clock, tone: "text-amber-600" },
  ];

  return (
    <DojoPageShell
      title="Folha de Pagamento"
      description="Calcule, feche e acompanhe a folha mensal — salário fixo, hora-aula, adiantamentos, bônus e recibos."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="w-[170px]"
          />
          <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Lançamento avulso
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Colaborador</div>
                  <Select value={extra.member_id} onValueChange={(v) => setExtra({ ...extra, member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {rows.map((r: any) => (
                        <SelectItem key={r.member_id} value={r.member_id}>
                          {r.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Tipo</div>
                  <Select value={extra.kind} onValueChange={(v) => setExtra({ ...extra, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["advance", "bonus", "commission", "overtime", "reimbursement", "discount", "other"].map((k) => (
                        <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  value={extra.amount}
                  onChange={(e) => setExtra({ ...extra, amount: e.target.value })}
                />
                <Input
                  placeholder="Descrição (opcional)"
                  value={extra.description}
                  onChange={(e) => setExtra({ ...extra, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button onClick={onCreateExtra} className="w-full">Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild>
            <Link to="/dojo/app/team">Voltar para Equipe</Link>
          </Button>
        </div>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="mt-1 text-lg font-semibold">{k.value}</div>
                </div>
                <Icon className={`h-6 w-6 ${k.tone}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="preview" className="mt-2">
        <TabsList>
          <TabsTrigger value="preview">Prévia & Fechamento</TabsTrigger>
          <TabsTrigger value="payments">Lançamentos do mês ({totals.count})</TabsTrigger>
        </TabsList>

        {/* PREVIEW */}
        <TabsContent value="preview">
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="text-sm text-muted-foreground">
                  {eligible.length} colaborador(es) elegíveis para o fechamento de {month}.
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">
                    Selecionado: <strong>{brl(chosenTotal)}</strong>
                  </div>
                  <Button
                    onClick={() => closeMut.mutate()}
                    disabled={chosen.length === 0 || closeMut.isPending}
                  >
                    {closeMut.isPending ? "Fechando..." : `Fechar folha (${chosen.length})`}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[36px]">
                        <Checkbox
                          checked={eligible.length > 0 && chosen.length === eligible.length}
                          onCheckedChange={(v) => {
                            if (v) {
                              const next: Record<string, boolean> = {};
                              eligible.forEach((r: any) => (next[r.member_id] = true));
                              setSelected(next);
                            } else setSelected({});
                          }}
                        />
                      </TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Horas × R$</TableHead>
                      <TableHead className="text-right">Aulas × R$</TableHead>
                      <TableHead className="text-right">Bônus</TableHead>
                      <TableHead className="text-right">Adiant./Desc.</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.isLoading && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          Calculando prévia...
                        </TableCell>
                      </TableRow>
                    )}
                    {!preview.isLoading && rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          Nenhum colaborador ativo no período.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((r: any) => {
                      const disabled = r.already_closed || !r.has_config || r.net <= 0;
                      return (
                        <TableRow key={r.member_id}>
                          <TableCell>
                            <Checkbox
                              checked={!!selected[r.member_id]}
                              disabled={disabled}
                              onCheckedChange={(v) =>
                                setSelected((s) => ({ ...s, [r.member_id]: !!v }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/dojo/app/team/$id"
                              params={{ id: r.member_id }}
                              className="font-medium hover:underline"
                            >
                              {r.full_name}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {r.role}
                              {!r.has_config && " · sem configuração financeira"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{brl(r.base)}</TableCell>
                          <TableCell className="text-right">
                            {r.hours ? `${r.hours}h × ${brl(r.hourly_rate)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.classes ? `${r.classes} × ${brl(r.per_class_rate)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">{r.bonuses ? brl(r.bonuses) : "—"}</TableCell>
                          <TableCell className="text-right text-rose-600">
                            {r.advances + r.discounts > 0 ? `− ${brl(r.advances + r.discounts)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{brl(r.net)}</TableCell>
                          <TableCell className="text-right">
                            {r.already_closed ? (
                              <Badge variant="outline" className={STATUS_COLORS.paid}>
                                Fechada
                              </Badge>
                            ) : !r.has_config ? (
                              <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-600">
                                Configurar
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={STATUS_COLORS.pending}>
                                Elegível
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    )}
                    {!payments.isLoading && (payments.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          Nenhum lançamento neste mês.
                        </TableCell>
                      </TableRow>
                    )}
                    {(payments.data ?? []).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.dojo_team_members?.full_name ?? "—"}</TableCell>
                        <TableCell>{KIND_LABELS[p.kind] ?? p.kind}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{p.description ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">{brl(Number(p.amount))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[p.status] ?? ""}>
                            {p.status === "paid" ? "Pago" : p.status === "canceled" ? "Cancelado" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {p.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await markPaidFn({ data: { id: p.id } });
                                  qc.invalidateQueries({ queryKey: ["team-payments", month] });
                                  toast.success("Marcado como pago");
                                }}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" /> Pagar
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => printReceipt(p)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            {p.status !== "canceled" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (!confirm("Cancelar este lançamento?")) return;
                                  await deleteFn({ data: { id: p.id } });
                                  qc.invalidateQueries({ queryKey: ["team-payments", month] });
                                  qc.invalidateQueries({ queryKey: ["payroll-preview", month] });
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DojoPageShell>
  );
}
