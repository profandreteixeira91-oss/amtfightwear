import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { listKbArticles, upsertKbArticle, deleteKbArticle } from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales/kb")({
  component: KbPage,
});

type Article = { id: string; title: string; body_md: string; tags: string[]; is_active: boolean };

function KbPage() {
  const list = useServerFn(listKbArticles);
  const upsert = useServerFn(upsertKbArticle);
  const del = useServerFn(deleteKbArticle);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["sales-kb"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);

  const save = useMutation({
    mutationFn: async (a: Partial<Article>) =>
      upsert({
        data: {
          id: a.id,
          title: a.title ?? "",
          body_md: a.body_md ?? "",
          tags: a.tags ?? [],
          is_active: a.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Artigo salvo");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["sales-kb"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Artigo removido");
      qc.invalidateQueries({ queryKey: ["sales-kb"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Base de conhecimento"
        description="Políticas de frete, troca, tamanhos e pagamento consultadas pelo SalesBot."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditing({ title: "", body_md: "", tags: [], is_active: true })}
              >
                <Plus className="mr-2 h-4 w-4" /> Novo artigo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Editar artigo" : "Novo artigo"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input
                    value={editing?.title ?? ""}
                    onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Conteúdo (markdown)</Label>
                  <Textarea
                    rows={10}
                    value={editing?.body_md ?? ""}
                    onChange={(e) => setEditing((s) => ({ ...s, body_md: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Ativo</span>
                  <Switch
                    checked={editing?.is_active ?? true}
                    onCheckedChange={(v) => setEditing((s) => ({ ...s, is_active: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
                  {save.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard title="Artigos" description="O agente consulta estes artigos ao responder sobre políticas.">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sem artigos"
            description="Cadastre políticas oficiais (frete, troca, tabela de tamanhos) para o SalesBot usar."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((a) => (
              <li key={a.id} className="flex items-start justify-between py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.title}</span>
                    {!a.is_active && <span className="text-[10px] uppercase text-muted-foreground">inativo</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.body_md}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(a);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
