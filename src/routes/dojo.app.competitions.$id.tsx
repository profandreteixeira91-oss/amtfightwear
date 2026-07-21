import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Plus, ExternalLink, Pencil, FileCheck2, FileX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getAcademyCompetition,
  listCompetitionAthletes, upsertCompetitionAthlete, deleteCompetitionAthlete,
  listCompetitionSubRows, upsertCompetitionSubRow, deleteCompetitionSubRow,
} from "@/lib/dojo/competitions/academy.functions";
import {
  listAthleteResults, upsertAthleteResult, deleteAthleteResult,
} from "@/lib/dojo/competitions/rankings.functions";
import { supabase } from "@/integrations/supabase/client";
import { scopeLabel, tierLabel } from "@/lib/dojo/competitions/classifier";

export const Route = createFileRoute("/dojo/app/competitions/$id")({
  head: () => ({ meta: [{ title: "Gestão de Competição — AMT Dojo Manager" }] }),
  component: ManagePage,
});

const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAYMENT_METHODS: Array<{ v: string; l: string }> = [
  { v: "pix", l: "PIX" },
  { v: "cash", l: "Dinheiro" },
  { v: "credit_card", l: "Cartão de crédito" },
  { v: "debit_card", l: "Cartão de débito" },
  { v: "boleto", l: "Boleto" },
  { v: "bank_transfer", l: "Transferência" },
  { v: "other", l: "Outro" },
];

const STATUS_OPTS: Array<{ v: string; l: string; color: string }> = [
  { v: "interested", l: "Interessado", color: "bg-zinc-500" },
  { v: "confirmed", l: "Confirmado", color: "bg-blue-500" },
  { v: "registered", l: "Inscrito", color: "bg-emerald-600" },
  { v: "weigh_in", l: "Pesagem", color: "bg-amber-500" },
  { v: "competing", l: "Competindo", color: "bg-purple-500" },
  { v: "finished", l: "Finalizado", color: "bg-slate-600" },
  { v: "cancelled", l: "Cancelado", color: "bg-red-500" },
];

const DEFAULT_DOCS = [
  { key: "identity", label: "Documento com foto" },
  { key: "graduation_certificate", label: "Certificado de graduação" },
  { key: "medical_exam", label: "Atestado médico" },
  { key: "registration_receipt", label: "Comprovante de inscrição" },
  { key: "payment_receipt", label: "Comprovante de pagamento" },
  { key: "parental_authorization", label: "Autorização dos pais (menores)" },
];

type AthleteDoc = { key: string; label: string; provided: boolean; file_url?: string | null; notes?: string | null };

