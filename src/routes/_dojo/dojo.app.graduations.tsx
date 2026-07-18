import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDojoStudents } from "@/lib/dojo/dojo.functions";

export const Route = createFileRoute("/_authenticated/dojo/app/graduations")({
  component: GraduationsPage,
});

function GraduationsPage() {
  const listFn = useServerFn(listDojoStudents);
  const q = useQuery({ queryKey: ["dojo-students"], queryFn: () => listFn() });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Graduações por aluno</h2>
      <p className="text-sm text-muted-foreground mb-4">Abra um aluno para registrar uma nova graduação, definir grau e emitir certificado.</p>
      <div className="rounded border">
        {(q.data ?? []).map((s: any) => (
          <Link key={s.id} to="/dojo/app/students/$id" params={{ id: s.id }} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted">
            <div>
              <div className="font-medium">{s.full_name}</div>
              <div className="text-xs text-muted-foreground">Faixa: {s.belt?.name ?? "—"} {s.current_degree ? `· ${s.current_degree}º grau` : ""}</div>
            </div>
            <span className="text-sm text-primary">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
