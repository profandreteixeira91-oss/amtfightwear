import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  listEvalSessions, listEvalTemplates, createEvalSession, deleteEvalSession,
} from "@/lib/dojo/evaluations.functions";
import { listDojoStudents } from "@/lib/dojo/dojo.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Play, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/evaluations/sessions/")({
  component: SessionsList,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  in_progress: "Em andamento",
  done: "Concluída",
  failed: "Falhou",
  review: "Em revisão",
};
const RESULT_LABEL: Record<string, string> = {
  approved: "Aprovado",
  failed: "Reprovado",
  review: "Revisão",
  conditional: "Aprovado c/ ressalvas",
};
const RESULT_COLOR: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  review: "bg-amber-100 text-amber-800",
  conditional: "bg-blue-100 text-blue-800",
};

function SessionsList() {
  const listFn = useServerFn(listEvalSessions);
  const tplFn = useServerFn(listEvalTemplates);
  const studFn = useServerFn(listDojoStudents);
  const createFn = useServerFn(createEvalSession);
  const delFn = useServerFn(deleteEvalSession);
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["eval-sessions"], queryFn: () => listFn() });
  const { data: templates } = useQuery({ queryKey: ["eval-templates"], queryFn: () => tplFn() });
  const { data: students } = useQuery({ queryKey: ["dojo-students"], queryFn: () => studFn() });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSess, setNewSess] = useState({ template_id: "", student_id: "" });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((r: any) => {
      if (status !== "all" && r.status !== status) return false;
      if (q) {
        const hay = `${r.student?.full_name ?? ""} ${r.template?.title ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, q, status]);

  const create = async () => {
    if (!newSess.template_id || !newSess.student_id) return toast.error("Selecione modelo e aluno");
    try {
      const res = await createFn({ data: newSess });
      setDialogOpen(false);
      setNewSess({ template_id: "", student_id: "" });
      qc.invalidateQueries({ queryKey: ["eval-sessions"] });
      nav({ to: "/dojo/app/evaluations/sessions/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    try {
      await delFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["eval-sessions"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Minhas avaliações</h2>
          <p className="text-sm text-muted-foreground">Avaliações executadas ou agendadas com seus alunos.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nova avaliação</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
            <DialogHeader><DialogTitle>Nova avaliação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Modelo</label>
                <select className="border rounded p-2 bg-background w-full" value={newSess.template_id} onChange={(e) => setNewSess({ ...newSess, template_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {(templates ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Aluno</label>
                <select className="border rounded p-2 bg-background w-full" value={newSess.student_id} onChange={(e) => setNewSess({ ...newSess, student_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {(students ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Criar e iniciar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por aluno ou modelo..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 bg-background text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{s.student?.full_name ?? "Aluno"}</div>
                <div className="text-xs text-muted-foreground">
                  {s.template?.title ?? "Sem modelo"} · {new Date(s.updated_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="text-sm">
                {s.total_score} / {s.max_score} <span className="text-muted-foreground">({s.percentage}%)</span>
              </div>
              <Badge variant="outline">{STATUS_LABEL[s.status] ?? s.status}</Badge>
              {s.result && (
                <span className={`text-xs px-2 py-1 rounded-full ${RESULT_COLOR[s.result] ?? "bg-muted"}`}>
                  {RESULT_LABEL[s.result]}
                </span>
              )}
              <Link to="/dojo/app/evaluations/sessions/$id" params={{ id: s.id }}>
                <Button size="sm" variant="outline">
                  <Play className="h-3.5 w-3.5 mr-1" /> Abrir
                </Button>
              </Link>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground p-8 text-center border rounded">
            Nenhuma avaliação encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