function ManagePage() {
  const { id } = useParams({ from: "/dojo/app/competitions/$id" });
  const getFn = useServerFn(getAcademyCompetition);
  const q = useQuery({ queryKey: ["ac-comp", id], queryFn: () => getFn({ data: { id } }) });

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (q.isError || !q.data) return <div className="p-6 text-sm text-red-500">Não foi possível carregar.</div>;

  const row = q.data as unknown as { id: string; notes: string | null; competition: { name: string; scope: string | null; tier: string | null; city: string | null; state: string | null; start_at: string | null; official_url: string | null } | null };
  const comp = row.competition;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost"><Link to="/dojo/app/competitions"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{comp?.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{scopeLabel(comp?.scope)}</Badge>
            {comp?.tier && comp.tier !== "other" && <Badge variant="outline">{tierLabel(comp?.tier)}</Badge>}
            {comp?.start_at && <span>{new Date(comp.start_at).toLocaleDateString("pt-BR")}</span>}
            {(comp?.city || comp?.state) && <span>{comp?.city}{comp?.state && `/${comp.state}`}</span>}
            {comp?.official_url && <a href={comp.official_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:underline"><ExternalLink className="h-3 w-3" />site oficial</a>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="athletes" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="athletes">Atletas</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="staff">Comissão</TabsTrigger>
          <TabsTrigger value="finances">Financeiro</TabsTrigger>
          <TabsTrigger value="hotels">Hospedagem</TabsTrigger>
          <TabsTrigger value="transport">Transporte</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="athletes"><AthletesPanel acId={id} /></TabsContent>
        <TabsContent value="results"><ResultsPanel acId={id} /></TabsContent>
        <TabsContent value="staff"><GenericPanel acId={id} table="staff" fields={STAFF_FIELDS} title="Comissão técnica" /></TabsContent>
        <TabsContent value="finances"><GenericPanel acId={id} table="finances" fields={FIN_FIELDS} title="Movimentação financeira" /></TabsContent>
        <TabsContent value="hotels"><GenericPanel acId={id} table="hotels" fields={HOTEL_FIELDS} title="Hospedagem" /></TabsContent>
        <TabsContent value="transport"><GenericPanel acId={id} table="transport" fields={TRANSPORT_FIELDS} title="Transporte" /></TabsContent>
        <TabsContent value="documents"><GenericPanel acId={id} table="documents" fields={DOC_FIELDS} title="Documentos" /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Atletas — inscrição rica: professor, número, valor, documentos
// ============================================================

type AthleteRow = {
  id: string;
  student_id: string;
  category: string | null;
  weight_class: string | null;
  weight_kg: number | null;
  belt_id: string | null;
  belt_name: string | null;
  age_group: string | null;
  status: string;
  paid: boolean;
  notes: string | null;
  teacher_id: string | null;
  registration_number: string | null;
  amount_paid: number | null;
  payment_method: string | null;
  documents: AthleteDoc[] | null;
  student: { full_name: string; photo_url: string | null } | null;
  belt: { name: string; color_hex: string | null } | null;
};

function AthletesPanel({ acId }: { acId: string }) {
  const listFn = useServerFn(listCompetitionAthletes);
  const delFn = useServerFn(deleteCompetitionAthlete);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["comp-athletes", acId],
    queryFn: () => listFn({ data: { academy_competition_id: acId } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Atleta removido"); qc.invalidateQueries({ queryKey: ["comp-athletes", acId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editing, setEditing] = useState<Partial<AthleteRow> | null>(null);

  const rows = ((q.data ?? []) as unknown) as AthleteRow[];

  const stats = useMemo(() => {
    const acc = { total: rows.length, paid: 0, pending: 0, totalAmount: 0, confirmed: 0 };
    for (const r of rows) {
      if (r.paid) acc.paid += 1; else acc.pending += 1;
      acc.totalAmount += Number(r.amount_paid ?? 0);
      if (r.status === "registered" || r.status === "confirmed") acc.confirmed += 1;
    }
    return acc;
  }, [rows]);

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox label="Atletas" value={stats.total} />
        <StatBox label="Confirmados" value={stats.confirmed} />
        <StatBox label="Pagos" value={`${stats.paid}/${stats.total}`} />
        <StatBox label="Arrecadado" value={brl(stats.totalAmount)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Atletas inscritos</div>
        <Button size="sm" onClick={() => setEditing({ academy_competition_id: acId } as Partial<AthleteRow>)}>
          <Plus className="mr-1 h-4 w-4" /> Novo atleta
        </Button>
      </div>

      <div className="divide-y overflow-hidden rounded border">
        {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum atleta inscrito ainda.</div>}
        {rows.map((r) => {
          const statusMeta = STATUS_OPTS.find((s) => s.v === r.status);
          const docsProvided = (r.documents ?? []).filter((d) => d.provided).length;
          const docsTotal = (r.documents ?? []).length || DEFAULT_DOCS.length;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              {r.student?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.student.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">
                  {r.student?.full_name?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.student?.full_name}</div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {r.category && <span>{r.category}</span>}
                  {r.weight_class && <span>{r.weight_class}{r.weight_kg ? ` (${r.weight_kg}kg)` : ""}</span>}
                  {r.belt_name && <span>Faixa: {r.belt_name}</span>}
                  {r.age_group && <span>{r.age_group}</span>}
                  {r.registration_number && <span>#{r.registration_number}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {statusMeta && <Badge className={`${statusMeta.color} text-white`}>{statusMeta.l}</Badge>}
                <Badge variant={r.paid ? "default" : "outline"} className="gap-1">
                  {r.paid ? <FileCheck2 className="h-3 w-3" /> : <FileX2 className="h-3 w-3" />}
                  {r.paid ? brl(r.amount_paid) : "Pendente"}
                </Badge>
                <Badge variant="outline">
                  Docs: {docsProvided}/{docsTotal}
                </Badge>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remover ${r.student?.full_name}?`)) delMut.mutate(r.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {editing && (
        <AthleteDialog
          acId={acId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["comp-athletes", acId] }); setEditing(null); }}
        />
      )}
    </CardContent></Card>
  );
}

function AthleteDialog({ acId, initial, onClose, onSaved }: {
  acId: string;
  initial: Partial<AthleteRow>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertFn = useServerFn(upsertCompetitionAthlete);
  const [studentId, setStudentId] = useState<string>(initial.student_id ?? "");
  const [teacherId, setTeacherId] = useState<string>(initial.teacher_id ?? "");
  const [beltId, setBeltId] = useState<string>(initial.belt_id ?? "");
  const [category, setCategory] = useState<string>(initial.category ?? "");
  const [weightClass, setWeightClass] = useState<string>(initial.weight_class ?? "");
  const [weightKg, setWeightKg] = useState<string>(initial.weight_kg != null ? String(initial.weight_kg) : "");
  const [ageGroup, setAgeGroup] = useState<string>(initial.age_group ?? "");
  const [regNumber, setRegNumber] = useState<string>(initial.registration_number ?? "");
  const [amountPaid, setAmountPaid] = useState<string>(initial.amount_paid != null ? String(initial.amount_paid) : "");
  const [paymentMethod, setPaymentMethod] = useState<string>(initial.payment_method ?? "");
  const [paid, setPaid] = useState<boolean>(!!initial.paid);
  const [status, setStatus] = useState<string>(initial.status ?? "interested");
  const [notes, setNotes] = useState<string>(initial.notes ?? "");
  const [docs, setDocs] = useState<AthleteDoc[]>(() => {
    const provided = (initial.documents ?? []) as AthleteDoc[];
    return DEFAULT_DOCS.map((d) => {
      const found = provided.find((p) => p.key === d.key);
      return { key: d.key, label: d.label, provided: !!found?.provided, file_url: found?.file_url ?? null, notes: found?.notes ?? null };
    });
  });

  const students = useQuery({
    queryKey: ["students-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dojo_students").select("id, full_name").eq("status", "active").order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string }>;
    },
  });
  const teachers = useQuery({
    queryKey: ["team-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dojo_team_members").select("id, full_name, role").eq("status", "active").order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string; role: string | null }>;
    },
  });
  const belts = useQuery({
    queryKey: ["belts-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dojo_belts").select("id, name, color_hex").order("order_index");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; color_hex: string | null }>;
    },
  });

  const mut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (payload: any) => upsertFn({ data: payload }),
    onSuccess: () => { toast.success("Atleta salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!studentId) return toast.error("Selecione um aluno");
    const beltName = belts.data?.find((b) => b.id === beltId)?.name ?? null;
    mut.mutate({
      id: initial.id,
      academy_competition_id: acId,
      student_id: studentId,
      teacher_id: teacherId || null,
      belt_id: beltId || null,
      belt_name: beltName,
      category: category || null,
      weight_class: weightClass || null,
      weight_kg: weightKg ? Number(weightKg) : null,
      age_group: ageGroup || null,
      registration_number: regNumber || null,
      amount_paid: amountPaid ? Number(amountPaid) : null,
      payment_method: paymentMethod || null,
      paid,
      status,
      notes: notes || null,
      documents: docs,
    });
  };

  const docsDone = docs.filter((d) => d.provided).length;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.id ? "Editar inscrição" : "Nova inscrição de atleta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identificação */}
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Identificação</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Aluno *</Label>
                <Select value={studentId} onValueChange={setStudentId} disabled={!!initial.id}>
                  <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                  <SelectContent>
                    {(students.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Professor responsável</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
                  <SelectContent>
                    {(teachers.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}{t.role ? ` (${t.role})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Categoria */}
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Categoria</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Faixa</Label>
                <Select value={beltId} onValueChange={setBeltId}>
                  <SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger>
                  <SelectContent>
                    {(belts.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria de idade</Label>
                <Input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="Adulto, Master 1…" />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Absoluto, Feminino…" />
              </div>
              <div>
                <Label className="text-xs">Classe de peso</Label>
                <Input value={weightClass} onChange={(e) => setWeightClass(e.target.value)} placeholder="Peso Pena, -70kg…" />
              </div>
              <div>
                <Label className="text-xs">Peso (kg)</Label>
                <Input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Ex: 76.5" />
              </div>
              <div>
                <Label className="text-xs">Situação</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Pagamento */}
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Inscrição e pagamento</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs">Nº de inscrição</Label>
                <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="Código do organizador" />
              </div>
              <div>
                <Label className="text-xs">Valor pago (R$)</Label>
                <Input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Forma de pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Checkbox id="paid" checked={paid} onCheckedChange={(c) => setPaid(!!c)} />
                <Label htmlFor="paid" className="cursor-pointer">Marcar como pago</Label>
              </div>
            </div>
          </section>

          {/* Documentos */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Checklist de documentos
              </div>
              <Badge variant="outline">{docsDone}/{docs.length} entregues</Badge>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              {docs.map((d, i) => (
                <div key={d.key} className="flex flex-wrap items-center gap-2">
                  <Checkbox
                    id={`doc-${d.key}`}
                    checked={d.provided}
                    onCheckedChange={(c) => {
                      const next = [...docs];
                      next[i] = { ...next[i], provided: !!c };
                      setDocs(next);
                    }}
                  />
                  <Label htmlFor={`doc-${d.key}`} className="flex-1 cursor-pointer text-sm">{d.label}</Label>
                  <Input
                    className="w-full sm:w-64"
                    placeholder="URL do arquivo (opcional)"
                    value={d.file_url ?? ""}
                    onChange={(e) => {
                      const next = [...docs];
                      next[i] = { ...next[i], file_url: e.target.value || null };
                      setDocs(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={mut.isPending}>{mut.isPending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Resultados — enriquecido: empates, KOs, ippons, certificados
// ============================================================

type ResultRow = {
  id: string;
  athlete_id: string | null;
  student_id: string | null;
  placement: number | null;
  medal: string | null;
  category: string | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  submissions: number;
  knockouts: number;
  ippons: number;
  points: number;
  penalties: number;
  total_time_seconds: number | null;
  photos: string[] | null;
  videos: string[] | null;
  certificates: string[] | null;
  notes: string | null;
  athlete: { id: string; student: { id: string; full_name: string; photo_url: string | null } | null } | null;
};

const MEDAL_OPTS = [
  { v: "gold", l: "🥇 Ouro" },
  { v: "silver", l: "🥈 Prata" },
  { v: "bronze", l: "🥉 Bronze" },
  { v: "participation", l: "Participação" },
];

function ResultsPanel({ acId }: { acId: string }) {
  const listAthFn = useServerFn(listCompetitionAthletes);
  const listResFn = useServerFn(listAthleteResults);
  const upResFn = useServerFn(upsertAthleteResult);
  const delResFn = useServerFn(deleteAthleteResult);
  const qc = useQueryClient();

  const athletes = useQuery({
    queryKey: ["comp-athletes", acId],
    queryFn: () => listAthFn({ data: { academy_competition_id: acId } }),
  });
  const results = useQuery({
    queryKey: ["comp-results", acId],
    queryFn: () => listResFn({ data: { academy_competition_id: acId } }),
  });

  const upMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (row: any) => upResFn({ data: row }),
    onSuccess: () => { toast.success("Resultado salvo"); qc.invalidateQueries({ queryKey: ["comp-results", acId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delResFn({ data: { id } }),
    onSuccess: () => { toast.success("Resultado removido"); qc.invalidateQueries({ queryKey: ["comp-results", acId] }); },
  });

  const [editing, setEditing] = useState<Partial<ResultRow> | null>(null);

  const rows = ((results.data ?? []) as unknown) as ResultRow[];
  const athList = ((athletes.data ?? []) as unknown) as AthleteRow[];

  const summary = useMemo(() => {
    const acc = { gold: 0, silver: 0, bronze: 0, wins: 0, losses: 0, draws: 0 };
    for (const r of rows) {
      if (r.medal === "gold") acc.gold += 1;
      else if (r.medal === "silver") acc.silver += 1;
      else if (r.medal === "bronze") acc.bronze += 1;
      acc.wins += r.wins ?? 0;
      acc.losses += r.losses ?? 0;
      acc.draws += r.draws ?? 0;
    }
    return acc;
  }, [rows]);

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
        <StatBox label="🥇 Ouro" value={summary.gold} />
        <StatBox label="🥈 Prata" value={summary.silver} />
        <StatBox label="🥉 Bronze" value={summary.bronze} />
        <StatBox label="Vitórias" value={summary.wins} />
        <StatBox label="Empates" value={summary.draws} />
        <StatBox label="Derrotas" value={summary.losses} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Resultados por atleta</div>
        <Button size="sm" onClick={() => setEditing({ academy_competition_id: acId } as Partial<ResultRow>)}>
          <Plus className="mr-1 h-4 w-4" /> Registrar resultado
        </Button>
      </div>

      <div className="divide-y overflow-hidden rounded border">
        {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum resultado registrado.</div>}
        {rows.map((r) => {
          const medal = MEDAL_OPTS.find((m) => m.v === r.medal);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              {r.athlete?.student?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.athlete.student.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">
                  {r.athlete?.student?.full_name?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {medal && (
                    <Badge className={
                      r.medal === "gold" ? "bg-amber-500 text-white"
                      : r.medal === "silver" ? "bg-slate-400 text-white"
                      : r.medal === "bronze" ? "bg-orange-600 text-white"
                      : "bg-zinc-500 text-white"
                    }>{medal.l}</Badge>
                  )}
                  {r.placement && <Badge variant="outline">{r.placement}º lugar</Badge>}
                  <span className="font-medium">{r.athlete?.student?.full_name ?? "—"}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {r.category && <span>{r.category}</span>}
                  <span>Cartel: V{r.wins}/E{r.draws}/D{r.losses}</span>
                  {r.submissions ? <span>Finalizações: {r.submissions}</span> : null}
                  {r.knockouts ? <span>KOs: {r.knockouts}</span> : null}
                  {r.ippons ? <span>Ippons: {r.ippons}</span> : null}
                  {r.points ? <span>Pontos: {r.points}</span> : null}
                  {(r.certificates?.length ?? 0) > 0 && <span>📄 {r.certificates!.length} certificado(s)</span>}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover resultado?")) delMut.mutate(r.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {editing && (
        <ResultDialog
          acId={acId}
          initial={editing}
          athletes={athList}
          onClose={() => setEditing(null)}
          onSaved={(payload) => upMut.mutate(payload)}
        />
      )}
    </CardContent></Card>
  );
}

function ResultDialog({ acId, initial, athletes, onClose, onSaved }: {
  acId: string;
  initial: Partial<ResultRow>;
  athletes: AthleteRow[];
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSaved: (payload: any) => void;
}) {
  const [athleteId, setAthleteId] = useState<string>(initial.athlete_id ?? "");
  const [medal, setMedal] = useState<string>(initial.medal ?? "");
  const [placement, setPlacement] = useState<string>(initial.placement != null ? String(initial.placement) : "");
  const [category, setCategory] = useState<string>(initial.category ?? "");
  const [wins, setWins] = useState<string>(String(initial.wins ?? 0));
  const [draws, setDraws] = useState<string>(String(initial.draws ?? 0));
  const [losses, setLosses] = useState<string>(String(initial.losses ?? 0));
  const [subs, setSubs] = useState<string>(String(initial.submissions ?? 0));
  const [kos, setKos] = useState<string>(String(initial.knockouts ?? 0));
  const [ippons, setIppons] = useState<string>(String(initial.ippons ?? 0));
  const [points, setPoints] = useState<string>(String(initial.points ?? 0));
  const [penalties, setPenalties] = useState<string>(String(initial.penalties ?? 0));
  const [totalTime, setTotalTime] = useState<string>(initial.total_time_seconds != null ? String(initial.total_time_seconds) : "");
  const [certificates, setCertificates] = useState<string>((initial.certificates ?? []).join("\n"));
  const [photos, setPhotos] = useState<string>((initial.photos ?? []).join("\n"));
  const [videos, setVideos] = useState<string>((initial.videos ?? []).join("\n"));
  const [notes, setNotes] = useState<string>(initial.notes ?? "");

  const submit = () => {
    if (!athleteId) return toast.error("Selecione um atleta");
    const ath = athletes.find((a) => a.id === athleteId);
    onSaved({
      id: initial.id,
      academy_competition_id: acId,
      athlete_id: athleteId,
      student_id: ath?.student_id ?? null,
      medal: medal || null,
      placement: placement ? Number(placement) : null,
      category: category || ath?.category || null,
      wins: Number(wins) || 0,
      draws: Number(draws) || 0,
      losses: Number(losses) || 0,
      submissions: Number(subs) || 0,
      knockouts: Number(kos) || 0,
      ippons: Number(ippons) || 0,
      points: Number(points) || 0,
      penalties: Number(penalties) || 0,
      total_time_seconds: totalTime ? Number(totalTime) : null,
      certificates: certificates.split("\n").map((s) => s.trim()).filter(Boolean),
      photos: photos.split("\n").map((s) => s.trim()).filter(Boolean),
      videos: videos.split("\n").map((s) => s.trim()).filter(Boolean),
      notes: notes || null,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.id ? "Editar resultado" : "Registrar resultado"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Atleta *</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger><SelectValue placeholder="Selecionar atleta" /></SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.student?.full_name}{a.category ? ` — ${a.category}` : ""}{a.weight_class ? ` (${a.weight_class})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoria (livre)</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Medalha</Label>
              <Select value={medal} onValueChange={setMedal}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {MEDAL_OPTS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Colocação</Label>
              <Input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="1, 2, 3…" />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cartel</div>
            <div className="grid gap-2 grid-cols-3 lg:grid-cols-6">
              <NumberField label="Vitórias" value={wins} onChange={setWins} />
              <NumberField label="Empates" value={draws} onChange={setDraws} />
              <NumberField label="Derrotas" value={losses} onChange={setLosses} />
              <NumberField label="Finalizações" value={subs} onChange={setSubs} />
              <NumberField label="KOs" value={kos} onChange={setKos} />
              <NumberField label="Ippons" value={ippons} onChange={setIppons} />
              <NumberField label="Pontos" value={points} onChange={setPoints} />
              <NumberField label="Advertências" value={penalties} onChange={setPenalties} />
              <NumberField label="Tempo total (s)" value={totalTime} onChange={setTotalTime} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <TextAreaField label="Certificados (URLs, 1 por linha)" value={certificates} onChange={setCertificates} />
            <TextAreaField label="Fotos (URLs, 1 por linha)" value={photos} onChange={setPhotos} />
            <TextAreaField label="Vídeos (URLs, 1 por linha)" value={videos} onChange={setVideos} />
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

// ============================================================
// Painéis genéricos (staff / finances / hotels / transport / documents)
// ============================================================

type FieldDef = { key: string; label: string; type?: "text" | "number" | "textarea" | "date" | "datetime"; };

const STAFF_FIELDS: FieldDef[] = [
  { key: "role", label: "Função" },
  { key: "full_name", label: "Nome completo" },
  { key: "notes", label: "Observações", type: "textarea" },
];
const FIN_FIELDS: FieldDef[] = [
  { key: "kind", label: "Tipo (receita/despesa)" },
  { key: "description", label: "Descrição" },
  { key: "amount", label: "Valor", type: "number" },
  { key: "paid_at", label: "Pago em", type: "date" },
];
const HOTEL_FIELDS: FieldDef[] = [
  { key: "name", label: "Hotel" },
  { key: "address", label: "Endereço" },
  { key: "check_in", label: "Check-in", type: "date" },
  { key: "check_out", label: "Check-out", type: "date" },
  { key: "phone", label: "Telefone" },
];
const TRANSPORT_FIELDS: FieldDef[] = [
  { key: "kind", label: "Tipo (ônibus/van/avião)" },
  { key: "driver", label: "Motorista/Companhia" },
  { key: "seats", label: "Assentos", type: "number" },
  { key: "departure_at", label: "Saída", type: "datetime" },
  { key: "return_at", label: "Retorno", type: "datetime" },
];
const DOC_FIELDS: FieldDef[] = [
  { key: "kind", label: "Tipo" },
  { key: "title", label: "Título" },
  { key: "file_url", label: "URL do arquivo" },
  { key: "notes", label: "Observações", type: "textarea" },
];

function GenericPanel({ acId, table, fields, title }: {
  acId: string; table: "staff" | "finances" | "hotels" | "transport" | "results" | "documents"; fields: FieldDef[]; title: string;
}) {
  const listFn = useServerFn(listCompetitionSubRows);
  const upFn = useServerFn(upsertCompetitionSubRow);
  const delFn = useServerFn(deleteCompetitionSubRow);
  const qc = useQueryClient();
  const key = ["comp-sub", table, acId] as const;

  const q = useQuery({ queryKey: key, queryFn: () => listFn({ data: { academy_competition_id: acId, table } }) });
  const upMut = useMutation({
    mutationFn: (row: Record<string, unknown>) => upFn({ data: { table, row: { ...row, academy_competition_id: acId } } }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { table, id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: key }); },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const rows = (q.data ?? []) as Array<Record<string, unknown>>;

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="font-semibold">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          f.type === "textarea"
            ? <Textarea key={f.key} placeholder={f.label} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            : <Input key={f.key} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"} placeholder={f.label} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        ))}
      </div>
      <Button onClick={() => {
        const payload: Record<string, unknown> = {};
        for (const f of fields) {
          const v = form[f.key];
          if (v === undefined || v === "") continue;
          payload[f.key] = f.type === "number" ? Number(v) : v;
        }
        if (Object.keys(payload).length === 0) return toast.error("Preencha ao menos um campo");
        upMut.mutate(payload);
        setForm({});
      }}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>

      <div className="divide-y rounded border">
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum registro.</div>}
        {rows.map((r) => (
          <div key={r.id as string} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              {fields.map((f) => {
                const v = r[f.key];
                if (v === null || v === undefined || v === "") return null;
                return <span key={f.key} className="mr-3"><b className="text-muted-foreground">{f.label}:</b> {String(v)}</span>;
              })}
            </div>
            <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(r.id as string); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}
