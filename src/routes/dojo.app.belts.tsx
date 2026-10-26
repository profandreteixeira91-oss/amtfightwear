import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listDojoBelts,
  saveDojoBelt,
  deleteDojoBelt,
  reorderDojoBelts,
  checkIsAdmin,
} from "@/lib/dojo/dojo.functions";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import { formatBeltName } from "@/lib/dojo/degree-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Shield, Layers, Sparkles, Info } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/dojo/app/belts")({
  head: () => ({ meta: [{ title: "Modalidades e Faixas — AMT Dojo Manager" }] }),
  component: BeltsPage,
});

const KNOWN_MODALITIES: Array<{ id: string; label: string }> = [
  { id: "jiu-jitsu", label: "Jiu-Jitsu" },
  { id: "karate", label: "Karatê" },
  { id: "taekwondo", label: "Taekwondo" },
  { id: "muay-thai", label: "Muay Thai" },
  { id: "judo", label: "Judô" },
];

type BeltRow = {
  id: string;
  name: string;
  color_hex: string;
  stripe_hex: string | null;
  sort_order: number;
  max_degrees: number;
  category: string;
  modality: string;
  owner_id: string | null;
  min_months: number | null;
  min_classes: number | null;
  criteria_mode: "time" | "classes" | "evaluation" | "merit";
};

const emptyForm = {
  id: undefined as string | undefined,
  modality: "jiu-jitsu",
  name: "",
  color_hex: "#F5F5F5",
  stripe_hex: "" as string,
  sort_order: 10,
  max_degrees: 0,
  category: "adult",
  min_months: "" as string,
  min_classes: "" as string,
  criteria_mode: "time" as "time" | "classes" | "evaluation" | "merit",
  scope: "own" as "own" | "global",
};

