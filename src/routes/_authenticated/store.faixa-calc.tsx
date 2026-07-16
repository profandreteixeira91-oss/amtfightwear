import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";
import { brl } from "@/lib/format";
import { listSizePresets, type SizePreset } from "@/lib/store/sizes.functions";

export const Route = createFileRoute("/_authenticated/store/faixa-calc")({
  component: FaixaCalc,
});

// Comprimentos padrão de faixa (metros) — editáveis pelo usuário.
const DEFAULT_LENGTHS: Record<string, number> = {
  M0: 2.0, M1: 2.2, M2: 2.4, M3: 2.6, M4: 2.8, M5: 3.0,
  A0: 2.2, A1: 2.4, A2: 2.6, A3: 2.8, A4: 3.0, A5: 3.2,
  PP: 2.0, P: 2.2, M: 2.4, G: 2.6, GG: 2.8,
};

type MaterialInput = {
  pricePerMeter: number; // R$/m
  fabricWidth: number; // m (largura do rolo)
  usedWidth: number; // m (faixa cortada)
};

function costPerMeter(m: MaterialInput) {
  if (!m.fabricWidth) return 0;
  return m.pricePerMeter * (m.usedWidth / m.fabricWidth);
}

function FaixaCalc() {
  // Defaults from spec
  const [brim, setBrim] = useState<MaterialInput>({ pricePerMeter: 36.9, fabricWidth: 1.5, usedWidth: 0.14 });
  const [oxford, setOxford] = useState<MaterialInput>({ pricePerMeter: 5.7, fabricWidth: 1.5, usedWidth: 0.12 });
  const [alma, setAlma] = useState<MaterialInput>({ pricePerMeter: 16.9, fabricWidth: 1.5, usedWidth: 0.08 });
  const [almaLayers, setAlmaLayers] = useState<number>(3);

  // Freight per material (total) + total meters produced from this batch (rateio)
  const [freightBrim, setFreightBrim] = useState<number>(0);
  const [freightOxford, setFreightOxford] = useState<number>(0);
  const [freightAlma, setFreightAlma] = useState<number>(0);
  const [batchMeters, setBatchMeters] = useState<number>(100); // metros de faixa produzidos por rateio

  // Comprimentos por tamanho (m) — vindos da tabela de medidas (categoria "faixa")
  const listFn = useServerFn(listSizePresets);
  const { data: presets } = useQuery({
    queryKey: ["size-presets"],
    queryFn: () => listFn(),
  });
  const faixaPreset = useMemo<SizePreset | undefined>(
    () => (presets ?? []).find((p) => p.category_key.toLowerCase() === "faixa"),
    [presets],
  );
  const [lengths, setLengths] = useState<Record<string, number>>({});
  const currentSizes = faixaPreset?.sizes ?? [];
  const getLen = (s: string) => lengths[s] ?? DEFAULT_LENGTHS[s.toUpperCase()] ?? 2.5;

  const brimCostPerM = useMemo(() => costPerMeter(brim), [brim]);
  const oxfordCostPerM = useMemo(() => costPerMeter(oxford), [oxford]);
  const almaCostPerLayerPerM = useMemo(() => costPerMeter(alma), [alma]);
  const almaCostPerM = almaCostPerLayerPerM * (almaLayers || 0);

  const freightPerM = useMemo(() => {
    if (!batchMeters) return 0;
    return (freightBrim + freightOxford + freightAlma) / batchMeters;
  }, [freightBrim, freightOxford, freightAlma, batchMeters]);

  const materialsPerM = brimCostPerM + oxfordCostPerM + almaCostPerM;
  const totalPerM = materialsPerM + freightPerM;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Calculadora de custo — Faixas</h1>
          <p className="text-sm text-muted-foreground">
            Cálculo por metro de faixa produzida, com rateio de frete.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MaterialCard
          title="Brim (capa externa)"
          value={brim}
          onChange={setBrim}
          costPerMeter={brimCostPerM}
        />
        <MaterialCard
          title="Oxford (forro)"
          value={oxford}
          onChange={setOxford}
          costPerMeter={oxfordCostPerM}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alma (lona de algodão)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="R$ / metro" value={alma.pricePerMeter} onChange={(v) => setAlma({ ...alma, pricePerMeter: v })} step={0.01} />
            <Field label="Largura do rolo (m)" value={alma.fabricWidth} onChange={(v) => setAlma({ ...alma, fabricWidth: v })} step={0.01} />
            <Field label="Largura usada por camada (m)" value={alma.usedWidth} onChange={(v) => setAlma({ ...alma, usedWidth: v })} step={0.01} />
            <Field label="Nº de camadas" value={almaLayers} onChange={setAlmaLayers} step={1} />
            <Separator />
            <Row label="Custo por camada / m" value={brl(almaCostPerLayerPerM)} />
            <Row label={`Custo total (${almaLayers || 0} camadas) / m`} value={brl(almaCostPerM)} bold />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frete / busca de materiais (rateio)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Frete Brim (R$)" value={freightBrim} onChange={setFreightBrim} step={0.01} />
          <Field label="Frete Oxford (R$)" value={freightOxford} onChange={setFreightOxford} step={0.01} />
          <Field label="Frete Alma (R$)" value={freightAlma} onChange={setFreightAlma} step={0.01} />
          <Field
            label="Metros de faixa produzidos com esse lote"
            value={batchMeters}
            onChange={setBatchMeters}
            step={1}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Brim por metro" value={brl(brimCostPerM)} />
          <Row label="Oxford por metro" value={brl(oxfordCostPerM)} />
          <Row label={`Alma por metro (${almaLayers || 0} camadas)`} value={brl(almaCostPerM)} />
          <Row label="Frete rateado por metro" value={brl(freightPerM)} />
          <Separator />
          <Row label="Materiais por metro" value={brl(materialsPerM)} />
          <Row label="Custo total por metro" value={brl(totalPerM)} bold />
          <Separator />
          <div className="flex items-center gap-3 pt-2">
            <Label className="w-56">Comprimento da faixa (m)</Label>
            <Input
              type="number"
              step={0.1}
              value={beltLength}
              onChange={(e) => setBeltLength(Number(e.target.value) || 0)}
              className="max-w-[140px]"
            />
          </div>
          <Row label={`Custo por faixa (${beltLength || 0} m)`} value={brl(totalPerBelt)} bold highlight />
        </CardContent>
      </Card>
    </div>
  );
}

function MaterialCard({
  title,
  value,
  onChange,
  costPerMeter: cpm,
}: {
  title: string;
  value: MaterialInput;
  onChange: (v: MaterialInput) => void;
  costPerMeter: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="R$ / metro" value={value.pricePerMeter} onChange={(v) => onChange({ ...value, pricePerMeter: v })} step={0.01} />
        <Field label="Largura do rolo (m)" value={value.fabricWidth} onChange={(v) => onChange({ ...value, fabricWidth: v })} step={0.01} />
        <Field label="Largura usada (m)" value={value.usedWidth} onChange={(v) => onChange({ ...value, usedWidth: v })} step={0.01} />
        <Separator />
        <Row label="Custo por metro" value={brl(cpm)} bold />
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${
        highlight ? "rounded-md bg-primary/10 px-3 py-2 text-primary" : ""
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}
