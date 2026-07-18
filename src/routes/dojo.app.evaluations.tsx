import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listDojoEvaluations, saveDojoEvaluation, deleteDojoEvaluation, listDojoBelts,
} from "@/lib/dojo/dojo.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Plus, Printer, Pencil } from "lucide-react";

export const Route = createFileRoute("/dojo/app/evaluations")({
  component: EvaluationsPage,
});

type EvalItem = { type: "teorica" | "pratica"; question: string; max_score: number; notes?: string | null };
type EvalForm = {
  id?: string;
  belt_id: string;
  degree: number;
  title: string;
  description: string;
  items: EvalItem[];
  passing_score: number | "";
  active: boolean;
};

const emptyForm = (): EvalForm => ({
  belt_id: "", degree: 0, title: "", description: "", items: [], passing_score: "", active: true,
});

function EvaluationsPage() {
  const listFn = useServerFn(listDojoEvaluations);
  const saveFn = useServerFn(saveDojoEvaluation);
  const delFn = useServerFn(deleteDojoEvaluation);
  const beltsFn = useServerFn(listDojoBelts);
  const qc = useQueryClient();

  const evals = useQuery({ queryKey: ["dojo-evaluations"], queryFn: () => listFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });

  const [form, setForm] = useState<EvalForm | null>(null);
  const [printing, setPrinting] = useState<any | null>(null);

  const selectedBelt = useMemo(
    () => (belts.data ?? []).find((b: any) => b.id === form?.belt_id),
    [belts.data, form?.belt_id],
  );
  const maxDeg = selectedBelt?.max_degrees ?? 4;
  const total = useMemo(
    () => (form?.items ?? []).reduce((s, i) => s + Number(i.max_score || 0), 0),
    [form?.items],
  );

  const addItem = (type: "teorica" | "pratica") => {
    if (!form) return;
    setForm({ ...form, items: [...form.items, { type, question: "", max_score: 10 }] });
  };
  const updItem = (i: number, patch: Partial<EvalItem>) => {
    if (!form) return;
    const items = [...form.items]; items[i] = { ...items[i], ...patch };
    setForm({ ...form, items });
  };
  const rmItem = (i: number) => {
    if (!form) return;
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return toast.error("Informe um título");
    if (form.items.length === 0) return toast.error("Adicione ao menos um item");
    try {
      await saveFn({ data: {
        id: form.id,
        belt_id: form.belt_id || null,
        degree: form.degree,
        title: form.title,
        description: form.description || null,
        items: form.items,
        passing_score: form.passing_score === "" ? null : Number(form.passing_score),
        active: form.active,
      }});
      toast.success("Avaliação salva");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["dojo-evaluations"] });
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluída");
      qc.invalidateQueries({ queryKey: ["dojo-evaluations"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const doPrint = (ev: any) => {
    setPrinting(ev);
    setTimeout(() => window.print(), 100);
  };

  if (form) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{form.id ? "Editar avaliação" : "Nova avaliação"}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Título</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Prova para Faixa Azul" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Faixa</label>
                <select className="border rounded p-2 bg-background w-full" value={form.belt_id} onChange={e => setForm({ ...form, belt_id: e.target.value, degree: 0 })}>
                  <option value="">— sem faixa —</option>
                  {(belts.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Grau</label>
                <select className="border rounded p-2 bg-background w-full" value={form.degree} onChange={e => setForm({ ...form, degree: Number(e.target.value) })}>
                  {Array.from({ length: maxDeg + 1 }).map((_, i) => (
                    <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pontuação para aprovação</label>
                <Input type="number" min={0} value={form.passing_score}
                  onChange={e => setForm({ ...form, passing_score: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder={`Total: ${total}`} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                  Ativa
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição / Instruções</label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Instruções gerais para o aluno" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Itens da avaliação
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addItem("teorica")}><Plus className="h-4 w-4 mr-1" /> Teórica</Button>
                <Button size="sm" variant="outline" onClick={() => addItem("pratica")}><Plus className="h-4 w-4 mr-1" /> Prática</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {form.items.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded">
                Adicione itens teóricos (perguntas escritas) e práticos (técnicas a executar).
              </div>
            )}
            {form.items.map((it, i) => (
              <div key={i} className="border rounded p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <select className="border rounded p-1 bg-background text-xs" value={it.type} onChange={e => updItem(i, { type: e.target.value as any })}>
                    <option value="teorica">Teórica</option>
                    <option value="pratica">Prática</option>
                  </select>
                  <Input className="flex-1" value={it.question} onChange={e => updItem(i, { question: e.target.value })} placeholder="Pergunta ou técnica requisitada" />
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    Pts
                    <Input type="number" className="w-20" min={0} value={it.max_score} onChange={e => updItem(i, { max_score: Number(e.target.value) })} />
                  </label>
                  <Button size="icon" variant="ghost" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <Input value={it.notes ?? ""} onChange={e => updItem(i, { notes: e.target.value })} placeholder="Observações / critérios (opcional)" />
              </div>
            ))}
            <div className="text-right text-sm font-medium">Total: {total} pts</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Avaliações</h2>
            <p className="text-sm text-muted-foreground">Cadastre provas teóricas e práticas por faixa/grau e imprima a folha para o aluno estudar.</p>
          </div>
          <Button onClick={() => setForm(emptyForm())}><Plus className="h-4 w-4 mr-1" /> Nova avaliação</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(evals.data ?? []).map((ev: any) => (
            <Card key={ev.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <span className="truncate">{ev.title}</span>
                  {!ev.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">inativa</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  {ev.belt?.name ?? "Sem faixa"} {ev.degree ? `· ${ev.degree}º grau` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ev.items?.length ?? 0} itens · {ev.total_score} pts
                  {ev.passing_score != null && ` · aprovação ${ev.passing_score}`}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setForm({
                    id: ev.id, belt_id: ev.belt_id ?? "", degree: ev.degree ?? 0,
                    title: ev.title, description: ev.description ?? "",
                    items: ev.items ?? [], passing_score: ev.passing_score ?? "",
                    active: ev.active,
                  })}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                  <Button size="sm" onClick={() => doPrint(ev)}><Printer className="h-3 w-3 mr-1" /> Imprimir</Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(ev.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(evals.data ?? []).length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground p-6 text-center border rounded">
              Nenhuma avaliação cadastrada.
            </div>
          )}
        </div>
      </div>

      {/* Print sheet */}
      {printing && (
        <div className="hidden print:block p-8 text-black bg-white">
          <div className="border-b pb-3 mb-4">
            <div className="text-xs uppercase tracking-wider">AMT Dojo Manager · Ficha de avaliação</div>
            <h1 className="text-2xl font-bold">{printing.title}</h1>
            <div className="text-sm">
              {printing.belt?.name ?? "Sem faixa"}
              {printing.degree ? ` · ${printing.degree}º grau` : ""}
              {" · Total: "}{printing.total_score} pts
              {printing.passing_score != null && ` · Aprovação: ${printing.passing_score}`}
            </div>
            {printing.description && <p className="text-sm mt-2">{printing.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div>Aluno: ______________________________________</div>
            <div>Data: ______/______/________</div>
            <div>Avaliador: __________________________________</div>
            <div>Nota final: ______ / {printing.total_score}</div>
          </div>

          {(["teorica", "pratica"] as const).map(kind => {
            const items = (printing.items ?? []).filter((it: EvalItem) => it.type === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind} className="mb-6">
                <h2 className="text-lg font-semibold border-b mb-2">
                  {kind === "teorica" ? "Parte Teórica" : "Parte Prática"}
                </h2>
                <ol className="space-y-3 list-decimal pl-5">
                  {items.map((it: EvalItem, i: number) => (
                    <li key={i}>
                      <div className="flex justify-between gap-2">
                        <span className="flex-1">{it.question}</span>
                        <span className="text-xs whitespace-nowrap">____ / {it.max_score} pts</span>
                      </div>
                      {it.notes && <div className="text-xs text-gray-600 mt-0.5">{it.notes}</div>}
                      {kind === "teorica" && (
                        <div className="mt-1 border-b border-dotted h-8" />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}

          <div className="mt-10 pt-4 border-t text-xs text-gray-600">
            Assinatura do aluno: ____________________________ · Assinatura do avaliador: ____________________________
          </div>
        </div>
      )}
    </>
  );
}
