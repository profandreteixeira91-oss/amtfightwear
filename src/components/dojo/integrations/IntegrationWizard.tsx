import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationDef } from "@/lib/dojo/integrations-catalog";
import { toast } from "sonner";

export function IntegrationWizard({
  open,
  onOpenChange,
  integration,
  initialValues,
  onSubmit,
  onTest,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  integration: IntegrationDef;
  initialValues?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onTest?: (values: Record<string, string>) => Promise<{ ok: boolean; message: string; latencyMs?: number; status?: number }>;
}) {
  const steps = integration.wizard ?? [];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number; status?: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const hasFields = !!current?.fields?.length;

  const missingFields = (current?.fields ?? []).filter(
    (f) => !f.optional && !(values[f.key] ?? "").trim(),
  );
  const stepInvalid = missingFields.length > 0;

  const allMissing = steps
    .flatMap((s) => s.fields ?? [])
    .filter((f) => !f.optional && !(values[f.key] ?? "").trim());
  const canFinish = allMissing.length === 0;


  async function handleTest() {
    if (!onTest) return;
    setTesting(true);
    try {
      const r = await onTest(values);
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message ?? "Falha inesperada" });
    } finally {
      setTesting(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await onSubmit(values);
      toast.success(`${integration.name} configurado com sucesso`);
      onOpenChange(false);
      setStep(0);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm", integration.logoColor)}>
              {integration.logoInitials}
            </div>
            <div>
              <DialogTitle>Configurar {integration.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">{integration.vendor} · v{integration.version}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 my-2 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium border",
                i < step && "bg-emerald-500 text-white border-emerald-500",
                i === step && "bg-primary text-primary-foreground border-primary",
                i > step && "bg-muted text-muted-foreground",
              )}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("text-[11px]", i === step ? "font-medium" : "text-muted-foreground")}>{s.title}</span>
              {i < steps.length - 1 && <span className="h-px w-4 bg-border mx-1" />}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-2">
          <h3 className="font-semibold">Passo {step + 1}: {current.title}</h3>
          <p className="text-sm text-muted-foreground">{current.description}</p>

          {current.helperLinks?.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {l.label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}

          {hasFields && (
            <div className="space-y-3 border-t pt-3">
              {current.fields!.map((f) => {
                const val = values[f.key] ?? "";
                const invalid = !f.optional && !val.trim();
                return (
                  <div key={f.key}>
                    <Label className="text-sm">
                      {f.label}
                      {f.optional ? (
                        <span className="text-muted-foreground text-xs ml-1">(opcional)</span>
                      ) : (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      type={f.secret ? "password" : "text"}
                      placeholder={f.placeholder}
                      value={val}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className={cn(f.secret ? "font-mono" : "", invalid && "border-red-500/60 focus-visible:ring-red-500/40")}
                      autoComplete="off"
                      aria-invalid={invalid}
                    />
                    {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}
                    {invalid && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
                  </div>
                );
              })}
            </div>
          )}

          {stepInvalid && (
            <p className="text-xs text-red-500">
              Preencha todos os campos obrigatórios para continuar.
            </p>
          )}

          {step === steps.length - 2 && onTest && (
            <div className="border-t pt-3">
              <Button onClick={handleTest} disabled={testing || stepInvalid} variant="secondary" size="sm">

                {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Testar conexão agora
              </Button>
              {testResult && (
                <div className={cn(
                  "mt-3 rounded-md border p-3 text-sm",
                  testResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300"
                )}>
                  <div className="font-medium">{testResult.ok ? "Conexão validada" : "Falha no teste"}</div>
                  <div className="text-xs mt-1">
                    {testResult.message}
                    {testResult.status ? ` · HTTP ${testResult.status}` : ""}
                    {testResult.latencyMs ? ` · ${testResult.latencyMs}ms` : ""}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Voltar</Button>
          {!isLast ? (
            <Button onClick={() => setStep((s) => s + 1)}>Próximo</Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Concluir e salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
