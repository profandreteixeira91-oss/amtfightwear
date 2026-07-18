import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listDojoStudents, listDojoBelts, addBulkGraduation,
  getGraduationSettings, saveGraduationSettings,
} from "@/lib/dojo/dojo.functions";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import beltsReference from "@/assets/amt-belts-reference.png.asset.json";

export const Route = createFileRoute("/dojo/app/graduations")({
  component: GraduationsPage,
});

type SystemKind = "merit" | "classes" | "period";

function GraduationsPage() {
  const studentsFn = useServerFn(listDojoStudents);
  const beltsFn = useServerFn(listDojoBelts);
  const bulkFn = useServerFn(addBulkGraduation);
  const getCfg = useServerFn(getGraduationSettings);
  const saveCfg = useServerFn(saveGraduationSettings);
  const qc = useQueryClient();

  const students = useQuery({ queryKey: ["dojo-students"], queryFn: () => studentsFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const cfg = useQuery({ queryKey: ["dojo-grad-settings"], queryFn: () => getCfg() });

  // Settings state
  const [system, setSystem] = useState<SystemKind>("merit");
  const [defaultClasses, setDefaultClasses] = useState(60);
  const [defaultPeriod, setDefaultPeriod] = useState(12);
  const [classesByBelt, setClassesByBelt] = useState<Record<string, number>>({});
  const [periodByBelt, setPeriodByBelt] = useState<Record<string, number>>({});

  useEffect(() => {
    if (cfg.data) {
      setSystem((cfg.data as any).system ?? "merit");
      setDefaultClasses((cfg.data as any).default_classes ?? 60);
      setDefaultPeriod((cfg.data as any).default_period_months ?? 12);
      setClassesByBelt((cfg.data as any).classes_by_belt ?? {});
      setPeriodByBelt((cfg.data as any).period_months_by_belt ?? {});
    }
  }, [cfg.data]);

  const saveSettings = async () => {
    try {
      await saveCfg({ data: {
        system, classes_by_belt: classesByBelt, period_months_by_belt: periodByBelt,
        default_classes: defaultClasses, default_period_months: defaultPeriod,
      }});
      toast.success("Sistema de graduação salvo");
      qc.invalidateQueries({ queryKey: ["dojo-grad-settings"] });
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  // New graduation state (bulk)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [beltId, setBeltId] = useState("");
  const [degree, setDegree] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluator, setEvaluator] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const selectedBelt = useMemo(
    () => (belts.data ?? []).find((b: any) => b.id === beltId),
    [belts.data, beltId]
  );
  const maxDeg = selectedBelt?.max_degrees ?? 4;

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students.data ?? []).filter((s: any) => !q || s.full_name.toLowerCase().includes(q));
  }, [students.data, search]);

  const submitBulk = async () => {
    if (selectedStudents.size === 0) return toast.error("Selecione ao menos um aluno");
    if (!beltId) return toast.error("Selecione a faixa");
    if (degree < 0 || degree > maxDeg) return toast.error(`Grau deve estar entre 0 e ${maxDeg}`);
    try {
      const res = await bulkFn({ data: {
        student_ids: Array.from(selectedStudents),
        belt_id: beltId, degree, graduation_date: date,
        evaluator: evaluator || null, notes: notes || null,
      }});
      toast.success(`${res.count} graduação(ões) registrada(s)`);
      setSelectedStudents(new Set()); setEvaluator(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
    } catch (e: any) { toast.error(e.message ?? "Erro ao registrar"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Graduações</h2>
        <p className="text-sm text-muted-foreground">Configure o sistema, registre graduações em massa e visualize as faixas AMT.</p>
      </div>

      {/* Sistema de graduação */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sistema de graduação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { k: "merit", label: "Por mérito", desc: "Professor decide caso a caso" },
              { k: "classes", label: "Por aulas", desc: "Baseado na quantidade de aulas" },
              { k: "period", label: "Por período", desc: "Baseado em tempo mínimo" },
            ] as { k: SystemKind; label: string; desc: string }[]).map(opt => (
              <button
                key={opt.k}
                onClick={() => setSystem(opt.k)}
                className={`text-left border rounded p-3 flex-1 min-w-[180px] transition ${system === opt.k ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>

          {system === "classes" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-muted-foreground">
                  Padrão (aulas)
                  <Input type="number" min={0} value={defaultClasses} onChange={e => setDefaultClasses(Number(e.target.value))} />
                </label>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {(belts.data ?? []).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-2 border rounded p-2">
                    <BeltVisual colorHex={b.color_hex} name={b.name} stripeHex={b.stripe_hex} degree={0} maxDegrees={b.max_degrees} />
                    <div className="flex-1 min-w-0 text-sm truncate">{b.name}</div>
                    <Input
                      type="number" min={0} className="w-24"
                      value={classesByBelt[b.id] ?? ""}
                      placeholder={String(defaultClasses)}
                      onChange={e => setClassesByBelt({ ...classesByBelt, [b.id]: Number(e.target.value) })}
                    />
                    <span className="text-xs text-muted-foreground">aulas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {system === "period" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-muted-foreground">
                  Padrão (meses)
                  <Input type="number" min={0} value={defaultPeriod} onChange={e => setDefaultPeriod(Number(e.target.value))} />
                </label>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {(belts.data ?? []).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-2 border rounded p-2">
                    <BeltVisual colorHex={b.color_hex} name={b.name} stripeHex={b.stripe_hex} degree={0} maxDegrees={b.max_degrees} />
                    <div className="flex-1 min-w-0 text-sm truncate">{b.name}</div>
                    <Input
                      type="number" min={0} className="w-24"
                      value={periodByBelt[b.id] ?? ""}
                      placeholder={String(defaultPeriod)}
                      onChange={e => setPeriodByBelt({ ...periodByBelt, [b.id]: Number(e.target.value) })}
                    />
                    <span className="text-xs text-muted-foreground">meses</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={saveSettings}>Salvar sistema</Button>
        </CardContent>
      </Card>

      {/* Nova graduação (bulk) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Nova graduação
            <span className="text-xs font-normal text-muted-foreground">{selectedStudents.size} aluno(s) selecionado(s)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Faixa</label>
              <select className="border rounded p-2 bg-background w-full" value={beltId} onChange={(e) => { setBeltId(e.target.value); setDegree(0); }}>
                <option value="">Selecione…</option>
                {(belts.data ?? []).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Grau</label>
              <select
                className="border rounded p-2 bg-background w-full"
                value={degree}
                onChange={(e) => setDegree(Number(e.target.value))}
                disabled={!selectedBelt}
              >
                {Array.from({ length: maxDeg + 1 }).map((_, i) => (
                  <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Avaliador</label>
              <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Ex.: Prof. André Teixeira" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          {selectedBelt && (
            <div className="flex items-center gap-4 p-3 bg-muted/40 rounded">
              <BeltVisual
                colorHex={selectedBelt.color_hex}
                stripeHex={selectedBelt.stripe_hex}
                degree={degree}
                maxDegrees={maxDeg}
                className="min-w-[220px]"
              />
              <div className="text-sm">
                <div className="font-medium">{selectedBelt.name}</div>
                <div className="text-muted-foreground">{degree === 0 ? "Sem grau" : `${degree}º grau`}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input placeholder="Buscar aluno…" value={search} onChange={e => setSearch(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setSelectedStudents(new Set(filteredStudents.map((s: any) => s.id)))}>Todos</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())}>Limpar</Button>
            </div>
            <div className="border rounded max-h-72 overflow-y-auto divide-y">
              {filteredStudents.map((s: any) => (
                <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.belt?.name ?? "Sem faixa"} {s.current_degree ? `· ${s.current_degree}º grau` : ""}
                    </div>
                  </div>
                  {s.belt?.color_hex && (
                    <BeltVisual colorHex={s.belt.color_hex} stripeHex={s.belt.stripe_hex} degree={s.current_degree ?? 0} maxDegrees={s.belt?.max_degrees ?? 4} />
                  )}
                </label>
              ))}
              {filteredStudents.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Nenhum aluno.</div>
              )}
            </div>
          </div>

          <Button onClick={submitBulk} disabled={selectedStudents.size === 0}>
            Registrar graduação para {selectedStudents.size} aluno(s)
          </Button>
          <p className="text-xs text-muted-foreground">
            Após registrar, abra <Link to="/dojo/app/certificates" className="underline">Certificados</Link> para emitir o certificado de cada aluno.
          </p>
        </CardContent>
      </Card>

      {/* Faixas AMT */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sistema de faixas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <figure className="border rounded overflow-hidden bg-muted/30">
            <img
              src={beltsReference.url}
              alt="Sistema de faixas oficial AMT — da Branca à Vermelha, com todos os graus"
              className="w-full h-auto"
              loading="lazy"
            />
            <figcaption className="p-2 text-xs text-muted-foreground">
              Referência oficial AMT: Branca à Marrom (1–4 graus), Preta (1–6), Preta com Aparador,
              Vermelha e Preta (7º), Vermelha e Branca (8º) e Vermelha (9º).
            </figcaption>
          </figure>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(belts.data ?? []).map((b: any) => (
              <div key={b.id} className="border rounded p-3 space-y-2 bg-background">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{b.name}</div>
                  <span className="text-[11px] text-muted-foreground">até {b.max_degrees}º grau</span>
                </div>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: b.max_degrees + 1 }).map((_, d) => (
                    <div key={d} className="flex items-center gap-2">
                      <BeltVisual colorHex={b.color_hex} name={b.name} stripeHex={b.stripe_hex} degree={d} maxDegrees={b.max_degrees} />
                      <span className="text-[11px] text-muted-foreground">{d === 0 ? "sem grau" : `${d}º`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
