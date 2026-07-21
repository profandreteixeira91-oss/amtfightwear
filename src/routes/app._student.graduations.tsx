import { formatDegree, degreeSuffix, degreeUnit } from "@/lib/dojo/degree-label";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyGraduations } from "@/lib/student/student.functions";
import { Award } from "lucide-react";

export const Route = createFileRoute("/app/_student/graduations")({
  head: () => ({ meta: [{ title: "Graduações — Portal do Aluno" }] }),
  component: GraduationsPage,
});

function GraduationsPage() {
  const fn = useServerFn(getMyGraduations);
  const { data } = useQuery({ queryKey: ["student", "graduations"], queryFn: () => fn({}) });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Graduações</h1>

      {data?.current && (
        <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-neutral-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Faixa atual</div>
          <div
            className="mx-auto mt-3 h-6 w-40 rounded-md shadow-inner"
            style={{ background: data.current.color_hex }}
          />
          <div className="mt-3 text-lg font-bold">{data.current.name}</div>
          {data.current.degree ? <div className="text-sm text-neutral-500">{data.current.degree}º {degreeUnit((data.current as any).modality)}</div> : null}
        </section>
      )}

      <h2 className="mt-4 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        <Award className="h-3.5 w-3.5" /> Linha do tempo
      </h2>
      <ul className="space-y-2">
        {(data?.history ?? []).map((g) => {
          const b = (g as { dojo_belts?: { name?: string; color_hex?: string; modality?: string | null } }).dojo_belts;
          return (
            <li key={g.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              <div className="flex items-center gap-3">
                <div className="h-8 w-2 rounded-full" style={{ background: b?.color_hex ?? "#000" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{b?.name ?? "Faixa"}{degreeSuffix(g.degree, b?.modality)}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(g.graduation_date).toLocaleDateString("pt-BR")} {g.evaluator ? `· ${g.evaluator}` : ""}
                  </div>
                </div>
              </div>
              {g.notes && <div className="mt-2 text-xs text-neutral-600">{g.notes}</div>}
            </li>
          );
        })}
        {(data?.history?.length ?? 0) === 0 && (
          <p className="text-center text-sm text-neutral-500">Sem graduações registradas ainda.</p>
        )}
      </ul>
    </div>
  );
}
