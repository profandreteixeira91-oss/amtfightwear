import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getEvalTemplate, saveEvalTemplate,
  listEvalCategories, listEvalTechniques,
  saveEvalCategory, saveEvalTechnique,
} from "@/lib/dojo/evaluations.functions";
import { listDojoBelts } from "@/lib/dojo/dojo.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";

const tplOpts = (id: string) =>
  queryOptions({
    queryKey: ["eval-template", id],
    queryFn: () => getEvalTemplate({ data: { id } }),
    staleTime: 60_000,
  });
const beltsOpts = () =>
  queryOptions({
    queryKey: ["dojo-belts"],
    queryFn: () => listDojoBelts(),
    staleTime: 5 * 60_000,
  });
const evalCategoriesOpts = () =>
  queryOptions({
    queryKey: ["eval-categories"],
    queryFn: () => listEvalCategories(),
    staleTime: 5 * 60_000,
  });
const evalTechniquesOpts = () =>
  queryOptions({
    queryKey: ["eval-techniques"],
    queryFn: () => listEvalTechniques(),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/dojo/app/evaluations/templates/$id")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(beltsOpts());
    context.queryClient.prefetchQuery(evalCategoriesOpts());
    context.queryClient.prefetchQuery(evalTechniquesOpts());
    return context.queryClient.ensureQueryData(tplOpts(params.id));
  },
  component: TemplateEditor,
  errorComponent: ({ error }) => (
    <div className="text-sm text-destructive">Falha ao carregar modelo: {error instanceof Error ? error.message : String(error)}</div>
  ),
});

type Criterion = {
  id: string;
  name: string;
  description?: string | null;
  weight: number;
  max_score: number;
  min_score: number;
  required: boolean;
  eliminatory: boolean;
  techniques: string[];
  library_id?: string | null;
};
type Category = {
  id: string;
  name: string;
  weight: number;
  criteria: Criterion[];
  library_id?: string | null;
};

const uid = () => Math.random().toString(36).slice(2, 10);

