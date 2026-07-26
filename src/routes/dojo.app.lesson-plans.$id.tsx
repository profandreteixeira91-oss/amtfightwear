import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getLessonPlan,
  upsertLessonPlan,
  deleteLessonPlan,
  bulkDuplicateLessonPlan,
  upsertLessonTemplate,
  listClassesForPicker,
  listClassStudentsForAttendance,
  registerLessonDelivery,
} from "@/lib/dojo/lesson-plans.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronLeft, Save, Copy, BookmarkPlus, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableRow, DragHandle } from "@/components/dojo/lesson-plans/SortableBlock";

export const Route = createFileRoute("/dojo/app/lesson-plans/$id")({
  component: LessonEditorPage,
});

type Block = {
  id: string;
  kind: "warmup" | "stretching" | "fundamentals" | "techniques" | "exercises" | "sparring" | "conditioning" | "closing" | "custom";
  title: string;
  duration_min: number | null;
  description: string;
  items: { id: string; name: string; description?: string | null; time_min?: number | null; reps?: string | null; sets?: string | null; intensity?: string | null }[];
};

const BLOCK_KINDS: { value: Block["kind"]; label: string }[] = [
  { value: "warmup", label: "Aquecimento" },
  { value: "stretching", label: "Alongamento" },
  { value: "fundamentals", label: "Fundamentos" },
  { value: "techniques", label: "Técnicas" },
  { value: "exercises", label: "Exercícios" },
  { value: "sparring", label: "Sparring / Randori" },
  { value: "conditioning", label: "Condicionamento físico" },
  { value: "closing", label: "Encerramento" },
  { value: "custom", label: "Personalizado" },
];

function LessonEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getLessonPlan);
  const upsertFn = useServerFn(upsertLessonPlan);
  const deleteFn = useServerFn(deleteLessonPlan);

  const { data: plan, refetch } = useQuery({
    queryKey: ["lesson-plan", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [form, setForm] = useState<{
    title: string;
    modality: string;
    category: string;
    age_range: string;
    location: string;
    date: string;
    start_time: string;
    end_time: string;
    duration_min: number | null;
    status: "planejada" | "ministrada" | "cancelada" | "reagendada";
    color: string;
    objectives: string;
    notes: string;
    blocks: Block[];
    class_id: string | null;
    teacher_id: string | null;
    unit_id: string | null;
  } | null>(null);

  useEffect(() => {
    if (!plan) return;
    setForm({
      title: plan.title ?? "",
      modality: plan.modality ?? "",
      category: plan.category ?? "",
      age_range: plan.age_range ?? "",
      location: plan.location ?? "",
      date: (plan.date as string) ?? "",
      start_time: (plan.start_time as string | null) ?? "",
      end_time: (plan.end_time as string | null) ?? "",
      duration_min: (plan.duration_min as number | null) ?? null,
      status: (plan.status as "planejada" | "ministrada" | "cancelada" | "reagendada") ?? "planejada",
      color: plan.color ?? "#dc2626",
      objectives: plan.objectives ?? "",
      notes: plan.notes ?? "",
      blocks: (Array.isArray(plan.blocks) ? (plan.blocks as unknown as Block[]) : []) ?? [],
      class_id: (plan.class_id as string | null) ?? null,
      teacher_id: (plan.teacher_id as string | null) ?? null,
      unit_id: (plan.unit_id as string | null) ?? null,
    });
  }, [plan]);

  const save = useMutation({
    mutationFn: (payload: NonNullable<typeof form>) =>
      upsertFn({
        data: {
          id,
          title: payload.title,
          modality: payload.modality || null,
          category: payload.category || null,
          age_range: payload.age_range || null,
          location: payload.location || null,
          date: payload.date,
          start_time: payload.start_time || null,
          end_time: payload.end_time || null,
          duration_min: payload.duration_min ?? null,
          status: payload.status,
          color: payload.color || null,
          objectives: payload.objectives || null,
          notes: payload.notes || null,
          blocks: payload.blocks,
          class_id: payload.class_id,
          teacher_id: payload.teacher_id,
          unit_id: payload.unit_id,
        },
      }),
    onSuccess: () => {
      refetch();
    },
  });

  // AUTOSAVE (debounce 1s)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (!form) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      save.mutate(form);
    }, 1200);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano excluído");
      navigate({ to: "/dojo/app/lesson-plans" });
    },
  });

  const bulkDupFn = useServerFn(bulkDuplicateLessonPlan);
  const bulkDup = useMutation({
    mutationFn: (input: { mode: "weekly" | "biweekly" | "monthly"; occurrences: number }) =>
      bulkDupFn({ data: { id, ...input } }),
    onSuccess: (r) => toast.success(`${r.created} aulas criadas`),
  });

  const saveTplFn = useServerFn(upsertLessonTemplate);
  const saveTpl = useMutation({
    mutationFn: (name: string) =>
      saveTplFn({
        data: {
          name,
          description: form?.objectives || null,
          modality: form?.modality || null,
          category: form?.category || null,
          age_range: form?.age_range || null,
          color: form?.color || null,
          objectives: form?.objectives || null,
          duration_min: form?.duration_min ?? null,
          blocks: (form?.blocks ?? []) as never,
        },
      }),
    onSuccess: () => toast.success("Modelo salvo na sua biblioteca"),
  });

  const classesFn = useServerFn(listClassesForPicker);
  const { data: classes } = useQuery({
    queryKey: ["lesson-plans", "classes-picker"],
    queryFn: () => classesFn({}),
  });

  const registerFn = useServerFn(registerLessonDelivery);
  const register = useMutation({
    mutationFn: (input: { presentStudentIds: string[]; absentStudentIds: string[]; notes: string; mediaUrls: string[] }) =>
      registerFn({ data: { planId: id, ...input } }),
    onSuccess: () => {
      toast.success("Aula registrada com presenças");
      refetch();
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!form) return <div className="p-6 text-sm text-muted-foreground">Carregando plano…</div>;

  const patch = (p: Partial<typeof form>) => setForm({ ...form, ...p });

  const addBlock = () =>
    patch({
      blocks: [
        ...form.blocks,
        { id: crypto.randomUUID(), kind: "custom", title: "Novo bloco", duration_min: 10, description: "", items: [] },
      ],
    });

  const updateBlock = (bid: string, upd: Partial<Block>) =>
    patch({ blocks: form.blocks.map((b) => (b.id === bid ? { ...b, ...upd } : b)) });

  const removeBlock = (bid: string) => patch({ blocks: form.blocks.filter((b) => b.id !== bid) });

  const reorderBlocks = (activeId: string, overId: string) => {
    const oldIdx = form.blocks.findIndex((b) => b.id === activeId);
    const newIdx = form.blocks.findIndex((b) => b.id === overId);
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
    patch({ blocks: arrayMove(form.blocks, oldIdx, newIdx) });
  };

  const reorderItems = (bid: string, activeId: string, overId: string) => {
    const block = form.blocks.find((b) => b.id === bid);
    if (!block) return;
    const oldIdx = block.items.findIndex((i) => i.id === activeId);
    const newIdx = block.items.findIndex((i) => i.id === overId);
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
    updateBlock(bid, { items: arrayMove(block.items, oldIdx, newIdx) });
  };

  const addItem = (bid: string) =>
    updateBlock(bid, {
      items: [
        ...(form.blocks.find((b) => b.id === bid)?.items ?? []),
        { id: crypto.randomUUID(), name: "", description: "" },
      ],
    });

  const updateItem = (bid: string, iid: string, upd: Partial<Block["items"][number]>) => {
    const block = form.blocks.find((b) => b.id === bid);
    if (!block) return;
    updateBlock(bid, {
      items: block.items.map((it) => (it.id === iid ? { ...it, ...upd } : it)),
    });
  };

  const removeItem = (bid: string, iid: string) => {
    const block = form.blocks.find((b) => b.id === bid);
    if (!block) return;
    updateBlock(bid, { items: block.items.filter((it) => it.id !== iid) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dojo/app/lesson-plans" })}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {save.isPending ? "Salvando…" : save.isSuccess ? "Salvo automaticamente" : ""}
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <BookmarkPlus className="mr-1 h-4 w-4" /> Salvar como modelo
              </Button>
            </DialogTrigger>
            <SaveTemplateDialog defaultName={form.title} onSave={(name) => saveTpl.mutate(name)} />
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Copy className="mr-1 h-4 w-4" /> Duplicar em massa
              </Button>
            </DialogTrigger>
            <BulkDuplicateDialog onConfirm={(input) => bulkDup.mutate(input)} pending={bulkDup.isPending} />
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                <ClipboardCheck className="mr-1 h-4 w-4" /> Registrar aula ministrada
              </Button>
            </DialogTrigger>
            <RegisterDeliveryDialog
              classId={form.class_id}
              pending={register.isPending}
              onConfirm={(input) => register.mutate(input)}
            />
          </Dialog>
          <Button size="sm" onClick={() => save.mutate(form)} disabled={save.isPending}>
            <Save className="mr-1 h-4 w-4" /> Salvar agora
          </Button>
          <Button size="sm" variant="destructive" onClick={() => remove.mutate()}>
            <Trash2 className="mr-1 h-4 w-4" /> Excluir
          </Button>
        </div>
      </div>

      {/* HEADER */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Informações gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Turma</Label>
            <Select
              value={form.class_id ?? "__none"}
              onValueChange={(v) => {
                if (v === "__none") {
                  patch({ class_id: null });
                  return;
                }
                const c = (classes ?? []).find((x) => (x.id as string) === v);
                patch({
                  class_id: v,
                  teacher_id: (c?.teacher_id as string | null) ?? form.teacher_id,
                  unit_id: (c?.unit_id as string | null) ?? form.unit_id,
                  modality: form.modality || (c?.modality as string) || "",
                  color: form.color || (c?.color as string) || "#dc2626",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vincular a uma turma (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem turma</SelectItem>
                {(classes ?? []).map((c) => (
                  <SelectItem key={c.id as string} value={c.id as string}>
                    {c.name as string}
                    {(c.dojo_team_members as { full_name?: string } | null)?.full_name
                      ? ` · ${(c.dojo_team_members as { full_name?: string }).full_name}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Vincular a turma autopreenche professor, unidade e habilita a chamada automática em "Registrar aula".
            </p>
          </div>
          <div>
            <Label>Modalidade</Label>
            <Input value={form.modality} onChange={(e) => patch({ modality: e.target.value })} placeholder="Judô, Jiu-Jitsu, Muay Thai…" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => patch({ category: e.target.value })} placeholder="Infantil, adulto, competição…" />
          </div>
          <div>
            <Label>Faixa etária</Label>
            <Input value={form.age_range} onChange={(e) => patch({ age_range: e.target.value })} placeholder="6-10 anos, todas as idades…" />
          </div>
          <div>
            <Label>Local</Label>
            <Input value={form.location} onChange={(e) => patch({ location: e.target.value })} />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Início</Label>
              <Input type="time" value={form.start_time} onChange={(e) => patch({ start_time: e.target.value })} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" value={form.end_time} onChange={(e) => patch({ end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Carga horária (min)</Label>
            <Input
              type="number"
              value={form.duration_min ?? ""}
              onChange={(e) => patch({ duration_min: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => patch({ status: v as typeof form.status })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="ministrada">Ministrada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="reagendada">Reagendada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cor</Label>
            <Input type="color" value={form.color} onChange={(e) => patch({ color: e.target.value })} className="h-10 w-24" />
          </div>
          <div className="md:col-span-2">
            <Label>Objetivos da aula</Label>
            <Textarea
              rows={3}
              value={form.objectives}
              onChange={(e) => patch({ objectives: e.target.value })}
              placeholder="Desenvolver equilíbrio, treinar raspagens, revisão técnica, preparação para exame…"
            />
          </div>
        </CardContent>
      </Card>

      {/* BLOCOS */}
      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="min-w-0 truncate">Estrutura da aula</CardTitle>
          <Button size="sm" onClick={addBlock} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Adicionar bloco
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) => {
              if (e.over && e.active.id !== e.over.id) reorderBlocks(String(e.active.id), String(e.over.id));
            }}
          >
            <SortableContext items={form.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {form.blocks.map((b) => (
                <SortableRow key={b.id} id={b.id}>
                  {({ listeners, attributes }) => (
                    <div className="rounded-lg border bg-card p-3">
                      <div className="mb-2 flex items-start gap-2">
                        <DragHandle listeners={listeners as Record<string, unknown>} attributes={attributes as unknown as Record<string, unknown>} />
                        <Select value={b.kind} onValueChange={(v) => updateBlock(b.id, { kind: v as Block["kind"] })}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOCK_KINDS.map((k) => (
                              <SelectItem key={k.value} value={k.value}>
                                {k.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
                          value={b.title}
                          onChange={(e) => updateBlock(b.id, { title: e.target.value })}
                          placeholder="Título do bloco"
                        />
                        <Input
                          type="number"
                          className="w-24"
                          value={b.duration_min ?? ""}
                          onChange={(e) => updateBlock(b.id, { duration_min: e.target.value ? Number(e.target.value) : null })}
                          placeholder="min"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeBlock(b.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        value={b.description}
                        onChange={(e) => updateBlock(b.id, { description: e.target.value })}
                        placeholder="Descrição, orientações e objetivos do bloco…"
                      />
                      <div className="mt-3 space-y-2">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e: DragEndEvent) => {
                            if (e.over && e.active.id !== e.over.id) reorderItems(b.id, String(e.active.id), String(e.over.id));
                          }}
                        >
                          <SortableContext items={b.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                            {b.items.map((it) => (
                              <SortableRow key={it.id} id={it.id}>
                                {({ listeners: iL, attributes: iA }) => (
                                  <div className="grid grid-cols-12 items-center gap-2 rounded border bg-muted/30 p-2 text-sm">
                                    <div className="col-span-1 flex justify-center">
                                      <DragHandle listeners={iL as Record<string, unknown>} attributes={iA as unknown as Record<string, unknown>} />
                                    </div>
                                    <Input
                                      className="col-span-3"
                                      value={it.name}
                                      onChange={(e) => updateItem(b.id, it.id, { name: e.target.value })}
                                      placeholder="Exercício / técnica"
                                    />
                                    <Input
                                      className="col-span-4"
                                      value={it.description ?? ""}
                                      onChange={(e) => updateItem(b.id, it.id, { description: e.target.value })}
                                      placeholder="Descrição"
                                    />
                                    <Input
                                      className="col-span-1"
                                      value={it.time_min ?? ""}
                                      onChange={(e) => updateItem(b.id, it.id, { time_min: e.target.value ? Number(e.target.value) : null })}
                                      placeholder="min"
                                      type="number"
                                    />
                                    <Input
                                      className="col-span-1"
                                      value={it.reps ?? ""}
                                      onChange={(e) => updateItem(b.id, it.id, { reps: e.target.value })}
                                      placeholder="rep"
                                    />
                                    <Input
                                      className="col-span-1"
                                      value={it.sets ?? ""}
                                      onChange={(e) => updateItem(b.id, it.id, { sets: e.target.value })}
                                      placeholder="sér"
                                    />
                                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeItem(b.id, it.id)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                )}
                              </SortableRow>
                            ))}
                          </SortableContext>
                        </DndContext>
                        <Button size="sm" variant="outline" onClick={() => addItem(b.id)}>
                          <Plus className="mr-1 h-3 w-3" /> Adicionar item
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableRow>
              ))}
            </SortableContext>
          </DndContext>
          {form.blocks.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum bloco. Adicione aquecimento, técnicas, sparring…
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Observações e feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Anotações internas, feedback dos alunos, avisos, tarefas para casa…"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SaveTemplateDialog({ defaultName, onSave }: { defaultName: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(defaultName || "Novo modelo");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Salvar como modelo</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Nome do modelo</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          O modelo copia estrutura de blocos, modalidade, cor e objetivos. Reutilize ao criar novas aulas.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(name)} disabled={!name.trim()}>
          Salvar modelo
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function BulkDuplicateDialog({
  onConfirm,
  pending,
}: {
  onConfirm: (input: { mode: "weekly" | "biweekly" | "monthly"; occurrences: number }) => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [occurrences, setOccurrences] = useState(4);
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Duplicar em massa</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Frequência</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal (mesmo dia da semana)</SelectItem>
              <SelectItem value="biweekly">Quinzenal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantidade de repetições</Label>
          <Input
            type="number"
            min={1}
            max={52}
            value={occurrences}
            onChange={(e) => setOccurrences(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cria {occurrences} aulas idênticas a esta, mantendo horário, blocos e turma.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onConfirm({ mode, occurrences })} disabled={pending}>
          {pending ? "Duplicando…" : "Duplicar aulas"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RegisterDeliveryDialog({
  classId,
  pending,
  onConfirm,
}: {
  classId: string | null;
  pending: boolean;
  onConfirm: (input: { presentStudentIds: string[]; absentStudentIds: string[]; notes: string; mediaUrls: string[] }) => void;
}) {
  const studentsFn = useServerFn(listClassStudentsForAttendance);
  const { data: students } = useQuery({
    queryKey: ["lesson-plans", "class-students", classId ?? "none"],
    queryFn: () => (classId ? studentsFn({ data: { classId } }) : Promise.resolve([])),
    enabled: !!classId,
  });
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [media, setMedia] = useState("");

  useEffect(() => {
    if (students) {
      const initial: Record<string, boolean> = {};
      for (const s of students) initial[s.id] = true;
      setPresent(initial);
    }
  }, [students]);

  const toggleAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    for (const s of students ?? []) next[s.id] = v;
    setPresent(next);
  };

  const presentIds = Object.entries(present).filter(([, v]) => v).map(([k]) => k);
  const absentIds = (students ?? []).map((s) => s.id).filter((id) => !present[id]);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Registrar aula ministrada</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {!classId ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Vincule esta aula a uma turma para carregar a lista de alunos. Você ainda pode registrar sem chamada.
          </div>
        ) : !students?.length ? (
          <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhum aluno matriculado nesta turma.
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Chamada ({presentIds.length}/{students.length} presentes)</div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggleAll(true)}>Todos</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>Ninguém</Button>
              </div>
            </div>
            <div className="max-h-72 divide-y overflow-y-auto rounded border">
              {students.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-3 p-2 hover:bg-muted/50">
                  <Checkbox
                    checked={!!present[s.id]}
                    onCheckedChange={(v) => setPresent({ ...present, [s.id]: !!v })}
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{s.full_name}</div>
                    {s.modality ? <div className="text-[11px] text-muted-foreground">{s.modality}</div> : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label>Observações da aula</Label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="O que foi trabalhado, destaques, alunos em evolução, tarefas para casa…"
          />
        </div>
        <div>
          <Label>Mídia (URLs separadas por vírgula)</Label>
          <Input
            value={media}
            onChange={(e) => setMedia(e.target.value)}
            placeholder="https://…foto1.jpg, https://…video.mp4"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onConfirm({
              presentStudentIds: presentIds,
              absentStudentIds: absentIds,
              notes,
              mediaUrls: media.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {pending ? "Registrando…" : "Registrar aula"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
