import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ArrowRight, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { useDojoPermissions } from "@/components/dojo/DojoPermissionsProvider";
import { getSetupState, saveSetupProgress } from "@/lib/dojo/setup.functions";
import { StepIdentity } from "./steps/StepIdentity";
import { StepStructure } from "./steps/StepStructure";
import { StepStudents } from "./steps/StepStudents";
import { StepReady } from "./steps/StepReady";

const titles = ["Identidade do dojo", "Plano e primeira turma", "Seus primeiros alunos", "Tudo pronto para começar"];

export function SetupWizardModal() {
  const { isOwner, loading } = useDojoPermissions();
  const getState = useServerFn(getSetupState); const saveProgress = useServerFn(saveSetupProgress);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["dojo-setup"], queryFn: () => getState(), enabled: isOwner && !loading });
  const [open, setOpen] = useState(false); const [step, setStep] = useState(0); const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (!query.data || initialized.current) return;
    initialized.current = true;
    setStep(Math.min(query.data.progress?.step ?? 0, 3));
    if (!query.data.progress && query.data.students === 0) setOpen(true);
  }, [query.data]);
  async function refresh(): Promise<void> {
    await Promise.all([qc.invalidateQueries({ queryKey: ["dojo-setup"] }), qc.invalidateQueries({ queryKey: ["dojo-students"] }), qc.invalidateQueries({ queryKey: ["dojo-hero-me"] }), qc.invalidateQueries({ queryKey: ["dojo", "academy-branding"] }), qc.invalidateQueries({ queryKey: ["dojo-classes-list"] })]);
  }
  async function persist(next: number, completed = false): Promise<void> {
    await saveProgress({ data: { step: next, status: completed ? "completed" : "paused" } });
    setStep(Math.min(next, 3)); await refresh();
  }
  async function pause(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try { await persist(step); setOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o progresso."); } finally { setBusy(false); }
  }
  async function advance(): Promise<void> { await persist(step + 1); }
  const state = query.data;
  if (!isOwner || loading || !state) return null;
  const visible = state.progress?.status !== "completed" && (state.progress !== null || state.students === 0);
  return <>
    {visible && <section className="setup-light flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-background p-4 text-foreground" aria-label="Primeiros passos">
      <div className="flex items-center gap-3"><Flag className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Implantação do seu dojo</h2><p className="text-sm text-muted-foreground">Etapa {Math.min(state.progress?.step ?? 0, 3) + 1} de 4 · {state.students} alunos cadastrados</p></div></div>
      <Button onClick={() => setOpen(true)}>Continuar <ArrowRight /></Button>
    </section>}
    <Dialog open={open} onOpenChange={(value) => { if (!value) void pause(); }}>
      <DialogContent hideClose className="setup-light max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg bg-background text-foreground" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
        <Button size="icon" variant="ghost" className="absolute right-3 top-3" aria-label="Fechar assistente" disabled={busy} onClick={() => void pause()}><X /></Button>
        <DojoLogo className="h-8 w-auto max-w-48" />
        <DialogHeader><p className="text-xs font-medium text-muted-foreground">PRIMEIROS PASSOS · ETAPA {step + 1} DE 4</p><DialogTitle className="text-xl">{titles[step]}</DialogTitle><DialogDescription>Implantação da academia</DialogDescription></DialogHeader>
        <div role="progressbar" aria-label="Progresso da implantação" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step + 1} className="grid h-1.5 grid-cols-4 gap-1">{titles.map((title, index) => <span key={title} className={index <= step ? "rounded-full bg-primary" : "rounded-full bg-muted"} />)}</div>
        {step === 0 && <StepIdentity academy={state.academy} onNext={advance} onBusy={setBusy} />}
        {step === 1 && <StepStructure state={state} onNext={advance} refresh={refresh} onBusy={setBusy} />}
        {step === 2 && <StepStudents state={state} refresh={refresh} onBusy={setBusy} />}
        {step === 3 && <StepReady state={state} />}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" disabled={busy} onClick={() => void pause()}>Fazer mais tarde</Button>
          <div className="flex flex-wrap gap-2">{step > 0 && <Button variant="outline" disabled={busy} onClick={() => setStep(step - 1)}><ChevronLeft />Voltar</Button>}
            <Button variant={step >= 2 ? "default" : "outline"} disabled={busy} onClick={async () => { setBusy(true); try { await persist(step === 3 ? 4 : step + 1, step === 3); if (step === 3) setOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setBusy(false); } }}>{step === 3 ? "Ir para o painel" : step === 2 ? "Continuar" : "Pular etapa"}</Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  </>;
}