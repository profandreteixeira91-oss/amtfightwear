import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  listDojoBelts,
  saveDojoBelt,
  deleteDojoBelt,
  reorderDojoBelts,
  checkIsAdmin,
} from "@/lib/dojo/dojo.functions";
import { BeltAuto, BeltSpecVisual, type BeltSpec } from "@/components/dojo/BeltSpecVisual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, Copy, Save, Beaker } from "lucide-react";

/**
 * Rota oculta (não vinculada no menu) para edição avançada de faixas:
 * modalidade, ordem, número de graus e a **ilustração** (spec visual)
 * de cada faixa e de suas subvariações.
 *
 * Acesso direto: /dojo/app/belt-studio
 */
export const Route = createFileRoute("/dojo/app/belt-studio")({
  head: () => ({ meta: [{ title: "Belt Studio (oculto) — AMT Dojo Manager" }] }),
  component: BeltStudio,
});

type BeltRow = {
  id: string;
  name: string;
  color_hex: string;
  stripe_hex: string | null;
  sort_order: number;
  max_degrees: number;
  category: string;
  modality: string;
  owner_id: string | null;
  min_months: number | null;
  min_classes: number | null;
  criteria_mode: "time" | "classes" | "evaluation" | "merit";
  visual?: BeltSpec | null;
  variants?: BeltVariant[] | null;
};

type BeltVariant = {
  id: string;
  name: string;
  /** grau associado (0 = base, 1..N) */
  degree: number;
  /** override visual — quando vazio, herda o spec da faixa pai */
  visual?: BeltSpec | null;
};

const MODALITY_OPTIONS = [
  { id: "jiu-jitsu", label: "Jiu-Jitsu" },
  { id: "judo", label: "Judô" },
  { id: "karate", label: "Karatê" },
  { id: "taekwondo", label: "Taekwondo" },
  { id: "muay-thai", label: "Muay Thai" },
];

function newBeltDraft(modality = "jiu-jitsu"): BeltRow {
  return {
    id: "",
    name: "Nova faixa",
    color_hex: "#F5F5F5",
    stripe_hex: null,
    sort_order: 100,
    max_degrees: 4,
    category: "adult",
    modality,
    owner_id: null,
    min_months: null,
    min_classes: null,
    criteria_mode: "time",
    visual: {},
    variants: [],
  };
}

