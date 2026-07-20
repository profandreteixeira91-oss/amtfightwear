import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ChevronLeft, ChevronRight, Users, CalendarDays, Percent, Activity } from "lucide-react";
import { listClasses, listOccurrences, listSpaces, scheduleStats } from "@/lib/dojo/schedule.functions";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { ClassFormDialog } from "@/components/dojo/schedule/ClassFormDialog";
import { ClassSidePanel } from "@/components/dojo/schedule/ClassSidePanel";
import { WeekCalendar } from "@/components/dojo/schedule/WeekCalendar";
import { SpacesManager } from "@/components/dojo/schedule/SpacesManager";
import { WEEKDAYS, MODALITIES, fmtTime, ymd } from "@/components/dojo/schedule/constants";

export const Route = createFileRoute("/dojo/app/schedule")({
  head: () => ({ meta: [{ title: "Agenda — AMT Dojo Manager" }] }),
  component: SchedulePage,
});

type ViewMode = "day" | "week" | "month";

function startOfWeek(d: Date) {
  const nd = new Date(d);
  nd.setDate(d.getDate() - d.getDay());
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function SchedulePage() {
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [panel, setPanel] = useState<{ classId: string; date?: string } | null>(null);
  const [filters, setFilters] = useState({ modality: "all", space_id: "all", unit_id: "all", status: "active", teacher: "" });

  const listClassesFn = useServerFn(listClasses);
  const listOccFn = useServerFn(listOccurrences);
  const listSpacesFn = useServerFn(listSpaces);
  const listUnitsFn = useServerFn(listDojoUnits);
  const statsFn = useServerFn(scheduleStats);

  const range = useMemo(() => {
    if (view === "day") return { from: ymd(cursor), to: ymd(cursor), start: cursor };
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return { from: ymd(s), to: ymd(e), start: s };
    }
    const s = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const e = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return { from: ymd(s), to: ymd(e), start: s };
  }, [view, cursor]);

  const classes = useQuery({ queryKey: ["dojo-classes"], queryFn: () => listClassesFn() });
  const spaces = useQuery({ queryKey: ["dojo-spaces"], queryFn: () => listSpacesFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnitsFn() });
  const occurrences = useQuery({
    queryKey: ["dojo-occurrences", range.from, range.to],
    queryFn: () => listOccFn({ data: { from: range.from, to: range.to } }),
  });
  const stats = useQuery({ queryKey: ["dojo-schedule-stats"], queryFn: () => statsFn() });

  const filtered = useMemo(() => {
    return (classes.data ?? []).filter((c: any) => {
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.modality !== "all" && c.modality !== filters.modality) return false;
      if (filters.space_id !== "all" && c.space_id !== filters.space_id) return false;
      if (filters.unit_id !== "all" && c.unit_id !== filters.unit_id) return false;
      if (filters.teacher && !(c.teacher_name ?? "").toLowerCase().includes(filters.teacher.toLowerCase())) return false;
      return true;
    });
  }, [classes.data, filters]);

  // expand recurring schedules into date-specific events for range
  const events = useMemo(() => {
    const list: any[] = [];
    const occMap = new Map<string, any>();
    for (const o of occurrences.data ?? []) {
      occMap.set(`${o.class_id}|${o.occurrence_date}`, o);
    }
    const start = new Date(range.from);
    const end = new Date(range.to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = ymd(d);
      const dow = d.getDay();
      for (const c of filtered) {
        for (const s of c.schedules ?? []) {
          if (s.weekday !== dow) continue;
          const occ = occMap.get(`${c.id}|${dateKey}`);
          list.push({
            classId: c.id,
            date: dateKey,
            item: {
              classId: c.id,
              schedule_id: s.id,
              name: c.name,
              teacher: c.teacher_name,
              space: c.dojo_spaces?.name,
              color: c.color,
              start: (occ?.start_time ?? s.start_time)?.slice(0, 5),
              end: (occ?.end_time ?? s.end_time)?.slice(0, 5),
              enrolled: (c.students ?? []).length,
              capacity: c.max_students,
              cancelled: occ?.status === "cancelled",
              cancelReason: occ?.cancel_reason,
            },
          });
        }
      }
    }
    return list;
  }, [filtered, occurrences.data, range]);

  const shift = (delta: number) => {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setCursor(d);
  };

  const label = useMemo(() => {
    if (view === "day") return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return `${s.getDate().toString().padStart(2, "0")}/${(s.getMonth() + 1).toString().padStart(2, "0")} — ${e.getDate().toString().padStart(2, "0")}/${(e.getMonth() + 1).toString().padStart(2, "0")}`;
    }
    return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [view, cursor]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setFormOpen(true); setPanel(null); };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      {/* Header ações */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Gerencie turmas, horários, professores e alunos da academia.
        </p>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> Nova turma
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Activity} label="Turmas ativas" value={stats.data?.activeClasses ?? 0} />
        <Kpi icon={CalendarDays} label="Aulas hoje" value={stats.data?.classesToday ?? 0} />
        <Kpi icon={Users} label="Alunos matriculados" value={stats.data?.enrolledStudents ?? 0} />
        <Kpi icon={Percent} label="Taxa de ocupação" value={`${stats.data?.occupancyRate ?? 0}%`} />
      </div>


      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Agenda</TabsTrigger>
          <TabsTrigger value="classes">Turmas</TabsTrigger>
          <TabsTrigger value="spaces">Espaços</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-3">
          {/* Filters + view controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md bg-white">
              <Button size="sm" variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Hoje</Button>
              <Button size="sm" variant="ghost" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="text-sm font-medium capitalize min-w-[180px]">{label}</div>

            <div className="flex items-center gap-1 border rounded-md bg-white ml-auto p-0.5">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs rounded ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Filter label="Modalidade">
              <Select value={filters.modality} onValueChange={(v) => setFilters({ ...filters, modality: v })}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {MODALITIES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Espaço">
              <Select value={filters.space_id} onValueChange={(v) => setFilters({ ...filters, space_id: v })}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(spaces.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Unidade">
              <Select value={filters.unit_id} onValueChange={(v) => setFilters({ ...filters, unit_id: v })}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(units.data ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Status">
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Professor">
              <Input
                className="h-8 w-[160px]"
                placeholder="Buscar..."
                value={filters.teacher}
                onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
              />
            </Filter>
          </div>

          {view === "week" && (
            <WeekCalendar
              weekStart={range.start}
              events={events}
              onSelect={(classId, date) => setPanel({ classId, date })}
            />
          )}
          {view === "day" && (
            <DayView events={events} onSelect={(classId, date) => setPanel({ classId, date })} />
          )}
          {view === "month" && (
            <MonthView cursor={cursor} events={events} onSelect={(classId, date) => setPanel({ classId, date })} />
          )}
        </TabsContent>

        <TabsContent value="classes">
          <ClassesTable classes={filtered} onOpen={(c) => setPanel({ classId: c.id })} />
        </TabsContent>

        <TabsContent value="spaces">
          <SpacesManager />
        </TabsContent>
      </Tabs>

      <ClassFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      <ClassSidePanel
        open={!!panel}
        classId={panel?.classId ?? null}
        occurrenceDate={panel?.date}
        onOpenChange={(v) => !v && setPanel(null)}
        onEdit={openEdit}
      />
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="border rounded-lg bg-white p-3 flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function DayView({ events, onSelect }: { events: any[]; onSelect: (id: string, d: string) => void }) {
  const sorted = [...events].sort((a, b) => a.item.start.localeCompare(b.item.start));
  return (
    <div className="border rounded-lg bg-white divide-y">
      {sorted.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma aula neste dia.</div>}
      {sorted.map((e, i) => (
        <button
          key={i}
          onClick={() => onSelect(e.classId, e.date)}
          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors ${e.item.cancelled ? "opacity-60" : ""}`}
        >
          <span className="h-10 w-1.5 rounded-full" style={{ background: e.item.color }} />
          <div className="w-24 text-sm font-semibold">{fmtTime(e.item.start)}–{fmtTime(e.item.end)}</div>
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${e.item.cancelled ? "line-through" : ""}`}>{e.item.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {e.item.teacher || "—"} · {e.item.space || "—"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {e.item.enrolled}/{e.item.capacity}
          </div>
        </button>
      ))}
    </div>
  );
}

function MonthView({ cursor, events, onSelect }: { cursor: Date; events: any[]; onSelect: (id: string, d: string) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startCell = new Date(first);
  startCell.setDate(1 - first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startCell); d.setDate(startCell.getDate() + i);
    cells.push(d);
  }
  const byDay: Record<string, any[]> = {};
  for (const e of events) { (byDay[e.date] = byDay[e.date] ?? []).push(e); }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div key={d.value} className="p-2 text-[10px] uppercase text-center text-muted-foreground border-l first:border-l-0">
            {d.short}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const dateKey = ymd(d);
          const items = byDay[dateKey] ?? [];
          const isToday = dateKey === ymd(new Date());
          return (
            <div
              key={i}
              className={`min-h-[92px] p-1.5 border-b border-l first:border-l-0 ${inMonth ? "bg-white" : "bg-muted/20"}`}
            >
              <div className={`text-[11px] font-semibold mb-1 ${isToday ? "text-primary" : inMonth ? "" : "text-muted-foreground"}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelect(e.classId, e.date)}
                    className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${e.item.cancelled ? "line-through opacity-60" : ""}`}
                    style={{ background: `${e.item.color}22`, borderLeft: `2px solid ${e.item.color}` }}
                  >
                    {fmtTime(e.item.start)} {e.item.name}
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{items.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClassesTable({ classes, onOpen }: { classes: any[]; onOpen: (c: any) => void }) {
  if (!classes.length) {
    return <div className="border rounded-lg bg-white p-8 text-center text-sm text-muted-foreground">Nenhuma turma cadastrada.</div>;
  }
  return (
    <div className="border rounded-lg bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
          <tr>
            <th className="text-left p-2">Turma</th>
            <th className="text-left p-2">Modalidade</th>
            <th className="text-left p-2">Professor</th>
            <th className="text-left p-2">Espaço</th>
            <th className="text-left p-2">Horários</th>
            <th className="text-left p-2">Alunos</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {classes.map((c: any) => (
            <tr key={c.id} onClick={() => onOpen(c)} className="cursor-pointer hover:bg-muted/40">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                  <span className="font-medium">{c.name}</span>
                </div>
              </td>
              <td className="p-2 capitalize">{c.modality}</td>
              <td className="p-2">{c.teacher_name || "—"}</td>
              <td className="p-2">{c.dojo_spaces?.name || "—"}</td>
              <td className="p-2 text-xs">
                {(c.schedules ?? []).map((s: any) => `${WEEKDAYS[s.weekday].short} ${fmtTime(s.start_time)}`).join(", ") || "—"}
              </td>
              <td className="p-2">{(c.students ?? []).length}/{c.max_students}</td>
              <td className="p-2">
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {c.status === "active" ? "Ativa" : "Inativa"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
