import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCompetitions } from "@/lib/student/student.functions";
import { Trophy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/app/_student/competitions")({
  head: () => ({ meta: [{ title: "Competições — Portal do Aluno" }] }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const fn = useServerFn(getMyCompetitions);
  const { data } = useQuery({ queryKey: ["student", "competitions"], queryFn: () => fn({}) });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Competições</h1>

      {(data?.mine?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Minhas inscrições</h2>
          <ul className="space-y-2">
            {(data?.mine ?? []).map((m) => {
              const c = (m as { dojo_competitions?: { id: string; name: string; starts_at?: string; external_url?: string; banner_url?: string; city?: string; state?: string } }).dojo_competitions;
              return (
                <li key={m.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100">
                  {c?.banner_url && <img src={c.banner_url} alt="" className="h-32 w-full object-cover" />}
                  <div className="p-4">
                    <div className="text-sm font-semibold">{c?.name}</div>
                    <div className="text-xs text-neutral-500">
                      {c?.starts_at ? new Date(c.starts_at).toLocaleDateString("pt-BR") : "—"}
                      {c?.city ? ` · ${c.city}/${c.state}` : ""}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-emerald-700">Status: {m.status}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Próximas competições</h2>
        {(data?.upcoming?.length ?? 0) === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
            <Trophy className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">Nenhuma competição no radar da sua academia.</p>
          </div>
        )}
        <ul className="space-y-2">
          {(data?.upcoming ?? []).map((c) => (
            <li key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100">
              {c.banner_url && <img src={c.banner_url} alt="" className="h-32 w-full object-cover" />}
              <div className="p-4">
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-neutral-500">
                  {c.starts_at ? new Date(c.starts_at).toLocaleDateString("pt-BR") : ""}
                  {c.city ? ` · ${c.city}/${c.state}` : ""}
                </div>
                {c.external_url && (
                  <a
                    href={c.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "var(--sa-primary, #dc2626)" }}
                  >
                    Inscrever-se <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
