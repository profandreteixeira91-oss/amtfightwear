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
    <div className="overflow-hidden rounded-xl bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Day header */}
          <div className="sticky top-0 z-20 grid grid-cols-[72px_repeat(7,1fr)] border-b border-gray-100 bg-white">
            <div />
            {days.map((d) => {
              const isToday = ymd(d) === todayKey;
              return (
                <div key={d.toISOString()} className="px-2 py-3 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    {WEEKDAYS[d.getDay()].short}
                  </div>
                  <div className="mt-1 flex justify-center">
                    <span
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium tabular-nums ${
                        isToday ? "bg-primary text-primary-foreground" : "text-gray-700"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="grid grid-cols-[72px_repeat(7,1fr)]">
            {/* Hours column */}
            <div>
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2 pt-1 text-[10px] font-medium tabular-nums text-gray-400"
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
              return (
                <div
                  key={dateKey}
                  className={`relative ${dayIdx > 0 ? "border-l border-gray-100" : ""} bg-white`}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="border-b border-gray-100"
                      style={{ height: ROW_H }}
                    />
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
                        className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-left text-[11px] leading-tight transition-all hover:z-10 hover:brightness-95 ${
                          it.cancelled ? "line-through opacity-60" : ""
                        }`}
                        style={{
                          top,
                          height,
                          background: `${it.color}1f`,
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
