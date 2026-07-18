import { useMemo } from "react";
import { MapPin, Calendar as CalIcon } from "lucide-react";
import { providerLabel } from "@/lib/dojo/competitions/providers";

type Competition = {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  city: string | null;
  state: string | null;
  organizer: string | null;
  provider: string;
  banner_url: string | null;
};

type View = "month" | "week" | "list";

function fmtDate(iso: string | null) {
  if (!iso) return "Data a definir";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function CompetitionCalendar({
  competitions,
  view,
  cursor,
  onSelect,
}: {
  competitions: Competition[];
  view: View;
  cursor: Date;
  onSelect: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Competition[]>();
    for (const c of competitions) {
      const key = c.starts_at ? c.starts_at.slice(0, 10) : "no-date";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [competitions]);

  if (view === "list") {
    return (
      <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white divide-y">
        {competitions.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma competição encontrada.</div>
        )}
        {competitions.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-[color:var(--dojo-surface-2)]"
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-bold">
              {c.starts_at ? new Date(c.starts_at).toLocaleDateString("pt-BR", { day: "2-digit" }) : "?"}
              <span className="sr-only">{fmtDate(c.starts_at)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{c.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CalIcon className="h-3 w-3" /> {fmtDate(c.starts_at)}</span>
                {(c.city || c.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {[c.city, c.state].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className="rounded-full bg-[color:var(--dojo-surface-2)] px-2 py-0.5">
                  {providerLabel(c.provider)}
                </span>
                {c.organizer && <span>· {c.organizer}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (view === "week") {
    const start = startOfWeek(cursor);
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const items = grouped.get(key) ?? [];
          return (
            <div key={key} className="rounded-lg border border-[color:var(--dojo-border)] bg-white min-h-32 p-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {d.toLocaleDateString("pt-BR", { weekday: "short" })}
              </div>
              <div className="text-sm font-semibold">{d.getDate()}</div>
              <div className="mt-2 space-y-1">
                {items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className="w-full rounded-md bg-primary/10 px-2 py-1 text-left text-xs font-medium text-primary hover:bg-primary/15"
                  >
                    <div className="truncate">{c.name}</div>
                    <div className="truncate text-[10px] text-primary/70">
                      {[c.city, c.state].filter(Boolean).join(" · ") || providerLabel(c.provider)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // month
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[color:var(--dojo-border)] bg-[color:var(--dojo-surface-2)] text-[10px] uppercase tracking-widest text-muted-foreground">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
          <div key={d} className="p-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, idx) => {
          const key = d.toISOString().slice(0, 10);
          const inMonth = d.getMonth() === cursor.getMonth();
          const items = grouped.get(key) ?? [];
          return (
            <div
              key={idx}
              className={`min-h-24 border-b border-r border-[color:var(--dojo-border)] p-1.5 ${inMonth ? "bg-white" : "bg-[color:var(--dojo-surface-2)]/40"}`}
            >
              <div className={`text-[11px] font-semibold ${inMonth ? "" : "text-muted-foreground"}`}>{d.getDate()}</div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className="block w-full truncate rounded bg-primary/10 px-1.5 py-0.5 text-left text-[10px] font-medium text-primary hover:bg-primary/15"
                    title={c.name}
                  >
                    {c.name}
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{items.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