function BeltStudio() {
  const listFn = useServerFn(listDojoBelts);
  const saveFn = useServerFn(saveDojoBelt);
  const delFn = useServerFn(deleteDojoBelt);
  const reorderFn = useServerFn(reorderDojoBelts);
  const adminFn = useServerFn(checkIsAdmin);
  const qc = useQueryClient();

  const beltsQ = useQuery<BeltRow[]>({ queryKey: ["belt-studio-list"], queryFn: () => listFn() as any });
  const adminQ = useQuery({ queryKey: ["belt-studio-admin"], queryFn: () => adminFn() });

  const belts = beltsQ.data ?? [];
  const [modality, setModality] = useState("jiu-jitsu");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BeltRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const scoped = useMemo(
    () => belts.filter((b) => b.modality === modality).sort((a, b) => a.sort_order - b.sort_order),
    [belts, modality],
  );

  // Sync draft when selection changes
  useEffect(() => {
    if (!selectedId) { setDraft(null); return; }
    const found = belts.find((b) => b.id === selectedId);
    if (found) {
      setDraft({
        ...found,
        visual: (found.visual ?? {}) as BeltSpec,
        variants: (found.variants ?? []) as BeltVariant[],
      });
    }
  }, [selectedId, belts]);

  const doSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const isNew = !draft.id;
      const scope: "own" | "global" =
        adminQ.data?.isAmtAdmin && draft.owner_id === null ? "global" : "own";
      const saved: any = await saveFn({
        data: {
          id: draft.id || undefined,
          modality: draft.modality,
          name: draft.name,
          color_hex: draft.color_hex,
          stripe_hex: draft.stripe_hex,
          sort_order: draft.sort_order,
          max_degrees: draft.max_degrees,
          category: draft.category,
          min_months: draft.min_months,
          min_classes: draft.min_classes,
          criteria_mode: draft.criteria_mode,
          scope,
          visual: draft.visual ?? {},
          variants: draft.variants ?? [],
        } as any,
      });
      toast.success(isNew ? "Faixa criada." : "Alterações salvas.");
      await qc.invalidateQueries({ queryKey: ["belt-studio-list"] });
      if (saved?.id) setSelectedId(saved.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!draft?.id) return;
    if (!confirm(`Excluir a faixa "${draft.name}"?`)) return;
    try {
      await delFn({ data: { id: draft.id } });
      toast.success("Faixa excluída.");
      setSelectedId(null);
      await qc.invalidateQueries({ queryKey: ["belt-studio-list"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro ao excluir"); }
  };

  const doClone = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      id: "",
      name: `${draft.name} (cópia)`,
      sort_order: (draft.sort_order ?? 0) + 1,
    });
    setSelectedId(null);
  };

  const move = async (b: BeltRow, dir: -1 | 1) => {
    const idx = scoped.findIndex((x) => x.id === b.id);
    const swap = scoped[idx + dir];
    if (!swap) return;
    const items = scoped.map((x, i) => ({
      id: x.id,
      sort_order: i === idx ? swap.sort_order : i === idx + dir ? b.sort_order : x.sort_order,
    }));
    await reorderFn({ data: { items } });
    await qc.invalidateQueries({ queryKey: ["belt-studio-list"] });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <Beaker className="h-6 w-6 text-red-600" />
        <div>
          <h1 className="text-xl font-semibold">Belt Studio</h1>
          <p className="text-xs text-muted-foreground">
            Rota oculta — edite modalidades, faixas, ordem, número de graus e a ilustração de cada variação e subvariação.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* LISTA */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODALITY_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => { setDraft(newBeltDraft(modality)); setSelectedId(null); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {beltsQ.isLoading && <div className="text-xs text-muted-foreground">Carregando...</div>}
            {scoped.length === 0 && !beltsQ.isLoading && (
              <div className="text-xs text-muted-foreground py-6 text-center">Nenhuma faixa para esta modalidade.</div>
            )}
            {scoped.map((b, i) => (
              <div
                key={b.id}
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                  selectedId === b.id ? "border-red-500 bg-red-50/40" : "border-transparent hover:bg-muted/40"
                }`}
                onClick={() => setSelectedId(b.id)}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    disabled={i === 0}
                    onClick={(e) => { e.stopPropagation(); move(b, -1); }}
                    aria-label="Mover para cima"
                  ><ChevronUp className="h-3 w-3" /></button>
                  <button
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    disabled={i === scoped.length - 1}
                    onClick={(e) => { e.stopPropagation(); move(b, 1); }}
                    aria-label="Mover para baixo"
                  ><ChevronDown className="h-3 w-3" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{b.name}</div>
                  <div className="mt-1"><BeltAuto belt={b as any} degree={0} /></div>
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">#{b.sort_order}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* EDITOR */}
        <div className="space-y-4">
          {!draft ? (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">
              Selecione uma faixa à esquerda ou clique em <b>+</b> para criar uma nova.
            </CardContent></Card>
          ) : (
            <BeltEditor
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onSave={doSave}
              onDelete={doDelete}
              onClone={doClone}
              canDelete={!!draft.id}
              showJson={showJson}
              setShowJson={setShowJson}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Editor de uma faixa                                          */
/* ============================================================ */

function BeltEditor({
  draft, setDraft, saving, onSave, onDelete, onClone, canDelete,
}: {
  draft: BeltRow;
  setDraft: (b: BeltRow) => void;
  saving: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClone: () => void;
  canDelete: boolean;
}) {
  const spec: BeltSpec = draft.visual ?? {};


  return (
    <>
      {/* Preview + ações */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Pré-visualização</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClone}><Copy className="h-4 w-4 mr-1" /> Duplicar</Button>
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
            )}
            <Button size="sm" onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}</Button>
          </div>

        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-neutral-100 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="w-full max-w-md">
              <BeltAuto belt={draft as any} degree={0} />
              <div className="text-[11px] text-muted-foreground mt-1">Base (grau 0)</div>
            </div>
            {draft.max_degrees > 0 && (
              <div className="w-full max-w-md">
                <BeltAuto belt={draft as any} degree={Math.min(draft.max_degrees, 3)} />
                <div className="text-[11px] text-muted-foreground mt-1">Grau {Math.min(draft.max_degrees, 3)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Campos base */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Modalidade">
            <Select value={draft.modality} onValueChange={(v) => setDraft({ ...draft, modality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALITY_OPTIONS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ordem">
            <Input type="number" value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value || "0", 10) })} />
          </Field>
          <Field label="Nº de graus (máx.)">
            <Input type="number" min={0} max={20} value={draft.max_degrees}
              onChange={(e) => setDraft({ ...draft, max_degrees: parseInt(e.target.value || "0", 10) })} />
          </Field>
          <Field label="Categoria">
            <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adulto</SelectItem>
                <SelectItem value="kids">Infantil</SelectItem>
                <SelectItem value="youth">Juvenil</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cor base (fallback)">
            <div className="flex gap-2">
              <Input type="color" className="w-14 p-1 h-9" value={draft.color_hex}
                onChange={(e) => setDraft({ ...draft, color_hex: e.target.value })} />
              <Input value={draft.color_hex} onChange={(e) => setDraft({ ...draft, color_hex: e.target.value })} />
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Ilustração — spec estruturada */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ilustração</CardTitle></CardHeader>
        <CardContent>
          <SpecEditor spec={spec} onChange={(next) => setDraft({ ...draft, visual: next })} />
        </CardContent>
      </Card>


      {/* Graus — edição individual */}
      <DegreesSection draft={draft} setDraft={setDraft} parentSpec={spec} />

      {/* Variações / subvariações */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Variações e subvariações</CardTitle>
          <Button size="sm" variant="outline" onClick={() => {
            const arr = [...(draft.variants ?? [])];
            arr.push({ id: crypto.randomUUID(), name: "Nova variação", degree: arr.length + 1, visual: null });
            setDraft({ ...draft, variants: arr });
          }}><Plus className="h-4 w-4 mr-1" /> Variação</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(draft.variants ?? []).length === 0 && (
            <div className="text-xs text-muted-foreground">
              Nenhuma variação. Crie subvariações como <em>“Preta com aparador”</em>, <em>“Preta 1º grau”</em>,
              <em>“Coral”</em>, etc. Cada uma pode ter seu próprio visual (herdando o da faixa quando vazio).
            </div>
          )}
          {(draft.variants ?? []).map((v, i) => (
            <VariantRow
              key={v.id}
              variant={v}
              parentSpec={spec}
              parentBelt={draft}
              onChange={(next) => {
                const arr = [...(draft.variants ?? [])]; arr[i] = next; setDraft({ ...draft, variants: arr });
              }}
              onRemove={() => {
                const arr = [...(draft.variants ?? [])]; arr.splice(i, 1); setDraft({ ...draft, variants: arr });
              }}
            />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function VariantRow({
  variant, parentSpec, parentBelt, onChange, onRemove,
}: {
  variant: BeltVariant;
  parentSpec: BeltSpec;
  parentBelt: BeltRow;
  onChange: (v: BeltVariant) => void;
  onRemove: () => void;
}) {
  const effective: BeltSpec = variant.visual && Object.keys(variant.visual).length > 0 ? variant.visual : parentSpec;
  const [showEditor, setShowEditor] = useState(false);
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input className="flex-1" value={variant.name} onChange={(e) => onChange({ ...variant, name: e.target.value })} />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">grau</span>
          <Input type="number" className="w-16 h-8" value={variant.degree}
            onChange={(e) => onChange({ ...variant, degree: parseInt(e.target.value || "0", 10) })} />
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowEditor(!showEditor)}>
          {showEditor ? "Fechar" : "Editar ilustração"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
      <div className="pl-1">
        <BeltSpecVisual
          spec={effective}
          degree={variant.degree}
          fallback={<BeltAuto belt={parentBelt as any} degree={variant.degree} />}
        />
      </div>
      {showEditor && (
        <div className="mt-2 pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">
              Cole/edite o spec JSON. Deixe vazio (<code>{"{}"}</code>) para herdar da faixa pai.
            </span>
            <Button size="sm" variant="outline" onClick={() => onChange({ ...variant, visual: { ...parentSpec } })}>
              Copiar do pai
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...variant, visual: null })}>
              Limpar (herdar)
            </Button>
          </div>
          <textarea
            className="w-full h-32 font-mono text-[11px] p-2 border rounded"
            value={JSON.stringify(variant.visual ?? {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange({ ...variant, visual: parsed });
              } catch { /* aguarda JSON válido */ }
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/* Edição grau-a-grau                                           */
/* ============================================================ */

function DegreesSection({
  draft, setDraft, parentSpec,
}: {
  draft: BeltRow;
  setDraft: (b: BeltRow) => void;
  parentSpec: BeltSpec;
}) {
  const max = Math.max(0, Number(draft.max_degrees) || 0);
  const variants = draft.variants ?? [];

  const setMax = (n: number) => {
    const next = Math.max(0, Math.min(20, n));
    // Remove overrides acima do novo máximo
    const filtered = variants.filter((v) => v.degree <= next);
    setDraft({ ...draft, max_degrees: next, variants: filtered });
  };

  const findVariant = (degree: number) =>
    variants.find((v) => v.degree === degree && (v.name?.startsWith("Grau ") || v.name?.startsWith("Grau")));

  const upsertVariant = (degree: number, visual: BeltSpec | null) => {
    const arr = [...variants];
    const idx = arr.findIndex((v) => v.degree === degree && v.name?.startsWith("Grau"));
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], visual };
    } else {
      arr.push({ id: crypto.randomUUID(), name: `Grau ${degree}`, degree, visual });
    }
    setDraft({ ...draft, variants: arr });
  };

  const removeVariant = (degree: number) => {
    const arr = variants.filter((v) => !(v.degree === degree && v.name?.startsWith("Grau")));
    setDraft({ ...draft, variants: arr });
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Graus (edição individual)</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setMax(max - 1)} disabled={max <= 0}>−</Button>
          <div className="text-xs w-16 text-center tabular-nums">{max} {max === 1 ? "grau" : "graus"}</div>
          <Button size="sm" variant="outline" onClick={() => setMax(max + 1)} disabled={max >= 20}>+</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {max === 0 && (
          <div className="text-xs text-muted-foreground">
            Esta faixa não tem graus. Use os botões acima para adicionar.
          </div>
        )}
        {Array.from({ length: max }).map((_, i) => {
          const degree = i + 1;
          const override = findVariant(degree);
          const hasOverride = !!override?.visual && Object.keys(override.visual).length > 0;
          const effective: BeltSpec = hasOverride ? (override!.visual as BeltSpec) : parentSpec;
          return (
            <DegreeRow
              key={degree}
              degree={degree}
              effective={effective}
              hasOverride={hasOverride}
              parentBelt={draft}
              onCustomize={() => upsertVariant(degree, { ...parentSpec })}
              onReset={() => removeVariant(degree)}
              onChange={(next) => upsertVariant(degree, next)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function DegreeRow({
  degree, effective, hasOverride, parentBelt, onCustomize, onReset, onChange,
}: {
  degree: number;
  effective: BeltSpec;
  hasOverride: boolean;
  parentBelt: BeltRow;
  onCustomize: () => void;
  onReset: () => void;
  onChange: (spec: BeltSpec) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold w-16 shrink-0">Grau {degree}</div>
        <div className="flex-1 min-w-0">
          <BeltSpecVisual
            spec={effective}
            degree={degree}
            fallback={<BeltAuto belt={parentBelt as any} degree={degree} />}
          />
        </div>
        <div className="flex items-center gap-1">
          {hasOverride ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
                {open ? "Fechar" : "Editar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onReset} title="Voltar ao padrão da faixa">
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { onCustomize(); setOpen(true); }}>
              Personalizar
            </Button>
          )}
        </div>
      </div>
      {open && hasOverride && (
        <div className="pt-2 border-t space-y-2">
          <div className="text-[11px] text-muted-foreground">
            Ajuste o spec JSON deste grau. Salve para persistir.
          </div>
          <textarea
            className="w-full h-32 font-mono text-[11px] p-2 border rounded"
            value={JSON.stringify(effective, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch { /* aguarda JSON válido */ }
            }}
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {action}
    </div>
  );
}
