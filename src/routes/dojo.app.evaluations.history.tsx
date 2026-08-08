import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listEvalSessions } from "@/lib/dojo/evaluations.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dojo/app/evaluations/history")({
  component: HistoryPage,
});

const RESULT_LABEL: Record<string, string> = {
  approved: "Aprovado", failed: "Reprovado", review: "Revisão", conditional: "Condicional",
};
const RESULT_COLOR: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  review: "bg-amber-50 text-amber-600 border-amber-200",
  conditional: "bg-blue-50 text-blue-600 border-blue-200",
};


function HistoryPage() {
  const listFn = useServerFn(listEvalSessions);
  const { data } = useQuery({ queryKey: ["eval-sessions"], queryFn: () => listFn() });
  const [q, setQ] = useState("");

  const timeline = useMemo(() => {
    const rows = (data ?? []).filter((s: any) => s.status === "done");
    if (!q) return rows;
    const ql = q.toLowerCase();
    return rows.filter((s: any) =>
      (s.student?.full_name ?? "").toLowerCase().includes(ql) ||
      (s.template?.title ?? "").toLowerCase().includes(ql),
    );
  }, [data, q]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Histórico completo</h2>
        <p className="text-sm text-neutral-500 font-medium">Todas as avaliações concluídas em ordem cronológica.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input className="pl-10 h-10 border-neutral-200 bg-white shadow-sm" placeholder="Buscar aluno ou modelo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-2">
        {timeline.map((s: any) => (
          <Card key={s.id} className="overflow-hidden border-neutral-200 bg-white hover:bg-neutral-50 transition-all shadow-sm">
            <CardContent className="p-3 flex flex-wrap items-center gap-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 w-20 shrink-0">
                {s.finished_at && new Date(s.finished_at).toLocaleDateString("pt-BR")}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold text-neutral-900 leading-tight">{s.student?.full_name}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{s.template?.title}</div>
              </div>
              <div className="text-sm font-black text-neutral-900">{s.total_score}/{s.max_score} <span className="text-[10px] text-neutral-400 font-bold">({s.percentage}%)</span></div>
              {s.result && <Badge className={`text-[10px] font-black uppercase tracking-wider ${RESULT_COLOR[s.result] ?? "bg-neutral-100 text-neutral-600"}`}>{RESULT_LABEL[s.result] ?? s.result}</Badge>}
              <Link to="/dojo/app/evaluations/sessions/$id" params={{ id: s.id }}>
                <Button size="sm" variant="outline" className="h-9 w-9 p-0 border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {timeline.length === 0 && (
          <div className="text-sm font-medium text-neutral-400 p-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl bg-white shadow-sm">
            Nenhuma avaliação concluída ainda.
          </div>
        )}
      </div>
    </div>
  );
}
