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

  const byDay = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const e of events) {
      map[e.date] = map[e.date] ?? [];
      map[e.date].push(e.item);
    }
    return map;
  }, [events]);

  return (
    <div className="border rounded-lg bg-white overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
          <div />
          {days.map((d) => {
            const isToday = ymd(d) === ymd(new Date());
            return (
              <div key={d.toISOString()} className="p-2 text-center border-l">
                <div className="text-[10px] uppercase text-muted-foreground">{WEEKDAYS[d.getDay()].short}</div>
                <div className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                  {d.getDate().toString().padStart(2, "0")}/{(d.getMonth() + 1).toString().padStart(2, "0")}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-r">
            {hours.map((h) => (
              <div key={h} className="h-14 text-[10px] text-muted-foreground px-1 pt-0.5 border-b">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const dateKey = ymd(d);
            const items = byDay[dateKey] ?? [];
            return (
              <div key={dateKey} className="relative border-l">
                {hours.map((h) => (
                  <div key={h} className="h-14 border-b" />
                ))}
                {items.map((it, idx) => {
                  const [sh, sm] = it.start.split(":").map(Number);
                  const [eh, em] = it.end.split(":").map(Number);
                  const startMin = sh * 60 + sm;
                  const endMin = eh * 60 + em;
                  const top = ((startMin - 6 * 60) / 60) * 56;
                  const height = Math.max(24, ((endMin - startMin) / 60) * 56 - 2);
                  return (
                    <button
                      key={idx}
                      onClick={() => onSelect(it.classId, dateKey)}
                      className={`absolute left-1 right-1 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight overflow-hidden shadow-sm hover:shadow-md hover:z-10 transition-all ${
                        it.cancelled ? "opacity-60 line-through" : ""
                      }`}
                      style={{
                        top,
                        height,
                        background: `${it.color}18`,
                        borderLeft: `3px solid ${it.color}`,
                        color: "var(--dojo-fg, #0a0a0a)",
                      }}
                    >
                      <div className="font-semibold truncate">{it.name}</div>
                      <div className="text-[10px] opacity-75">
                        {fmtTime(it.start)}–{fmtTime(it.end)}
                      </div>
                      {height > 46 && (
                        <div className="text-[10px] opacity-75 truncate">
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
  );
}
