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

export const Route = createFileRoute("/dojo/app/lesson-plans/")({
  component: LessonPlansDashboardPage,
});

const STATUS_COLORS: Record<string, string> = {
  planejada: "bg-blue-100 text-blue-700 border-blue-200",
  ministrada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelada: "bg-neutral-100 text-neutral-500 border-neutral-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
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
  return d.toISOString().slice(0, 10);
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
    mutationFn: (payload: { templateId?: string; builtInKey?: string }) =>
      fromTplFn({ data: { ...payload, date: fmt(new Date()) } }),
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Aulas planejadas (semana)" value={stats?.week_planned ?? 0} icon={CalendarDays} tone="blue" />
        <KpiCard label="Aulas realizadas (semana)" value={stats?.week_done ?? 0} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Horas planejadas" value={formatHours(stats?.total_planned_min ?? 0)} icon={Clock} tone="violet" />
        <KpiCard label="Turmas ativas" value={stats?.active_classes ?? 0} icon={Users} tone="amber" />
      </div>

      {stats?.next_lesson ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próxima aula</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{stats.next_lesson.title}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(stats.next_lesson.date).toLocaleDateString("pt-BR")}
                {stats.next_lesson.start_time ? ` · ${stats.next_lesson.start_time.slice(0, 5)}` : ""}
                {(stats.next_lesson.dojo_classes as { name?: string } | null)?.name
                  ? ` · ${(stats.next_lesson.dojo_classes as { name?: string }).name}`
                  : ""}
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/dojo/app/lesson-plans/$id" params={{ id: stats.next_lesson.id as string }}>
                Abrir plano
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* CALENDAR HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, view === "month" ? -30 : -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, view === "month" ? 30 : 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-3 text-sm font-medium text-muted-foreground">{formatRangeLabel(range.from, range.to, view)}</span>
        </div>
        <div className="flex items-center gap-1">
          {(["week", "month", "list"] as ViewMode[]).map((v) => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
              {v === "week" ? "Semana" : v === "month" ? "Mês" : "Lista"}
            </Button>
          ))}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="ml-2">
                <Sparkles className="mr-1 h-4 w-4" /> Do modelo
              </Button>
            </DialogTrigger>
            <TemplatePickerDialog onPick={(payload) => createFromTpl.mutate(payload)} />
          </Dialog>
          <Button size="sm" className="ml-1" onClick={() => createDraft.mutate(fmt(new Date()))}>
            <Plus className="mr-1 h-4 w-4" /> Em branco
          </Button>
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
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  } as const;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
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
          <div key={key} className={`rounded-lg border p-2 min-h-[160px] ${isToday ? "border-primary/40 bg-primary/5" : "bg-card"}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium">
                {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-primary"
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
                  className={`block rounded border px-2 py-1 text-xs ${STATUS_COLORS[p.status as string] ?? ""}`}
                >
                  <div className="font-medium truncate">{p.title}</div>
                  {p.start_time ? <div className="opacity-70">{(p.start_time as string).slice(0, 5)}</div> : null}
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
    <div className="grid grid-cols-7 gap-1">
      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((w) => (
        <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
          {w}
        </div>
      ))}
      {cells.map((d) => {
        const key = fmt(d);
        const items = byDay[key] ?? [];
        const inMonth = d.getMonth() === anchor.getMonth();
        return (
          <div
            key={key}
            className={`min-h-[92px] rounded border p-1 text-xs ${inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground"}`}
            onDoubleClick={() => onCreate(key)}
          >
            <div className="mb-1 text-[11px] font-medium">{d.getDate()}</div>
            {items.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to="/dojo/app/lesson-plans/$id"
                params={{ id: p.id as string }}
                className={`mb-0.5 block truncate rounded border px-1 ${STATUS_COLORS[p.status as string] ?? ""}`}
              >
                {p.title}
              </Link>
            ))}
            {items.length > 3 ? <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div> : null}
          </div>
        );
      })}
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
    return <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Nenhuma aula planejada neste período.</div>;
  }
  return (
    <div className="divide-y rounded-lg border">
      {plans.map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-3">
          <div className="w-24 text-sm text-muted-foreground">
            {new Date(p.date as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            {p.start_time ? ` · ${(p.start_time as string).slice(0, 5)}` : ""}
          </div>
          <div className="flex-1">
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-muted-foreground">
              {(p.dojo_classes as { name?: string } | null)?.name ?? "—"}
              {p.modality ? ` · ${p.modality}` : ""}
            </div>
          </div>
          <Badge className={STATUS_COLORS[p.status as string] ?? ""} variant="outline">
            {p.status as string}
          </Badge>
          <Button asChild size="icon" variant="ghost">
            <Link to="/dojo/app/lesson-plans/$id" params={{ id: p.id as string }}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDuplicate(p.id as string)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(p.id as string)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function TemplatePickerDialog({
  onPick,
}: {
  onPick: (payload: { templateId?: string; builtInKey?: string }) => void;
}) {
  const builtInsFn = useServerFn(getBuiltInLessonTemplates);
  const listFn = useServerFn(listLessonTemplates);
  const { data: builtIns } = useQuery({
    queryKey: ["lesson-plans", "builtin-templates"],
    queryFn: () => builtInsFn({}),
  });
  const { data: custom } = useQuery({
    queryKey: ["lesson-plans", "custom-templates"],
    queryFn: () => listFn({}),
  });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Escolher modelo</DialogTitle>
      </DialogHeader>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {custom && custom.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Meus modelos</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {custom.map((t) => (
                <button
                  key={t.id as string}
                  className="rounded-lg border p-3 text-left transition hover:border-primary hover:bg-primary/5"
                  onClick={() => onPick({ templateId: t.id as string })}
                >
                  <div className="font-medium">{t.name as string}</div>
                  <div className="text-xs text-muted-foreground">
                    {(t.modality as string) ?? "—"} · {(t.blocks as unknown[])?.length ?? 0} blocos
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Modelos prontos</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(builtIns ?? []).map((t) => (
              <button
                key={t.key}
                className="rounded-lg border p-3 text-left transition hover:border-primary hover:bg-primary/5"
                onClick={() => onPick({ builtInKey: t.key })}
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.category ?? "Todas as modalidades"} · {t.block_count} blocos
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
