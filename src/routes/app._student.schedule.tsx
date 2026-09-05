import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDojoClassGrid } from "@/lib/student/student.functions";
import { CalendarRange, ChevronDown, Clock, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/app/_student/schedule")({
  head: () => ({
    meta: [
      { title: "Grade de aulas — Portal do Aluno" },
      { name: "description", content: "Veja a agenda completa de turmas do seu dojo, dia a dia." },
      { property: "og:title", content: "Grade de aulas — Portal do Aluno" },
      { property: "og:description", content: "Agenda semanal de turmas do dojo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

const WEEKDAYS = [
  { i: 1, short: "Seg", long: "Segunda-feira" },
  { i: 2, short: "Ter", long: "Terça-feira" },
  { i: 3, short: "Qua", long: "Quarta-feira" },
  { i: 4, short: "Qui", long: "Quinta-feira" },
  { i: 5, short: "Sex", long: "Sexta-feira" },
  { i: 6, short: "Sáb", long: "Sábado" },
  { i: 0, short: "Dom", long: "Domingo" },
];

type Slot = {
  key: string;
  classId: string;
  name: string;
  modality: string | null;
  teacher: string | null;
  color: string | null;
  unitId: string | null;
  capacity: number | null;
  level: string | null;
  start: string;
  end: string | null;
  mine: boolean;
};

const hhmm = (v: string | null) => (v ? v.slice(0, 5) : "");

function SchedulePage() {
  const qc = useQueryClient();
  const fn = useServerFn(getDojoClassGrid);
  const { data, isLoading } = useQuery({
    queryKey: ["student", "class-grid"],
    queryFn: () => fn({}),
  });

  useEffect(() => {
    const chan = supabase.channel("student-schedule-grid")
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_classes" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "class-grid"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_class_schedules" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "class-grid"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [qc]);

  const todayIdx = new Date().getDay();
  const [day, setDay] = useState<number>(todayIdx);
  const [view, setView] = useState<"week" | "day">("week");

  const unitName = useMemo(() => {
    const map = new Map<string, string>();
    (data?.units ?? []).forEach((u: any) => map.set(u.id, u.name));
    return map;
  }, [data]);

  const byDay = useMemo(() => {
    const map = new Map<number, Slot[]>();
    const mineSet = new Set(data?.myClassIds ?? []);
    (data?.classes ?? []).forEach((c: any) => {
      (c.schedules ?? []).forEach((s: any) => {
        const arr = map.get(s.weekday) ?? [];
        arr.push({
          key: `${c.id}-${s.id}`,
          classId: c.id,
          name: c.name,
          modality: c.modality ?? null,
          teacher: c.teacher_name ?? null,
          color: c.color ?? null,
          unitId: c.unit_id ?? null,
          capacity: c.capacity ?? null,
          level: c.level ?? null,
          start: s.start_time ?? "",
          end: s.end_time ?? null,
          mine: mineSet.has(c.id),
        });
        map.set(s.weekday, arr);
      });
    });
    map.forEach((arr) => arr.sort((a, b) => (a.start < b.start ? -1 : 1)));
    return map;
  }, [data]);

  const total = useMemo(
    () => WEEKDAYS.reduce((acc, w) => acc + (byDay.get(w.i)?.length ?? 0), 0),
    [byDay],
  );
  const list = byDay.get(day) ?? [];

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <header className="min-w-0">
        <h1 className="truncate text-lg font-bold sm:text-xl">Grade de aulas</h1>
        <p className="text-xs text-neutral-500">
          Todas as turmas do dojo — apenas visualização.
        </p>
      </header>

      <div className="flex w-full min-w-0 items-center gap-2">
        <div className="inline-flex shrink-0 rounded-xl bg-white p-1 ring-1 ring-neutral-200">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === v ? "text-white" : "text-neutral-600"
              }`}
              style={view === v ? { background: "var(--sa-primary, #dc2626)" } : undefined}
            >
              {v === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
        <span className="min-w-0 truncate text-[11px] text-neutral-400">
          {total} {total === 1 ? "horário" : "horários"} na semana
        </span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {!isLoading && total === 0 && <EmptyState label="Nenhuma turma cadastrada nesta semana." />}

      {!isLoading && total > 0 && view === "week" && (
        <WeekAgenda byDay={byDay} unitName={unitName} todayIdx={todayIdx} />
      )}

      {!isLoading && total > 0 && view === "day" && (
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {WEEKDAYS.map((w) => {
              const count = (byDay.get(w.i) ?? []).length;
              const active = day === w.i;
              return (
                <button
                  key={w.i}
                  type="button"
                  onClick={() => setDay(w.i)}
                  className={`flex min-w-0 flex-col items-center rounded-xl px-1 py-2 text-xs font-semibold ring-1 transition ${
                    active ? "text-white ring-transparent" : "bg-white text-neutral-600 ring-neutral-200"
                  }`}
                  style={active ? { background: "var(--sa-primary, #dc2626)" } : undefined}
                >
                  <span>{w.short}</span>
                  <span
                    className={`text-[10px] font-medium ${active ? "opacity-90" : "text-neutral-400"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {list.length === 0 ? (
            <EmptyState
              label={`Nenhuma turma em ${WEEKDAYS.find((w) => w.i === day)?.long}.`}
            />
          ) : (
            <ul className="min-w-0 space-y-2">
              {list.map((s) => (
                <SlotCard key={s.key} slot={s} unitName={unitName} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
      <CalendarRange className="mx-auto h-10 w-10 text-neutral-300" />
      <p className="mt-3 text-sm text-neutral-500">{label}</p>
    </div>
  );
}

/** Agenda semanal em lista — cabe em qualquer largura, sem rolagem lateral. */
function WeekAgenda({
  byDay,
  unitName,
  todayIdx,
}: {
  byDay: Map<number, Slot[]>;
  unitName: Map<string, string>;
  todayIdx: number;
}) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  return (
    <div className="min-w-0 space-y-3">
      {WEEKDAYS.map((w) => {
        const items = byDay.get(w.i) ?? [];
        const isToday = w.i === todayIdx;
        const open = !collapsed[w.i];
        return (
          <section
            key={w.i}
            className={`min-w-0 overflow-hidden rounded-2xl bg-white ring-1 ${
              isToday ? "ring-red-200" : "ring-neutral-100"
            }`}
          >
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [w.i]: !!open }))}
              className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`truncate text-[13px] font-bold ${
                    isToday ? "text-red-600" : "text-neutral-800"
                  }`}
                >
                  {w.long}
                </span>
                {isToday && (
                  <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600">
                    Hoje
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
                {items.length === 0 ? "—" : `${items.length}`}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
                />
              </span>
            </button>

            {open && (
              <div className="min-w-0 border-t border-neutral-100">
                {items.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-neutral-400">Sem aulas neste dia.</p>
                ) : (
                  <ul className="min-w-0 divide-y divide-neutral-100">
                    {items.map((s) => (
                      <li
                        key={s.key}
                        className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)] gap-2.5 px-3 py-2.5"
                      >
                        <div className="min-w-0 text-[11px] font-bold tabular-nums leading-tight text-neutral-700">
                          {hhmm(s.start)}
                          {s.end && (
                            <div className="font-medium text-neutral-400">{hhmm(s.end)}</div>
                          )}
                        </div>
                        <div
                          className="min-w-0 rounded-lg px-2 py-1.5"
                          style={{
                            background: `${s.color || "#dc2626"}14`,
                            borderLeft: `3px solid ${s.color || "#dc2626"}`,
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-[12.5px] font-semibold text-neutral-900">
                              {s.name}
                            </span>
                            {s.mine && (
                              <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                Minha
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[10.5px] text-neutral-500">
                            {[s.modality, s.level, s.teacher].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {(s.capacity || (s.unitId && unitName.get(s.unitId))) && (
                            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-neutral-400">
                              {s.capacity ? (
                                <span className="inline-flex shrink-0 items-center gap-1">
                                  <Users className="h-3 w-3 shrink-0" />
                                  {s.capacity}
                                </span>
                              ) : null}
                              {s.unitId && unitName.get(s.unitId) ? (
                                <span className="inline-flex min-w-0 items-center gap-1">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{unitName.get(s.unitId)}</span>
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SlotCard({ slot: s, unitName }: { slot: Slot; unitName: Map<string, string> }) {
  return (
    <li className="grid min-w-0 grid-cols-[6px_minmax(0,1fr)] gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100">
      <div
        className="rounded-full"
        style={{ background: s.color || "var(--sa-primary, #dc2626)" }}
      />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{s.name}</span>
          {s.mine && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Minha turma
            </span>
          )}
        </div>
        <div className="truncate text-xs text-neutral-500">
          {[s.modality, s.level, s.teacher].filter(Boolean).join(" · ") || "—"}
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
          <span className="inline-flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3" />
            {hhmm(s.start)}
            {s.end ? ` – ${hhmm(s.end)}` : ""}
          </span>
          {s.capacity ? (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Users className="h-3 w-3" />
              {s.capacity} vagas
            </span>
          ) : null}
          {s.unitId && unitName.get(s.unitId) ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{unitName.get(s.unitId)}</span>
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
