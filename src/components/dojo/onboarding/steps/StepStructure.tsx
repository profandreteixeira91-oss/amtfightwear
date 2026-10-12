import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDojoPlan } from "@/lib/dojo/dojo.functions";
import { saveClass } from "@/lib/dojo/schedule.functions";
import { CLASS_COLORS, WEEKDAYS, MODALITIES } from "@/components/dojo/schedule/constants";
import type { SetupState } from "@/lib/dojo/setup.functions";

export function StepStructure({ state, onNext, refresh }: { state: SetupState; onNext: () => Promise<void>; refresh: () => Promise<void> }) {
  const savePlan = useServerFn(saveDojoPlan); const saveSchedule = useServerFn(saveClass);
  const [name, setName] = useState(""); const [amount, setAmount] = useState("");
  const [className, setClassName] = useState(""); const [modality, setModality] = useState(state.academy?.modalities?.[0] ?? MODALITIES[0]);
  const [days, setDays] = useState<number[]>([]); const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState("20"); const [busy, setBusy] = useState(false);
  const [planSaved, setPlanSaved] = useState(state.plans.length > 0); const [classSaved, setClassSaved] = useState(state.classes.length > 0);
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      if (!planSaved) { await savePlan({ data: { name: name.trim(), amount: Number(amount), frequency: "monthly", active: true, payment_methods: [{ code: "cash", enabled: true, gateway: "manual" }] } }); setPlanSaved(true); }
      if (!classSaved) {
        if (days.length === 0 || end <= start) throw new Error("Selecione os dias e um horário final maior que o inicial.");
        await saveSchedule({ data: { name: className.trim(), modality, level: "todos", color: CLASS_COLORS[0], max_students: Number(capacity), status: "active", schedules: days.map((weekday) => ({ weekday, start_time: start, end_time: end })) } }); setClassSaved(true);
      }
      await refresh(); await onNext();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); await refresh(); } finally { setBusy(false); }
  }}>
    <section className="space-y-3"><h3 className="font-semibold">Plano mensal</h3>{planSaved ? <p className="text-sm text-muted-foreground">Plano cadastrado ✓</p> : <><Label htmlFor="setup-plan">Nome do plano</Label><Input id="setup-plan" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /><Label htmlFor="setup-amount">Mensalidade (R$)</Label><Input id="setup-amount" required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></>}</section>
    <section className="space-y-3 border-t pt-4"><h3 className="font-semibold">Primeira turma</h3>{classSaved ? <p className="text-sm text-muted-foreground">Turma cadastrada ✓</p> : <>
      <Label htmlFor="setup-class">Nome da turma</Label><Input id="setup-class" required value={className} onChange={(e) => setClassName(e.target.value)} />
      <Label htmlFor="setup-modality">Modalidade</Label><select id="setup-modality" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={modality} onChange={(e) => setModality(e.target.value)}>{Array.from(new Set([...(state.academy?.modalities ?? []), ...MODALITIES])).map((m) => <option key={m}>{m}</option>)}</select>
      <fieldset><legend className="mb-2 text-sm">Dias da semana</legend><div className="flex flex-wrap gap-3">{WEEKDAYS.map((day) => <label key={day.value} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={days.includes(day.value)} onChange={(e) => setDays(e.target.checked ? [...days, day.value] : days.filter((d) => d !== day.value))} />{day.short}</label>)}</div></fieldset>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="setup-start">Início</Label><Input id="setup-start" required type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div><div><Label htmlFor="setup-end">Fim</Label><Input id="setup-end" required type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div></div>
      <Label htmlFor="setup-capacity">Vagas por aula</Label><Input id="setup-capacity" required type="number" min="1" max="1000" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
    </>}</section>
    <Button className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar e continuar"}</Button>
  </form>;
}