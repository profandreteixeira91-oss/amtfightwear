import { useEffect, useMemo, useRef, useState } from "react";
import { WEEKDAYS, fmtTime, ymd } from "./constants";

type Item = {
  classId: string;
  schedule_id?: string;
  name: string;
  teacher?: string;
  space?: string;
  color: string;
  start: string;
  end: string;
  enrolled: number;
  capacity: number;
  cancelled?: boolean;
  cancelReason?: string;
};

export function MobileWeekAgenda({
  weekStart,
  events,
  onSelect,
}: {
  weekStart: Date;
  events: Array<{ classId: string; date: string; item: Item }>;
  onSelect: (classId: string, date: string) => void;
}) {
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const todayKey = ymd(new Date());
  const initialKey = useMemo(() => {
    const inWeek = days.find((d) => ymd(d) === todayKey);
    return inWeek ? todayKey : ymd(days[0]);
  }, [days, todayKey]);

  const [selected, setSelected] = useState(initialKey);
  useEffect(() => setSelected(initialKey), [initialKey]);

  const byDay = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const e of events) {
      map[e.date] = map[e.date] ?? [];
      map[e.date].push(e.item);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [events]);

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-day="${selected}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  const dayItems = byDay[selected] ?? [];

  return (
    <div className="space-y-3">
      {/* Day strip */}
      <div
        ref={stripRef}
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((d) => {
          const key = ymd(d);
          const isSel = key === selected;
          const isToday = key === todayKey;
          const count = (byDay[key] ?? []).length;
          return (
            <button
              key={key}
              data-day={key}
              onClick={() => setSelected(key)}
              className={`relative flex min-w-[64px] shrink-0 snap-center flex-col items-center gap-1 rounded-2xl border px-3 py-2 transition-all ${
                isSel
                  ? "border-transparent bg-gradient-to-br from-red-600 to-red-800 text-white shadow-md shadow-red-900/30"
                  : "border-neutral-200 bg-white text-neutral-700 active:scale-95"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isSel ? "text-white/80" : "text-neutral-400"
                }`}
              >
                {WEEKDAYS[d.getDay()].short}
              </span>
              <span className="text-lg font-black leading-none tabular-nums">
                {d.getDate()}
              </span>
              <span
                className={`flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold tabular-nums ${
                  isSel
                    ? "bg-white/20 text-white"
                    : count > 0
                    ? "bg-red-50 text-red-700"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {count}
              </span>
              {isToday && !isSel && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <div className="flex items-baseline justify-between px-1">
        <div className="text-sm font-bold capitalize text-neutral-800">
          {new Date(selected + "T12:00:00").toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "short",
          })}
        </div>
        <div className="text-[11px] font-medium text-neutral-500 tabular-nums">
          {dayItems.length} {dayItems.length === 1 ? "aula" : "aulas"}
        </div>
      </div>

      {/* Timeline list */}
      {dayItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma aula neste dia.
        </div>
      ) : (
        <ul className="space-y-2">
          {dayItems.map((it, i) => (
            <li key={i}>
              <button
                onClick={() => onSelect(it.classId, selected)}
                className={`group flex w-full items-stretch gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-neutral-100 transition-all active:scale-[0.99] ${
                  it.cancelled ? "opacity-60" : ""
                }`}
              >
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-50 py-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    início
                  </div>
                  <div className="text-sm font-black tabular-nums text-neutral-900">
                    {fmtTime(it.start)}
                  </div>
                  <div className="mt-0.5 text-[9px] tabular-nums text-neutral-400">
                    até {fmtTime(it.end)}
                  </div>
                </div>
                <div
                  className="w-1 shrink-0 rounded-full"
                  style={{ background: it.color }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm font-bold text-neutral-900 ${
                      it.cancelled ? "line-through" : ""
                    }`}
                  >
                    {it.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-neutral-500">
                    {it.teacher || "—"} · {it.space || "—"}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 tabular-nums">
                      {it.enrolled}/{it.capacity}
                    </span>
                    {it.cancelled && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Cancelada
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
