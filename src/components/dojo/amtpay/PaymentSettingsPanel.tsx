import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Calculator, Lock } from "lucide-react";
import {
  getPaymentSettings,
  previewFees,
} from "@/lib/dojo/payment-settings.functions";

const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (n: number) => `${(Number(n) * 100).toFixed(2)}%`;

export function PaymentSettingsPanel() {
  const getFn = useServerFn(getPaymentSettings);
  const previewFn = useServerFn(previewFees);

  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "payment-settings"],
    queryFn: () => getFn(),
  });

  const [previewInput, setPreviewInput] = useState({
    amount: 200,
    method: "pix" as "pix" | "boleto" | "card",
    installments: 1,
  });
  const { data: preview } = useQuery({
    queryKey: ["amtpay", "preview-fees", previewInput],
    queryFn: () => previewFn({ data: previewInput }),
    enabled: Boolean(data),
  });

  if (isLoading || !data) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          As taxas do <b>gateway</b> e a <b>taxa AMT (2%)</b> são fixas e definidas pela plataforma —
          não podem ser alteradas. Todos os pagamentos entram na conta central da AMT Pay e o saldo
          líquido é creditado automaticamente na sua carteira. Você solicita saque quando quiser e o
          valor é enviado via PIX para a chave cadastrada.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PIX</CardTitle>
            <CardDescription>Custo por transação PIX.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadOnlyRow label="% sobre o valor" value={pct(data.pix_fee_percent)} />
            <ReadOnlyRow label="Custo fixo" value={money(Number(data.pix_fee_fixed))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Boleto</CardTitle>
            <CardDescription>Custo por boleto emitido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadOnlyRow label="% sobre o valor" value={pct(data.boleto_fee_percent)} />
            <ReadOnlyRow label="Custo fixo" value={money(Number(data.boleto_fee_fixed))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cartão de crédito</CardTitle>
            <CardDescription>À vista e parcelado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadOnlyRow label="% à vista" value={pct(data.card_upfront_percent)} />
            <ReadOnlyRow label="Fixo à vista" value={money(Number(data.card_upfront_fixed))} />
            <ReadOnlyRow label="% parcelado" value={pct(data.card_inst_percent)} />
            <ReadOnlyRow label="Fixo parcelado" value={money(Number(data.card_inst_fixed))} />
            <ReadOnlyRow label="% adicional por parcela" value={pct(data.card_extra_per_inst)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Simulador de saldo líquido
          </CardTitle>
          <CardDescription>Veja quanto entra na carteira após taxas.</CardDescription>
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O saldo líquido é creditado automaticamente na sua carteira assim que o pagamento é
              confirmado. Para receber, solicite um saque na aba <b>Saques</b> — a transferência PIX
              é feita automaticamente pela conta AMT para a sua chave cadastrada.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
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
