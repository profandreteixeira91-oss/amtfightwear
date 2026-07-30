import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDojoClassGrid } from "@/lib/student/student.functions";
import { CalendarRange, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/app/_student/schedule")({
  head: () => ({ meta: [{ title: "Grade de aulas — Portal do Aluno" }] }),
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

function SchedulePage() {
  const fn = useServerFn(getDojoClassGrid);
  const { data, isLoading } = useQuery({
    queryKey: ["student", "class-grid"],
    queryFn: () => fn({}),
  });

  const todayIdx = new Date().getDay();
  const [day, setDay] = useState<number>(todayIdx);

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

  const list = byDay.get(day) ?? [];
  const [view, setView] = useState<"week" | "day">("week");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Grade de aulas</h1>
        <p className="text-xs text-neutral-500">
          Todas as turmas do dojo — apenas visualização.
        </p>
      </div>

      <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-neutral-200">
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

      {view === "week" && (
        <WeekGrid byDay={byDay} isLoading={isLoading} unitName={unitName} />
      )}

      {view === "day" && (
        <>


      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {WEEKDAYS.map((w) => {
          const count = (byDay.get(w.i) ?? []).length;
          const active = day === w.i;
          return (
            <button
              key={w.i}
              type="button"
              onClick={() => setDay(w.i)}
              className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ${
                active
                  ? "text-white ring-transparent"
                  : "bg-white text-neutral-600 ring-neutral-200"
              }`}
              style={active ? { background: "var(--sa-primary, #dc2626)" } : undefined}
            >
              <span>{w.short}</span>
              <span className={`text-[10px] font-medium ${active ? "opacity-90" : "text-neutral-400"}`}>
                {count} {count === 1 ? "aula" : "aulas"}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}

      {!isLoading && list.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <CalendarRange className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">
            Nenhuma turma cadastrada em {WEEKDAYS.find((w) => w.i === day)?.long}.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {list.map((s) => (
          <li
            key={s.key}
            className="flex items-stretch gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100"
          >
            <div
              className="w-1.5 shrink-0 rounded-full"
              style={{ background: s.color || "var(--sa-primary, #dc2626)" }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
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
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {s.start.slice(0, 5)}
                  {s.end ? ` – ${s.end.slice(0, 5)}` : ""}
                </span>
                {s.capacity ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {s.capacity} vagas
                  </span>
                ) : null}
                {s.unitId && unitName.get(s.unitId) ? (
                  <span className="truncate">{unitName.get(s.unitId)}</span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
        </>
      )}
    </div>
  );
}

const ROW_H = 56;

function WeekGrid({
  byDay,
  isLoading,
  unitName,
}: {
  byDay: Map<number, Slot[]>;
  isLoading: boolean;
  unitName: Map<string, string>;
}) {
  const all = WEEKDAYS.flatMap((w) => byDay.get(w.i) ?? []);
  const [selected, setSelected] = useState<Slot | null>(null);

  const { minH, maxH } = useMemo(() => {
    if (all.length === 0) return { minH: 6, maxH: 22 };
    let lo = 24;
    let hi = 0;
    all.forEach((s) => {
      const sh = Number(s.start.slice(0, 2)) || 0;
      const eh = s.end ? Math.ceil((Number(s.end.slice(0, 2)) || 0) + (Number(s.end.slice(3, 5)) ? 1 : 0)) : sh + 1;
      lo = Math.min(lo, sh);
      hi = Math.max(hi, eh);
    });
    return { minH: Math.max(0, lo), maxH: Math.min(24, Math.max(hi, lo + 2)) };
  }, [all]);

  const hours = Array.from({ length: maxH - minH }, (_, i) => minH + i);
  const todayIdx = new Date().getDay();

  if (isLoading) return <p className="text-sm text-neutral-500">Carregando…</p>;

  if (all.length === 0)
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
        <CalendarRange className="mx-auto h-10 w-10 text-neutral-300" />
        <p className="mt-3 text-sm text-neutral-500">Nenhuma turma cadastrada nesta semana.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100">
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-neutral-100">
              <div />
              {WEEKDAYS.map((w) => (
                <div
                  key={w.i}
                  className={`px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${
                    w.i === todayIdx ? "text-red-600" : "text-neutral-400"
                  }`}
                >
                  {w.short}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[44px_repeat(7,1fr)]">
              <div>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-1 pt-0.5 text-[9px] font-medium tabular-nums text-neutral-400"
                    style={{ height: ROW_H }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {WEEKDAYS.map((w, dayIdx) => {
                const items = byDay.get(w.i) ?? [];
                return (
                  <div
                    key={w.i}
                    className={`relative ${dayIdx > 0 ? "border-l border-neutral-100" : ""}`}
                  >
                    {hours.map((h) => (
                      <div key={h} className="border-b border-neutral-100" style={{ height: ROW_H }} />
                    ))}
                    {items.map((s) => {
                      const sm = (Number(s.start.slice(0, 2)) || 0) * 60 + (Number(s.start.slice(3, 5)) || 0);
                      const em = s.end
                        ? (Number(s.end.slice(0, 2)) || 0) * 60 + (Number(s.end.slice(3, 5)) || 0)
                        : sm + 60;
                      const top = ((sm - minH * 60) / 60) * ROW_H;
                      const height = Math.max(24, ((em - sm) / 60) * ROW_H - 3);
                      const color = s.color || "#dc2626";
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setSelected(s)}
                          className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] leading-tight transition hover:z-10 hover:brightness-95"
                          style={{
                            top,
                            height,
                            background: `${color}1f`,
                            borderLeft: `3px solid ${color}`,
                          }}
                        >
                          <div className="truncate font-semibold text-neutral-900">{s.name}</div>
                          <div className="truncate text-[9px] text-neutral-500">
                            {s.start.slice(0, 5)}
                            {s.end ? `–${s.end.slice(0, 5)}` : ""}
                          </div>
                          {s.mine && height > 44 && (
                            <div className="truncate text-[9px] font-semibold text-emerald-700">
                              Minha turma
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="px-1 text-[10px] text-neutral-400">Arraste para o lado para ver a semana completa.</p>

      {selected && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{selected.name}</div>
              <div className="truncate text-xs text-neutral-500">
                {[selected.modality, selected.level, selected.teacher].filter(Boolean).join(" · ") || "—"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selected.start.slice(0, 5)}
                  {selected.end ? ` – ${selected.end.slice(0, 5)}` : ""}
                </span>
                {selected.capacity ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selected.capacity} vagas
                  </span>
                ) : null}
                {selected.unitId && unitName.get(selected.unitId) ? (
                  <span className="truncate">{unitName.get(selected.unitId)}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 text-xs font-semibold text-neutral-400"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

