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
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
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
  { id: "karate", label: "Karate" },
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

function BeltsPage() {
  const listFn = useServerFn(listDojoBelts);
  const saveFn = useServerFn(saveDojoBelt);
  const delFn = useServerFn(deleteDojoBelt);
  const reorderFn = useServerFn(reorderDojoBelts);
  const adminFn = useServerFn(checkIsAdmin);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["dojo-belts"], queryFn: () => listFn() });
  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => adminFn() });
  const isAdmin = Boolean(adminQ.data?.isAdmin);

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Modalidades e Faixas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as graduações de cada modalidade. Arraste pelo <GripVertical className="inline h-3 w-3" /> para reordenar.
            {isAdmin && " Como administrador AMT, suas alterações em faixas globais propagam para todos os usuários."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modalidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {modalities.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={modality === m ? "default" : "outline"}
                onClick={() => setModality(m)}
              >
                {label(m)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Nova modalidade (ex.: Kung Fu)"
              value={customModality}
              onChange={(e) => setCustomModality(e.target.value)}
              className="max-w-xs"
            />
            <Button size="sm" variant="outline" onClick={addCustomModality}>
              <Plus className="h-4 w-4 mr-1" /> Criar modalidade e faixa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {label(modality)} — {localBelts.length} faixa(s)
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nova faixa
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded divide-y">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={localBelts.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {localBelts.map((b) => (
                  <SortableBeltRow key={b.id} belt={b} onEdit={openEdit} onRemove={remove} />
                ))}
              </SortableContext>
            </DndContext>
            {localBelts.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma faixa cadastrada para esta modalidade.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar faixa" : "Nova faixa"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">
                Carência (opcional) — tempo mínimo em meses antes da próxima graduação
              </label>
              <Input
                type="number"
                min={0}
                max={240}
                placeholder="Ex.: 6, 12, 24… (deixe vazio para sem carência)"
                value={form.min_months}
                onChange={(e) => setForm((f) => ({ ...f, min_months: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Visibilidade</label>
              <select
                className="border rounded p-2 bg-background w-full"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as "own" | "global" }))}
                disabled={!isAdmin && form.scope !== "own"}
              >
                <option value="own">Somente meu dojo</option>
                <option value="global" disabled={!isAdmin}>
                  Global (todos os usuários){!isAdmin ? " — apenas admin AMT" : ""}
                </option>
              </select>
              {isAdmin && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Faixas globais são fixas e propagam para toda a base de dojos.
                </p>
              )}
            </div>
            <div className="col-span-2 flex items-center gap-3 bg-muted/40 p-3 rounded">
              <BeltVisual
                modality={form.modality}
                name={form.name}
                colorHex={form.color_hex}
                stripeHex={form.stripe_hex || null}
                degree={0}
                maxDegrees={form.max_degrees}
                className="min-w-[220px]"
              />
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
}: {
  belt: BeltRow;
  onEdit: (b: BeltRow) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 p-3 bg-background">
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-8 text-xs text-muted-foreground">{b.sort_order}</div>
      <BeltVisual
        modality={b.modality}
        name={b.name}
        colorHex={b.color_hex}
        stripeHex={b.stripe_hex}
        degree={0}
        maxDegrees={b.max_degrees}
        className="min-w-[220px]"
      />
      <div className="flex-1 min-w-[160px]">
        <div className="text-sm font-medium">{b.name}</div>
        <div className="text-xs text-muted-foreground">
          {b.max_degrees > 0 ? `${b.max_degrees} graus` : "sem graus"} · {b.owner_id ? "própria" : "global"}
          {b.min_months != null && ` · carência ${b.min_months} ${b.min_months === 1 ? "mês" : "meses"}`}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onEdit(b)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onRemove(b.id)}>
        <Trash2 className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  );
}
