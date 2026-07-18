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
  approved: "Aprovado", failed: "Reprovado", review: "Revisão", conditional: "Aprovado c/ ressalvas",
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
        <h2 className="text-lg font-semibold">Histórico completo</h2>
        <p className="text-sm text-muted-foreground">Todas as avaliações concluídas em ordem cronológica.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar aluno ou modelo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-2">
        {timeline.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-3 flex flex-wrap items-center gap-3">
              <div className="text-xs text-muted-foreground w-20">
                {s.finished_at && new Date(s.finished_at).toLocaleDateString("pt-BR")}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{s.student?.full_name}</div>
                <div className="text-xs text-muted-foreground">{s.template?.title}</div>
              </div>
              <div className="text-sm">{s.total_score}/{s.max_score} ({s.percentage}%)</div>
              {s.result && <Badge>{RESULT_LABEL[s.result] ?? s.result}</Badge>}
              <Link to="/dojo/app/evaluations/sessions/$id" params={{ id: s.id }}>
                <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {timeline.length === 0 && (
          <div className="text-sm text-muted-foreground p-6 text-center border rounded">
            Nenhuma avaliação concluída ainda.
          </div>
        )}
      </div>
    </div>
  );
}
