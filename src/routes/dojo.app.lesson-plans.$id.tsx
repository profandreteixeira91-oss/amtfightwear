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
import { Plus, Trash2, ChevronLeft, Save, Copy, BookmarkPlus } from "lucide-react";
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

  const moveBlock = (bid: string, dir: -1 | 1) => {
    const idx = form.blocks.findIndex((b) => b.id === bid);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= form.blocks.length) return;
    const next = [...form.blocks];
    [next[idx], next[to]] = [next[to], next[idx]];
    patch({ blocks: next });
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {save.isPending ? "Salvando…" : save.isSuccess ? "Salvo automaticamente" : ""}
          </span>
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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Estrutura da aula</CardTitle>
          <Button size="sm" onClick={addBlock}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar bloco
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.blocks.map((b, idx) => (
            <div key={b.id} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-start gap-2">
                <div className="flex flex-col text-muted-foreground">
                  <button className="hover:text-foreground" onClick={() => moveBlock(b.id, -1)} disabled={idx === 0}>
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
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
                <Button variant="ghost" size="icon" onClick={() => moveBlock(b.id, 1)} disabled={idx === form.blocks.length - 1}>
                  ↓
                </Button>
                <Button variant="ghost" size="icon" onClick={() => moveBlock(b.id, -1)} disabled={idx === 0}>
                  ↑
                </Button>
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
                {b.items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 rounded border bg-muted/30 p-2 text-sm">
                    <Input
                      className="col-span-4"
                      value={it.name}
                      onChange={(e) => updateItem(b.id, it.id, { name: e.target.value })}
                      placeholder="Exercício / técnica"
                    />
                    <Input
                      className="col-span-4"
                      value={it.description ?? ""}
                      onChange={(e) => updateItem(b.id, it.id, { description: e.target.value })}
                      placeholder="Descrição / observações"
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
                ))}
                <Button size="sm" variant="outline" onClick={() => addItem(b.id)}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar item
                </Button>
              </div>
            </div>
          ))}
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
