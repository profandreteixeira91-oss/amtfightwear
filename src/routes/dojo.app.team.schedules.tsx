import { calendarISO } from "@/lib/dates";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listTeamSchedule,
  substituteTeacher,
  revertSubstitution,
  listSubstitutions,
  generateOccurrences,
} from "@/lib/dojo/team-schedule.functions";
import { listTeamMembers } from "@/lib/dojo/team.functions";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, History, RefreshCw, UserCog, Users, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/team/schedules")({
  head: () => ({
    meta: [
      { title: "Escalas — Equipe · AMT Dojo Manager" },
      {
        name: "description",
        content:
          "Visualização semanal das aulas, substituições de professores e histórico completo — mantendo o vínculo do professor original preservado.",
      },
    ],
  }),
  component: SchedulesPage,
});

const REASON_LABELS: Record<string, string> = {
  ferias: "Férias",
  licenca: "Licença",
  evento: "Evento",
  competicao: "Competição",
  afastamento: "Afastamento",
  emergencia: "Emergência",
  outro: "Outro",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
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
function fmtBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function SchedulesPage() {
  const listFn = useServerFn(listTeamSchedule);
  const teamFn = useServerFn(listTeamMembers);
  const subFn = useServerFn(substituteTeacher);
  const revertFn = useServerFn(revertSubstitution);
  const historyFn = useServerFn(listSubstitutions);
  const genFn = useServerFn(generateOccurrences);
  const qc = useQueryClient();

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [view, setView] = useState<"week" | "day" | "history">("week");

  const from = fmt(weekStart);
  const to = fmt(addDays(weekStart, view === "day" ? 0 : 6));

  const team = useQuery({
    queryKey: ["team-members"],
    queryFn: () => teamFn(),
  });

  const schedule = useQuery({
    queryKey: ["team-schedule", from, to, teacherFilter],
    queryFn: () =>
      listFn({
        data: {
          from,
          to,
          teacher_id: teacherFilter === "all" ? null : teacherFilter,
        },
      }),
  });

  const history = useQuery({
    queryKey: ["team-substitutions", teacherFilter],
    queryFn: () =>
      historyFn({
        data: { teacher_id: teacherFilter === "all" ? null : teacherFilter, limit: 100 },
      }),
    enabled: view === "history",
  });

  const teamById = useMemo(() => {
    const map = new Map<string, any>();
    for (const m of team.data ?? []) {
      if (m?.id) map.set(m.id as string, m);
    }
    return map;
  }, [team.data]);


  // Agrupar ocorrências por dia
  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const occ of (schedule.data ?? []) as any[]) {
      const k = occ.occurrence_date as string | null;
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(occ);
    }

    return map;
  }, [schedule.data]);

  const days = useMemo(() => {
    const n = view === "day" ? 1 : 7;
    return Array.from({ length: n }, (_, i) => addDays(weekStart, i));
  }, [weekStart, view]);

  // ============ Substitution Dialog ============
  const [substOcc, setSubstOcc] = useState<any | null>(null);
  const [substForm, setSubstForm] = useState({
    substitute_teacher_id: "",
    reason: "ferias" as const,
    reason_detail: "",
    apply_to_period: false,
    period_end: "",
  });

  const openSubst = (occ: any) => {
    setSubstOcc(occ);
    setSubstForm({
      substitute_teacher_id: "",
      reason: "ferias",
      reason_detail: "",
      apply_to_period: false,
      period_end: occ.occurrence_date,
    });
  };

  const confirmSubst = async () => {
    if (!substOcc || !substForm.substitute_teacher_id) {
      toast.error("Selecione um professor substituto");
      return;
    }
    try {
      const r = await subFn({
        data: {
          occurrence_id: substOcc.occurrence_id,
          substitute_teacher_id: substForm.substitute_teacher_id,
          reason: substForm.reason,
          reason_detail: substForm.reason_detail || null,
          apply_to_period: substForm.apply_to_period,
          period_end: substForm.apply_to_period ? substForm.period_end : null,
        },
      });
      toast.success(`Substituição registrada em ${r.affected} aula(s)`);
      setSubstOcc(null);
      qc.invalidateQueries({ queryKey: ["team-schedule"] });
      qc.invalidateQueries({ queryKey: ["team-substitutions"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const revertOcc = async (occurrence_id: string) => {
    if (!confirm("Reverter substituição desta aula? O histórico será preservado.")) return;
    try {
      await revertFn({ data: { occurrence_id } });
      toast.success("Substituição revertida");
      qc.invalidateQueries({ queryKey: ["team-schedule"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const materialize = async () => {
    try {
      const r = await genFn({ data: { from, to } });
      toast.success(`${r.created} ocorrência(s) sincronizada(s)`);
      qc.invalidateQueries({ queryKey: ["team-schedule"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const teachers = (team.data ?? []).filter((m: any) =>
    ["teacher", "instructor", "assistant"].includes(m.role) && m.status !== "terminated",
  );

  return (
    <DojoPageShell
      title="Escalas"
      description="Agenda semanal, substituições e histórico completo"

      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={materialize}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar semana
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dojo/app/team">
              <Users className="mr-2 h-4 w-4" /> Colaboradores
            </Link>
          </Button>
        </div>
      }
    >
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mt-4">
        <TabsList>
          <TabsTrigger value="day">Hoje</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {view !== "history" && (
            <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setWeekStart((d) => addDays(d, view === "day" ? -1 : -7))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] px-2 text-center text-sm font-medium">
                {view === "day"
                  ? weekStart.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })
                  : `${fmtBR(weekStart)} – ${fmtBR(addDays(weekStart, 6))}`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setWeekStart((d) => addDays(d, view === "day" ? 1 : 7))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
              >
                Hoje
              </Button>
            </div>
          )}
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os professores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os professores</SelectItem>
              {teachers.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="day" className="mt-4">
          <DayView
            day={days[0]}
            occurrences={byDay.get(fmt(days[0])) ?? []}
            teamById={teamById}
            onSubstitute={openSubst}
            onRevert={revertOcc}
            loading={schedule.isLoading}
          />
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
            {days.map((d) => {
              const key = fmt(d);
              const items = byDay.get(key) ?? [];
              const isToday = fmt(new Date()) === key;
              return (
                <div
                  key={key}
                  className={`rounded-lg border bg-card ${isToday ? "ring-2 ring-primary/50" : ""}`}
                >
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div>
                      <div className="text-xs font-medium uppercase text-muted-foreground">
                        {WEEKDAYS[d.getDay()]}
                      </div>
                      <div className="text-sm font-semibold">{fmtBR(d)}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="max-h-[520px] space-y-2 overflow-y-auto p-2">
                    {items.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Sem aulas
                      </div>
                    )}
                    {items.map((occ: any) => (
                      <OccurrenceCard
                        key={occ.occurrence_id}
                        occ={occ}
                        teamById={teamById}
                        compact
                        onSubstitute={() => openSubst(occ)}
                        onRevert={() => revertOcc(occ.occurrence_id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {history.isLoading && (
                <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
              )}
              {!history.isLoading && (history.data ?? []).length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Nenhuma substituição registrada.
                </div>
              )}
              {(history.data ?? []).map((h: any) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-3 border-b p-3 last:border-0"
                >
                  <History className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm">
                      <span className="font-medium">
                        {h.original_teacher?.full_name ?? "—"}
                      </span>{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      <span className="font-medium text-primary">
                        {h.substitute_teacher?.full_name ?? "—"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {h.dojo_classes?.name ?? "Aula"} · {h.period_start}
                      {h.period_end && h.period_end !== h.period_start
                        ? ` até ${h.period_end}`
                        : ""}
                    </div>
                  </div>
                  <Badge variant="secondary">{REASON_LABELS[h.reason] ?? h.reason}</Badge>
                  {h.metadata?.reverted && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                      Revertida
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Substitution Dialog */}
      <Dialog open={!!substOcc} onOpenChange={(v) => !v && setSubstOcc(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Substituir Professor</DialogTitle>
          </DialogHeader>
          {substOcc && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{substOcc.class_name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(substOcc.occurrence_date + "T00:00:00").toLocaleDateString(
                    "pt-BR",
                    { weekday: "long", day: "2-digit", month: "long" },
                  )}{" "}
                  · {String(substOcc.start_time).slice(0, 5)}–{String(substOcc.end_time).slice(0, 5)}
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Professor atual:</span>{" "}
                  <span className="font-medium">
                    {teamById.get(
                      substOcc.substitute_teacher_id ?? substOcc.class_teacher_id,
                    )?.full_name ?? "—"}
                  </span>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Novo professor</Label>
                <Select
                  value={substForm.substitute_teacher_id}
                  onValueChange={(v) =>
                    setSubstForm((f) => ({ ...f, substitute_teacher_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar professor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers
                      .filter((t: any) => t.id !== substOcc.class_teacher_id)
                      .map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Motivo</Label>
                <Select
                  value={substForm.reason}
                  onValueChange={(v) => setSubstForm((f) => ({ ...f, reason: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REASON_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Observações (opcional)</Label>
                <Textarea
                  rows={2}
                  value={substForm.reason_detail}
                  onChange={(e) =>
                    setSubstForm((f) => ({ ...f, reason_detail: e.target.value }))
                  }
                />
              </div>

              <div className="rounded-md border p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={substForm.apply_to_period}
                    onChange={(e) =>
                      setSubstForm((f) => ({ ...f, apply_to_period: e.target.checked }))
                    }
                  />
                  <div>
                    <div className="font-medium">Aplicar em período</div>
                    <div className="text-xs text-muted-foreground">
                      Substitui automaticamente todas as ocorrências desta aula até a data
                      escolhida.
                    </div>
                  </div>
                </label>
                {substForm.apply_to_period && (
                  <div className="mt-2">
                    <Label className="mb-1 block text-xs">Até (inclusive)</Label>
                    <Input
                      type="date"
                      value={substForm.period_end}
                      onChange={(e) =>
                        setSubstForm((f) => ({ ...f, period_end: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubstOcc(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmSubst}>
              <UserCog className="mr-2 h-4 w-4" /> Confirmar substituição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DojoPageShell>
  );
}

function OccurrenceCard({
  occ,
  teamById,
  compact,
  onSubstitute,
  onRevert,
}: {
  occ: any;
  teamById: Map<string, any>;
  compact?: boolean;
  onSubstitute: () => void;
  onRevert: () => void;
}) {
  const effectiveId = occ.substitute_teacher_id ?? occ.class_teacher_id;
  const effective = effectiveId ? teamById.get(effectiveId) : null;
  const original = occ.original_teacher_id
    ? teamById.get(occ.original_teacher_id)
    : occ.class_teacher_id
      ? teamById.get(occ.class_teacher_id)
      : null;
  const substituted = !!occ.substitute_teacher_id;

  return (
    <div
      className="rounded-md border bg-background p-2 transition hover:shadow-sm"
      style={{ borderLeftColor: occ.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`truncate ${compact ? "text-xs" : "text-sm"} font-medium`}>
            {occ.class_name}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {String(occ.start_time).slice(0, 5)}–{String(occ.end_time).slice(0, 5)} ·{" "}
            {occ.modality}
          </div>
        </div>
        {substituted && (
          <Badge variant="secondary" className="text-[10px]">
            Substituído
          </Badge>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={effective?.photo_url ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {(effective?.full_name ?? "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-xs">
          <div className="truncate font-medium">{effective?.full_name ?? "Sem professor"}</div>
          {substituted && original && (
            <div className="truncate text-[10px] text-muted-foreground line-through">
              {original.full_name}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        {!substituted ? (
          <Button size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={onSubstitute}>
            <UserCog className="mr-1 h-3 w-3" /> Substituir
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={onSubstitute}>
              Alterar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRevert}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function DayView({
  day,
  occurrences,
  teamById,
  onSubstitute,
  onRevert,
  loading,
}: {
  day: Date;
  occurrences: any[];
  teamById: Map<string, any>;
  onSubstitute: (occ: any) => void;
  onRevert: (occurrence_id: string) => void;
  loading: boolean;
}) {
  const sorted = [...occurrences].sort((a, b) =>
    String(a.start_time).localeCompare(String(b.start_time)),
  );

  return (
    <Card>
      <CardContent className="p-0">
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma aula em {day.toLocaleDateString("pt-BR")}. Clique em "Sincronizar semana"
            para gerar as ocorrências.
          </div>
        )}
        <div className="divide-y">
          {sorted.map((occ) => {
            const effectiveId = occ.substitute_teacher_id ?? occ.class_teacher_id;
            const effective = effectiveId ? teamById.get(effectiveId) : null;
            const substituted = !!occ.substitute_teacher_id;
            return (
              <div key={occ.occurrence_id} className="flex flex-wrap items-center gap-3 p-3">
                <div
                  className="w-1.5 self-stretch rounded-full"
                  style={{ background: occ.color }}
                />
                <div className="min-w-[80px] text-sm font-mono font-medium">
                  {String(occ.start_time).slice(0, 5)}
                  <div className="text-[10px] text-muted-foreground">
                    {String(occ.end_time).slice(0, 5)}
                  </div>
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className="font-medium">{occ.class_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {occ.modality} · {occ.level}
                  </div>
                </div>
                <div className="flex min-w-[180px] items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={effective?.photo_url ?? undefined} />
                    <AvatarFallback>
                      {(effective?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{effective?.full_name ?? "Sem professor"}</div>
                    {substituted && (
                      <Badge variant="secondary" className="text-[10px]">
                        Substituído
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!substituted ? (
                    <Button size="sm" variant="outline" onClick={() => onSubstitute(occ)}>
                      <UserCog className="mr-1 h-3 w-3" /> Substituir
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onSubstitute(occ)}>
                        Alterar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRevert(occ.occurrence_id)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> Reverter
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
