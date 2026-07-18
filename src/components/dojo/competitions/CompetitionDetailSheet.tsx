import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ExternalLink, MapPin, Calendar, DollarSign, Users, Trash2, UserPlus, Pencil, Search,
} from "lucide-react";
import {
  getCompetition, addCompetitionAthlete, removeCompetitionAthlete,
  updateCompetitionAthlete, searchStudents, deleteCompetition,
} from "@/lib/dojo/competitions.functions";
import { providerLabel } from "@/lib/dojo/competitions/providers";

type Props = {
  competitionId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (comp: any) => void;
};

const STATUS_LABEL: Record<string, string> = {
  pre_registered: "Pré-inscrito",
  registered: "Inscrito",
  payment_pending: "Pagto pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  pre_registered: "bg-slate-100 text-slate-800",
  registered: "bg-blue-100 text-blue-800",
  payment_pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function CompetitionDetailSheet({ competitionId, onOpenChange, onEdit }: Props) {
  const qc = useQueryClient();
  const getFn = useServerFn(getCompetition);
  const addAthleteFn = useServerFn(addCompetitionAthlete);
  const removeAthleteFn = useServerFn(removeCompetitionAthlete);
  const updateAthleteFn = useServerFn(updateCompetitionAthlete);
  const searchFn = useServerFn(searchStudents);
  const deleteFn = useServerFn(deleteCompetition);

  const [tab, setTab] = useState<"details" | "athletes" | "history">("details");
  const [adding, setAdding] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [newAthlete, setNewAthlete] = useState<{
    student_id?: string;
    category?: string;
    weight?: string;
    belt?: string;
    age_group?: string;
    status?: string;
    notes?: string;
  }>({});

  const q = useQuery({
    queryKey: ["dojo-competition", competitionId],
    queryFn: () => getFn({ data: { id: competitionId as string } }),
    enabled: !!competitionId,
  });

  const students = useQuery({
    queryKey: ["dojo-students-search", searchQ],
    queryFn: () => searchFn({ data: { q: searchQ } }),
    enabled: adding,
  });

  const c = q.data?.competition;
  const athletes = q.data?.athletes ?? [];

  const summary = useMemo(() => {
    const total = athletes.length;
    const confirmed = athletes.filter((a: any) => a.status === "confirmed").length;
    const pending = athletes.filter((a: any) => a.status === "payment_pending" || a.status === "pre_registered").length;
    const fee = Number(c?.entry_fee ?? 0);
    const estimated = fee > 0 ? fee * total : 0;
    return { total, confirmed, pending, estimated };
  }, [athletes, c?.entry_fee]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-competition", competitionId] });

  const doAdd = async () => {
    if (!newAthlete.student_id) { toast.error("Selecione um aluno"); return; }
    try {
      await addAthleteFn({ data: {
        competition_id: competitionId as string,
        student_id: newAthlete.student_id,
        category: newAthlete.category || null,
        weight: newAthlete.weight ? Number(newAthlete.weight) : null,
        belt: newAthlete.belt || null,
        age_group: newAthlete.age_group || null,
        status: (newAthlete.status as any) || "pre_registered",
        notes: newAthlete.notes || null,
      }});
      toast.success("Atleta adicionado");
      setNewAthlete({});
      setAdding(false);
      refresh();
      qc.invalidateQueries({ queryKey: ["dojo-competitions"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const doRemove = async (id: string) => {
    if (!confirm("Remover atleta desta competição?")) return;
    try {
      await removeAthleteFn({ data: { id } });
      toast.success("Removido");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const doStatus = async (row: any, status: string) => {
    try {
      await updateAthleteFn({ data: { id: row.id, competition_id: row.competition_id, student_id: row.student_id, status: status as any } });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const doDeleteCompetition = async () => {
    if (!c) return;
    if (!confirm(`Excluir competição "${c.name}"? Todos os atletas inscritos serão removidos.`)) return;
    try {
      await deleteFn({ data: { id: c.id } });
      toast.success("Competição excluída");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["dojo-competitions"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Sheet open={!!competitionId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {!c ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <>
            {c.banner_url && (
              <div className="h-40 w-full overflow-hidden bg-muted">
                <img src={c.banner_url} alt={c.name} className="h-full w-full object-cover" />
              </div>
            )}
            <SheetHeader className="p-4 md:p-6 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-xl leading-tight">{c.name}</SheetTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-[color:var(--dojo-surface-2)] px-2 py-0.5">{providerLabel(c.provider)}</span>
                    {c.modality && <span>{c.modality}</span>}
                    {c.with_gi != null && <span>· {c.with_gi ? "Com kimono" : "Sem kimono"}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={doDeleteCompetition}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {c.external_url && (
                <a href={c.external_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                  <Button size="sm" className="w-full sm:w-auto">
                    <ExternalLink className="h-4 w-4 mr-2" /> Ir para inscrição oficial
                  </Button>
                </a>
              )}
            </SheetHeader>

            <div className="flex gap-1 border-b px-4 md:px-6">
              {(["details","athletes","history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "details" ? "Detalhes" : t === "athletes" ? `Atletas (${athletes.length})` : "Histórico"}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {tab === "details" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Kpi label="Atletas" value={summary.total} icon={<Users className="h-4 w-4" />} />
                    <Kpi label="Confirmados" value={summary.confirmed} />
                    <Kpi label="Pendentes" value={summary.pending} />
                    <Kpi label="Estimado" value={summary.estimated ? summary.estimated.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"} icon={<DollarSign className="h-4 w-4" />} />
                  </div>

                  <div className="grid gap-2 text-sm">
                    <Info icon={<Calendar className="h-4 w-4" />} label="Início" value={fmtDate(c.starts_at)} />
                    <Info icon={<Calendar className="h-4 w-4" />} label="Fim" value={fmtDate(c.ends_at)} />
                    <Info icon={<Calendar className="h-4 w-4" />} label="Prazo de inscrição" value={fmtDate(c.registration_deadline)} />
                    <Info icon={<MapPin className="h-4 w-4" />} label="Local" value={[c.venue_name, c.address, [c.city, c.state].filter(Boolean).join("/")].filter(Boolean).join(" — ") || "—"} />
                    <Info icon={<DollarSign className="h-4 w-4" />} label="Inscrição" value={c.entry_fee ? Number(c.entry_fee).toLocaleString("pt-BR", { style: "currency", currency: c.currency || "BRL" }) : "—"} />
                    <Info label="Organizador" value={c.organizer || "—"} />
                    <Info label="Categorias" value={(c.categories ?? []).join(", ") || "—"} />
                  </div>

                  {c.description && (
                    <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white p-3 text-sm whitespace-pre-wrap">
                      {c.description}
                    </div>
                  )}

                  <div className="rounded-lg border border-dashed border-[color:var(--dojo-border)] bg-[color:var(--dojo-surface-2)]/40 p-3 text-xs text-muted-foreground">
                    Mapa e integrações de pagamento, hospedagem e transporte serão exibidos aqui.
                  </div>
                </div>
              )}

              {tab === "athletes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Atletas Inscritos</h3>
                    <Button size="sm" onClick={() => setAdding((s) => !s)}>
                      <UserPlus className="h-4 w-4 mr-1" /> {adding ? "Fechar" : "Adicionar Atleta"}
                    </Button>
                  </div>

                  {adding && (
                    <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white p-3 space-y-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="Buscar aluno por nome, CPF ou telefone…"
                          value={searchQ}
                          onChange={(e) => setSearchQ(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded border divide-y">
                        {(students.data ?? []).map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => setNewAthlete((n) => ({
                              ...n,
                              student_id: s.id,
                              belt: s.belt?.name ?? n.belt,
                            }))}
                            className={`flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-[color:var(--dojo-surface-2)] ${newAthlete.student_id === s.id ? "bg-primary/5" : ""}`}
                          >
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                              {s.photo_url ? <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" /> : (
                                <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">{s.full_name?.[0]}</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{s.full_name}</div>
                              <div className="truncate text-xs text-muted-foreground">{s.belt?.name ?? "—"} {s.cpf ? `· ${s.cpf}` : ""}</div>
                            </div>
                          </button>
                        ))}
                        {(students.data ?? []).length === 0 && (
                          <div className="p-3 text-xs text-muted-foreground">Nenhum aluno encontrado.</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        <Input placeholder="Categoria" value={newAthlete.category ?? ""} onChange={(e) => setNewAthlete({ ...newAthlete, category: e.target.value })} />
                        <Input type="number" step="0.01" placeholder="Peso (kg)" value={newAthlete.weight ?? ""} onChange={(e) => setNewAthlete({ ...newAthlete, weight: e.target.value })} />
                        <Input placeholder="Faixa" value={newAthlete.belt ?? ""} onChange={(e) => setNewAthlete({ ...newAthlete, belt: e.target.value })} />
                        <Input placeholder="Idade / grupo" value={newAthlete.age_group ?? ""} onChange={(e) => setNewAthlete({ ...newAthlete, age_group: e.target.value })} />
                        <select className="h-10 rounded border bg-background px-2 text-sm" value={newAthlete.status ?? "pre_registered"} onChange={(e) => setNewAthlete({ ...newAthlete, status: e.target.value })}>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <Textarea placeholder="Observações" value={newAthlete.notes ?? ""} onChange={(e) => setNewAthlete({ ...newAthlete, notes: e.target.value })} />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={doAdd} disabled={!newAthlete.student_id}>Salvar inscrição</Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white divide-y">
                    {athletes.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground text-center">Nenhum atleta cadastrado.</div>
                    )}
                    {athletes.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 p-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                          {a.student?.photo_url ? (
                            <img src={a.student.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">{a.student?.full_name?.[0]}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{a.student?.full_name ?? "—"}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {a.belt && <span>{a.belt}</span>}
                            {a.category && <span>· {a.category}</span>}
                            {a.weight && <span>· {a.weight} kg</span>}
                            {a.age_group && <span>· {a.age_group}</span>}
                          </div>
                        </div>
                        <select
                          value={a.status}
                          onChange={(e) => doStatus(a, e.target.value)}
                          className={`text-xs rounded px-2 py-1 border-0 ${STATUS_STYLE[a.status] ?? "bg-muted"}`}
                        >
                          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <Button size="icon" variant="ghost" onClick={() => doRemove(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "history" && (
                <div className="rounded-lg border border-dashed border-[color:var(--dojo-border)] bg-[color:var(--dojo-surface-2)]/40 p-6 text-sm text-muted-foreground text-center">
                  Resultados, chaves e medalhas aparecerão aqui após a competição.
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Kpi({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex min-w-[8rem] items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="flex-1 text-sm">{value}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-muted-foreground">{children}</div>;
}
