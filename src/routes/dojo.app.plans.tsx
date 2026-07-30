import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { listDojoPlans, saveDojoPlan, deleteDojoPlan, listDojoUnits } from "@/lib/dojo/dojo.functions";
import {
  getNativeBillingConfig,
  saveNativeBillingConfig,
  DEFAULT_NATIVE_BILLING,
  type NativeBillingConfig,
} from "@/lib/dojo/native-billing.functions";
import {
  PAYMENT_METHODS,
  
  defaultPlanPaymentMethods,
  defaultPlanRules,
  normalizePlanPaymentMethods,
  type PlanPaymentMethod,
  type PlanRules,
  type PlanFrequency,
  FREQUENCY_LABELS,
  FREQUENCY_MONTHS,
  CONFIG_LABELS,
  type PaymentMethodConfig,
} from "@/lib/dojo/payment-methods";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, Save, Info, CheckCircle2, XCircle, Sparkles, ChevronRight, Copy,
  QrCode, Link as LinkIcon,
} from "lucide-react";

export const Route = createFileRoute("/dojo/app/plans")({
  head: () => ({ meta: [{ title: "Planos — AMT Dojo Manager" }] }),
  component: PlansPage,
});

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PlanForm = {
  id?: string;
  name: string;
  description: string;
  amount: number | string;
  enrollment_fee: number | string;
  frequency: PlanFrequency;
  custom_months: number | string;
  installments: number | string;
  unit_id: string | null;
  active: boolean;
  sort_order: number;
  payment_methods: PlanPaymentMethod[];
  rules: PlanRules;
};

function emptyForm(): PlanForm {
  return {
    name: "",
    description: "",
    amount: "",
    enrollment_fee: "",
    frequency: "monthly",
    custom_months: 1,
    installments: 1,
    unit_id: null,
    active: true,
    sort_order: 0,
    payment_methods: defaultPlanPaymentMethods(),
    rules: defaultPlanRules(),
  };
}

function planToForm(p: any): PlanForm {
  return {
    id: p.id,
    name: p.name ?? "",
    description: p.description ?? "",
    amount: p.amount ?? 0,
    enrollment_fee: p.enrollment_fee ?? 0,
    frequency: (p.frequency ?? "monthly") as PlanFrequency,
    custom_months: p.custom_months ?? 1,
    installments: p.installments ?? 1,
    unit_id: p.unit_id ?? null,
    active: p.active ?? true,
    sort_order: p.sort_order ?? 0,
    payment_methods: normalizePlanPaymentMethods(p.payment_methods),
    rules: { ...defaultPlanRules(), ...(p.rules ?? {}) },
  };
}

