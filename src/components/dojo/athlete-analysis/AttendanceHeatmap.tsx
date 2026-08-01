import { calendarISO } from "@/lib/dates";
import { useMemo } from "react";

export function AttendanceHeatmap({ data, days = 365 }: { data: { date: string; count: number }[]; days?: number }) {
  const map = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.date, d.count);
    return m;
  }, [data]);

  const { weeks, monthLabels, max } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // start at first Sunday <= (today - days + 1)
    const start = new Date(now.getTime() - (days - 1) * 86400_000);
    start.setDate(start.getDate() - start.getDay());
    const totalDays = Math.ceil((now.getTime() - start.getTime()) / 86400_000) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);

    const cells: { date: string; count: number; inRange: boolean }[][] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const col: { date: string; count: number; inRange: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start.getTime() + (w * 7 + d) * 86400_000);
        const iso = calendarISO(dt);
        col.push({
          date: iso,
          count: map.get(iso) ?? 0,
          inRange: dt >= new Date(now.getTime() - (days - 1) * 86400_000) && dt <= now,
        });
      }
      cells.push(col);
    }

    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let w = 0; w < totalWeeks; w++) {
      const firstDay = new Date(cells[w][0].date);
      if (firstDay.getMonth() !== lastMonth) {
        labels.push({ week: w, label: monthNames[firstDay.getMonth()] });
        lastMonth = firstDay.getMonth();
      }
    }

    const m = Math.max(1, ...cells.flat().map((c) => c.count));
    return { weeks: cells, monthLabels: labels, max: m };
  }, [map, days]);

  const dayLabels = ["", "Seg", "", "Qua", "", "Sex", ""];

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* month labels */}
        <div className="relative mb-1 h-4 pl-8">
          {monthLabels.map((m) => (
            <span
              key={`${m.week}-${m.label}`}
              className="absolute text-[10px] font-medium text-muted-foreground"
              style={{ left: `${m.week * 14}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] text-muted-foreground">
            {dayLabels.map((d, i) => (
              <div key={i} className="flex h-3 items-center">{d}</div>
            ))}
          </div>
          <div className="flex gap-1">
            {weeks.map((col, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-1">
                {col.map((c, di) => {
                  const opacity = !c.inRange ? 0 : c.count === 0 ? 0.08 : Math.min(1, 0.2 + (c.count / max) * 0.8);
                  return (
                    <div
                      key={`${wi}-${di}`}
                      title={c.inRange ? `${c.date}: ${c.count} check-in(s)` : ""}
                      className="h-3 w-3 rounded-[3px] bg-primary transition-transform hover:scale-125"
                      style={{ opacity }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Menos</span>
        {[0.08, 0.3, 0.55, 0.8, 1].map((o, i) => (
          <div key={i} className="h-3 w-3 rounded-[3px] bg-primary" style={{ opacity: o }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
