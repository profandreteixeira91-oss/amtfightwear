import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getMyAgenda } from "@/lib/student/student.functions";
import { CalendarDays } from "lucide-react";
import { studentSupabase as supabase } from "@/lib/student-auth/student-client";

export const Route = createFileRoute("/app/_student/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Portal do Aluno" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const qc = useQueryClient();
  const fn = useServerFn(getMyAgenda);
  const { data, isLoading } = useQuery({ queryKey: ["student", "agenda"], queryFn: () => fn({}) });

  useEffect(() => {
    const chan = supabase.channel("student-agenda-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_classes" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "agenda"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_class_schedules" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "agenda"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_class_occurrences" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "agenda"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [qc]);

  const grouped = new Map<string, any[]>();
  (data ?? []).forEach((occ) => {
    if (!occ) return;
    const cls = occ.dojo_classes;
    if (!cls || (cls as any).status === "inactive") return;
    if (occ.status === "cancelled") return;
    const key = occ.occurrence_date || "sem-data";
    const arr = grouped.get(key) ?? [];
    arr.push(occ);
    grouped.set(key, arr);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Minha agenda</h1>
      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && grouped.size === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <CalendarDays className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">Nenhuma turma encontrada para este aluno.</p>
        </div>
      )}
      {[...grouped.entries()].map(([date, list]) => (
        <section key={date}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
          </h2>
          <ul className="space-y-2">
            {(list ?? []).map((occ) => {
              const cls = (occ as { dojo_classes?: { name?: string; modality?: string; teacher_name?: string; color?: string } }).dojo_classes;
              return (
                <li key={occ.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100">
                  <div
                    className="h-12 w-1.5 rounded-full"
                    style={{ background: cls?.color || "var(--sa-primary, #dc2626)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{cls?.name ?? "Aula"}</div>
                    <div className="text-xs text-neutral-500">
                      {cls?.modality ?? ""} {cls?.teacher_name ? `· ${cls.teacher_name}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">
                      {occ.start_time?.slice(0, 5) ?? "—"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">{occ.status}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
