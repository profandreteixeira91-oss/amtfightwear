import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  GraduationCap,
  Sparkles,
  Users,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Copy,
  CalendarDays,
  Search,
} from "lucide-react";
import { listClasses, deleteClass, duplicateClass, listSpaces } from "@/lib/dojo/schedule.functions";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { ClassFormDialog } from "@/components/dojo/schedule/ClassFormDialog";
import { ClassSidePanel } from "@/components/dojo/schedule/ClassSidePanel";
import { WEEKDAYS, MODALITIES, fmtTime } from "@/components/dojo/schedule/constants";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo/app/classes")({
  head: () => ({
    meta: [
      { title: "Turmas — AMT Dojo Manager" },
      { name: "description", content: "Crie, edite e remova as turmas do seu dojo. Tudo aparece automaticamente na Agenda." },
      { property: "og:title", content: "Turmas — AMT Dojo Manager" },
      { property: "og:description", content: "Gestão completa das turmas do dojo integrada à agenda de aulas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const qc = useQueryClient();
  const listClassesFn = useServerFn(listClasses);
  const listSpacesFn = useServerFn(listSpaces);
  const listUnitsFn = useServerFn(listDojoUnits);
  const deleteFn = useServerFn(deleteClass);
  const duplicateFn = useServerFn(duplicateClass);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [studentsId, setStudentsId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ modality: "all", space_id: "all", unit_id: "all", status: "all" });

  const classes = useQuery({ queryKey: ["dojo-classes"], queryFn: () => listClassesFn() });
  const spaces = useQuery({ queryKey: ["dojo-spaces"], queryFn: () => listSpacesFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnitsFn() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dojo-classes"] });
    qc.invalidateQueries({ queryKey: ["dojo-occurrences"] });
    qc.invalidateQueries({ queryKey: ["dojo-schedule-stats"] });
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (classes.data ?? []).filter((c: any) => {
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.modality !== "all" && c.modality !== filters.modality) return false;
      if (filters.space_id !== "all" && c.space_id !== filters.space_id) return false;
      if (filters.unit_id !== "all" && c.unit_id !== filters.unit_id) return false;
      if (!term) return true;
      return [c.name, c.modality, c.teacher_name, c.dojo_spaces?.name]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [classes.data, filters, q]);

  const totals = useMemo(() => {
    const all = classes.data ?? [];
    return {
      total: all.length,
      active: all.filter((c: any) => c.status === "active").length,
      students: all.reduce((acc: number, c: any) => acc + (c.students ?? []).length, 0),
      slots: all.reduce((acc: number, c: any) => acc + (c.schedules ?? []).length, 0),
    };
  }, [classes.data]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setFormOpen(true); setPanelId(null); };

  const onDuplicate = async (c: any) => {
    setBusy(true);
    try {
      await duplicateFn({ data: { id: c.id } });
      toast.success("Turma duplicada");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao duplicar");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteFn({ data: { id: toDelete.id } });
      toast.success("Turma removida");
      setToDelete(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      {/* Hero */}
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
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-red-300/80">
                <Sparkles className="h-3 w-3" /> Rotina do dojo
              </div>
              <h1 className="mt-1 font-display text-3xl md:text-4xl font-black tracking-tight text-white">Turmas</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Cadastre, edite e remova turmas. Toda turma criada aqui aparece automaticamente na{" "}
                <Link to="/dojo/app/schedule" className="underline decoration-red-400/60 underline-offset-2">
                  Agenda
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex md:justify-end">
            <Button
              onClick={openNew}
              className="h-11 rounded-full bg-white px-5 font-semibold text-red-700 shadow-lg shadow-red-950/40 hover:bg-white/95 transition-all"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nova turma
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={GraduationCap} label="Turmas cadastradas" value={totals.total} accent="from-red-500 to-red-700" />
        <Kpi icon={CalendarDays} label="Turmas ativas" value={totals.active} accent="from-amber-500 to-orange-600" />
        <Kpi icon={Clock} label="Horários semanais" value={totals.slots} accent="from-violet-500 to-fuchsia-600" />
        <Kpi icon={Users} label="Matrículas em turmas" value={totals.students} accent="from-emerald-500 to-teal-600" />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:w-[240px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Buscar turma, professor..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={filters.modality} onValueChange={(v) => setFilters({ ...filters, modality: v })}>
          <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas modalidades</SelectItem>
            {MODALITIES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.space_id} onValueChange={(v) => setFilters({ ...filters, space_id: v })}>
          <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Espaço" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os espaços</SelectItem>
            {(spaces.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.unit_id} onValueChange={(v) => setFilters({ ...filters, unit_id: v })}>
          <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as unidades</SelectItem>
            {(units.data ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="h-9 w-full sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {classes.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm font-semibold text-neutral-700">Nenhuma turma encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie sua primeira turma — ela aparecerá automaticamente na agenda de aulas.
          </p>
          <Button onClick={openNew} className="mt-4 rounded-full">
            <Plus className="h-4 w-4 mr-1.5" /> Nova turma
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c: any) => (
            <div
              key={c.id}
              className="group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: c.color || "#dc2626" }} />
              <div className="pl-2.5">
                <div className="flex items-start justify-between gap-2">
                  <button className="min-w-0 text-left" onClick={() => setPanelId(c.id)}>
                    <div className="font-semibold break-words">{c.name}</div>
                    <div className="mt-0.5 text-xs capitalize text-muted-foreground break-words">
                      {c.modality} · {c.level || "todos"}
                    </div>
                  </button>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {c.status === "active" ? "Ativa" : "Inativa"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{(c.students ?? []).length}/{c.max_students} alunos · {c.teacher_name || "sem professor"}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">
                      {c.dojo_spaces?.name || "Sem espaço"}
                      {c.dojo_units?.name ? ` · ${c.dojo_units.name}` : ""}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">
                      {(c.schedules ?? []).length
                        ? (c.schedules ?? [])
                            .slice()
                            .sort((a: any, b: any) => a.weekday - b.weekday || String(a.start_time).localeCompare(b.start_time))
                            .map((s: any) => `${WEEKDAYS[s.weekday]?.short} ${fmtTime(s.start_time)}`)
                            .join(" · ")
                        : "Sem horários"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full"
                    onClick={() => setStudentsId(c.id)}
                    title="Gerenciar alunos da turma"
                  >
                    <Users className="h-3.5 w-3.5 mr-1" /> Alunos
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-full" onClick={() => setPanelId(c.id)}>
                    Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-0"
                    disabled={busy}
                    title="Duplicar turma"
                    onClick={() => onDuplicate(c)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-0 text-destructive hover:text-destructive"
                    title="Remover turma"
                    onClick={() => setToDelete(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      <ClassFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      <ClassSidePanel
        open={!!panelId}
        classId={panelId}
        onOpenChange={(v) => !v && setPanelId(null)}
        onEdit={openEdit}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma <strong>{toDelete?.name}</strong> será excluída junto com seus horários e deixará de aparecer na
              agenda. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); onDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-[0.08] blur-2xl`} />
      <div className="relative flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md ring-1 ring-white/20`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-black tabular-nums tracking-tight">{value}</div>
        </div>
      </div>
    </div>
  );
}
