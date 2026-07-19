import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getAcademyCompetition,
  listCompetitionAthletes, upsertCompetitionAthlete, deleteCompetitionAthlete,
  listCompetitionSubRows, upsertCompetitionSubRow, deleteCompetitionSubRow,
} from "@/lib/dojo/competitions/academy.functions";
import { supabase } from "@/integrations/supabase/client";
import { scopeLabel, tierLabel } from "@/lib/dojo/competitions/classifier";

export const Route = createFileRoute("/dojo/app/competitions/$id")({
  head: () => ({ meta: [{ title: "Gestão de Competição — AMT Dojo Manager" }] }),
  component: ManagePage,
});

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
          <TabsTrigger value="staff">Comissão</TabsTrigger>
          <TabsTrigger value="finances">Financeiro</TabsTrigger>
          <TabsTrigger value="hotels">Hospedagem</TabsTrigger>
          <TabsTrigger value="transport">Transporte</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="athletes"><AthletesPanel acId={id} /></TabsContent>
        <TabsContent value="staff"><GenericPanel acId={id} table="staff" fields={STAFF_FIELDS} title="Comissão técnica" /></TabsContent>
        <TabsContent value="finances"><GenericPanel acId={id} table="finances" fields={FIN_FIELDS} title="Movimentação financeira" /></TabsContent>
        <TabsContent value="hotels"><GenericPanel acId={id} table="hotels" fields={HOTEL_FIELDS} title="Hospedagem" /></TabsContent>
        <TabsContent value="transport"><GenericPanel acId={id} table="transport" fields={TRANSPORT_FIELDS} title="Transporte" /></TabsContent>
        <TabsContent value="results"><GenericPanel acId={id} table="results" fields={RESULT_FIELDS} title="Resultados" /></TabsContent>
        <TabsContent value="documents"><GenericPanel acId={id} table="documents" fields={DOC_FIELDS} title="Documentos" /></TabsContent>
      </Tabs>
    </div>
  );
}

// -------- Atletas --------

function AthletesPanel({ acId }: { acId: string }) {
  const listFn = useServerFn(listCompetitionAthletes);
  const upsertFn = useServerFn(upsertCompetitionAthlete);
  const delFn = useServerFn(deleteCompetitionAthlete);
  const studentsFn = useServerFn(listStudents);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["comp-athletes", acId], queryFn: () => listFn({ data: { academy_competition_id: acId } }) });
  const students = useQuery({ queryKey: ["students-basic"], queryFn: () => studentsFn({ data: {} }) });

  const upsertMut = useMutation({
    mutationFn: (i: Parameters<typeof upsertFn>[0]["data"]) => upsertFn({ data: i }),
    onSuccess: () => { toast.success("Atleta salvo"); qc.invalidateQueries({ queryKey: ["comp-athletes", acId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Atleta removido"); qc.invalidateQueries({ queryKey: ["comp-athletes", acId] }); },
  });

  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("");
  const [weight, setWeight] = useState("");

  const rows = (q.data ?? []) as Array<{ id: string; category: string | null; weight_class: string | null; status: string; paid: boolean; student: { full_name: string } | null }>;
  const studentList = (students.data ?? []) as Array<{ id: string; full_name: string }>;

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger><SelectValue placeholder="Aluno" /></SelectTrigger>
          <SelectContent>{studentList.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input placeholder="Peso" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <Button onClick={() => {
          if (!studentId) return toast.error("Selecione um aluno");
          upsertMut.mutate({ academy_competition_id: acId, student_id: studentId, category, weight_class: weight, status: "interested" });
          setStudentId(""); setCategory(""); setWeight("");
        }}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="divide-y rounded border">
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum atleta ainda.</div>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.student?.full_name}</div>
              <div className="text-xs text-muted-foreground">{r.category || "—"} · {r.weight_class || "—"} · {r.status}</div>
            </div>
            <Badge variant={r.paid ? "default" : "outline"}>{r.paid ? "Pago" : "Pendente"}</Badge>
            <Button size="sm" variant="outline" onClick={() => upsertMut.mutate({ id: r.id, academy_competition_id: acId, student_id: "", paid: !r.paid })}>
              {r.paid ? "Marcar não pago" : "Marcar pago"}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(r.id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

// -------- Painel Genérico --------

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
const RESULT_FIELDS: FieldDef[] = [
  { key: "athlete_name", label: "Atleta" },
  { key: "category", label: "Categoria" },
  { key: "medal", label: "Medalha (gold/silver/bronze)" },
  { key: "position", label: "Colocação", type: "number" },
  { key: "notes", label: "Observações", type: "textarea" },
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