function TemplateEditor() {
  const { id } = Route.useParams();
  const saveFn = useServerFn(saveEvalTemplate);
  const saveCategoryFn = useServerFn(saveEvalCategory);
  const saveTechniqueFn = useServerFn(saveEvalTechnique);
  const qc = useQueryClient();

  const { data: tpl } = useSuspenseQuery(tplOpts(id));
  const { data: belts } = useSuspenseQuery(beltsOpts());
  const { data: libCategories } = useSuspenseQuery(evalCategoriesOpts());
  const { data: libTechniques } = useSuspenseQuery(evalTechniquesOpts());

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (tpl && !form) {
      setForm({
        title: tpl.title ?? "",
        description: tpl.description ?? "",
        modality: tpl.modality ?? "",
        category: tpl.category ?? "",
        belt_id: tpl.belt_id ?? "",
        end_belt_id: tpl.end_belt_id ?? "",
        degree: tpl.degree ?? 0,
        min_training_months: tpl.min_training_months ?? "",
        min_attendance: tpl.min_attendance ?? "",
        observations: tpl.observations ?? "",
        method: tpl.method ?? "numeric",
        passing_score: tpl.passing_score ?? "",
        active: tpl.active ?? true,
        auto_graduate: tpl.auto_graduate ?? false,
        structure: (tpl.structure as any) ?? { categories: [] },
      });
    }
  }, [tpl, form]);

  if (!form) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const beltList: any[] = belts ?? [];
  const modalities = Array.from(
    new Set(beltList.map((b) => (b.modality ?? "").toString().trim()).filter(Boolean)),
  ).sort();
  const filteredBelts = form.modality
    ? beltList.filter((b) => (b.modality ?? "") === form.modality)
    : beltList;


  const cats: Category[] = form.structure.categories ?? [];

  const total = cats.reduce(
    (s, c) => s + c.criteria.reduce((sc, cr) => sc + Number(cr.max_score || 0), 0),
    0,
  );

  const setCats = (next: Category[]) =>
    setForm({ ...form, structure: { ...form.structure, categories: next } });

  const addCategory = () =>
    setCats([...cats, { id: uid(), name: "Nova categoria", weight: 1, criteria: [] }]);

  const libCats: any[] = libCategories ?? [];
  const libTechs: any[] = libTechniques ?? [];

  const addCategoryFromLibrary = (libId: string) => {
    const lc = libCats.find((c) => c.id === libId);
    if (!lc) return;
    const techs = libTechs.filter((t) => t.category_id === libId && !t.archived);
    const newCat: Category = {
      id: uid(),
      name: lc.name,
      weight: 1,
      library_id: lc.id,
      criteria: techs.map((t) => ({
        id: uid(),
        name: t.name,
        description: t.description ?? null,
        weight: 1,
        max_score: Number(t.default_score ?? 10),
        min_score: 0,
        required: !!t.required,
        eliminatory: false,
        techniques: [t.id],
        library_id: t.id,
      })),
    };
    setCats([...cats, newCat]);
  };

  // Auto-save a category to the library when its name is finalized.
  const autoSaveCategory = async (ci: number) => {
    const c = cats[ci];
    if (!c) return;
    const name = (c.name ?? "").trim();
    if (!name || name.toLowerCase() === "nova categoria") return;
    if (c.library_id) return;
    const existing = libCats.find(
      (lc) => (lc.name ?? "").trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      updCategory(ci, { library_id: existing.id });
      return;
    }
    try {
      const res = await saveCategoryFn({ data: { name } });
      updCategory(ci, { library_id: res.id });
      qc.invalidateQueries({ queryKey: ["eval-categories"] });
      toast.success(`Categoria "${name}" salva na biblioteca`);
    } catch (e: any) {
      // silencioso — não bloquear o editor
      console.warn("autoSaveCategory:", e?.message);
    }
  };

  // Auto-save a technique/exercise to the library when its name is finalized.
  const autoSaveTechnique = async (ci: number, cri: number) => {
    const c = cats[ci];
    const cr = c?.criteria[cri];
    if (!c || !cr) return;
    const name = (cr.name ?? "").trim();
    if (!name || name.toLowerCase() === "novo critério" || name.toLowerCase() === "nova técnica") return;
    if (cr.library_id) return;
    // Garantir categoria na biblioteca antes
    let categoryLibId = c.library_id ?? null;
    if (!categoryLibId) {
      const catName = (c.name ?? "").trim();
      const matched = libCats.find(
        (lc) => (lc.name ?? "").trim().toLowerCase() === catName.toLowerCase(),
      );
      if (matched) {
        categoryLibId = matched.id;
        updCategory(ci, { library_id: matched.id });
      } else if (catName) {
        try {
          const res = await saveCategoryFn({ data: { name: catName } });
          categoryLibId = res.id;
          updCategory(ci, { library_id: res.id });
          qc.invalidateQueries({ queryKey: ["eval-categories"] });
        } catch {}
      }
    }
    const existing = libTechs.find(
      (lt) =>
        (lt.name ?? "").trim().toLowerCase() === name.toLowerCase() &&
        (categoryLibId ? lt.category_id === categoryLibId : true),
    );
    if (existing) {
      updCriterion(ci, cri, { library_id: existing.id, techniques: [existing.id] });
      return;
    }
    try {
      const res = await saveTechniqueFn({
        data: {
          name,
          category_id: categoryLibId ?? null,
          default_score: Number(cr.max_score ?? 10),
          required: !!cr.required,
        },
      });
      updCriterion(ci, cri, { library_id: res.id, techniques: [res.id] });
      qc.invalidateQueries({ queryKey: ["eval-techniques"] });
      toast.success(`"${name}" salva em Técnicas`);
    } catch (e: any) {
      console.warn("autoSaveTechnique:", e?.message);
    }
  };

  const addTechniqueCriterion = (ci: number, techId: string) => {
    const t = libTechs.find((x) => x.id === techId);
    if (!t) return;
    const next = [...cats];
    next[ci] = {
      ...next[ci],
      criteria: [...next[ci].criteria, {
        id: uid(),
        name: t.name,
        description: t.description ?? null,
        weight: 1,
        max_score: Number(t.default_score ?? 10),
        min_score: 0,
        required: !!t.required,
        eliminatory: false,
        techniques: [t.id],
        library_id: t.id,
      }],
    };
    setCats(next);
  };

  const updCategory = (i: number, patch: Partial<Category>) => {
    const next = [...cats]; next[i] = { ...next[i], ...patch }; setCats(next);
  };

  const rmCategory = (i: number) => setCats(cats.filter((_, idx) => idx !== i));

  const moveCategory = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats]; [next[i], next[j]] = [next[j], next[i]]; setCats(next);
  };

  const addCriterion = (ci: number) => {
    const next = [...cats];
    next[ci] = {
      ...next[ci],
      criteria: [...next[ci].criteria, {
        id: uid(), name: "Nova técnica", weight: 1,
        max_score: 10, min_score: 0, required: false, eliminatory: false, techniques: [],
      }],
    };
    setCats(next);
  };

  const updCriterion = (ci: number, cri: number, patch: Partial<Criterion>) => {
    const next = [...cats];
    const list = [...next[ci].criteria];
    list[cri] = { ...list[cri], ...patch };
    next[ci] = { ...next[ci], criteria: list };
    setCats(next);
  };

  const rmCriterion = (ci: number, cri: number) => {
    const next = [...cats];
    next[ci] = { ...next[ci], criteria: next[ci].criteria.filter((_, i) => i !== cri) };
    setCats(next);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Informe um título");
    try {
      await saveFn({
        data: {
          id,
          title: form.title,
          description: form.description || null,
          modality: form.modality || null,
          category: form.category || null,
          belt_id: form.belt_id || null,
          end_belt_id: form.end_belt_id || null,
          degree: Number(form.degree) || 0,
          min_training_months: form.min_training_months === "" ? null : Number(form.min_training_months),
          min_attendance: form.min_attendance === "" ? null : Number(form.min_attendance),
          observations: form.observations || null,
          method: form.method,
          passing_score: form.passing_score === "" ? null : Number(form.passing_score),
          active: form.active,
          auto_graduate: form.auto_graduate,
          structure: form.structure,
        },
      });
      toast.success("Modelo salvo");
      qc.invalidateQueries({ queryKey: ["eval-template", id] });
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/dojo/app/evaluations/templates" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Modelos
        </Link>
        <Button onClick={save}>Salvar modelo</Button>
      </div>

      <Card className="border-neutral-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100"><CardTitle className="text-base font-black uppercase tracking-tight text-neutral-900">Informações gerais</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Título</Label>
              <Input className="border-neutral-200 bg-white shadow-sm focus:ring-red-500" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Categoria</Label>
              <Input className="border-neutral-200 bg-white shadow-sm focus:ring-red-500" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: adulto" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Modalidade</Label>
              <select
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-red-500/20"
                value={form.modality}
                onChange={(e) => {
                  const nextMod = e.target.value;
                  const stillValid = (id: string) =>
                    !id || beltList.some((b) => b.id === id && (!nextMod || (b.modality ?? "") === nextMod));
                  setForm({
                    ...form,
                    modality: nextMod,
                    belt_id: stillValid(form.belt_id) ? form.belt_id : "",
                    end_belt_id: stillValid(form.end_belt_id) ? form.end_belt_id : "",
                  });
                }}
              >
                <option value="">Selecione a modalidade…</option>
                {modalities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {modalities.length === 0 && (
                <p className="text-[10px] text-neutral-400 font-bold mt-1">
                  Cadastre modalidades em Modalidades e Faixas.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Faixa inicial</Label>
              <select
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-red-500/20"
                value={form.belt_id}
                disabled={!form.modality}
                onChange={(e) => setForm({ ...form, belt_id: e.target.value })}
              >
                <option value="">{form.modality ? "—" : "Selecione a modalidade primeiro"}</option>
                {filteredBelts.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Faixa final (para graduação)</Label>
              <select
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-red-500/20"
                value={form.end_belt_id}
                disabled={!form.modality}
                onChange={(e) => setForm({ ...form, end_belt_id: e.target.value })}
              >
                <option value="">{form.modality ? "—" : "Selecione a modalidade primeiro"}</option>
                {filteredBelts.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tempo mínimo de treino (meses)</Label>
              <Input className="border-neutral-200 bg-white shadow-sm focus:ring-red-500" type="number" min={0} value={form.min_training_months} onChange={(e) => setForm({ ...form, min_training_months: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Frequência mínima (aulas)</Label>
              <Input className="border-neutral-200 bg-white shadow-sm focus:ring-red-500" type="number" min={0} value={form.min_attendance} onChange={(e) => setForm({ ...form, min_attendance: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Método de avaliação</Label>
              <select className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-red-500/20" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="numeric">Nota numérica</option>
                <option value="checklist">Checklist</option>
                <option value="pass_fail">Aprovado/Reprovado</option>
                <option value="scale">Escala</option>
                <option value="rubric">Rubrica</option>
                <option value="concept">Conceito</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nota mínima para aprovação</Label>
              <Input className="border-neutral-200 bg-white shadow-sm focus:ring-red-500" type="number" min={0} value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: e.target.value === "" ? "" : Number(e.target.value) })} placeholder={`Total: ${total}`} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Descrição</Label>
            <Textarea className="min-h-[80px] border-neutral-200 bg-white shadow-sm focus:ring-red-500" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Observações</Label>
            <Textarea className="min-h-[80px] border-neutral-200 bg-white shadow-sm focus:ring-red-500" rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-8 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-900 transition-colors">Ativo</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <Switch checked={form.auto_graduate} onCheckedChange={(v) => setForm({ ...form, auto_graduate: v })} />
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-900 transition-colors">Graduar automaticamente ao aprovar</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base font-black uppercase tracking-tight text-neutral-900">Estrutura da avaliação</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {libCats.length > 0 && (
                <select
                  className="border rounded p-2 bg-background text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addCategoryFromLibrary(e.target.value);
                      e.currentTarget.value = "";
                    }
                  }}
                >
                  <option value="">+ Da biblioteca…</option>
                  {libCats.filter((c) => !c.archived).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="outline" onClick={addCategory}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Categoria
              </Button>
            </div>
          </div>
          {libCats.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre categorias e técnicas em Avaliações → Biblioteca para importar aqui.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {cats.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 text-center border rounded">
              Adicione categorias, cada uma com suas técnicas/exercícios.
            </div>
          )}
          {cats.map((cat, ci) => (
            <div key={cat.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1 font-medium"
                  value={cat.name}
                  onChange={(e) => updCategory(ci, { name: e.target.value })}
                  onBlur={() => autoSaveCategory(ci)}
                />

                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Peso
                  <Input className="w-16" type="number" min={0} value={cat.weight} onChange={(e) => updCategory(ci, { weight: Number(e.target.value) })} />
                </label>
                <Button size="icon" variant="ghost" onClick={() => moveCategory(ci, -1)}><ChevronUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => moveCategory(ci, 1)}><ChevronDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => rmCategory(ci)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                {cat.criteria.map((cr, cri) => (
                  <div key={cr.id} className="border rounded p-2 bg-background space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={cr.name}
                        onChange={(e) => updCriterion(ci, cri, { name: e.target.value })}
                        onBlur={() => autoSaveTechnique(ci, cri)}
                        placeholder="Nome da técnica/exercício"
                      />

                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        Pts
                        <Input className="w-16" type="number" min={0} value={cr.max_score} onChange={(e) => updCriterion(ci, cri, { max_score: Number(e.target.value) })} />
                      </label>
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        Peso
                        <Input className="w-14" type="number" min={0} value={cr.weight} onChange={(e) => updCriterion(ci, cri, { weight: Number(e.target.value) })} />
                      </label>
                      <Button size="icon" variant="ghost" onClick={() => rmCriterion(ci, cri)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pl-1">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={cr.required} onChange={(e) => updCriterion(ci, cri, { required: e.target.checked })} />
                        Obrigatório
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={cr.eliminatory} onChange={(e) => updCriterion(ci, cri, { eliminatory: e.target.checked })} />
                        Eliminatório
                      </label>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button size="sm" variant="ghost" onClick={() => addCriterion(ci)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Técnica/Exercício
                  </Button>

                  {(() => {
                    const matchLib = libCats.find(
                      (c) => (c.name ?? "").trim().toLowerCase() === (cat.name ?? "").trim().toLowerCase(),
                    );
                    const availableTechs = libTechs.filter(
                      (t) =>
                        !t.archived &&
                        (matchLib ? t.category_id === matchLib.id : true) &&
                        !cat.criteria.some((cr) => (cr.techniques ?? []).includes(t.id)),
                    );
                    if (availableTechs.length === 0) return null;
                    return (
                      <select
                        className="border rounded p-1.5 bg-background text-xs"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addTechniqueCriterion(ci, e.target.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      >
                        <option value="">
                          + Técnica {matchLib ? `de "${matchLib.name}"` : "da biblioteca"}…
                        </option>
                        {availableTechs.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-medium pt-2">Total: {total} pts</div>
        </CardContent>
      </Card>
    </div>
  );
}