function PlansPage() {
  const listFn = useServerFn(listDojoPlans);
  const saveFn = useServerFn(saveDojoPlan);
  const delFn = useServerFn(deleteDojoPlan);
  const unitsFn = useServerFn(listDojoUnits);
  const qc = useQueryClient();

  const plans = useQuery({ queryKey: ["dojo-plans"], queryFn: () => listFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });

  // ---- Cobrança nativa (PIX / Link fixo) ----
  const getNbFn = useServerFn(getNativeBillingConfig);
  const saveNbFn = useServerFn(saveNativeBillingConfig);
  const nativeCfg = useQuery({
    queryKey: ["dojo", "native-billing"],
    queryFn: () => getNbFn(),
  });
  const [nb, setNb] = useState<NativeBillingConfig>(DEFAULT_NATIVE_BILLING);
  const [nbDirty, setNbDirty] = useState(false);
  const [nbSaving, setNbSaving] = useState(false);
  useEffect(() => {
    if (nativeCfg.data) {
      setNb(nativeCfg.data as NativeBillingConfig);
      setNbDirty(false);
    }
  }, [nativeCfg.data]);
  const patchNb = (partial: Partial<NativeBillingConfig>) => {
    setNb((s) => ({ ...s, ...partial }));
    setNbDirty(true);
  };
  const saveNb = async () => {
    try {
      setNbSaving(true);
      await saveNbFn({ data: nb });
      toast.success("Cobrança nativa atualizada");
      await qc.invalidateQueries({ queryKey: ["dojo", "native-billing"] });
      setNbDirty(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setNbSaving(false);
    }
  };

  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sincroniza form com plano selecionado
  useEffect(() => {
    if (selectedId === "new") {
      setForm(emptyForm());
      setDirty(false);
      return;
    }
    if (!selectedId) return;
    const found = (plans.data ?? []).find((p: any) => p.id === selectedId);
    if (found) {
      setForm(planToForm(found));
      setDirty(false);
    }
  }, [selectedId, plans.data]);

  // Seleciona o primeiro automaticamente
  useEffect(() => {
    if (selectedId === null && plans.data && plans.data.length > 0) {
      setSelectedId((plans.data[0] as any).id);
    }
  }, [plans.data, selectedId]);

  const patch = (partial: Partial<PlanForm>) => {
    setForm((f) => ({ ...f, ...partial }));
    setDirty(true);
  };

  const patchMethod = (code: string, partial: Partial<PlanPaymentMethod>) => {
    setForm((f) => ({
      ...f,
      payment_methods: f.payment_methods.map((m) =>
        m.code === code ? { ...m, ...partial } : m,
      ),
    }));
    setDirty(true);
  };

  const patchMethodConfig = (code: string, key: keyof PaymentMethodConfig, value: any) => {
    setForm((f) => ({
      ...f,
      payment_methods: f.payment_methods.map((m) =>
        m.code === code ? { ...m, config: { ...(m.config ?? {}), [key]: value } } : m,
      ),
    }));
    setDirty(true);
  };

  const patchRule = (key: keyof PlanRules, value: any) => {
    setForm((f) => ({ ...f, rules: { ...f.rules, [key]: value } }));
    setDirty(true);
  };

  const enabledCount = form.payment_methods.filter((m) => m.enabled).length;

  const durationDays = useMemo(() => {
    if (form.frequency === "custom") {
      const m = Number(form.custom_months) || 1;
      return m * 30;
    }
    return (FREQUENCY_MONTHS[form.frequency as Exclude<PlanFrequency, "custom">] ?? 1) * 30;
  }, [form.frequency, form.custom_months]);

  const onSave = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do plano");
    if (!(Number(form.amount) >= 0) || form.amount === "") return toast.error("Informe um valor válido");
    if (enabledCount === 0) return toast.error("Selecione ao menos uma forma de pagamento para este plano.");

    try {
      setSaving(true);
      const payload = {
        id: form.id,
        name: form.name.trim(),
        description: form.description || null,
        amount: Number(form.amount),
        enrollment_fee: Number(form.enrollment_fee) || 0,
        frequency: form.frequency,
        custom_months: form.frequency === "custom" ? Number(form.custom_months) || 1 : null,
        installments: Number(form.installments) || 1,
        duration_days: durationDays,
        unit_id: form.unit_id,
        active: form.active,
        sort_order: form.sort_order,
        payment_methods: form.payment_methods,
        rules: form.rules,
      };
      const res = await saveFn({ data: payload as any });
      toast.success(form.id ? "Plano atualizado" : "Plano criado");
      await qc.invalidateQueries({ queryKey: ["dojo-plans"] });
      setSelectedId((res as any).id ?? form.id ?? null);
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!form.id) return;
    if (!confirm(`Excluir o plano "${form.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delFn({ data: { id: form.id } });
      toast.success("Plano excluído");
      await qc.invalidateQueries({ queryKey: ["dojo-plans"] });
      setSelectedId(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    }
  };

  const onDuplicate = () => {
    const { id, ...rest } = form;
    setForm({ ...rest, name: `${form.name} (cópia)` });
    setSelectedId("new");
    setDirty(true);
    toast.info("Cópia criada — ajuste e salve para persistir");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <DojoPageShell
        description="Fonte única de configuração comercial: valores, formas de pagamento e regras usadas por todo o sistema."
      >
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* ============ SIDEBAR ============ */}
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            <Card className="dojo-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider sm:text-sm">Planos</CardTitle>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                  {plans.data?.length ?? 0}
                </Badge>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-2">
                <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                  {(plans.data ?? []).map((p: any) => {
                    const active = selectedId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={
                          "group flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all " +
                          (active
                            ? "border-primary/40 bg-primary/5 shadow-sm"
                            : "border-transparent hover:border-border hover:bg-muted/50")
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{p.name}</span>
                            {!p.active && (
                              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                Inativo
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {brl(p.amount)} ·{" "}
                            {FREQUENCY_LABELS[(p.frequency ?? "monthly") as PlanFrequency]}
                          </div>
                        </div>
                        <ChevronRight
                          className={
                            "h-3.5 w-3.5 shrink-0 transition-opacity " +
                            (active ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-50")
                          }
                        />
                      </button>
                    );
                  })}
                  {(plans.data ?? []).length === 0 && (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Nenhum plano cadastrado.
                    </div>
                  )}
                </div>
                <Separator className="my-2" />
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setSelectedId("new")}
                >
                  <Plus className="h-4 w-4" /> Novo Plano
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* ============ ÁREA PRINCIPAL ============ */}
          <main className="min-w-0 space-y-4">
            {selectedId === null ? (
              <EmptyPicker />
            ) : (
              <>
                {/* Ações do topo */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold tracking-tight">
                      {form.id ? form.name || "Sem nome" : "Novo plano"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground sm:text-xs">
                      {enabledCount > 0
                        ? `${enabledCount} forma(s) de pagamento ativa(s)`
                        : "Nenhuma forma de pagamento ativa"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-2 rounded-md border border-[color:var(--dojo-border)] bg-white px-2 py-1 sm:px-3 sm:py-1.5">
                      <Label htmlFor="plan-active" className="text-[10px] font-semibold uppercase tracking-wider sm:text-xs">
                        Ativo
                      </Label>
                      <Switch
                        id="plan-active"
                        checked={form.active}
                        onCheckedChange={(v) => patch({ active: v })}
                        className="scale-75 sm:scale-100"
                      />
                    </div>
                    {form.id && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={onDuplicate} className="h-8 gap-1.5 rounded-full px-3 text-xs sm:h-9">
                          <Copy className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Duplicar</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={onDelete} className="h-8 gap-1.5 rounded-full px-3 text-xs sm:h-9">
                          <Trash2 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Excluir</span>
                        </Button>
                      </div>
                    )}
                    <Button size="sm" onClick={onSave} disabled={saving || !dirty} className="h-8 gap-1.5 rounded-full px-4 text-xs sm:h-9">
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "..." : "Salvar"}
                    </Button>
                  </div>
                </div>

                {/* Informações gerais */}
                <SectionCard title="Informações Gerais" icon={Info}>
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <Field label="Nome do plano" required>
                      <Input
                        value={form.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder="Ex.: Mensal, Trimestral, Kids..."
                        className="h-9 sm:h-10 text-sm"
                      />
                    </Field>
                    <Field label="Unidade">
                      <Select
                        value={form.unit_id ?? "none"}
                        onValueChange={(v) => patch({ unit_id: v === "none" ? null : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as unidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Todas as unidades</SelectItem>
                          {(units.data ?? []).map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Descrição" className="md:col-span-2">
                      <Textarea
                        value={form.description}
                        onChange={(e) => patch({ description: e.target.value })}
                        placeholder="Detalhes visíveis para o aluno e para a administração"
                        rows={2}
                      />
                    </Field>
                    <Field label="Valor mensal (R$)" required>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.amount}
                        onChange={(e) => patch({ amount: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </Field>
                    <Field label="Taxa de matrícula (R$)" hint="Opcional — cobrada uma única vez">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.enrollment_fee}
                        onChange={(e) => patch({ enrollment_fee: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </Field>
                    <Field label="Frequência">
                      <Select
                        value={form.frequency}
                        onValueChange={(v) => patch({ frequency: v as PlanFrequency })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(FREQUENCY_LABELS) as PlanFrequency[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {FREQUENCY_LABELS[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.frequency === "custom" ? (
                      <Field label="Meses (personalizado)" required>
                        <Input
                          type="number"
                          min="1"
                          value={form.custom_months}
                          onChange={(e) => patch({ custom_months: e.target.value })}
                        />
                      </Field>
                    ) : (
                      <Field label="Nº de parcelas" hint="Quantidade de cobranças geradas por ciclo">
                        <Input
                          type="number"
                          min="1"
                          value={form.installments}
                          onChange={(e) => patch({ installments: e.target.value })}
                        />
                      </Field>
                    )}
                  </div>
                </SectionCard>

                {/* Formas de pagamento */}
                <SectionCard
                  title="Formas de Pagamento Aceitas"
                  icon={Sparkles}
                  right={
                    enabledCount === 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Nenhuma habilitada
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> {enabledCount} ativas
                      </Badge>
                    )
                  }
                >
                  <p className="mb-3 text-xs text-muted-foreground">
                    Somente os métodos habilitados aqui aparecerão como opções ao registrar manualmente as
                    mensalidades deste plano.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((def) => {
                      const state = form.payment_methods.find((m) => m.code === def.code)!;
                      const Icon = def.icon;
                      return (
                        <div
                          key={def.code}
                          className={
                            "rounded-xl border p-2.5 transition-colors sm:p-3 " +
                            (state.enabled
                              ? "border-primary/30 bg-primary/[0.03]"
                              : "border-border bg-muted/20")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className={
                                  "grid h-8 w-8 shrink-0 place-items-center rounded-md " +
                                  (state.enabled
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground")
                                }
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold sm:text-sm">{def.label}</div>
                              </div>
                            </div>
                            <Switch
                              checked={state.enabled}
                              onCheckedChange={(v) => patchMethod(def.code, { enabled: v })}
                              className="scale-90 sm:scale-100"
                            />
                          </div>



                          {state.enabled && def.configFields.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-dashed pt-3">
                              <div className="grid grid-cols-2 gap-2">
                                {def.configFields.map((k) => (
                                  <div key={k}>
                                    <Label className="text-[11px] text-muted-foreground">
                                      {CONFIG_LABELS[k]}
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8"
                                      value={(state.config?.[k] as any) ?? ""}
                                      onChange={(e) =>
                                        patchMethodConfig(
                                          def.code,
                                          k,
                                          e.target.value === "" ? undefined : Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </SectionCard>

                {/* Cobrança Nativa — PIX exibido ao aluno + Link fixo */}
                {(form.payment_methods.find((m) => m.code === "pix")?.enabled ||
                  form.payment_methods.find((m) => m.code === "payment_link")?.enabled) && (
                  <SectionCard
                    title="Cobrança Nativa (independente do AMT Pay)"
                    icon={QrCode}
                    right={
                      <Button
                        size="sm"
                        onClick={saveNb}
                        disabled={nbSaving || !nbDirty}
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {nbSaving ? "Salvando..." : "Salvar cobrança"}
                      </Button>
                    }
                  >
                    <p className="mb-3 text-xs text-muted-foreground">
                      Estas configurações valem para <b>todos os alunos</b> do dojo. Ao gerar uma cobrança,
                      o aluno visualiza a chave PIX (com QR Code) e/ou o link fixo abaixo. O pagamento é feito
                      por fora e você marca como recebido manualmente no módulo Financeiro.
                    </p>

                    {form.payment_methods.find((m) => m.code === "pix")?.enabled && (
                      <div className="mb-4 rounded-lg border border-emerald-200/50 bg-emerald-50/40 p-3 dark:bg-emerald-950/10">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-semibold">Chave PIX exibida ao aluno</span>
                          </div>
                          <Switch
                            checked={nb.pix_enabled}
                            onCheckedChange={(v) => patchNb({ pix_enabled: v })}
                            className="scale-90 sm:scale-100"
                          />
                        </div>
                        {nb.pix_enabled && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Tipo da chave">
                              <Select
                                value={nb.pix_key_type}
                                onValueChange={(v) => patchNb({ pix_key_type: v as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cpf">CPF</SelectItem>
                                  <SelectItem value="cnpj">CNPJ</SelectItem>
                                  <SelectItem value="email">E-mail</SelectItem>
                                  <SelectItem value="phone">Telefone</SelectItem>
                                  <SelectItem value="random">Aleatória</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Chave PIX" required>
                              <Input
                                value={nb.pix_key}
                                onChange={(e) => patchNb({ pix_key: e.target.value })}
                                placeholder="Ex.: 123.456.789-00 ou email@dojo.com"
                              />
                            </Field>
                            <Field label="Nome do titular" className="md:col-span-2" required>
                              <Input
                                value={nb.pix_holder_name}
                                onChange={(e) => patchNb({ pix_holder_name: e.target.value })}
                                placeholder="Nome que aparece no comprovante"
                              />
                            </Field>
                            <div className="md:col-span-2">
                              <PixKeyCheck
                                pixKey={nb.pix_key}
                                keyType={nb.pix_key_type}
                                holder={nb.pix_holder_name}
                              />
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {form.payment_methods.find((m) => m.code === "payment_link")?.enabled && (
                      <div className="mb-4 rounded-lg border border-blue-200/50 bg-blue-50/40 p-3 dark:bg-blue-950/10">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-semibold">Link fixo de pagamento</span>
                          </div>
                          <Switch
                            checked={nb.payment_link_enabled}
                            onCheckedChange={(v) => patchNb({ payment_link_enabled: v })}
                          />
                        </div>
                        {nb.payment_link_enabled && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="URL do link" className="md:col-span-2" required>
                              <Input
                                type="url"
                                value={nb.payment_link_url}
                                onChange={(e) => patchNb({ payment_link_url: e.target.value })}
                                placeholder="https://pag.ae/... ou https://link.mercadopago.com/..."
                              />
                            </Field>
                            <Field
                              label="Rótulo do botão"
                              className="md:col-span-2"
                              hint="Texto exibido ao aluno. Ex.: Pagar via PagSeguro"
                            >
                              <Input
                                value={nb.payment_link_label}
                                onChange={(e) => patchNb({ payment_link_label: e.target.value })}
                                placeholder="Pagar agora"
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                    )}

                    <Field label="Instruções extras exibidas ao aluno (opcional)">
                      <Textarea
                        value={nb.instructions}
                        onChange={(e) => patchNb({ instructions: e.target.value })}
                        placeholder="Ex.: Após o pagamento, envie o comprovante pelo WhatsApp (11) 99999-9999."
                        rows={2}
                      />
                    </Field>
                  </SectionCard>
                )}

                {/* Regras */}
                <SectionCard title="Regras do Plano" icon={Info}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <RuleCheck
                      label="Permitir pagamento antecipado"
                      checked={form.rules.allow_prepay}
                      onChange={(v) => patchRule("allow_prepay", v)}
                    />
                    <RuleCheck
                      label="Renovação automática"
                      checked={form.rules.auto_renew}
                      onChange={(v) => patchRule("auto_renew", v)}
                    />
                    <RuleCheck
                      label="Gerar cobrança automaticamente"
                      checked={form.rules.auto_generate_invoice}
                      onChange={(v) => patchRule("auto_generate_invoice", v)}
                    />
                    <RuleCheck
                      label="Permitir inadimplência"
                      checked={form.rules.allow_default}
                      onChange={(v) => patchRule("allow_default", v)}
                    />
                    <RuleCheck
                      label="Suspender check-in automaticamente"
                      checked={form.rules.suspend_checkin}
                      onChange={(v) => patchRule("suspend_checkin", v)}
                    />
                    <RuleCheck
                      label="Suspender acesso ao App do aluno"
                      checked={form.rules.suspend_app}
                      onChange={(v) => patchRule("suspend_app", v)}
                    />
                    <RuleCheck
                      label="Necessita matrícula"
                      checked={form.rules.requires_enrollment_fee}
                      onChange={(v) => patchRule("requires_enrollment_fee", v)}
                    />
                    <div className="flex items-center gap-3 rounded-md border p-3">
                      <div className="min-w-0 flex-1">
                        <Label className="text-sm">Bloquear acesso após</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Dias corridos após o vencimento
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="h-8 w-20"
                        placeholder="—"
                        value={form.rules.block_after_days ?? ""}
                        onChange={(e) =>
                          patchRule(
                            "block_after_days",
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Rodapé — salvar novamente */}
                <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--dojo-border)] bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    {dirty
                      ? "Você possui alterações não salvas neste plano."
                      : "Todas as alterações foram salvas com sucesso."}
                  </p>
                  <Button onClick={onSave} disabled={saving || !dirty} className="h-9 gap-2 rounded-full px-5 text-xs sm:h-10 sm:text-sm">
                    <Save className="h-4 w-4" />
                    {saving ? "..." : "Salvar plano"}
                  </Button>
                </div>
              </>
            )}
          </main>
        </div>
      </DojoPageShell>
    </TooltipProvider>
  );
}

// ============ COMPONENTES AUXILIARES ============
function SectionCard({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  icon: any;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="dojo-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 sm:pb-3">
        <CardTitle className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider sm:gap-2 sm:text-sm">
          <Icon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
          {title}
        </CardTitle>
        {right}
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + className}>
      <div className="flex items-center gap-1.5">
        <Label className="text-xs">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 cursor-help text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="max-w-xs text-xs">{hint}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

function RuleCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--dojo-border)] p-2.5 transition-colors hover:bg-muted/40 sm:gap-3 sm:p-3">
      <Checkbox checked={!!checked} onCheckedChange={(v) => onChange(v === true)} className="h-4 w-4" />
      <span className="text-xs font-medium sm:text-sm">{label}</span>
    </label>
  );
}

function EmptyPicker() {
  return (
    <Card className="dojo-card">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Selecione um plano</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Escolha um plano na lista à esquerda para editar suas configurações comerciais, ou crie um
          novo plano.
        </p>
      </CardContent>
    </Card>
  );
}
