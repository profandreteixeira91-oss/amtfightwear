import { useMemo } from "react";

export function AttendanceHeatmap({ data, days = 365 }: { data: { date: string; count: number }[]; days?: number }) {
  const map = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.date, d.count);
    return m;
  }, [data]);

  const cells = useMemo(() => {
    const arr: { date: string; count: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      const iso = d.toISOString().slice(0, 10);
      arr.push({ date: iso, count: map.get(iso) ?? 0 });
    }
    return arr;
  }, [map, days]);

  const max = Math.max(1, ...cells.map((c) => c.count));

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-1 pb-2" style={{ gridAutoColumns: "12px" }}>
        {cells.map((c) => {
          const opacity = c.count === 0 ? 0.06 : Math.min(1, 0.15 + (c.count / max) * 0.85);
          return (
            <div
              key={c.date}
              title={`${c.date}: ${c.count} check-in(s)`}
              className="h-3 w-3 rounded-sm bg-primary"
              style={{ opacity }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Menos</span>
        {[0.06, 0.3, 0.55, 0.8, 1].map((o, i) => (
          <div key={i} className="h-3 w-3 rounded-sm bg-primary" style={{ opacity: o }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
