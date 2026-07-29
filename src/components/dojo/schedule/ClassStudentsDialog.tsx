import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, X, Users } from "lucide-react";
import { getClass, addClassStudent, removeClassStudent, searchStudents } from "@/lib/dojo/schedule.functions";

export function ClassStudentsDialog({
  classId,
  open,
  onOpenChange,
}: {
  classId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const getClassFn = useServerFn(getClass);
  const searchFn = useServerFn(searchStudents);
  const addFn = useServerFn(addClassStudent);
  const removeFn = useServerFn(removeClassStudent);
  const qc = useQueryClient();

  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const cls = useQuery({
    queryKey: ["dojo-class", classId],
    queryFn: () => getClassFn({ data: { id: classId! } }),
    enabled: !!classId && open,
  });

  const search = useQuery({
    queryKey: ["dojo-student-search", term],
    queryFn: () => searchFn({ data: { q: term } }),
    enabled: open,
  });

  const students: any[] = (cls.data as any)?.students ?? [];
  const capacity = (cls.data as any)?.max_students ?? 0;
  const isFull = capacity > 0 && students.length >= capacity;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dojo-class", classId] });
    qc.invalidateQueries({ queryKey: ["dojo-classes"] });
    qc.invalidateQueries({ queryKey: ["dojo-occurrences"] });
  };

  const add = async (student_id: string) => {
    if (!classId) return;
    setBusy(student_id);
    try {
      await addFn({ data: { class_id: classId, student_id } });
      toast.success("Aluno matriculado na turma");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao matricular");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (rowId: string) => {
    setBusy(rowId);
    try {
      await removeFn({ data: { id: rowId } });
      toast.success("Aluno removido da turma");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span className="break-words">Alunos — {(cls.data as any)?.name ?? "Turma"}</span>
          </DialogTitle>
          <DialogDescription>
            Matricule ou remova alunos desta turma. {students.length}
            {capacity ? `/${capacity}` : ""} vagas ocupadas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="min-w-0">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Matriculados nesta turma
            </h4>
            <div className="divide-y rounded-xl border">
              {students.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum aluno matriculado.</div>
              )}
              {students.map((row: any) => {
                const s = row.dojo_students;
                return (
                  <div key={row.id} className="flex items-center gap-3 p-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                      {s?.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        s?.full_name?.[0] ?? "?"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium break-words">{s?.full_name}</div>
                      <div className="text-xs text-muted-foreground break-words">{s?.phone || s?.email || "—"}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy === row.id}
                      title="Remover da turma"
                      onClick={() => remove(row.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="min-w-0">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Adicionar aluno
            </h4>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Nome, telefone, email ou CPF"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            {isFull && (
              <p className="mb-2 text-xs text-amber-600">Turma lotada — remova alguém para incluir novos alunos.</p>
            )}
            <div className="max-h-[320px] divide-y overflow-y-auto rounded-xl border">
              {((search.data as any[]) ?? []).map((s: any) => {
                const already = students.some((r: any) => r.student_id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={already || isFull || busy === s.id}
                    onClick={() => add(s.id)}
                    className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted disabled:opacity-50"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        s.full_name?.[0] ?? "?"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium break-words">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground break-words">{s.phone || s.email}</div>
                    </div>
                    {already ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">Já matriculado</span>
                    ) : (
                      <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
              {((search.data as any[]) ?? []).length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
