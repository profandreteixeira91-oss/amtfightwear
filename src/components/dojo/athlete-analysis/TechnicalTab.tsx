import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Trash2, Settings, Sparkles, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TechnicalRadar } from "./TechnicalRadar";
import {
  listStudentModalities,
  listStudentTechnicalScores,
  upsertStudentTechnicalScore,
  listFundamentals,
  upsertFundamental,
  deleteFundamental,
  seedDefaultFundamentals,
} from "@/lib/dojo/technical.functions";

const MODALITIES: { value: string; label: string }[] = [
  { value: "jiu-jitsu", label: "Jiu-Jitsu" },
  { value: "judo", label: "Judô" },
  { value: "muay-thai", label: "Muay Thai" },
  { value: "boxe", label: "Boxe" },
  { value: "mma", label: "MMA" },
  { value: "karate", label: "Karatê" },
  { value: "taekwondo", label: "Taekwondo" },
];

function modalityLabel(v: string) {
  return MODALITIES.find((m) => m.value === v)?.label ?? v;
}

export function TechnicalTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const modsFn = useServerFn(listStudentModalities);
  const scoresFn = useServerFn(listStudentTechnicalScores);
  const upsertScore = useServerFn(upsertStudentTechnicalScore);
  const seedFn = useServerFn(seedDefaultFundamentals);

  const modsQ = useQuery({
    queryKey: ["tech-modalities", studentId],
    queryFn: () => modsFn({ data: { studentId } }),
  });

  const [modality, setModality] = useState<string>("");
  const effectiveModality = modality || modsQ.data?.[0] || "jiu-jitsu";
  const [managerOpen, setManagerOpen] = useState(false);

  const scoresQ = useQuery({
    queryKey: ["tech-scores", studentId, effectiveModality],
    queryFn: () => scoresFn({ data: { studentId, modality: effectiveModality } }),
    enabled: !!effectiveModality,
  });

  const [drafts, setDrafts] = useState<Record<string, { score: number; notes: string }>>({});

  const rows = scoresQ.data ?? [];
  const radarData = useMemo(
    () =>
      rows
        .filter((r: any) => r.score)
        .slice(0, 12)
        .map((r: any) => ({ axis: r.fundamental.name, value: Number(r.score?.score ?? 0) })),
    [rows],
  );

  const saveMut = useMutation({
    mutationFn: async (payload: { fundamentalId: string; score: number; notes: string | null }) =>
      upsertScore({ data: { studentId, ...payload } }),
    onSuccess: () => {
      toast.success("Nota salva");
      qc.invalidateQueries({ queryKey: ["tech-scores", studentId] });
      qc.invalidateQueries({ queryKey: ["athlete", studentId, "tech"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const seedMut = useMutation({
    mutationFn: async () => seedFn({ data: { modality: effectiveModality } }),
    onSuccess: (res: any) => {
      toast.success(res.seeded ? `${res.seeded} fundamentos criados` : "Já havia fundamentos");
      qc.invalidateQueries({ queryKey: ["tech-scores", studentId] });
      qc.invalidateQueries({ queryKey: ["tech-fundamentals"] });
    },
  });

  return (
    <div className="space-y-4">
      <SectionCard
        title="Notas Técnicas por Fundamento"
        description="Avalie o desempenho por técnica/fundamento da modalidade selecionada"
        actions={
          <div className="flex items-center gap-2">
            <Select value={effectiveModality} onValueChange={setModality}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(modsQ.data?.length ? modsQ.data : MODALITIES.map((m) => m.value)).map((m: string) => (
                  <SelectItem key={m} value={m}>{modalityLabel(m)}</SelectItem>
                ))}
                {MODALITIES.filter((m) => !(modsQ.data ?? []).includes(m.value)).map((m) => (
                  <SelectItem key={`o-${m.value}`} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> Gerenciar fundamentos
            </Button>
          </div>
        }
      >
        {scoresQ.isLoading ? (
          <Skeleton className="h-40" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nenhum fundamento cadastrado"
            description="Crie fundamentos para esta modalidade ou use os padrões sugeridos."
            icon={Sparkles}
            action={
              <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                <Sparkles className="mr-2 h-4 w-4" /> Usar fundamentos padrão
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => {
              const key = r.fundamental.id;
              const currentScore = drafts[key]?.score ?? Number(r.score?.score ?? 0);
              const currentNotes = drafts[key]?.notes ?? (r.score?.notes ?? "");
              const dirty = drafts[key] !== undefined;
              return (
                <div key={key} className="rounded-lg border border-border/40 bg-card p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{r.fundamental.name}</div>
                      {r.fundamental.description && (
                        <div className="text-xs text-muted-foreground">{r.fundamental.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        className="w-20"
                        value={currentScore}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [key]: { score: Number(e.target.value || 0), notes: currentNotes },
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">/10</span>
                      <Badge variant={currentScore >= 7 ? "default" : currentScore >= 5 ? "secondary" : "outline"}>
                        {currentScore >= 8.5 ? "Excelente" : currentScore >= 7 ? "Bom" : currentScore >= 5 ? "Regular" : "A evoluir"}
                      </Badge>
                      <Button
                        size="sm"
                        disabled={!dirty || saveMut.isPending}
                        onClick={() => {
                          saveMut.mutate({
                            fundamentalId: key,
                            score: currentScore,
                            notes: currentNotes || null,
                          });
                          setDrafts((d) => { const { [key]: _, ...rest } = d; return rest; });
                        }}
                      >
                        <Save className="mr-1 h-3 w-3" /> Salvar
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Observações (opcional)"
                    className="mt-2 min-h-[60px] text-sm"
                    value={currentNotes}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [key]: { score: currentScore, notes: e.target.value },
                      }))
                    }
                  />
                  {r.score?.assessed_at && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Última avaliação: {new Date(r.score.assessed_at).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Radar Técnico" description="Baseado nas notas por fundamento">
        {radarData.length > 0 ? (
          <TechnicalRadar data={radarData} max={10} />
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Registre notas para gerar o radar técnico.
          </div>
        )}
      </SectionCard>

      <FundamentalsManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        modality={effectiveModality}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["tech-scores", studentId] });
          qc.invalidateQueries({ queryKey: ["tech-fundamentals"] });
        }}
      />
    </div>
  );
}

function FundamentalsManager({
  open, onClose, modality, onChanged,
}: {
  open: boolean; onClose: () => void; modality: string; onChanged: () => void;
}) {
  const listFn = useServerFn(listFundamentals);
  const upsertFn = useServerFn(upsertFundamental);
  const delFn = useServerFn(deleteFundamental);

  const q = useQuery({
    queryKey: ["tech-fundamentals", modality],
    queryFn: () => listFn({ data: { modality } }),
    enabled: open,
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const startNew = () => { setEditing({}); setName(""); setDesc(""); };
  const startEdit = (row: any) => { setEditing(row); setName(row.name); setDesc(row.description ?? ""); };
  const cancel = () => { setEditing(null); setName(""); setDesc(""); };

  const save = async () => {
    if (!name.trim()) { toast.error("Informe o nome"); return; }
    try {
      await upsertFn({
        data: {
          id: editing?.id,
          modality,
          name: name.trim(),
          description: desc.trim() || null,
          orderIndex: editing?.order_index ?? (q.data?.length ?? 0),
        },
      });
      toast.success("Salvo");
      cancel();
      await q.refetch();
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir fundamento? As notas vinculadas também serão removidas.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluído");
      await q.refetch();
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fundamentos técnicos · {modalityLabel(modality)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={startNew}><Plus className="mr-1 h-3 w-3" /> Novo fundamento</Button>
          </div>

          {editing !== null && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Guarda fechada" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[60px]" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={cancel}><X className="mr-1 h-3 w-3" /> Cancelar</Button>
                <Button size="sm" onClick={save}><Save className="mr-1 h-3 w-3" /> Salvar</Button>
              </div>
            </div>
          )}

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border/40">
            {q.isLoading ? (
              <Skeleton className="h-40" />
            ) : (q.data?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum fundamento nesta modalidade.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {q.data!.map((f: any) => (
                  <li key={f.id} className="flex items-center gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{f.name}</div>
                      {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(f)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
