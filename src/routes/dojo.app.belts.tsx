import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listDojoBelts, saveDojoBelt, deleteDojoBelt } from "@/lib/dojo/dojo.functions";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dojo/app/belts")({
  head: () => ({ meta: [{ title: "Modalidades e Faixas — AMT Dojo Manager" }] }),
  component: BeltsPage,
});

const KNOWN_MODALITIES: Array<{ id: string; label: string }> = [
  { id: "jiu-jitsu", label: "Jiu-Jitsu" },
  { id: "karate", label: "Karate" },
  { id: "taekwondo", label: "Taekwondo" },
  { id: "muay-thai", label: "Muay Thai" },
  { id: "judo", label: "Judô" },
];

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
};

const emptyForm = {
  id: undefined as string | undefined,
  modality: "jiu-jitsu",
  name: "",
  color_hex: "#F5F5F5",
  stripe_hex: "" as string,
  sort_order: 10,
  max_degrees: 0,
  category: "adult",
  scope: "own" as "own" | "global",
};

function BeltsPage() {
  const listFn = useServerFn(listDojoBelts);
  const saveFn = useServerFn(saveDojoBelt);
  const delFn = useServerFn(deleteDojoBelt);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["dojo-belts"], queryFn: () => listFn() });
  const [modality, setModality] = useState("jiu-jitsu");
  const [customModality, setCustomModality] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const modalities = useMemo(() => {
    const set = new Set<string>(KNOWN_MODALITIES.map((m) => m.id));
    (q.data ?? []).forEach((b: any) => set.add(b.modality));
    return Array.from(set);
  }, [q.data]);

  const label = (id: string) => KNOWN_MODALITIES.find((m) => m.id === id)?.label ?? id;

  const belts: BeltRow[] = useMemo(
    () => (q.data ?? []).filter((b: any) => b.modality === modality),
    [q.data, modality]
  );

  const openNew = () => {
    setForm({ ...emptyForm, modality });
    setOpen(true);
  };
  const openEdit = (b: BeltRow) => {
    setForm({
      id: b.id,
      modality: b.modality,
      name: b.name,
      color_hex: b.color_hex,
      stripe_hex: b.stripe_hex ?? "",
      sort_order: b.sort_order,
      max_degrees: b.max_degrees,
      category: b.category ?? "adult",
      scope: b.owner_id ? "own" : "global",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    try {
      await saveFn({
        data: {
          ...form,
          stripe_hex: form.stripe_hex?.trim() ? form.stripe_hex : null,
        } as any,
      });
      toast.success("Faixa salva");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["dojo-belts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta faixa? Alunos vinculados perderão a referência.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluída");
      qc.invalidateQueries({ queryKey: ["dojo-belts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    }
  };

  const addCustomModality = () => {
    const slug = customModality
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) return toast.error("Nome inválido");
    setModality(slug);
    setCustomModality("");
    setForm({ ...emptyForm, modality: slug });
    setOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Modalidades e Faixas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as graduações de cada modalidade. Faixas globais aparecem para todos os usuários; faixas próprias ficam disponíveis apenas para o seu dojo.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modalidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {modalities.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={modality === m ? "default" : "outline"}
                onClick={() => setModality(m)}
              >
                {label(m)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Nova modalidade (ex.: Kung Fu)"
              value={customModality}
              onChange={(e) => setCustomModality(e.target.value)}
              className="max-w-xs"
            />
            <Button size="sm" variant="outline" onClick={addCustomModality}>
              <Plus className="h-4 w-4 mr-1" /> Criar modalidade e faixa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {label(modality)} — {belts.length} faixa(s)
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nova faixa
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded divide-y">
            {belts.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="w-8 text-xs text-muted-foreground">{b.sort_order}</div>
                <BeltVisual
                  name={b.name}
                  colorHex={b.color_hex}
                  stripeHex={b.stripe_hex}
                  degree={0}
                  maxDegrees={b.max_degrees}
                  className="min-w-[220px]"
                />
                <div className="flex-1 min-w-[160px]">
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.max_degrees > 0 ? `${b.max_degrees} graus` : "sem graus"} · {b.owner_id ? "própria" : "global"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
            {belts.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma faixa cadastrada para esta modalidade.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar faixa" : "Nova faixa"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Modalidade</label>
              <Input
                value={form.modality}
                onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cor principal</label>
              <Input
                type="color"
                value={form.color_hex}
                onChange={(e) => setForm((f) => ({ ...f, color_hex: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Detalhe (opcional)</label>
              <Input
                type="color"
                value={form.stripe_hex || "#ffffff"}
                onChange={(e) => setForm((f) => ({ ...f, stripe_hex: e.target.value }))}
              />
              {form.stripe_hex && (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground underline mt-1"
                  onClick={() => setForm((f) => ({ ...f, stripe_hex: "" }))}
                >
                  remover detalhe
                </button>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ordem</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Máx. graus</label>
              <Input
                type="number"
                value={form.max_degrees}
                onChange={(e) => setForm((f) => ({ ...f, max_degrees: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Visibilidade</label>
              <select
                className="border rounded p-2 bg-background w-full"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as "own" | "global" }))}
              >
                <option value="own">Somente meu dojo</option>
                <option value="global">Global (todos os usuários)</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3 bg-muted/40 p-3 rounded">
              <BeltVisual
                name={form.name}
                colorHex={form.color_hex}
                stripeHex={form.stripe_hex || null}
                degree={0}
                maxDegrees={form.max_degrees}
                className="min-w-[220px]"
              />
              <div className="text-xs text-muted-foreground">Pré-visualização</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
