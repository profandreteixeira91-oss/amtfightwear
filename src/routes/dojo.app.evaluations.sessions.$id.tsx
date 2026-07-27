import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getEvalSession, updateEvalSession, finishEvalSession,
  getEvalPlan, saveEvalPlan,
} from "@/lib/dojo/evaluations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, CheckCircle2, XCircle, RotateCcw, Plus } from "lucide-react";

export const Route = createFileRoute("/dojo/app/evaluations/sessions/$id")({
  component: SessionRunner,
});

function SessionRunner() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getEvalSession);
  const updFn = useServerFn(updateEvalSession);
  const finFn = useServerFn(finishEvalSession);
  const getPlanFn = useServerFn(getEvalPlan);
  const savePlanFn = useServerFn(saveEvalPlan);
  const qc = useQueryClient();

  const { data: sess, isLoading } = useQuery({
    queryKey: ["eval-session", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const { data: plan } = useQuery({
    queryKey: ["eval-plan", id],
    queryFn: () => getPlanFn({ data: { session_id: id } }),
  });

  const [scores, setScores] = useState<Record<string, number>>({});
  const [obs, setObs] = useState("");
  const [planForm, setPlanForm] = useState({
    strong_points: "",
    improvement_points: "",
    comments: "",
    next_evaluation_at: "",
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (sess && !initialized.current) {
      setScores((sess.scores as any) ?? {});
      setObs(sess.observations ?? "");
      initialized.current = true;
    }
  }, [sess]);

  useEffect(() => {
    if (plan) {
      setPlanForm({
        strong_points: plan.strong_points ?? "",
        improvement_points: plan.improvement_points ?? "",
        comments: plan.comments ?? "",
        next_evaluation_at: plan.next_evaluation_at ?? "",
      });
    }
  }, [plan]);

  const structure = (sess?.template?.structure as any) ?? { categories: [] };
  const total = useMemo(
    () => Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0),
    [scores],
  );
  const max = sess?.max_score ?? 0;
  const percent = max > 0 ? Math.round((total / max) * 1000) / 10 : 0;

  const setScore = (id: string, v: number) => setScores({ ...scores, [id]: v });

  const saveProgress = async (extraStatus?: string) => {
    try {
      await updFn({
        data: {
          id,
          scores: scores as any,
          observations: obs,
          status: extraStatus ?? (sess?.status === "draft" ? "in_progress" : sess?.status),
          started_at: sess?.started_at ?? new Date().toISOString(),
        },
      });
      toast.success("Progresso salvo");
      qc.invalidateQueries({ queryKey: ["eval-session", id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const finish = async (result: "approved" | "failed" | "review" | "conditional") => {
    try {
      await updFn({ data: { id, scores: scores as any, observations: obs } });
      await finFn({ data: { id, result } });
      await savePlanFn({
        data: {
          session_id: id,
          strong_points: planForm.strong_points || null,
          improvement_points: planForm.improvement_points || null,
          comments: planForm.comments || null,
          next_evaluation_at: planForm.next_evaluation_at || null,
        },
      });
      toast.success("Avaliação finalizada");
      qc.invalidateQueries({ queryKey: ["eval-session", id] });
      qc.invalidateQueries({ queryKey: ["eval-sessions"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading || !sess) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const student: any = sess.student;
  const passing = sess.template?.passing_score;
  const isDone = sess.status === "done";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-2 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/dojo/app/evaluations/sessions" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar para</span> Avaliações
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => saveProgress()} disabled={isDone} className="h-9">
            <Save className="h-4 w-4 mr-1.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Student header */}
      <Card className="overflow-hidden border-white/10 bg-neutral-900/50 backdrop-blur">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {student?.photo_url ? (
              <img src={student.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover shadow-lg" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-neutral-800 text-xl font-bold text-white shadow-lg">
                {student?.full_name?.charAt(0) ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-xl font-black tracking-tight text-white sm:text-2xl">{student?.full_name ?? "—"}</h2>
              <div className="truncate text-sm text-neutral-400">
                {student?.belt?.name ?? "Sem faixa"} · {sess.template?.title ?? "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-3xl font-black tracking-tighter text-white">{total}</span>
              <span className="text-sm font-bold text-neutral-500">/{max}</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-400">{percent}%</div>
            {passing != null && (
              <Badge variant={total >= passing ? "default" : "outline"} className={`mt-1 h-5 text-[10px] font-bold uppercase ${total >= passing ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "border-white/10 text-neutral-400"}`}>
                {total >= passing ? "Aprovado" : `Mínimo: ${passing}`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Structure evaluation */}
      {structure.categories?.length === 0 && (
        <div className="text-sm text-muted-foreground p-6 text-center border rounded">
          Este modelo não possui estrutura definida. Volte ao modelo e adicione categorias e critérios.
        </div>
      )}

      {structure.categories?.map((cat: any) => (
        <Card key={cat.id} className="overflow-hidden border-white/10 bg-neutral-900/40">
          <CardHeader className="border-b border-white/5 bg-white/5 py-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-300">{cat.name}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/5 p-0">
            {cat.criteria.map((cr: any) => (
              <div key={cr.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white leading-tight">{cr.name}</span>
                    <div className="flex gap-1">
                      {cr.required && <Badge variant="outline" className="h-4 border-emerald-500/30 bg-emerald-500/10 px-1 text-[8px] font-black uppercase text-emerald-400">Obrigatório</Badge>}
                      {cr.eliminatory && <Badge variant="destructive" className="h-4 bg-red-500/20 px-1 text-[8px] font-black uppercase text-red-400 ring-1 ring-inset ring-red-500/30">Eliminatório</Badge>}
                    </div>
                  </div>
                  {cr.description && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{cr.description}</p>}
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="relative">
                    <Input
                      type="number"
                      min={cr.min_score}
                      max={cr.max_score}
                      className="h-10 w-24 border-white/10 bg-neutral-950 pr-8 text-center font-black text-white focus:ring-red-500"
                      value={scores[cr.id] ?? ""}
                      onChange={(e) => setScore(cr.id, Number(e.target.value))}
                      disabled={isDone}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-600">
                      /{cr.max_score}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Observations */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Observações da avaliação</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} disabled={isDone} />
        </CardContent>
      </Card>

      {/* Evolution plan */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Plano de evolução</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Pontos fortes</Label>
            <Textarea rows={2} value={planForm.strong_points} onChange={(e) => setPlanForm({ ...planForm, strong_points: e.target.value })} />
          </div>
          <div>
            <Label>Pontos de melhoria</Label>
            <Textarea rows={2} value={planForm.improvement_points} onChange={(e) => setPlanForm({ ...planForm, improvement_points: e.target.value })} />
          </div>
          <div>
            <Label>Comentários gerais</Label>
            <Textarea rows={2} value={planForm.comments} onChange={(e) => setPlanForm({ ...planForm, comments: e.target.value })} />
          </div>
          <div>
            <Label>Data sugerida para nova avaliação</Label>
            <Input type="date" value={planForm.next_evaluation_at} onChange={(e) => setPlanForm({ ...planForm, next_evaluation_at: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Result actions */}
      {!isDone ? (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => finish("review")}><RotateCcw className="h-4 w-4 mr-1" /> Marcar para revisão</Button>
            <Button variant="outline" onClick={() => finish("conditional")}>Aprovar c/ ressalvas</Button>
            <Button variant="destructive" onClick={() => finish("failed")}><XCircle className="h-4 w-4 mr-1" /> Reprovar</Button>
            <Button onClick={() => finish("approved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center space-y-3">
            <div className="text-lg font-semibold">Avaliação concluída</div>
            <div className="text-sm text-muted-foreground">Resultado: {sess.result}</div>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Link to="/dojo/app/evaluations/sessions" search={{ new: 1 } as never}>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Nova avaliação
                </Button>
              </Link>
              {sess.result === "approved" && student?.id && (
                <Link
                  to="/dojo/app/graduations"
                  search={{ student: student.id, session: id } as never}
                >
                  <Button>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar graduação e pagamento
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
