import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Copy, Trash2, Ban, UserPlus, X, Search, BookOpen, Plus, ArrowRight, Sparkles } from "lucide-react";
import {
  getClass,
  deleteClass,
  duplicateClass,
  cancelOccurrence,
  addClassStudent,
  removeClassStudent,
  searchStudents,
} from "@/lib/dojo/schedule.functions";
import {
  listLessonPlans,
  upsertLessonPlan,
  listLessonTemplates,
  createPlanFromTemplate,
} from "@/lib/dojo/lesson-plans.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WEEKDAYS, CANCEL_REASONS, fmtTime } from "./constants";

export function ClassSidePanel({
  classId,
  occurrenceDate,
  open,
  onOpenChange,
  onEdit,
}: {
  classId: string | null;
  occurrenceDate?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (data: any) => void;
}) {
  const getClassFn = useServerFn(getClass);
  const delFn = useServerFn(deleteClass);
  const dupFn = useServerFn(duplicateClass);
  const cancelFn = useServerFn(cancelOccurrence);
  const searchFn = useServerFn(searchStudents);
  const addStudentFn = useServerFn(addClassStudent);
  const removeStudentFn = useServerFn(removeClassStudent);
  const listPlansFn = useServerFn(listLessonPlans);
  const upsertPlanFn = useServerFn(upsertLessonPlan);
  const listTemplatesFn = useServerFn(listLessonTemplates);
  const fromTemplateFn = useServerFn(createPlanFromTemplate);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["dojo-class", classId],
    queryFn: () => getClassFn({ data: { id: classId! } }),
    enabled: !!classId && open,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [term, setTerm] = useState("");
  const search = useQuery({
    queryKey: ["dojo-student-search", term],
    queryFn: () => searchFn({ data: { q: term } }),
    enabled: addOpen,
  });

  const [cancelForm, setCancelForm] = useState<{ reason: string; notes: string } | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const plansForDay = useQuery({
    queryKey: ["dojo-class-plans", classId, occurrenceDate],
    queryFn: () =>
      listPlansFn({
        data: { classId: classId!, from: occurrenceDate!, to: occurrenceDate!, limit: 20 },
      }),
    enabled: !!classId && !!occurrenceDate && open,
  });

  const handleCreatePlan = async () => {
    if (!classId || !occurrenceDate || !cls) return;
    setCreatingPlan(true);
    try {
      const schedule = (cls.schedules ?? []).find((s: any) => {
        const d = new Date(occurrenceDate + "T12:00:00");
        return s.weekday === d.getDay();
      });
      const row: any = await upsertPlanFn({
        data: {
          title: `${cls.name} — ${new Date(occurrenceDate + "T12:00:00").toLocaleDateString("pt-BR")}`,
          date: occurrenceDate,
          start_time: schedule?.start_time ?? null,
          end_time: schedule?.end_time ?? null,
          modality: cls.modality ?? null,
          color: cls.color ?? null,
          class_id: classId,
          teacher_id: cls.teacher_id ?? null,
          unit_id: cls.unit_id ?? null,
          status: "planejada",
          blocks: [],
        },
      });
      toast.success("Plano de aula criado");
      qc.invalidateQueries({ queryKey: ["dojo-class-plans", classId, occurrenceDate] });
      navigate({ to: "/dojo/app/lesson-plans/$id", params: { id: row.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingPlan(false);
    }
  };


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dojo-class", classId] });
    qc.invalidateQueries({ queryKey: ["dojo-classes"] });
    qc.invalidateQueries({ queryKey: ["dojo-schedule-stats"] });
  };

  const cls: any = q.data;

  const handleDelete = async () => {
    if (!cls || !confirm("Excluir turma? Esta ação não pode ser desfeita.")) return;
    await delFn({ data: { id: cls.id } });
    toast.success("Turma excluída");
    invalidate();
    onOpenChange(false);
  };

  const handleDuplicate = async () => {
    if (!cls) return;
    await dupFn({ data: { id: cls.id } });
    toast.success("Turma duplicada");
    invalidate();
  };

  const handleCancelOccurrence = async () => {
    if (!cls || !occurrenceDate || !cancelForm?.reason) return;
    try {
      await cancelFn({
        data: {
          class_id: cls.id,
          occurrence_date: occurrenceDate,
          cancel_reason: cancelForm.reason,
          notes: cancelForm.notes || null,
        },
      });
      toast.success("Ocorrência cancelada");
      setCancelForm(null);
      qc.invalidateQueries({ queryKey: ["dojo-occurrences"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddStudent = async (student_id: string) => {
    if (!cls) return;
    try {
      await addStudentFn({ data: { class_id: cls.id, student_id } });
      toast.success("Aluno matriculado");
      setAddOpen(false);
      setTerm("");
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveStudent = async (id: string) => {
    if (!confirm("Remover aluno da turma?")) return;
    await removeStudentFn({ data: { id } });
    invalidate();
  };

  const students = cls?.students ?? [];
  const capacity = cls?.max_students ?? 0;
  const isFull = students.length >= capacity;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {!cls ? (
          <div className="pt-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full" style={{ background: cls.color }} />
                <SheetTitle className="flex-1">{cls.name}</SheetTitle>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <section className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Professor" value={cls.teacher_name || "—"} />
                <Info label="Espaço" value={cls.dojo_spaces?.name || "—"} />
                <Info label="Unidade" value={cls.dojo_units?.name || "—"} />
                <Info label="Modalidade" value={cls.modality} className="capitalize" />
                <Info label="Nível" value={cls.level} className="capitalize" />
                <Info
                  label="Ocupação"
                  value={
                    <span className={isFull ? "text-destructive font-semibold" : ""}>
                      {students.length} / {capacity}
                      {isFull && <span className="ml-1">· Turma lotada</span>}
                    </span>
                  }
                />
              </section>

              <section>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Horários</h4>
                <div className="space-y-1">
                  {(cls.schedules ?? []).map((s: any) => (
                    <div key={s.id} className="text-sm flex items-center justify-between border-b py-1.5 last:border-0">
                      <span className="font-medium">{WEEKDAYS[s.weekday].label}</span>
                      <span className="text-muted-foreground">
                        {fmtTime(s.start_time)} — {fmtTime(s.end_time)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {occurrenceDate && (
                <section className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Plano de aula ({new Date(occurrenceDate + "T12:00:00").toLocaleDateString("pt-BR")})
                    </h4>
                  </div>
                  {plansForDay.isLoading ? (
                    <div className="text-xs text-muted-foreground">Carregando…</div>
                  ) : (plansForDay.data ?? []).length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Nenhum plano vinculado a esta aula.</p>
                      <Button size="sm" variant="default" onClick={handleCreatePlan} disabled={creatingPlan}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {creatingPlan ? "Criando..." : "Criar plano para esta aula"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(plansForDay.data ?? []).map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => navigate({ to: "/dojo/app/lesson-plans/$id", params: { id: p.id } })}
                          className="w-full flex items-center gap-2 rounded-md border bg-white p-2 text-left text-sm hover:border-primary hover:bg-primary/5 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{p.title}</div>
                            <div className="text-[11px] text-muted-foreground capitalize">
                              {p.status} · {(p.blocks ?? []).length} blocos
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                      <Button size="sm" variant="outline" onClick={handleCreatePlan} disabled={creatingPlan} className="w-full">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Novo plano para esta data
                      </Button>
                    </div>
                  )}
                </section>
              )}


              {cls.description && (
                <section>
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Descrição</h4>
                  <p className="text-sm">{cls.description}</p>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                    Alunos matriculados
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} disabled={isFull}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="rounded-md border divide-y">
                  {students.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Nenhum aluno matriculado.
                    </div>
                  )}
                  {students.map((row: any) => {
                    const s = row.dojo_students;
                    return (
                      <div key={row.id} className="flex items-center gap-3 p-2 text-sm">
                        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                          {s?.photo_url ? (
                            <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-semibold">
                              {s?.full_name?.[0] ?? "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{s?.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s?.phone || "—"}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveStudent(row.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {cancelForm && (
                <section className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <h4 className="text-sm font-semibold">
                    Cancelar aula de {occurrenceDate}
                  </h4>
                  <Select value={cancelForm.reason} onValueChange={(v) => setCancelForm({ ...cancelForm, reason: v })}>
                    <SelectTrigger><SelectValue placeholder="Motivo" /></SelectTrigger>
                    <SelectContent>
                      {CANCEL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={2}
                    placeholder="Observações (opcional)"
                    value={cancelForm.notes}
                    onChange={(e) => setCancelForm({ ...cancelForm, notes: e.target.value })}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCancelForm(null)}>Voltar</Button>
                    <Button variant="destructive" size="sm" onClick={handleCancelOccurrence} disabled={!cancelForm.reason}>
                      Confirmar cancelamento
                    </Button>
                  </div>
                </section>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => onEdit(cls)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                {occurrenceDate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCancelForm({ reason: "", notes: "" })}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar aula
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleDuplicate}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Duplicar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
              </div>
            </div>

            {/* Add student dialog */}
            {addOpen && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAddOpen(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Adicionar aluno</h3>
                    <Button size="icon" variant="ghost" onClick={() => setAddOpen(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      className="pl-8"
                      placeholder="Nome, telefone, email ou CPF"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y rounded border">
                    {(search.data ?? []).map((s: any) => {
                      const already = students.some((r: any) => r.student_id === s.id);
                      return (
                        <button
                          key={s.id}
                          disabled={already}
                          onClick={() => handleAddStudent(s.id)}
                          className="w-full flex items-center gap-3 p-2 text-left hover:bg-muted disabled:opacity-50"
                        >
                          <div className="h-8 w-8 rounded-full bg-muted grid place-items-center text-xs font-semibold overflow-hidden">
                            {s.photo_url ? <img src={s.photo_url} alt="" className="h-full w-full object-cover" /> : s.full_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{s.full_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{s.phone || s.email}</div>
                          </div>
                          {already && <span className="text-xs text-muted-foreground">Já matriculado</span>}
                        </button>
                      );
                    })}
                    {(search.data ?? []).length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value, className }: { label: string; value: any; className?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${className ?? ""}`}>{value}</div>
    </div>
  );
}