export function BeltsPage() {
  const listFn = useServerFn(listDojoBelts);
  const saveFn = useServerFn(saveDojoBelt);
  const delFn = useServerFn(deleteDojoBelt);
  const reorderFn = useServerFn(reorderDojoBelts);
  const adminFn = useServerFn(checkIsAdmin);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["dojo-belts"], queryFn: () => listFn() });
  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => adminFn() });
  const isAmtAdmin = Boolean((adminQ.data as any)?.isAmtAdmin);
  const isAdmin = isAmtAdmin;

  const [modality, setModality] = useState("jiu-jitsu");
  const [customModality, setCustomModality] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [localBelts, setLocalBelts] = useState<BeltRow[]>([]);

  const modalities = useMemo(() => {
    const set = new Set<string>(KNOWN_MODALITIES.map((m) => m.id));
    (q.data ?? []).forEach((b: any) => set.add(b.modality));
    return Array.from(set);
  }, [q.data]);

  const label = (id: string) => KNOWN_MODALITIES.find((m) => m.id === id)?.label ?? id;

  const belts: BeltRow[] = useMemo(
    () =>
      ((q.data ?? []) as BeltRow[])
        .filter((b) => b.modality === modality)
        .sort((a, b) => a.sort_order - b.sort_order),
    [q.data, modality]
  );

  useEffect(() => {
    setLocalBelts(belts);
  }, [belts]);

  const openNew = () => {
    setForm({ ...emptyForm, modality, scope: isAdmin ? "global" : "own" });
    setOpen(true);
  };
  const openEdit = (b: BeltRow) => {
    setForm({
      id: b.id,
      modality: b.modality,
      name: b.name,
      color_hex: b.color_hex,
      stripe_hex: b.stripe_hex ?? "",
      sort_order: b.sort_order,
      max_degrees: b.max_degrees,
      category: b.category ?? "adult",
      min_months: b.min_months != null ? String(b.min_months) : "",
      min_classes: b.min_classes != null ? String(b.min_classes) : "",
      criteria_mode: (b.criteria_mode ?? "time") as any,
      scope: b.owner_id ? "own" : "global",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    try {
      await saveFn({
        data: {
          ...form,
          stripe_hex: form.stripe_hex?.trim() ? form.stripe_hex : null,
          min_months: form.min_months?.toString().trim() === "" ? null : Number(form.min_months),
          min_classes: form.min_classes?.toString().trim() === "" ? null : Number(form.min_classes),
          criteria_mode: form.criteria_mode,
        } as any,
      });
      toast.success("Faixa salva");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["dojo-belts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta faixa? Alunos vinculados perderão a referência.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluída");
      qc.invalidateQueries({ queryKey: ["dojo-belts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    }
  };

  const addCustomModality = () => {
    const slug = customModality
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) return toast.error("Nome inválido");
    setModality(slug);
    setCustomModality("");
    setForm({ ...emptyForm, modality: slug, scope: isAdmin ? "global" : "own" });
    setOpen(true);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localBelts.findIndex((b) => b.id === active.id);
    const newIndex = localBelts.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(localBelts, oldIndex, newIndex).map((b, i) => ({
      ...b,
      sort_order: (i + 1) * 10,
    }));
    setLocalBelts(reordered);
    try {
      await reorderFn({
        data: { items: reordered.map((b) => ({ id: b.id, sort_order: b.sort_order })) },
      });
      qc.invalidateQueries({ queryKey: ["dojo-belts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao reordenar");
      setLocalBelts(belts);
    }
  };

  const allBelts: BeltRow[] = (q.data ?? []) as BeltRow[];
  const globalCount = localBelts.filter((b) => !b.owner_id).length;
  const ownCount = localBelts.filter((b) => Boolean(b.owner_id)).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#3a0a0a] text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <Shield className="h-3.5 w-3.5" /> Graduações
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Modalidades <span className="text-primary">&</span> Faixas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Gerencie as graduações de cada modalidade. Arraste pelo <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" /> para reordenar.
              {isAmtAdmin
                ? " Como administrador AMT, suas alterações em faixas globais propagam para todos os usuários do sistema."
                : " Faixas globais AMT são somente leitura; as faixas que você criar ficam salvas apenas no seu login."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:min-w-[280px]">
            <StatChip label="Modalidades" value={modalities.length} />
            <StatChip label="Faixas" value={allBelts.length} />
            <StatChip label="Nesta aba" value={localBelts.length} highlight />
          </div>
        </div>
      </section>

      {/* Modalidade */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" /> Modalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {modalities.map((m) => {
              const count = allBelts.filter((b) => b.modality === m).length;
              const active = modality === m;
              return (
                <button
                  key={m}
                  onClick={() => setModality(m)}
                  className={
                    "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all " +
                    (active
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(220,38,38,0.55)]"
                      : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5")
                  }
                >
                  <span>{label(m)}</span>
                  <span
                    className={
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold " +
                      (active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              placeholder="Nova modalidade (ex.: Kung Fu)"
              value={customModality}
              onChange={(e) => setCustomModality(e.target.value)}
              className="h-10 w-full rounded-xl sm:max-w-xs"
            />
            <Button size="sm" variant="outline" className="h-10 w-full rounded-xl sm:w-auto" onClick={addCustomModality}>
              <Plus className="mr-1 h-4 w-4" /> Criar modalidade e faixa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de faixas */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="truncate text-base font-bold tracking-tight sm:text-lg">{label(modality)}</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <Sparkles className="h-3 w-3 text-primary" /> {localBelts.length} faixa(s)
                </span>
                {globalCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                    {globalCount} global AMT
                  </span>
                )}
                {ownCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {ownCount} própria(s)
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" onClick={openNew} className="h-10 shrink-0 rounded-xl px-3 shadow-[0_6px_16px_-6px_rgba(220,38,38,0.55)] sm:px-4">
              <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Nova faixa</span><span className="ml-1 sm:hidden">Nova</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-transparent">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={localBelts.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-border/60">
                  {localBelts.map((b) => (
                    <SortableBeltRow key={b.id} belt={b} onEdit={openEdit} onRemove={remove} canEdit={isAmtAdmin || Boolean(b.owner_id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {localBelts.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium">Nenhuma faixa cadastrada para esta modalidade.</div>
                <div className="text-xs text-muted-foreground">Clique em <strong>Nova faixa</strong> para começar.</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar faixa" : "Nova faixa"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Modalidade</label>
              <Input
                value={form.modality}
                onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cor principal</label>
              <Input
                type="color"
                value={form.color_hex}
                onChange={(e) => setForm((f) => ({ ...f, color_hex: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Detalhe (opcional)</label>
              <Input
                type="color"
                value={form.stripe_hex || "#ffffff"}
                onChange={(e) => setForm((f) => ({ ...f, stripe_hex: e.target.value }))}
              />
              {form.stripe_hex && (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground underline mt-1"
                  onClick={() => setForm((f) => ({ ...f, stripe_hex: "" }))}
                >
                  remover detalhe
                </button>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ordem</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Máx. graus</label>
              <Input
                type="number"
                value={form.max_degrees}
                onChange={(e) => setForm((f) => ({ ...f, max_degrees: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2 rounded-md border border-dashed p-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Critério para próxima graduação
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Modo</label>
                <select
                  className="border rounded p-2 bg-background w-full"
                  value={form.criteria_mode}
                  onChange={(e) => setForm((f) => ({ ...f, criteria_mode: e.target.value as any }))}
                >
                  <option value="time">Tempo mínimo de permanência</option>
                  <option value="classes">Mínimo de aulas (check-ins)</option>
                  <option value="evaluation">Mediante avaliação</option>
                  <option value="merit">Mérito (decisão do instrutor)</option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Este é o critério <strong>universal</strong> para todos os alunos nesta faixa. Pode ser sobrescrito aluno a aluno na ficha individual.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Meses mínimos</label>
                  <Input
                    type="number"
                    min={0}
                    max={240}
                    placeholder="Ex.: 6, 12, 24…"
                    value={form.min_months}
                    onChange={(e) => setForm((f) => ({ ...f, min_months: e.target.value }))}
                    disabled={form.criteria_mode !== "time" && form.criteria_mode !== "classes"}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Aulas mínimas</label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    placeholder="Ex.: 60, 120…"
                    value={form.min_classes}
                    onChange={(e) => setForm((f) => ({ ...f, min_classes: e.target.value }))}
                    disabled={form.criteria_mode !== "classes" && form.criteria_mode !== "time"}
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2 flex flex-col items-start gap-3 rounded bg-muted/40 p-3 sm:flex-row sm:items-center">
              <div className="w-full overflow-x-auto sm:w-auto">
                <BeltAuto
                  belt={{
                    name: form.name,
                    modality: form.modality,
                    color_hex: form.color_hex,
                    stripe_hex: form.stripe_hex || null,
                    max_degrees: form.max_degrees,
                  }}
                  degree={0}
                  className="min-w-[220px]"
                />
              </div>
              <div className="text-xs text-muted-foreground">Pré-visualização</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableBeltRow({
  belt: b,
  onEdit,
  onRemove,
  canEdit = true,
}: {
  belt: BeltRow;
  onEdit: (b: BeltRow) => void;
  onRemove: (id: string) => void;
  canEdit?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const isGlobal = !b.owner_id;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 bg-background p-3 transition-colors hover:bg-primary/[0.03] sm:flex sm:flex-wrap sm:gap-4 sm:p-4"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/60 transition-colors hover:text-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
        {b.sort_order}
      </div>
      <div className="col-span-2 min-w-0 order-last w-full sm:order-none sm:col-span-1 sm:w-auto sm:flex-1 sm:min-w-0">
        <div className="mb-2 w-full overflow-x-auto sm:hidden">
          <div className="shrink-0 inline-block rounded-xl bg-gradient-to-b from-neutral-50 to-neutral-100 p-2 ring-1 ring-border/60 dark:from-neutral-900 dark:to-neutral-950">
            <BeltAuto belt={b as any} degree={0} className="min-w-[200px]" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-sm font-semibold tracking-tight">{formatBeltName(b.name, b.modality)}</div>
          <span
            className={
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
              (isGlobal ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary")
            }
          >
            {isGlobal ? "Global AMT" : "Própria"}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium">{b.max_degrees > 0 ? `${b.max_degrees} graus` : "sem graus"}</span>
          {b.min_months != null && (
            <>
              <span className="text-border">•</span>
              <span>{b.min_months} {b.min_months === 1 ? "mês" : "meses"}</span>
            </>
          )}
          {b.min_classes != null && (
            <>
              <span className="text-border">•</span>
              <span>{b.min_classes} aulas</span>
            </>
          )}
          {b.criteria_mode && b.criteria_mode !== "time" && (
            <>
              <span className="text-border">•</span>
              <span className="italic">
                {b.criteria_mode === "classes" ? "por aulas" : b.criteria_mode === "evaluation" ? "por avaliação" : "por mérito"}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 rounded-xl bg-gradient-to-b from-neutral-50 to-neutral-100 p-2 ring-1 ring-border/60 sm:block dark:from-neutral-900 dark:to-neutral-950">
        <BeltAuto belt={b as any} degree={0} className="min-w-[200px]" />
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-90 transition-opacity sm:opacity-70 sm:group-hover:opacity-100">
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 rounded-lg p-0 hover:bg-primary/10 hover:text-primary"
          onClick={() => onEdit(b)}
          disabled={!canEdit}
          title={canEdit ? "Editar" : "Faixa global AMT — somente leitura"}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 rounded-lg p-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemove(b.id)}
          disabled={!canEdit}
          title={canEdit ? "Excluir" : "Faixa global AMT — somente leitura"}
        >
          <Trash2 className={`h-4 w-4 ${canEdit ? "" : "text-muted-foreground"}`} />
        </Button>
      </div>
    </div>
  );
}

function StatChip({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-2xl border px-3 py-2 backdrop-blur transition-colors " +
        (highlight
          ? "border-primary/40 bg-primary/15 text-white"
          : "border-white/10 bg-white/5 text-white/85")
      }
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</div>
      <div className="mt-0.5 text-2xl font-black tabular-nums leading-none">{value}</div>
    </div>
  );
}
