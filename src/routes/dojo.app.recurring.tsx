import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pause, Play, X, Zap, Pencil, Search, Filter } from "lucide-react";
import {
  listRecurringCharges,
  pauseRecurringCharge,
  resumeRecurringCharge,
  cancelRecurringCharge,
  generateNextInvoice,
  updateRecurringCharge,
  FREQUENCY_LABELS,
  type RecurringFrequency,
} from "@/lib/dojo/recurring.functions";

export const Route = createFileRoute("/dojo/app/recurring")({
  head: () => ({ meta: [{ title: "Mensalidades — AMT Dojo Manager" }] }),
  component: RecurringPage,
});

const BRL = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const fmtDate = (d?: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const statusBadge: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
  active: { label: "Ativa", variant: "default" },
  paused: { label: "Pausada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  ended: { label: "Encerrada", variant: "outline" },
};

function RecurringPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRecurringCharges);
  const pauseFn = useServerFn(pauseRecurringCharge);
  const resumeFn = useServerFn(resumeRecurringCharge);
  const cancelFn = useServerFn(cancelRecurringCharge);
  const generateFn = useServerFn(generateNextInvoice);
  const updateFn = useServerFn(updateRecurringCharge);

  const { data = [], isLoading } = useQuery({
    queryKey: ["dojo-recurring"],
    queryFn: () => listFn(),
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [freqFilter, setFreqFilter] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dojo-recurring"] });

  const pauseMut = useMutation({
    mutationFn: (id: string) => pauseFn({ data: { id } }),
    onSuccess: () => { toast.success("Cobrança pausada"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const resumeMut = useMutation({
    mutationFn: (id: string) => resumeFn({ data: { id } }),
    onSuccess: () => { toast.success("Cobrança retomada"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => { toast.success("Cobrança cancelada"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const genMut = useMutation({
    mutationFn: (id: string) => generateFn({ data: { id } }),
    onSuccess: (r: any) => {
      toast.success(r?.skipped ? "Fatura do ciclo já existia" : "Fatura gerada");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data as any[]).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (freqFilter !== "all" && (r.frequency ?? "monthly") !== freqFilter) return false;
      if (!term) return true;
      const name = (r.student?.name ?? "").toLowerCase();
      const plan = (r.plan?.name ?? "").toLowerCase();
      return name.includes(term) || plan.includes(term);
    });
  }, [data, q, statusFilter, freqFilter]);

  const kpis = useMemo(() => {
    const list = data as any[];
    const active = list.filter((r) => r.status === "active");
    const mrr = active.reduce((sum, r) => {
      const amount = Number(r.custom_amount ?? r.plan?.amount ?? 0);
      const freq: RecurringFrequency = r.frequency ?? "monthly";
      const monthly =
        freq === "monthly" ? amount :
        freq === "bimonthly" ? amount / 2 :
        freq === "quarterly" ? amount / 3 :
        freq === "semiannual" ? amount / 6 :
        freq === "annual" ? amount / 12 :
        freq === "custom" ? amount * (30 / Math.max(1, r.custom_days ?? 30)) : amount;
      return sum + monthly;
    }, 0);
    const paused = list.filter((r) => r.status === "paused").length;
    return {
      total: list.length,
      active: active.length,
      paused,
      mrr,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de regras</CardDescription>
            <CardTitle className="text-3xl">{kpis.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ativas</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{kpis.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pausadas</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{kpis.paused}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita mensal recorrente (MRR)</CardDescription>
            <CardTitle className="text-3xl">{BRL(kpis.mrr)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras de cobrança recorrente</CardTitle>
          <CardDescription>
            Unificação de mensalidades e assinaturas. Toda matrícula ativa gera cobranças
            automaticamente conforme a frequência configurada. Pause, retome ou cancele quando
            necessário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por aluno ou plano…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={freqFilter} onValueChange={setFreqFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as frequências</SelectItem>
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Próximo ciclo</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma regra encontrada.</TableCell></TableRow>
                )}
                {filtered.map((r: any) => {
                  const amount = r.custom_amount ?? r.plan?.amount ?? 0;
                  const st = statusBadge[r.status] ?? { label: r.status, variant: "outline" as const };
                  const managedByAsaas = !!r.asaas_subscription_id;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.student?.name ?? "—"}</TableCell>
                      <TableCell>{r.plan?.name ?? "—"}</TableCell>
                      <TableCell>
                        {FREQUENCY_LABELS[(r.frequency ?? "monthly") as RecurringFrequency]}
                        {r.frequency === "custom" && r.custom_days ? ` · ${r.custom_days}d` : ""}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{BRL(amount)}</TableCell>
                      <TableCell>{fmtDate(r.next_run_at)}</TableCell>
                      <TableCell>
                        {r.installments_total
                          ? `${r.installments_generated ?? 0}/${r.installments_total}`
                          : "∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {managedByAsaas && (
                          <Badge variant="outline" className="ml-1 text-[10px]">Asaas</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon" variant="ghost" title="Gerar próxima fatura agora"
                            disabled={managedByAsaas || r.status !== "active" || genMut.isPending}
                            onClick={() => genMut.mutate(r.id)}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                          {r.status === "paused" ? (
                            <Button
                              size="icon" variant="ghost" title="Retomar"
                              onClick={() => resumeMut.mutate(r.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon" variant="ghost" title="Pausar"
                              disabled={r.status !== "active"}
                              onClick={() => pauseMut.mutate(r.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon" variant="ghost" title="Editar regra"
                            onClick={() => setEditing(r)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" title="Cancelar" disabled={r.status === "cancelled"}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar cobrança recorrente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Nenhuma nova fatura será emitida para {r.student?.name ?? "este aluno"}.
                                  As faturas já geradas continuam válidas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => cancelMut.mutate(r.id)}>
                                  Cancelar cobrança
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditRecurringDialog
        row={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => { setEditing(null); invalidate(); }}
        updateFn={updateFn}
      />
    </div>
  );
}

function EditRecurringDialog({
  row,
  onOpenChange,
  onSaved,
  updateFn,
}: {
  row: any | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  updateFn: (args: { data: any }) => Promise<any>;
}) {
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [customDays, setCustomDays] = useState<string>("");
  const [dueDay, setDueDay] = useState<string>("5");
  const [amount, setAmount] = useState<string>("");
  const [installments, setInstallments] = useState<string>("");
  const [nextRun, setNextRun] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (row) {
      setFrequency((row.frequency ?? "monthly") as RecurringFrequency);
      setCustomDays(row.custom_days ? String(row.custom_days) : "");
      setDueDay(String(row.due_day ?? 5));
      setAmount(row.custom_amount != null ? String(row.custom_amount) : "");
      setInstallments(row.installments_total ? String(row.installments_total) : "");
      setNextRun(row.next_run_at ?? "");
      setNotes(row.notes ?? "");
    }
  }, [row]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: row.id,
          frequency,
          custom_days: frequency === "custom" ? Number(customDays) || 30 : null,
          custom_amount: amount === "" ? null : Number(amount),
          due_day: Math.max(1, Math.min(31, Number(dueDay) || 5)),
          installments_total: installments === "" ? null : Number(installments),
          next_run_at: nextRun || null,
          notes: notes || null,
        },
      }),
    onSuccess: () => { toast.success("Regra atualizada"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cobrança recorrente</DialogTitle>
          <DialogDescription>
            {row?.student?.name} — {row?.plan?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {frequency === "custom" && (
              <div>
                <Label>Intervalo (dias)</Label>
                <Input
                  type="number" min={1} max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Dia do vencimento</Label>
              <Input
                type="number" min={1} max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
            <div>
              <Label>Valor personalizado (R$)</Label>
              <Input
                type="number" step="0.01" min={0}
                placeholder="Usa valor do plano"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Total de parcelas</Label>
              <Input
                type="number" min={1} max={240}
                placeholder="Ilimitado"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
            <div>
              <Label>Próximo ciclo</Label>
              <Input
                type="date"
                value={nextRun}
                onChange={(e) => setNextRun(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Input
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas para essa cobrança"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
