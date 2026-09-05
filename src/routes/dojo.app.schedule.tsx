import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ChevronLeft, ChevronRight, Users, CalendarDays, Percent, Activity, CalendarRange, Sparkles } from "lucide-react";
import { listClasses, listOccurrences, listSpaces, scheduleStats } from "@/lib/dojo/schedule.functions";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { ClassFormDialog } from "@/components/dojo/schedule/ClassFormDialog";
import { ClassSidePanel } from "@/components/dojo/schedule/ClassSidePanel";
import { WeekCalendar } from "@/components/dojo/schedule/WeekCalendar";
import { MobileWeekAgenda } from "@/components/dojo/schedule/MobileWeekAgenda";
import { SpacesManager } from "@/components/dojo/schedule/SpacesManager";
import { WEEKDAYS, MODALITIES, fmtTime, ymd } from "@/components/dojo/schedule/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { SlidersHorizontal } from "lucide-react";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const listClassesFn = useServerFn(listClasses);
  const listOccFn = useServerFn(listOccurrences);
  const listSpacesFn = useServerFn(listSpaces);
  const listUnitsFn = useServerFn(listDojoUnits);
  const statsFn = useServerFn(scheduleStats);
  const qc = useQueryClient();

  useEffect(() => {
    const chan = supabase.channel("dojo-schedule-pg")
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_classes" }, () => {
        qc.invalidateQueries({ queryKey: ["dojo-classes"] });
        qc.invalidateQueries({ queryKey: ["dojo-schedule-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_class_schedules" }, () => {
        qc.invalidateQueries({ queryKey: ["dojo-classes"] });
        qc.invalidateQueries({ queryKey: ["dojo-schedule-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_class_occurrences" }, () => {
        qc.invalidateQueries({ queryKey: ["dojo-occurrences"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [qc]);

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
      // Chave por schedule_id garante que múltiplos horários no mesmo dia
      // (ex.: 09:00 e 19:00) não colidam sobrescrevendo um ao outro.
      if (o.schedule_id) {
        occMap.set(`sid:${o.schedule_id}|${o.occurrence_date}`, o);
      }
      occMap.set(`cls:${o.class_id}|${o.occurrence_date}|${(o.start_time ?? "").slice(0, 5)}`, o);
    }
    // IMPORTANTE: parsear como data LOCAL. new Date("YYYY-MM-DD") é UTC
    // (00:00 UTC), o que no Brasil (UTC-3) vira o dia anterior e faz
    // getDay() apontar para o dia errado — turmas somem da visualização.
    const parseLocal = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    };
    const start = parseLocal(range.from);
    const end = parseLocal(range.to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = ymd(d);
      const dow = d.getDay();
      for (const c of filtered) {
        for (const s of (c.schedules ?? [])) {
          if (s.weekday !== dow) continue;
          const occ =
            (s.id && occMap.get(`sid:${s.id}|${dateKey}`)) ||
            occMap.get(`cls:${c.id}|${dateKey}|${(s.start_time ?? "").slice(0, 5)}`);
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
      {/* Premium Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-red-950/40 bg-gradient-to-br from-[#1a0508] via-[#0f0304] to-black text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-red-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-red-900/30 blur-3xl pointer-events-none" />

        <div className="relative grid gap-6 p-6 md:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-red-500/40 blur-xl" />
              <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-800 shadow-lg shadow-red-950/50 ring-1 ring-white/10">
                <CalendarRange className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-red-300/80">
                <Sparkles className="h-3 w-3" /> Agenda inteligente
              </div>
              <h1 className="mt-1 font-display text-3xl md:text-4xl font-black tracking-tight text-white">
                Agenda de Aulas
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Comande turmas, horários, professores e ocupação da academia com uma visão executiva do seu dojo.
              </p>
            </div>
          </div>

          <div className="flex md:justify-end">
            <Button
              onClick={openNew}
              className="h-11 rounded-full bg-white px-5 font-semibold text-red-700 shadow-lg shadow-red-950/40 hover:bg-white/95 hover:shadow-red-900/50 transition-all"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nova turma
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Activity} label="Turmas ativas" value={stats.data?.activeClasses ?? 0} accent="from-red-500 to-red-700" />
        <Kpi icon={CalendarDays} label="Aulas hoje" value={stats.data?.classesToday ?? 0} accent="from-amber-500 to-orange-600" />
        <Kpi icon={Users} label="Alunos matriculados" value={stats.data?.enrolledStudents ?? 0} accent="from-emerald-500 to-teal-600" />
        <Kpi icon={Percent} label="Taxa de ocupação" value={`${stats.data?.occupancyRate ?? 0}%`} accent="from-violet-500 to-fuchsia-600" />
      </div>


      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="bg-neutral-100/70 p-1 rounded-full border border-neutral-200/70">
          <TabsTrigger value="calendar" className="rounded-full px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700">Agenda</TabsTrigger>
          <TabsTrigger value="classes" className="rounded-full px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700">Turmas</TabsTrigger>
          <TabsTrigger value="spaces" className="rounded-full px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700">Espaços</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-3">
          {/* Filters + view controls */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white p-2 shadow-sm">
            <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-0.5">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="h-8 px-3 rounded-full text-xs font-semibold hover:bg-white" onClick={() => setCursor(new Date())}>Hoje</Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="order-3 w-full text-sm font-semibold capitalize px-1 text-neutral-800 sm:order-none sm:w-auto sm:min-w-[180px] sm:px-2">{label}</div>

            <div className="flex items-center gap-1 rounded-full bg-neutral-100 ml-auto p-0.5">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all sm:px-3.5 ${view === v ? "bg-gradient-to-br from-red-600 to-red-800 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: collapsible filters */}
          <div className="sm:hidden">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                {filtersOpen ? "Ocultar" : "Mostrar"}
              </span>
            </button>
          </div>

          <div className={`${filtersOpen ? "grid" : "hidden"} grid-cols-2 gap-2 sm:flex sm:flex-wrap`}>
            <Filter label="Modalidade">
              <Select value={filters.modality} onValueChange={(v) => setFilters({ ...filters, modality: v })}>
                <SelectTrigger className="h-8 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {MODALITIES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Espaço">
              <Select value={filters.space_id} onValueChange={(v) => setFilters({ ...filters, space_id: v })}>
                <SelectTrigger className="h-8 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(spaces.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Unidade">
              <Select value={filters.unit_id} onValueChange={(v) => setFilters({ ...filters, unit_id: v })}>
                <SelectTrigger className="h-8 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(units.data ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Status">
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="h-8 w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Professor">
              <Input
                className="h-8 w-full sm:w-[160px]"
                placeholder="Buscar..."
                value={filters.teacher}
                onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
              />
            </Filter>
          </div>

          {view === "week" && (
            isMobile ? (
              <MobileWeekAgenda
                weekStart={range.start}
                events={events}
                onSelect={(classId, date) => setPanel({ classId, date })}
              />
            ) : (
              <WeekCalendar
                weekStart={range.start}
                events={events}
                onSelect={(classId, date) => setPanel({ classId, date })}
              />
            )
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

function Kpi({ icon: Icon, label, value, accent = "from-red-500 to-red-700" }: { icon: any; label: string; value: any; accent?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-[0.08] blur-2xl group-hover:opacity-[0.14] transition-opacity`} />
      <div className="relative flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md ring-1 ring-white/20`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-black tracking-tight tabular-nums">{value}</div>
        </div>
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
    <div className="rounded-xl bg-white divide-y divide-gray-100">
      {sorted.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma aula neste dia.</div>}
      {sorted.map((e, i) => (
        <button
          key={i}
          onClick={() => onSelect(e.classId, e.date)}
          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50/70 transition-colors ${e.item.cancelled ? "opacity-60" : ""}`}
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
    <div className="rounded-xl bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d.value} className="p-2 text-[10px] uppercase text-center text-gray-400 font-medium tracking-wider">
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
              className={`min-h-[96px] p-1.5 border-b border-l border-gray-100 first:border-l-0 bg-white ${inMonth ? "" : "text-gray-300"}`}
            >
              <div className="mb-1 flex justify-start">
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums ${
                  isToday ? "bg-primary text-primary-foreground" : inMonth ? "text-gray-700" : "text-gray-300"
                }`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelect(e.classId, e.date)}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate hover:brightness-95 ${e.item.cancelled ? "line-through opacity-60" : ""}`}
                    style={{ background: `${e.item.color}1f`, borderLeft: `2px solid ${e.item.color}` }}
                  >
                    {fmtTime(e.item.start)} {e.item.name}
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-gray-400 pl-1">+{items.length - 3}</div>
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
    <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase text-muted-foreground border-b border-gray-200">
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
        <tbody className="divide-y divide-gray-100">

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
