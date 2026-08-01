import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  lessonPlansDashboard,
  listLessonPlans,
  upsertLessonPlan,
  deleteLessonPlan,
  duplicateLessonPlan,
  getBuiltInLessonTemplates,
  listLessonTemplates,
  createPlanFromTemplate,
  listClassesForPicker,
} from "@/lib/dojo/lesson-plans.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  Copy,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calendarISO, todayISO } from "@/lib/dates";

export const Route = createFileRoute("/dojo/app/lesson-plans/")({
  component: LessonPlansDashboardPage,
});

const STATUS_COLORS: Record<string, string> = {
  planejada: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  ministrada: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  cancelada: "bg-neutral-500/15 text-neutral-300 border-neutral-400/30",
  reagendada: "bg-amber-500/15 text-amber-200 border-amber-400/30",
};


type ViewMode = "week" | "month" | "list";

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - ((day + 6) % 7));
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmt(d: Date) {
  return calendarISO(d);
}

function LessonPlansDashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dashFn = useServerFn(lessonPlansDashboard);
  const listFn = useServerFn(listLessonPlans);
  const upsertFn = useServerFn(upsertLessonPlan);
  const deleteFn = useServerFn(deleteLessonPlan);
  const dupFn = useServerFn(duplicateLessonPlan);
  const fromTplFn = useServerFn(createPlanFromTemplate);

  const createFromTpl = useMutation({
    mutationFn: (payload: {
      templateId?: string;
      builtInKey?: string;
      date: string;
      classId?: string | null;
      teacherId?: string | null;
      unitId?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      title?: string | null;
    }) => fromTplFn({ data: payload }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["lesson-plans"] });
      if (row && "id" in row) navigate({ to: "/dojo/app/lesson-plans/$id", params: { id: (row as { id: string }).id } });
    },
  });


  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const range = useMemo(() => {
    if (view === "week") {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7) };
    }
    if (view === "month") {
      const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
      return { from, to };
    }
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return { from, to: addDays(from, 60) };
  }, [view, anchor]);

  const { data: stats } = useQuery({
    queryKey: ["lesson-plans", "dashboard"],
    queryFn: () => dashFn({}),
  });

  const { data: plans } = useQuery({
    queryKey: ["lesson-plans", "list", fmt(range.from), fmt(range.to)],
    queryFn: () => listFn({ data: { from: fmt(range.from), to: fmt(range.to) } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lesson-plans"] });
  };

  const createDraft = useMutation({
    mutationFn: (date: string) =>
      upsertFn({
        data: {
          title: "Nova aula",
          date,
          status: "planejada",
          blocks: defaultBlocks(),
        },
      }),
    onSuccess: (row) => {
      invalidate();
      if (row && "id" in row) navigate({ to: "/dojo/app/lesson-plans/$id", params: { id: (row as { id: string }).id } });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Plano excluído");
    },
  });

  const duplicate = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => dupFn({ data: { id, date } }),
    onSuccess: () => {
      invalidate();
      toast.success("Plano duplicado");
    },
  });

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <KpiCard label="Semana" value={stats?.week_planned ?? 0} icon={CalendarDays} tone="sky" />
        <KpiCard label="Realizadas" value={stats?.week_done ?? 0} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Horas" value={formatHours(stats?.total_planned_min ?? 0)} icon={Clock} tone="violet" />
        <KpiCard label="Turmas" value={stats?.active_classes ?? 0} icon={Users} tone="amber" />
      </div>

      {stats?.next_lesson ? (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/40 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.6)]">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">Próxima aula</div>
              <div className="break-words text-lg font-bold leading-tight sm:text-xl">{stats.next_lesson.title}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-neutral-300">
                <span className="shrink-0">{new Date(stats.next_lesson.date).toLocaleDateString("pt-BR")}</span>
                {stats.next_lesson.start_time && <span className="shrink-0">· {stats.next_lesson.start_time.slice(0, 5)}</span>}
                {(stats.next_lesson.dojo_classes as { name?: string } | null)?.name && (
                  <span className="truncate">· {(stats.next_lesson.dojo_classes as { name?: string }).name}</span>
                )}
              </div>
            </div>
            <Button asChild size="sm" className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-400">
              <Link to="/dojo/app/lesson-plans/$id" params={{ id: stats.next_lesson.id as string }}>
                Abrir plano
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* CALENDAR HEADER */}
      <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-3 sm:p-4 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-1 sm:justify-start">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9 border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setAnchor(addDays(anchor, view === "month" ? -30 : -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setAnchor(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setAnchor(addDays(anchor, view === "month" ? 30 : 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="ml-2 text-xs font-semibold capitalize text-neutral-200 sm:ml-3 sm:text-sm">{formatRangeLabel(range.from, range.to, view)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
            {(["week", "month", "list"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "default" : "outline"}
                className={
                  cn(
                    "h-9 text-[11px] sm:text-sm",
                    view === v
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_6px_16px_-8px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-400"
                      : "border-white/15 bg-white/5 text-white hover:bg-white/10",
                    v === "list" ? "col-span-2 sm:col-span-1" : ""
                  )
                }
                onClick={() => setView(v)}
              >
                {v === "week" ? "Semana" : v === "month" ? "Mês" : "Lista completa"}
              </Button>
            ))}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 text-[11px] border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 sm:text-sm">
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> <span className="truncate">Modelo</span>
                </Button>
              </DialogTrigger>
              <TemplatePickerDialog onPick={(payload) => createFromTpl.mutate(payload)} />
            </Dialog>

            <Button size="sm" className="h-9 text-[11px] bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_6px_16_px_-8px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-400 sm:text-sm" onClick={() => createDraft.mutate(fmt(new Date()))}>
              <Plus className="mr-1 h-3.5 w-3.5" /> <span className="truncate">Novo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* CALENDAR / LIST */}
      {view === "week" ? (
        <WeekView from={range.from} plans={plans ?? []} onCreate={(d) => createDraft.mutate(d)} />
      ) : view === "month" ? (
        <MonthView anchor={anchor} plans={plans ?? []} onCreate={(d) => createDraft.mutate(d)} />
      ) : (
        <ListView
          plans={plans ?? []}
          onDelete={(id) => remove.mutate(id)}
          onDuplicate={(id) => duplicate.mutate({ id, date: fmt(addDays(new Date(), 7)) })}
        />
      )}
    </div>
  );
}


