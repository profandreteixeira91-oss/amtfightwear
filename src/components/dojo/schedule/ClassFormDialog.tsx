import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { saveClass, listSpaces } from "@/lib/dojo/schedule.functions";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { listTeamMembers } from "@/lib/dojo/team.functions";
import { WEEKDAYS, MODALITIES, LEVELS, CLASS_COLORS } from "./constants";

type Schedule = { weekday: number; start_time: string; end_time: string };

export function ClassFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
}) {
  const saveFn = useServerFn(saveClass);
  const listSpacesFn = useServerFn(listSpaces);
  const listUnitsFn = useServerFn(listDojoUnits);
  const listTeamFn = useServerFn(listTeamMembers);
  const qc = useQueryClient();

  const spaces = useQuery({ queryKey: ["dojo-spaces"], queryFn: () => listSpacesFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnitsFn() });
  const team = useQuery({ queryKey: ["dojo-team-members"], queryFn: () => listTeamFn() });

  const empty = {
    name: "",
    description: "",
    modality: "jiu-jitsu",
    level: "todos",
    color: "#dc2626",
    max_students: 20,
    status: "active" as const,
    space_id: null as string | null,
    unit_id: null as string | null,
    teacher_id: null as string | null,
    teacher_name: "",
    schedules: [{ weekday: 1, start_time: "19:00", end_time: "20:00" }] as Schedule[],
  };
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          id: initial.id,
          name: initial.name ?? "",
          description: initial.description ?? "",
          modality: initial.modality ?? "jiu-jitsu",
          level: initial.level ?? "todos",
          color: initial.color ?? "#dc2626",
          max_students: initial.max_students ?? 20,
          status: initial.status ?? "active",
          space_id: initial.space_id ?? null,
          unit_id: initial.unit_id ?? null,
          teacher_id: initial.teacher_id ?? null,
          teacher_name: initial.teacher_name ?? "",
          schedules:
            (initial.schedules ?? []).map((s: any) => ({
              weekday: s.weekday,
              start_time: s.start_time?.slice(0, 5) ?? "19:00",
              end_time: s.end_time?.slice(0, 5) ?? "20:00",
            })).length
              ? initial.schedules.map((s: any) => ({
                  weekday: s.weekday,
                  start_time: s.start_time?.slice(0, 5) ?? "19:00",
                  end_time: s.end_time?.slice(0, 5) ?? "20:00",
                }))
              : empty.schedules,
        });
      } else setForm(empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const toggleDay = (d: number) => {
    const base = form.schedules[0] ?? { start_time: "19:00", end_time: "20:00" };
    const exists = form.schedules.some((s: Schedule) => s.weekday === d);
    if (exists) {
      setForm({ ...form, schedules: form.schedules.filter((s: Schedule) => s.weekday !== d) });
    } else {
      setForm({
        ...form,
        schedules: [...form.schedules, { weekday: d, start_time: base.start_time, end_time: base.end_time }].sort(
          (a: Schedule, b: Schedule) => a.weekday - b.weekday,
        ),
      });
    }
  };

  const updateSchedule = (idx: number, patch: Partial<Schedule>) => {
    const next = [...form.schedules];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, schedules: next });
  };

  const onSubmit = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    if (!form.schedules.length) return toast.error("Selecione ao menos um dia da semana");
    setSaving(true);
    try {
      await saveFn({ data: form });
      toast.success("Turma salva");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["dojo-classes"] });
      qc.invalidateQueries({ queryKey: ["dojo-schedule-stats"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar turma" : "Nova turma"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações gerais
            </h3>
            <div className="grid gap-3">
              <div>
                <Label>Nome da turma *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Modalidade</Label>
                  <Select value={form.modality} onValueChange={(v) => setForm({ ...form, modality: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nível</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Cor da turma</Label>
                <div className="flex flex-wrap gap-2">
                  {CLASS_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-8 w-8 rounded-full border-2 ${form.color === c ? "border-foreground scale-110" : "border-transparent"} transition-transform`}
                      style={{ background: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Máx. alunos</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.max_students}
                    onChange={(e) => setForm({ ...form, max_students: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Espaço e professor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Espaço</Label>
                <Select
                  value={form.space_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, space_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem espaço</SelectItem>
                    {(spaces.data ?? []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select
                  value={form.unit_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, unit_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem unidade</SelectItem>
                    {(units.data ?? []).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Professor principal</Label>
                <Select
                  value={form.teacher_id ?? "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setForm({ ...form, teacher_id: null, teacher_name: "" });
                    } else {
                      const member = (team.data ?? []).find((m: any) => m.id === v);
                      setForm({
                        ...form,
                        teacher_id: v,
                        teacher_name: member?.full_name ?? "",
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador da Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem professor</SelectItem>
                    {(team.data ?? [])
                      .filter((m: any) => m.status !== "inactive" && m.status !== "terminated")
                      .map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name}
                          {m.role ? ` · ${m.role}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Somente colaboradores cadastrados no módulo{" "}
                  <span className="font-medium">Equipe</span> podem ser designados. Os horários da turma
                  aparecerão automaticamente na escala do professor.
                </p>
                {(team.data ?? []).length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Nenhum colaborador cadastrado. Cadastre em Equipe → Novo colaborador.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Horários</h3>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = form.schedules.some((s: Schedule) => s.weekday === d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-[color:var(--dojo-border)] hover:border-primary/40"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {form.schedules.map((s: Schedule, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="min-w-[70px] font-medium">{WEEKDAYS[s.weekday].label}</span>
                  <Input
                    type="time"
                    value={s.start_time}
                    onChange={(e) => updateSchedule(idx, { start_time: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={s.end_time}
                    onChange={(e) => updateSchedule(idx, { end_time: e.target.value })}
                    className="w-32"
                  />
                  <Button size="icon" variant="ghost" onClick={() => toggleDay(s.weekday)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {!form.schedules.length && (
                <p className="text-xs text-muted-foreground">Selecione ao menos um dia da semana.</p>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar turma"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
