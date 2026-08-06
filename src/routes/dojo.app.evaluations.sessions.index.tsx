import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
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
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new ? 1 : undefined }) as { new?: 1 },
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
  approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border border-red-500/30",
  review: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  conditional: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
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
  const search = useSearch({ from: "/dojo/app/evaluations/sessions/" });
  useEffect(() => {
    if (search?.new) {
      setDialogOpen(true);
      nav({ to: "/dojo/app/evaluations/sessions", search: {} as never, replace: true });
    }
  }, [search?.new]);

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
    <div className="mx-auto w-full max-w-4xl space-y-5 p-2 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white">Minhas Avaliações</h2>
          <p className="text-sm text-neutral-400">Gerencie as sessões de avaliação dos seus alunos.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full bg-red-600 font-bold hover:bg-red-700 sm:w-auto">
              <Plus className="h-5 w-5 mr-2" /> Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg border-white/10 bg-neutral-900 text-white">
            <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Nova Avaliação</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Modelo de Avaliação</label>
                <select className="h-11 border-white/10 rounded-lg p-2 bg-neutral-950 w-full text-sm focus:ring-red-500" value={newSess.template_id} onChange={(e) => setNewSess({ ...newSess, template_id: e.target.value })}>
                  <option value="">Selecione um modelo...</option>
                  {(templates ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Aluno</label>
                <select className="h-11 border-white/10 rounded-lg p-2 bg-neutral-950 w-full text-sm focus:ring-red-500" value={newSess.student_id} onChange={(e) => setNewSess({ ...newSess, student_id: e.target.value })}>
                  <option value="">Selecione um aluno...</option>
                  {(students ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" className="hover:bg-white/5" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={create}>Criar e Iniciar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input 
            className="h-11 border-white/10 bg-neutral-900/50 pl-10 text-sm focus:ring-red-500" 
            placeholder="Buscar por aluno ou modelo..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
        <select 
          className="h-11 rounded-lg border border-white/10 bg-neutral-900/50 px-4 text-sm text-white focus:ring-red-500 sm:w-48" 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {filtered.map((s: any) => (
          <Card key={s.id} className="overflow-hidden border-white/10 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white leading-tight truncate">{s.student?.full_name ?? "Aluno"}</div>
                <div className="mt-1 text-xs text-neutral-500 flex flex-wrap gap-x-2 gap-y-1">
                  <span className="truncate">{s.template?.title ?? "Sem modelo"}</span>
                  <span className="hidden sm:inline text-neutral-700">•</span>
                  <span>{new Date(s.updated_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
                <div className="text-sm font-black text-white">
                  {s.total_score} / {s.max_score} <span className="text-[10px] font-bold text-neutral-500">({s.percentage}%)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-6 border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                  {s.result && (
                    <Badge className={`h-6 text-[10px] font-bold uppercase tracking-wider ${RESULT_COLOR[s.result] ?? "bg-neutral-800 text-neutral-400"}`}>
                      {RESULT_LABEL[s.result]}
                    </Badge>
                  )}
                  <div className="flex gap-1.5 ml-2">
                    <Link to="/dojo/app/evaluations/sessions/$id" params={{ id: s.id }}>
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 border-white/10 bg-white/5 hover:bg-white/10 sm:w-auto sm:px-3">
                        <Play className="h-3.5 w-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Abrir</span>
                      </Button>
                    </Link>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-neutral-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/5 rounded-2xl bg-neutral-900/20">
            <Search className="h-10 w-10 text-neutral-700 mb-3" />
            <div className="text-sm font-medium text-neutral-400">Nenhuma avaliação encontrada</div>
          </div>
        )}
      </div>
    </div>
  );
}
