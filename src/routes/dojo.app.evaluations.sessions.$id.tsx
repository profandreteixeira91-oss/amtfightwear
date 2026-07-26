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
import { ArrowLeft, Save, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/dojo/app/evaluations/sessions" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Avaliações
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveProgress()} disabled={isDone}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* Student header */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {student?.photo_url && (
            <img src={student.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border" />
          )}
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-semibold">{student?.full_name ?? "—"}</h2>
            <div className="text-sm text-muted-foreground">
              {student?.belt?.name ?? "Sem faixa"} · Modelo: {sess.template?.title ?? "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{total}<span className="text-lg text-muted-foreground">/{max}</span></div>
            <div className="text-sm text-muted-foreground">{percent}%</div>
            {passing != null && (
              <Badge variant={total >= passing ? "default" : "outline"} className="mt-1">
                {total >= passing ? "Acima do mínimo" : `Mínimo: ${passing}`}
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
        <Card key={cat.id}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{cat.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cat.criteria.map((cr: any) => (
              <div key={cr.id} className="flex flex-wrap items-center gap-2 py-2 border-b last:border-0">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium">
                    {cr.name}
                    {cr.required && <Badge variant="outline" className="ml-2 text-[10px]">Obrigatório</Badge>}
                    {cr.eliminatory && <Badge variant="destructive" className="ml-1 text-[10px]">Eliminatório</Badge>}
                  </div>
                  {cr.description && <div className="text-xs text-muted-foreground">{cr.description}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={cr.min_score}
                    max={cr.max_score}
                    className="w-20"
                    value={scores[cr.id] ?? ""}
                    onChange={(e) => setScore(cr.id, Number(e.target.value))}
                    disabled={isDone}
                  />
                  <span className="text-xs text-muted-foreground">/ {cr.max_score}</span>
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
            {sess.result === "approved" && student?.id && (
              <Link
                to="/dojo/app/graduations"
                search={{ student: student.id, session: id } as never}
              >
                <Button className="mt-2">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar graduação e pagamento
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
