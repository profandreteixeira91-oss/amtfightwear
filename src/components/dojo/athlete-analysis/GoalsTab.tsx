import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, CheckCircle2, PauseCircle, PlayCircle, Target, CalendarClock, Flag,
  Trophy, GraduationCap, Activity, ClipboardCheck, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  listAthleteGoals, upsertAthleteGoal, setGoalStatus, updateGoalProgress,
  deleteAthleteGoal, listOwnerBeltsForGoals,
} from "@/lib/dojo/goals.functions";
import { todayISO } from "@/lib/dates";

type GoalType = "attendance" | "graduation" | "competition" | "evaluation" | "custom";

const TYPE_META: Record<GoalType, { label: string; icon: any; defaultUnit: string; hint: string }> = {
  attendance:  { label: "Frequência",  icon: Activity,        defaultUnit: "aulas",       hint: "Nº de check-ins presentes no período." },
  graduation:  { label: "Graduação",   icon: GraduationCap,   defaultUnit: "faixa",       hint: "Alcançar faixa/grau alvo." },
  competition: { label: "Competições", icon: Trophy,          defaultUnit: "campeonatos", hint: "Nº de competições disputadas." },
  evaluation:  { label: "Avaliação",   icon: ClipboardCheck,  defaultUnit: "%",           hint: "Nota mínima na próxima avaliação." },
  custom:      { label: "Personalizada", icon: Sparkles,      defaultUnit: "",            hint: "Meta livre com progresso manual." },
};

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  low:    { label: "Baixa",  className: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  medium: { label: "Média",  className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  high:   { label: "Alta",   className: "bg-red-500/15 text-red-700 border-red-500/30" },
};

const STATUS_META: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
  active:    { label: "Em andamento", variant: "default" },
  completed: { label: "Concluída",    variant: "secondary" },
  paused:    { label: "Pausada",      variant: "outline" },
  cancelled: { label: "Cancelada",    variant: "outline" },
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return String(v); }
}
function daysUntil(v?: string | null): number | null {
  if (!v) return null;
  const diff = new Date(v).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function GoalsTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAthleteGoals);
  const upsertFn = useServerFn(upsertAthleteGoal);
  const statusFn = useServerFn(setGoalStatus);
  const progFn = useServerFn(updateGoalProgress);
  const delFn = useServerFn(deleteAthleteGoal);
  const beltsFn = useServerFn(listOwnerBeltsForGoals);

  const goals = useQuery({
    queryKey: ["athlete", studentId, "goals"],
    queryFn: () => listFn({ data: { studentId } }),
  });
  const belts = useQuery({ queryKey: ["goals", "belts"], queryFn: () => beltsFn({}) });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["athlete", studentId, "goals"] });

  const upsert = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => { toast.success(editing ? "Meta atualizada" : "Meta criada"); setDialogOpen(false); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: any) => statusFn({ data: { id, status } }),
    onSuccess: () => invalidate(),
  });
  const updateProg = useMutation({
    mutationFn: ({ id, currentValue }: any) => progFn({ data: { id, currentValue } }),
    onSuccess: () => { invalidate(); toast.success("Progresso atualizado"); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Meta removida"); invalidate(); },
  });

  const stats = useMemo(() => {
    const list = goals.data ?? [];
    return {
      total: list.length,
      active: list.filter((g: any) => g.status === "active").length,
      completed: list.filter((g: any) => g.status === "completed").length,
      overdue: list.filter((g: any) => g.status === "active" && g.due_date && daysUntil(g.due_date)! < 0).length,
    };
  }, [goals.data]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (g: any) => { setEditing(g); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      {/* Header + stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="Total" value={stats.total} icon={Target} />
        <MiniStat label="Ativas" value={stats.active} icon={PlayCircle} />
        <MiniStat label="Concluídas" value={stats.completed} icon={CheckCircle2} />
        <MiniStat label="Atrasadas" value={stats.overdue} icon={Flag} tone={stats.overdue > 0 ? "warning" : undefined} />
      </div>

      <SectionCard
        title="Metas & Objetivos"
        description="Defina metas de frequência, graduação, competições ou personalizadas. Progresso calculado automaticamente."
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Nova meta
          </Button>
        }
      >
        {goals.isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : (goals.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Nenhuma meta cadastrada"
            description="Crie a primeira meta para acompanhar o desenvolvimento do atleta com prazos e progresso."
            icon={Target}
            action={<Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Criar meta</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {(goals.data ?? []).map((g: any) => (
              <GoalRow
                key={g.id}
                goal={g}
                onEdit={() => openEdit(g)}
                onToggleStatus={(status: any) => setStatus.mutate({ id: g.id, status })}
                onUpdateProgress={(v: any) => updateProg.mutate({ id: g.id, currentValue: v })}
                onDelete={() => { if (confirm(`Excluir a meta "${g.title}"?`)) remove.mutate(g.id); }}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studentId={studentId}
        editing={editing}
        belts={belts.data ?? []}
        onSubmit={(data: any) => upsert.mutate(data)}
        submitting={upsert.isPending}
      />
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone?: "warning" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warning" ? "border-amber-500/40 bg-amber-500/5" : "border-border/40 bg-muted/20"}`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <span>{label}</span><Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function GoalRow({ goal, onEdit, onToggleStatus, onUpdateProgress, onDelete }: any) {
  const meta = TYPE_META[goal.goal_type as GoalType] ?? TYPE_META.custom;
  const Icon = meta.icon;
  const target = Number(goal.target_value || 0);
  const current = Number(goal.current_value || 0);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const dLeft = daysUntil(goal.due_date);
  const overdue = goal.status === "active" && dLeft != null && dLeft < 0;
  const prio = PRIORITY_META[goal.priority] ?? PRIORITY_META.medium;
  const stt = STATUS_META[goal.status] ?? STATUS_META.active;

  const [manualOpen, setManualOpen] = useState(false);
  const [manualVal, setManualVal] = useState<string>(String(current));

  return (
    <li className={`rounded-xl border p-4 ${overdue ? "border-amber-500/50 bg-amber-500/5" : "border-border/40 bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-semibold">{goal.title}</div>
              <Badge variant={stt.variant} className="text-[10px]">{stt.label}</Badge>
              <Badge variant="outline" className={`text-[10px] ${prio.className}`}>Prioridade {prio.label}</Badge>
              {goal.auto_progress && goal.status === "active" && (
                <Badge variant="outline" className="text-[10px]"><Sparkles className="mr-1 h-2.5 w-2.5" />Auto</Badge>
              )}
            </div>
            {goal.description && <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{meta.label}</span>
              {goal.due_date && (
                <span className={overdue ? "font-semibold text-amber-700" : ""}>
                  <CalendarClock className="mr-1 inline h-3 w-3" />
                  Prazo: {fmtDate(goal.due_date)} {dLeft != null && (overdue ? `(${Math.abs(dLeft)}d atrasado)` : `(${dLeft}d restantes)`)}
                </span>
              )}
              <span>Início: {fmtDate(goal.start_date)}</span>
              {goal.completed_at && <span>Concluída em {fmtDate(goal.completed_at)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {goal.status === "active" && (
            <Button size="icon" variant="ghost" title="Pausar" onClick={() => onToggleStatus("paused")}>
              <PauseCircle className="h-4 w-4" />
            </Button>
          )}
          {goal.status === "paused" && (
            <Button size="icon" variant="ghost" title="Retomar" onClick={() => onToggleStatus("active")}>
              <PlayCircle className="h-4 w-4" />
            </Button>
          )}
          {goal.status !== "completed" && (
            <Button size="icon" variant="ghost" title="Marcar como concluída" onClick={() => onToggleStatus("completed")}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </Button>
          )}
          <Button size="icon" variant="ghost" title="Editar" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Excluir" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span className="tabular-nums">
            <span className="text-base font-bold text-foreground">{current}</span>
            <span> / {target} {goal.unit ?? meta.defaultUnit}</span>
            <span className="ml-2 text-foreground/70">({pct}%)</span>
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        {!goal.auto_progress && goal.status === "active" && (
          <div className="mt-2">
            {manualOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="h-8 w-32"
                  value={manualVal}
                  onChange={(e) => setManualVal(e.target.value)}
                />
                <Button size="sm" onClick={() => { onUpdateProgress(Number(manualVal || 0)); setManualOpen(false); }}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setManualOpen(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setManualVal(String(current)); setManualOpen(true); }}>
                Atualizar progresso
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function GoalDialog({ open, onOpenChange, studentId, editing, belts, onSubmit, submitting }: any) {
  const initial = useMemo(() => ({
    id: editing?.id,
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    goalType: (editing?.goal_type ?? "attendance") as GoalType,
    targetValue: Number(editing?.target_value ?? 12),
    unit: editing?.unit ?? "",
    startDate: editing?.start_date ?? todayISO(),
    dueDate: editing?.due_date ?? "",
    priority: editing?.priority ?? "medium",
    targetBeltId: editing?.target_belt_id ?? "",
    targetDegree: editing?.target_degree ?? "",
    autoProgress: editing?.auto_progress ?? true,
  }), [editing]);

  const [form, setForm] = useState<any>(initial);
  // Reset when opening
  useMemo(() => { setForm(initial); }, [initial, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.title?.trim()) return toast.error("Informe o título da meta");
    onSubmit({
      id: form.id,
      studentId,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      goalType: form.goalType,
      targetValue: Number(form.targetValue || 0),
      unit: form.unit?.trim() || null,
      startDate: form.startDate || undefined,
      dueDate: form.dueDate || null,
      priority: form.priority,
      targetBeltId: form.targetBeltId || null,
      targetDegree: form.targetDegree === "" || form.targetDegree == null ? null : Number(form.targetDegree),
      autoProgress: !!form.autoProgress,
    });
  };

  const meta = TYPE_META[form.goalType as GoalType] ?? TYPE_META.custom;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>Defina o objetivo, prazo e como o progresso será medido.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Chegar à faixa Azul" />
            </div>
            <div>
              <Label>Tipo de meta</Label>
              <Select value={form.goalType} onValueChange={(v) => set("goalType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{meta.hint}</p>
            </div>
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          {form.goalType === "graduation" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Faixa alvo</Label>
                <Select value={form.targetBeltId || undefined} onValueChange={(v) => set("targetBeltId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma faixa" /></SelectTrigger>
                  <SelectContent>
                    {belts.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.modality ? `${b.modality} — ` : ""}{b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grau alvo (opcional)</Label>
                <Input type="number" min={0} value={form.targetDegree ?? ""} onChange={(e) => set("targetDegree", e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Valor alvo *</Label>
              <Input type="number" min={0} value={form.targetValue} onChange={(e) => set("targetValue", e.target.value)} />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={form.unit} placeholder={meta.defaultUnit} onChange={(e) => set("unit", e.target.value)} />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Início</Label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div>
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>

          {form.goalType !== "custom" && (
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
              <div>
                <div className="text-sm font-medium">Progresso automático</div>
                <div className="text-xs text-muted-foreground">
                  Calculado com base nos dados do sistema ({meta.label.toLowerCase()}) desde a data de início.
                </div>
              </div>
              <Switch checked={!!form.autoProgress} onCheckedChange={(v) => set("autoProgress", v)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>{editing ? "Salvar alterações" : "Criar meta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
