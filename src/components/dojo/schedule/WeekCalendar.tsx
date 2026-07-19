import { useMemo } from "react";
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

const ROW_H = 60; // px per hour

export function WeekCalendar({
  weekStart,
  events,
  onSelect,
}: {
  weekStart: Date;
  events: Array<{ classId: string; date: string; item: Item }>;
  onSelect: (classId: string, date: string) => void;
}) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6h - 22h
  const todayKey = ymd(new Date());

  const byDay = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const e of events) {
      map[e.date] = map[e.date] ?? [];
      map[e.date].push(e.item);
    }
    return map;
  }, [events]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Day header */}
          <div className="sticky top-0 z-20 grid grid-cols-[72px_repeat(7,1fr)] border-b-2 border-border bg-muted/60 backdrop-blur">
            <div className="border-r border-border" />
            {days.map((d, i) => {
              const isToday = ymd(d) === todayKey;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={d.toISOString()}
                  className={`px-2 py-2.5 text-center ${i > 0 ? "border-l border-border" : ""} ${
                    isToday ? "bg-primary/10" : isWeekend ? "bg-muted/40" : ""
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {WEEKDAYS[d.getDay()].short}
                  </div>
                  <div
                    className={`mt-0.5 text-sm font-bold tabular-nums ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {d.getDate().toString().padStart(2, "0")}/
                    {(d.getMonth() + 1).toString().padStart(2, "0")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="grid grid-cols-[72px_repeat(7,1fr)]">
            {/* Hours column */}
            <div className="border-r border-border bg-muted/20">
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end border-b border-border/70 pr-2 pt-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
                  style={{ height: ROW_H }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((d, dayIdx) => {
              const dateKey = ymd(d);
              const items = byDay[dateKey] ?? [];
              const isToday = dateKey === todayKey;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={dateKey}
                  className={`relative ${dayIdx > 0 ? "border-l border-border" : ""} ${
                    isToday ? "bg-primary/5" : isWeekend ? "bg-muted/20" : "bg-background"
                  }`}
                >
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className={`relative border-b ${
                        i % 2 === 0 ? "border-border/60" : "border-border/40"
                      }`}
                      style={{ height: ROW_H }}
                    >
                      {/* half-hour dashed guide */}
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/40" />
                    </div>
                  ))}
                  {items.map((it, idx) => {
                    const [sh, sm] = it.start.split(":").map(Number);
                    const [eh, em] = it.end.split(":").map(Number);
                    const startMin = sh * 60 + sm;
                    const endMin = eh * 60 + em;
                    const top = ((startMin - 6 * 60) / 60) * ROW_H;
                    const height = Math.max(28, ((endMin - startMin) / 60) * ROW_H - 4);
                    return (
                      <button
                        key={idx}
                        onClick={() => onSelect(it.classId, dateKey)}
                        className={`absolute left-1 right-1 overflow-hidden rounded-md border border-black/5 px-2 py-1 text-left text-[11px] leading-tight shadow-sm ring-1 ring-black/5 transition-all hover:z-10 hover:shadow-md ${
                          it.cancelled ? "line-through opacity-60" : ""
                        }`}
                        style={{
                          top,
                          height,
                          background: `${it.color}22`,
                          borderLeft: `3px solid ${it.color}`,
                          color: "var(--dojo-fg, #0a0a0a)",
                        }}
                      >
                        <div className="truncate font-semibold">{it.name}</div>
                        <div className="text-[10px] opacity-75">
                          {fmtTime(it.start)}–{fmtTime(it.end)}
                        </div>
                        {height > 50 && (
                          <div className="truncate text-[10px] opacity-75">
                            {it.space || "—"} · {it.enrolled}/{it.capacity}
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
  );
}