function defaultBlocks() {
  return [
    { id: crypto.randomUUID(), kind: "warmup" as const, title: "Aquecimento", duration_min: 10, description: "", items: [] },
    { id: crypto.randomUUID(), kind: "fundamentals" as const, title: "Fundamentos", duration_min: 15, description: "", items: [] },
    { id: crypto.randomUUID(), kind: "techniques" as const, title: "Técnicas principais", duration_min: 30, description: "", items: [] },
    { id: crypto.randomUUID(), kind: "sparring" as const, title: "Sparring / Randori", duration_min: 20, description: "", items: [] },
    { id: crypto.randomUUID(), kind: "closing" as const, title: "Encerramento", duration_min: 10, description: "", items: [] },
  ];
}

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

function formatRangeLabel(from: Date, to: Date, view: ViewMode) {
  const f = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  if (view === "month") return from.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return `${f(from)} – ${f(addDays(to, -1))}`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "sky" | "emerald" | "violet" | "amber";
}) {
  const toneMap = {
    sky: { ring: "ring-sky-400/40", grad: "from-sky-500 to-cyan-500", glow: "shadow-[0_10px_25px_-12px_rgba(56,189,248,0.7)]" },
    emerald: { ring: "ring-emerald-400/40", grad: "from-emerald-500 to-teal-500", glow: "shadow-[0_10px_25px_-12px_rgba(16,185,129,0.7)]" },
    violet: { ring: "ring-violet-400/40", grad: "from-violet-500 to-fuchsia-500", glow: "shadow-[0_10px_25px_-12px_rgba(139,92,246,0.7)]" },
    amber: { ring: "ring-amber-400/40", grad: "from-amber-500 to-orange-500", glow: "shadow-[0_10px_25px_-12px_rgba(245,158,11,0.7)]" },
  } as const;
  const t = toneMap[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/70 p-3 sm:p-4 text-white backdrop-blur">
      <div aria-hidden className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${t.grad} opacity-20 blur-2xl sm:h-24 sm:w-24`} />
      <div className="relative flex items-center gap-2.5 sm:gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.grad} text-white ring-1 ${t.ring} ${t.glow} sm:h-11 sm:w-11`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-medium uppercase tracking-wider text-neutral-400 sm:text-[11px]">{label}</div>
          <div className="truncate text-lg font-black tracking-tight sm:text-2xl">{value}</div>
        </div>
      </div>
    </div>
  );
}


