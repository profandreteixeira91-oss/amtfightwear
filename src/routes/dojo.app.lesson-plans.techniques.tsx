import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listTechniques,
  upsertTechnique,
  deleteTechnique,
  getTechniquePresets,
  type TechniqueInput,
} from "@/lib/dojo/lesson-plans.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/lesson-plans/techniques")({
  component: TechniquesPage,
});

type Tech = Awaited<ReturnType<typeof listTechniques>>[number];

function TechniquesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTechniques);
  const presetsFn = useServerFn(getTechniquePresets);
  const upsertFn = useServerFn(upsertTechnique);
  const deleteFn = useServerFn(deleteTechnique);

  const [modality, setModality] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tech | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["techniques", modality, search],
    queryFn: () => listFn({ data: { modality: modality || undefined, search: search || undefined } }),
  });
  const { data: presets } = useQuery({ queryKey: ["techniques-presets"], queryFn: () => presetsFn() });

  const upsert = useMutation({
    mutationFn: (payload: TechniqueInput) => upsertFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techniques"] });
      setOpen(false);
      setEditing(null);
      toast.success("Técnica salva");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["techniques"] }),
  });

  const importPresetGroup = useMutation({
    mutationFn: async (group: { modality: string; category: string; examples: string[] }) => {
      for (const name of group.examples) {
        await upsertFn({ data: { modality: group.modality, category: group.category, name } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techniques"] });
      toast.success("Técnicas importadas");
    },
  });

  const grouped: Record<string, Tech[]> = {};
  for (const t of rows ?? []) {
    const key = `${t.modality} · ${t.category ?? "Geral"}`;
    (grouped[key] ??= []).push(t);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="w-52" placeholder="Modalidade" value={modality} onChange={(e) => setModality(e.target.value)} />
        <Input className="flex-1 min-w-[200px]" placeholder="Buscar técnica…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Nova técnica
            </Button>
          </DialogTrigger>
          <TechDialog initial={editing} onSubmit={(p) => upsert.mutate(p)} pending={upsert.isPending} />
        </Dialog>
      </div>

      {/* PRESETS OPT-IN */}
      {(rows ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Catálogos sugeridos por modalidade</span>
              <span className="text-xs text-muted-foreground">— importe apenas o que fizer sentido para o seu dojo</span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {(presets ?? []).map((g) => (
                <div key={`${g.modality}-${g.category}`} className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">{g.modality}</div>
                  <div className="font-medium">{g.category}</div>
                  <div className="mt-1 text-xs text-muted-foreground truncate">{g.examples.join(", ")}</div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => importPresetGroup.mutate(g)}>
                    Importar {g.examples.length}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {Object.entries(grouped).map(([label, items]) => (
        <div key={label}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    {t.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                    ) : null}
                    <div className="mt-1 flex gap-2 text-[11px] text-muted-foreground">
                      {t.difficulty ? <span>Dif.: {t.difficulty}</span> : null}
                      {t.recommended_belt ? <span>Faixa: {t.recommended_belt}</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id as string)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TechDialog({
  initial,
  onSubmit,
  pending,
}: {
  initial: Tech | null;
  onSubmit: (data: TechniqueInput) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState({
    modality: initial?.modality ?? "",
    category: initial?.category ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    difficulty: initial?.difficulty ?? "",
    recommended_belt: initial?.recommended_belt ?? "",
    video_url: initial?.video_url ?? "",
    image_url: initial?.image_url ?? "",
    notes: initial?.notes ?? "",
  });
  return (
    <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar técnica" : "Nova técnica"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Modalidade</Label>
          <Input value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} />
        </div>
        <div>
          <Label>Categoria</Label>
          <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Descrição</Label>
          <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Dificuldade</Label>
          <Input value={form.difficulty ?? ""} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
        </div>
        <div>
          <Label>Faixa recomendada</Label>
          <Input value={form.recommended_belt ?? ""} onChange={(e) => setForm({ ...form, recommended_belt: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Vídeo (URL)</Label>
          <Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Imagem (URL)</Label>
          <Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={pending || !form.modality || !form.name}
          onClick={() =>
            onSubmit({
              id: initial?.id as string | undefined,
              modality: form.modality,
              category: form.category || null,
              name: form.name,
              description: form.description || null,
              difficulty: form.difficulty || null,
              recommended_belt: form.recommended_belt || null,
              video_url: form.video_url || null,
              image_url: form.image_url || null,
              notes: form.notes || null,
            })
          }
        >
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </DialogContent>
  );
}
