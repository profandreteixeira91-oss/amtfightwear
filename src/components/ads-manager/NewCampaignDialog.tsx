import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { amCreateCampaign } from "@/lib/ads/ads-manager.functions";

const OBJECTIVES = [
  { id: "OUTCOME_SALES", label: "Vendas", hint: "Compras no site com pixel" },
  { id: "OUTCOME_LEADS", label: "Leads", hint: "Cadastros e mensagens" },
  { id: "OUTCOME_TRAFFIC", label: "Tráfego", hint: "Cliques no link" },
  { id: "OUTCOME_ENGAGEMENT", label: "Engajamento", hint: "Interações e mensagens" },
  { id: "OUTCOME_AWARENESS", label: "Reconhecimento", hint: "Alcance e lembrança" },
  { id: "OUTCOME_APP_PROMOTION", label: "Aplicativo", hint: "Instalações e eventos no app" },
] as const;

const SPECIAL = [
  { id: "CREDIT", label: "Crédito" },
  { id: "EMPLOYMENT", label: "Emprego" },
  { id: "HOUSING", label: "Habitação" },
  { id: "ISSUES_ELECTIONS_POLITICS", label: "Política" },
] as const;

type Props = { open: boolean; onOpenChange: (v: boolean) => void; accountId: string | null };

export function NewCampaignDialog({ open, onOpenChange, accountId }: Props) {
  const qc = useQueryClient();
  const create = useServerFn(amCreateCampaign);

  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState<string>("OUTCOME_SALES");
  const [name, setName] = useState("");
  const [cbo, setCbo] = useState(true);
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [budget, setBudget] = useState("50");
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [special, setSpecial] = useState<string[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const reset = () => {
    setStep(1);
    setName("");
    setSpecial([]);
    setStartAt("");
    setEndAt("");
  };

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          accountId: accountId ?? undefined,
          name: name.trim(),
          objective: objective as "OUTCOME_SALES",
          cbo,
          ...(cbo && budgetType === "daily" ? { dailyBudget: Number(budget) } : {}),
          ...(cbo && budgetType === "lifetime" ? { lifetimeBudget: Number(budget) } : {}),
          bidStrategy: bidStrategy as "LOWEST_COST_WITHOUT_CAP",
          specialCategories: special,
          ...(startAt ? { startAt } : {}),
          ...(endAt ? { endAt } : {}),
        },
      }),
    onSuccess: (r) => {
      toast.success("Campanha criada como PAUSADA", { description: `ID ${r.id}` });
      void qc.invalidateQueries({ queryKey: ["ads-manager"] });
      onOpenChange(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>
            Etapa {step} de 2 · a campanha é criada pausada para revisão antes de veicular.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {OBJECTIVES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setObjective(o.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  objective === o.id
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/60 hover:border-primary/30 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{o.label}</span>
                  {objective === o.id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{o.hint}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="camp-name">Nome da campanha</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Kimono Premium — Vendas BR"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Orçamento Advantage (CBO)</div>
                <p className="text-xs text-muted-foreground">
                  Distribui o orçamento automaticamente entre os conjuntos.
                </p>
              </div>
              <Switch checked={cbo} onCheckedChange={setCbo} />
            </div>

            {cbo && (
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div className="grid gap-1.5">
                  <Label>Tipo</Label>
                  <Select value={budgetType} onValueChange={(v) => setBudgetType(v as "daily")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="lifetime">Vitalício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="camp-budget">Valor (R$)</Label>
                  <Input
                    id="camp-budget"
                    type="number"
                    min={5}
                    step="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>Estratégia de lance</Label>
              <Select value={bidStrategy} onValueChange={setBidStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOWEST_COST_WITHOUT_CAP">Menor custo</SelectItem>
                  <SelectItem value="LOWEST_COST_WITH_BID_CAP">Limite de lance</SelectItem>
                  <SelectItem value="COST_CAP">Limite de custo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Categoria especial (quando aplicável)</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIAL.map((s) => {
                  const on = special.includes(s.id);
                  return (
                    <Badge
                      key={s.id}
                      variant={on ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setSpecial((prev) =>
                          prev.includes(s.id) ? prev.filter((p) => p !== s.id) : [...prev, s.id],
                        )
                      }
                    >
                      {s.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="camp-start">Início</Label>
                <Input
                  id="camp-start"
                  type="date"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="camp-end">Fim (opcional)</Label>
                <Input
                  id="camp-end"
                  type="date"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep(1))}
            disabled={mut.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => mut.mutate()} disabled={name.trim().length < 2 || mut.isPending}>
              {mut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Criar campanha
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