type PlanRow = Awaited<ReturnType<typeof listLessonPlans>>[number];

function WeekView({ from, plans, onCreate }: { from: Date; plans: PlanRow[]; onCreate: (date: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const byDay: Record<string, PlanRow[]> = {};
  for (const p of plans) {
    const k = p.date as string;
    (byDay[k] ??= []).push(p);
  }
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {days.map((d) => {
        const key = fmt(d);
        const items = byDay[key] ?? [];
        const isToday = fmt(new Date()) === key;
        return (
          <div
            key={key}
            className={cn(
              "min-h-[160px] rounded-xl border p-2 backdrop-blur transition-colors",
              isToday
                ? "border-red-500/40 bg-gradient-to-br from-red-950/40 via-neutral-950/70 to-neutral-950/70 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.7)]"
                : "border-white/10 bg-neutral-950/50 hover:border-white/20"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className={`text-xs font-semibold capitalize ${isToday ? "text-red-200" : "text-neutral-300"}`}>
                {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
              </div>
              <button
                className="text-neutral-400 transition-colors hover:text-red-300"
                onClick={() => onCreate(key)}
                title="Adicionar aula"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {items.map((p) => (
                <Link
                  key={p.id}
                  to="/dojo/app/lesson-plans/$id"
                  params={{ id: p.id as string }}
                  className={cn(
                    "block rounded-md border px-2 py-1 text-[10px] sm:text-xs backdrop-blur transition-transform hover:scale-[1.02]",
                    STATUS_COLORS[p.status as string] ?? "border-white/10 bg-white/5 text-white"
                  )}
                >
                  <div className="break-words font-semibold leading-tight">{p.title}</div>
                  {p.start_time ? <div className="mt-0.5 opacity-70">{(p.start_time as string).slice(0, 5)}</div> : null}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function MonthView({ anchor, plans, onCreate }: { anchor: Date; plans: PlanRow[]; onCreate: (date: string) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay: Record<string, PlanRow[]> = {};
  for (const p of plans) (byDay[p.date as string] ??= []).push(p);
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-2 backdrop-blur overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[560px]">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((w) => (
          <div key={w} className="pb-1 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            {w}
          </div>
        ))}
        {cells.map((d) => {
          const key = fmt(d);
          const items = byDay[key] ?? [];
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = fmt(new Date()) === key;
          return (
            <div
              key={key}
              className={`min-h-[92px] rounded-lg border p-1 text-xs transition-colors ${
                isToday
                  ? "border-red-500/50 bg-red-950/30"
                  : inMonth
                    ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    : "border-white/5 bg-transparent text-neutral-500"
              }`}
              onDoubleClick={() => onCreate(key)}
            >
              <div className={`mb-1 text-[11px] font-bold ${isToday ? "text-red-200" : "text-neutral-300"}`}>{d.getDate()}</div>
              {items.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  to="/dojo/app/lesson-plans/$id"
                  params={{ id: p.id as string }}
                  className={`mb-0.5 block truncate rounded border px-1 py-0.5 ${STATUS_COLORS[p.status as string] ?? "border-white/10 bg-white/5 text-white"}`}
                >
                  {p.title}
                </Link>
              ))}
              {items.length > 3 ? <div className="text-[10px] text-neutral-500">+{items.length - 3}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ListView({
  plans,
  onDelete,
  onDuplicate,
}: {
  plans: PlanRow[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  if (!plans.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-10 text-center text-sm text-neutral-400 backdrop-blur">
        Nenhuma aula planejada neste período.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/50 backdrop-blur">
      <div className="divide-y divide-white/5">
        {plans.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 text-white transition-colors hover:bg-white/[0.03]">
            <div className="w-24 shrink-0 text-sm font-semibold text-neutral-300">
              {new Date(p.date as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              {p.start_time ? ` · ${(p.start_time as string).slice(0, 5)}` : ""}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="break-words font-semibold leading-tight">{p.title}</div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-neutral-400">
                <span className="truncate">{(p.dojo_classes as { name?: string } | null)?.name ?? "—"}</span>
                {p.modality && <span className="truncate">· {p.modality}</span>}
              </div>
            </div>
            <Badge className={`${STATUS_COLORS[p.status as string] ?? "border-white/10 bg-white/5 text-white"} capitalize`} variant="outline">
              {p.status as string}
            </Badge>
            <div className="flex items-center gap-1">
              <Button asChild size="icon" variant="ghost" className="text-neutral-300 hover:bg-white/10 hover:text-white">
                <Link to="/dojo/app/lesson-plans/$id" params={{ id: p.id as string }}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="icon" variant="ghost" className="text-neutral-300 hover:bg-white/10 hover:text-white" onClick={() => onDuplicate(p.id as string)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => onDelete(p.id as string)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function TemplatePickerDialog({
  onPick,
}: {
  onPick: (payload: {
    templateId?: string;
    builtInKey?: string;
    date: string;
    classId?: string | null;
    teacherId?: string | null;
    unitId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    title?: string | null;
  }) => void;
}) {
  const builtInsFn = useServerFn(getBuiltInLessonTemplates);
  const listFn = useServerFn(listLessonTemplates);
  const classesFn = useServerFn(listClassesForPicker);
  const { data: builtIns } = useQuery({
    queryKey: ["lesson-plans", "builtin-templates"],
    queryFn: () => builtInsFn({}),
  });
  const { data: custom } = useQuery({
    queryKey: ["lesson-plans", "custom-templates"],
    queryFn: () => listFn({}),
  });
  const { data: classes } = useQuery({
    queryKey: ["lesson-plans", "classes-picker"],
    queryFn: () => classesFn({}),
  });

  const [selected, setSelected] = useState<
    | { kind: "custom"; id: string; name: string }
    | { kind: "builtin"; key: string; name: string }
    | null
  >(null);
  const [date, setDate] = useState<string>(() => todayISO());
  const [classId, setClassId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  const selectedClass = (classes ?? []).find((c: any) => c.id === classId);

  const apply = () => {
    if (!selected) return;
    const cls: any = selectedClass;
    onPick({
      templateId: selected.kind === "custom" ? selected.id : undefined,
      builtInKey: selected.kind === "builtin" ? selected.key : undefined,
      date,
      classId: classId || null,
      teacherId: cls?.teacher_id ?? null,
      unitId: cls?.unit_id ?? null,
      startTime: startTime || null,
      endTime: endTime || null,
      title: title.trim() || null,
    });
  };

  return (
    <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl">
      <DialogHeader>
        <DialogTitle>Aplicar modelo salvo</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        {/* Coluna esquerda — escolher modelo */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {custom && custom.length ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Meus modelos</div>
              <div className="grid grid-cols-1 gap-2">
                {custom.map((t) => {
                  const isSel = selected?.kind === "custom" && selected.id === (t.id as string);
                  return (
                    <button
                      key={t.id as string}
                      className={`rounded-lg border p-3 text-left transition ${isSel ? "border-primary bg-primary/5" : "hover:border-primary hover:bg-primary/5"}`}
                      onClick={() => setSelected({ kind: "custom", id: t.id as string, name: t.name as string })}
                    >
                      <div className="font-medium">{t.name as string}</div>
                      <div className="text-xs text-muted-foreground">
                        {(t.modality as string) ?? "—"} · {(t.blocks as unknown[])?.length ?? 0} blocos
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Você ainda não salvou modelos próprios. Dentro de um plano, clique em <b>Salvar como modelo</b> para
              reutilizá-lo depois.
            </div>
          )}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Modelos prontos</div>
            <div className="grid grid-cols-1 gap-2">
              {(builtIns ?? []).map((t) => {
                const isSel = selected?.kind === "builtin" && selected.key === t.key;
                return (
                  <button
                    key={t.key}
                    className={`rounded-lg border p-3 text-left transition ${isSel ? "border-primary bg-primary/5" : "hover:border-primary hover:bg-primary/5"}`}
                    onClick={() => setSelected({ kind: "builtin", key: t.key, name: t.name })}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.category ?? "Todas as modalidades"} · {t.block_count} blocos
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna direita — turma / data / horário */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Aplicar em</div>
          <div className="text-sm">
            <span className="text-muted-foreground">Modelo:</span>{" "}
            <span className="font-medium">{selected?.name ?? "—"}</span>
          </div>
          <div>
            <Label className="text-xs">Turma</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {(classes ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.modality ? `· ${c.modality}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Título (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selected?.name ?? "Título da aula"}
              className="mt-1"
            />
          </div>
          <Button className="w-full" disabled={!selected} onClick={apply}>
            Criar plano da aula
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

