import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Save, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  getPaymentSettings,
  updatePaymentSettings,
  previewFees,
} from "@/lib/dojo/payment-settings.functions";

const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PaymentSettingsPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPaymentSettings);
  const saveFn = useServerFn(updatePaymentSettings);
  const previewFn = useServerFn(previewFees);

  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "payment-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<Record<string, number>>({});
  useEffect(() => {
    if (data) {
      setForm({
        pix_fee_percent: Number(data.pix_fee_percent),
        pix_fee_fixed: Number(data.pix_fee_fixed),
        boleto_fee_percent: Number(data.boleto_fee_percent),
        boleto_fee_fixed: Number(data.boleto_fee_fixed),
        card_upfront_percent: Number(data.card_upfront_percent),
        card_upfront_fixed: Number(data.card_upfront_fixed),
        card_inst_percent: Number(data.card_inst_percent),
        card_inst_fixed: Number(data.card_inst_fixed),
        card_extra_per_inst: Number(data.card_extra_per_inst),
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: (payload: Record<string, number>) => saveFn({ data: payload }),
    onSuccess: () => {
      toast.success("Taxas atualizadas.");
      qc.invalidateQueries({ queryKey: ["amtpay", "payment-settings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  // Preview
  const [previewInput, setPreviewInput] = useState({
    amount: 200,
    method: "pix" as "pix" | "boleto" | "card",
    installments: 1,
  });
  const { data: preview } = useQuery({
    queryKey: ["amtpay", "preview-fees", previewInput, form],
    queryFn: () => previewFn({ data: previewInput }),
    enabled: Boolean(data),
  });

  const set = (k: string, v: string) =>
    setForm((s) => ({ ...s, [k]: v === "" ? 0 : Number(v) }));

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A <b>taxa AMT (2%)</b> é fixa e aplicada em todas as transações — não pode ser alterada.
          As taxas abaixo refletem o custo cobrado pelo <b>gateway (Asaas)</b> e alimentam
          automaticamente o cálculo do saldo líquido a cada pagamento confirmado.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PIX</CardTitle>
            <CardDescription>Custo por transação PIX.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeeRow label="% sobre o valor" value={form.pix_fee_percent} onChange={(v) => set("pix_fee_percent", v)} percent />
            <FeeRow label="Custo fixo (R$)" value={form.pix_fee_fixed} onChange={(v) => set("pix_fee_fixed", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Boleto</CardTitle>
            <CardDescription>Custo por boleto emitido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeeRow label="% sobre o valor" value={form.boleto_fee_percent} onChange={(v) => set("boleto_fee_percent", v)} percent />
            <FeeRow label="Custo fixo (R$)" value={form.boleto_fee_fixed} onChange={(v) => set("boleto_fee_fixed", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cartão de crédito</CardTitle>
            <CardDescription>À vista e parcelado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeeRow label="% à vista" value={form.card_upfront_percent} onChange={(v) => set("card_upfront_percent", v)} percent />
            <FeeRow label="Fixo à vista (R$)" value={form.card_upfront_fixed} onChange={(v) => set("card_upfront_fixed", v)} />
            <FeeRow label="% parcelado" value={form.card_inst_percent} onChange={(v) => set("card_inst_percent", v)} percent />
            <FeeRow label="Fixo parcelado (R$)" value={form.card_inst_fixed} onChange={(v) => set("card_inst_fixed", v)} />
            <FeeRow label="% adicional por parcela" value={form.card_extra_per_inst} onChange={(v) => set("card_extra_per_inst", v)} percent />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}>
          <Save className="h-4 w-4 mr-2" /> Salvar taxas
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Simulador de saldo líquido
          </CardTitle>
          <CardDescription>Ajuste os valores para ver o breakdown real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Valor da cobrança</Label>
              <Input
                type="number"
                step="0.01"
                value={previewInput.amount}
                onChange={(e) => setPreviewInput({ ...previewInput, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Método</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={previewInput.method}
                onChange={(e) => setPreviewInput({ ...previewInput, method: e.target.value as any })}
              >
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="card">Cartão de crédito</option>
              </select>
            </div>
            <div>
              <Label>Parcelas</Label>
              <Input
                type="number"
                min={1}
                max={24}
                disabled={previewInput.method !== "card"}
                value={previewInput.installments}
                onChange={(e) => setPreviewInput({ ...previewInput, installments: Number(e.target.value) })}
              />
            </div>
          </div>
          {preview && (
            <div className="grid gap-2 md:grid-cols-4 rounded-lg border bg-muted/30 p-4">
              <Stat label="Valor bruto" value={money(preview.gross)} />
              <Stat label="Taxa gateway" value={`- ${money(preview.gatewayFee)}`} tone="negative" />
              <Stat label="Taxa AMT (2%)" value={`- ${money(preview.platformFee)}`} tone="negative" />
              <Stat label="Saldo disponível" value={money(preview.net)} tone="positive" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeeRow({
  label,
  value,
  onChange,
  percent = false,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  percent?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={percent ? "0.0001" : "0.01"}
          value={percent ? value : value}
          onChange={(e) => onChange(e.target.value)}
        />
        {percent && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {(value * 100).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "";
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
