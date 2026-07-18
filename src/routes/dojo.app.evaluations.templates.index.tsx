import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listEvalTemplates, saveEvalTemplate, deleteEvalTemplate, duplicateEvalTemplate,
} from "@/lib/dojo/evaluations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/evaluations/templates/")({
  component: TemplatesList,
});

function TemplatesList() {
  const listFn = useServerFn(listEvalTemplates);
  const saveFn = useServerFn(saveEvalTemplate);
  const dupFn = useServerFn(duplicateEvalTemplate);
  const delFn = useServerFn(deleteEvalTemplate);
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["eval-templates"],
    queryFn: () => listFn(),
  });

  const createNew = async () => {
    try {
      const res = await saveFn({
        data: {
          title: "Novo modelo",
          method: "numeric",
          degree: 0,
          structure: { categories: [] },
        },
      });
      nav({ to: "/dojo/app/evaluations/templates/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const duplicate = async (id: string) => {
    try {
      const res = await dupFn({ data: { id } });
      toast.success("Duplicado");
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
      nav({ to: "/dojo/app/evaluations/templates/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modelos personalizados</h2>
          <p className="text-sm text-muted-foreground">
            Crie e edite seus próprios modelos de avaliação.
          </p>
        </div>
        <Button onClick={createNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo modelo
        </Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((t: any) => {
          const catCount = t.structure?.categories?.length ?? 0;
          const critCount = (t.structure?.categories ?? []).reduce(
            (s: number, c: any) => s + (c.criteria?.length ?? 0),
            0,
          );
          return (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  {!t.active && <Badge variant="outline">Inativo</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {t.modality ?? "Sem modalidade"} · v{t.version} · método {t.method}
                </div>
                <div className="text-xs text-muted-foreground">
                  {catCount} categorias · {critCount} critérios · {t.total_score ?? 0} pts
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/dojo/app/evaluations/templates/$id"
                    params={{ id: t.id }}
                    className="flex-1"
                  >
                    <Button size="sm" variant="outline" className="w-full">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => duplicate(t.id)} title="Duplicar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground p-8 text-center border rounded">
            Nenhum modelo criado ainda. Use a biblioteca ou crie um novo modelo.
          </div>
        )}
      </div>
    </div>
  );
}
