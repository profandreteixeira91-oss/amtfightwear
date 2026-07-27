import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listContentLibrary,
  upsertContentLibrary,
  deleteContentLibrary,
  type ContentInput,
} from "@/lib/dojo/lesson-plans.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Pencil, Film, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/lesson-plans/library")({
  component: LibraryPage,
});

type Content = Awaited<ReturnType<typeof listContentLibrary>>[number];

function LibraryPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listContentLibrary);
  const upsertFn = useServerFn(upsertContentLibrary);
  const deleteFn = useServerFn(deleteContentLibrary);

  const [search, setSearch] = useState("");
  const [modality, setModality] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["lesson-content", search, modality],
    queryFn: () => listFn({ data: { search: search || undefined, modality: modality || undefined } }),
  });

  const upsert = useMutation({
    mutationFn: (payload: ContentInput) => upsertFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-content"] });
      setOpen(false);
      setEditing(null);
      toast.success("Conteúdo salvo");
    },
  });


  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-content"] });
      toast.success("Conteúdo excluído");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="h-9 pl-9 text-sm" placeholder="Buscar conteúdo…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input
          className="h-9 w-full text-sm sm:w-48"
          placeholder="Modalidade"
          value={modality}
          onChange={(e) => setModality(e.target.value)}
        />
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
              <Plus className="mr-1 h-4 w-4" /> Novo conteúdo
            </Button>
          </DialogTrigger>
          <ContentDialog
            initial={editing}
            onSubmit={(payload) => upsert.mutate(payload)}
            pending={upsert.isPending}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {(rows ?? []).map((c) => (
          <Card key={c.id} className="overflow-hidden">
            {c.image_url ? (
              <img src={c.image_url} alt={c.name} className="h-40 w-full object-cover" />
            ) : (
              <div className="grid h-40 w-full place-items-center bg-muted text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="break-words font-semibold leading-tight">{c.name}</div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{c.modality ?? "—"}</span>
                    {c.category && <span className="truncate">· {c.category}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id as string)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {c.description ? <p className="mt-2 break-words text-sm text-muted-foreground">{c.description}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {c.tags?.map((t) => (
                  <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                {c.video_url ? <Film className="h-3.5 w-3.5" /> : null}
                {c.pdf_url ? <FileText className="h-3.5 w-3.5" /> : null}
                {c.avg_time_min ? <span>{c.avg_time_min} min</span> : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {(rows ?? []).length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhum conteúdo cadastrado. Comece criando seu banco pedagógico permanente.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ContentDialog({
  initial,
  onSubmit,
  pending,
}: {
  initial: Content | null;
  onSubmit: (data: ContentInput) => void;
  pending: boolean;
}) {

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    modality: initial?.modality ?? "",
    description: initial?.description ?? "",
    image_url: initial?.image_url ?? "",
    video_url: initial?.video_url ?? "",
    pdf_url: initial?.pdf_url ?? "",
    tags: (initial?.tags ?? []).join(", "),
    avg_time_min: initial?.avg_time_min ?? null,
    recommended_belt: initial?.recommended_belt ?? "",
    recommended_age: initial?.recommended_age ?? "",
    technical_level: initial?.technical_level ?? "",
  });

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Modalidade</Label>
          <Input value={form.modality ?? ""} onChange={(e) => setForm({ ...form, modality: e.target.value })} />
        </div>
        <div>
          <Label>Categoria</Label>
          <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Imagem (URL)</Label>
          <Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div>
          <Label>Vídeo (URL)</Label>
          <Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
        </div>
        <div>
          <Label>PDF (URL)</Label>
          <Input value={form.pdf_url ?? ""} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} />
        </div>
        <div>
          <Label>Tags (separadas por vírgula)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div>
          <Label>Tempo médio (min)</Label>
          <Input
            type="number"
            value={form.avg_time_min ?? ""}
            onChange={(e) => setForm({ ...form, avg_time_min: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <Label>Faixa recomendada</Label>
          <Input value={form.recommended_belt ?? ""} onChange={(e) => setForm({ ...form, recommended_belt: e.target.value })} />
        </div>
        <div>
          <Label>Idade recomendada</Label>
          <Input value={form.recommended_age ?? ""} onChange={(e) => setForm({ ...form, recommended_age: e.target.value })} />
        </div>
        <div>
          <Label>Nível técnico</Label>
          <Input value={form.technical_level ?? ""} onChange={(e) => setForm({ ...form, technical_level: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={pending || !form.name}
          onClick={() =>
            onSubmit({
              id: initial?.id as string | undefined,
              name: form.name,
              category: form.category || null,
              modality: form.modality || null,
              description: form.description || null,
              image_url: form.image_url || null,
              video_url: form.video_url || null,
              pdf_url: form.pdf_url || null,
              tags: form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              avg_time_min: form.avg_time_min ?? null,
              recommended_belt: form.recommended_belt || null,
              recommended_age: form.recommended_age || null,
              technical_level: form.technical_level || null,
            })
          }
        >
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </DialogContent>
  );
}
