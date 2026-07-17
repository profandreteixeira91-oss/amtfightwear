import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { brl } from "@/lib/format";
import { listSizePresets, type SizePreset } from "@/lib/store/sizes.functions";

export const Route = createFileRoute("/_authenticated/store/faixa-calc")({
  component: FaixaCalc,
});

// Extrai o comprimento (em metros) a partir do nome do tamanho.
// A nomenclatura já contém a metragem em cm — ex.: "M0-200", "A2 260cm", "P-220".
function parseLengthMeters(sizeName: string): number {
  const match = sizeName.match(/(\d{2,4})/);
  if (!match) return 0;
  const cm = Number(match[1]);
  if (!Number.isFinite(cm) || cm <= 0) return 0;
  return cm / 100;
}

type MaterialInput = {
  pricePerMeter: number;
  fabricWidth: number;
  usedWidth: number;
};

type ColoracaoKey = "brim" | "oxford";
type AlmaKey = "lona" | "eva";

function costPerMeter(m: MaterialInput) {
  if (!m.fabricWidth) return 0;
  return m.pricePerMeter * (m.usedWidth / m.fabricWidth);
}

function FaixaCalc() {
  // Coloração
  const [brim, setBrim] = useState<MaterialInput>({ pricePerMeter: 36.9, fabricWidth: 1.5, usedWidth: 0.14 });
  const [oxford, setOxford] = useState<MaterialInput>({ pricePerMeter: 5.7, fabricWidth: 1.5, usedWidth: 0.12 });

  // Alma - Lona de algodão
  const [lona, setLona] = useState<MaterialInput>({ pricePerMeter: 16.9, fabricWidth: 1.5, usedWidth: 0.08 });
  const [lonaLayers, setLonaLayers] = useState<number>(3);

  // Alma - EVA
  const [eva, setEva] = useState<MaterialInput>({ pricePerMeter: 25, fabricWidth: 1.2, usedWidth: 0.04 });

  // Frete fixo por metro enviado ao fabricante + Mão de obra por faixa
  const [freightPerMeter, setFreightPerMeter] = useState<number>(2);
  const [laborPerBelt, setLaborPerBelt] = useState<number>(8);

  // Margem de lucro (%)
  const [margin, setMargin] = useState<number>(100);

  // Seleção padrão (global) que se aplica a novos tamanhos
  const [defaultColor, setDefaultColor] = useState<ColoracaoKey>("brim");
  const [defaultAlma, setDefaultAlma] = useState<AlmaKey>("lona");

  // Seleção por tamanho (modelo)
  const [colorBySize, setColorBySize] = useState<Record<string, ColoracaoKey>>({});
  const [almaBySize, setAlmaBySize] = useState<Record<string, AlmaKey>>({});
  // Margem por tamanho (override do padrão)
  const [marginBySize, setMarginBySize] = useState<Record<string, number>>({});

  const listFn = useServerFn(listSizePresets);
  const { data: presets } = useQuery({
    queryKey: ["size-presets"],
    queryFn: () => listFn(),
  });
  const faixaPreset = useMemo<SizePreset | undefined>(
    () => (presets ?? []).find((p) => p.category_key.toLowerCase() === "faixa"),
    [presets],
  );
  const currentSizes = faixaPreset?.sizes ?? [];
  const getLen = (s: string) => parseLengthMeters(s);

  // Custos por metro
  const brimCostPerM = useMemo(() => costPerMeter(brim), [brim]);
  const oxfordCostPerM = useMemo(() => costPerMeter(oxford), [oxford]);
  const lonaCostPerLayerPerM = useMemo(() => costPerMeter(lona), [lona]);
  const lonaCostPerM = lonaCostPerLayerPerM * (lonaLayers || 0);
  const evaCostPerM = useMemo(() => costPerMeter(eva), [eva]);

  const freightPerM = useMemo(() => {
    if (!batchMeters) return 0;
    return (freightBrim + freightOxford + freightAlma) / batchMeters;
  }, [freightBrim, freightOxford, freightAlma, batchMeters]);

  const colorCostPerM = (k: ColoracaoKey) => (k === "brim" ? brimCostPerM : oxfordCostPerM);
  const almaCostPerM = (k: AlmaKey) => (k === "lona" ? lonaCostPerM : evaCostPerM);

  const getColor = (s: string) => colorBySize[s] ?? defaultColor;
  const getAlma = (s: string) => almaBySize[s] ?? defaultAlma;

  const marginMult = 1 + (margin || 0) / 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Calculadora de custo — Faixas</h1>
          <p className="text-sm text-muted-foreground">
            Selecione a coloração e o tipo de alma para cada modelo. Inclui margem e preço sugerido.
          </p>
        </div>
      </div>

      {/* Coloração */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Coloração
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MaterialCard title="Brim" value={brim} onChange={setBrim} costPerMeter={brimCostPerM} />
          <MaterialCard title="Oxford" value={oxford} onChange={setOxford} costPerMeter={oxfordCostPerM} />
        </div>
      </div>

      {/* Alma */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Alma
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lona de algodão (X camadas)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="R$ / metro" value={lona.pricePerMeter} onChange={(v) => setLona({ ...lona, pricePerMeter: v })} />
              <Field label="Largura do rolo (m)" value={lona.fabricWidth} onChange={(v) => setLona({ ...lona, fabricWidth: v })} />
              <Field label="Largura usada por camada (m)" value={lona.usedWidth} onChange={(v) => setLona({ ...lona, usedWidth: v })} />
              <Field label="Nº de camadas" value={lonaLayers} onChange={setLonaLayers} step={1} />
              <Separator />
              <Row label="Custo por camada / m" value={brl(lonaCostPerLayerPerM)} />
              <Row label={`Custo total (${lonaLayers || 0} camadas) / m`} value={brl(lonaCostPerM)} bold />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">EVA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="R$ / metro" value={eva.pricePerMeter} onChange={(v) => setEva({ ...eva, pricePerMeter: v })} />
              <Field label="Largura do rolo (m)" value={eva.fabricWidth} onChange={(v) => setEva({ ...eva, fabricWidth: v })} />
              <Field label="Largura usada (m)" value={eva.usedWidth} onChange={(v) => setEva({ ...eva, usedWidth: v })} />
              <Separator />
              <Row label="Custo por metro" value={brl(evaCostPerM)} bold />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Frete */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frete / busca de materiais (rateio)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Frete Brim (R$)" value={freightBrim} onChange={setFreightBrim} />
          <Field label="Frete Oxford (R$)" value={freightOxford} onChange={setFreightOxford} />
          <Field label="Frete Alma (R$)" value={freightAlma} onChange={setFreightAlma} />
          <Field label="Metros produzidos no lote" value={batchMeters} onChange={setBatchMeters} step={1} />
        </CardContent>
      </Card>

      {/* Padrões + margem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Padrão dos modelos e margem</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Coloração padrão</Label>
            <Select value={defaultColor} onValueChange={(v) => setDefaultColor(v as ColoracaoKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brim">Brim</SelectItem>
                <SelectItem value="oxford">Oxford</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alma padrão</Label>
            <Select value={defaultAlma} onValueChange={(v) => setDefaultAlma(v as AlmaKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lona">Lona de algodão</SelectItem>
                <SelectItem value="eva">EVA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Margem de lucro (%)" value={margin} onChange={setMargin} step={1} />
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado por tamanho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Brim por metro" value={brl(brimCostPerM)} />
          <Row label="Oxford por metro" value={brl(oxfordCostPerM)} />
          <Row label={`Lona por metro (${lonaLayers || 0} camadas)`} value={brl(lonaCostPerM)} />
          <Row label="EVA por metro" value={brl(evaCostPerM)} />
          <Row label="Frete rateado por metro" value={brl(freightPerM)} />
          <Separator />
          <div className="pt-2">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Custo e preço sugerido por tamanho — categoria "faixa"
            </div>
            {currentSizes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum tamanho cadastrado para a categoria "faixa". Cadastre em Tabela de tamanhos.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Tamanho</th>
                      <th className="px-3 py-2 text-left">Comprimento (m)</th>
                      <th className="px-3 py-2 text-left">Coloração</th>
                      <th className="px-3 py-2 text-left">Alma</th>
                      <th className="px-3 py-2 text-right">Custo unit.</th>
                      <th className="px-3 py-2 text-right">Margem (%)</th>
                      <th className="px-3 py-2 text-right">Preço sugerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSizes.map((s) => {
                      const len = getLen(s);
                      const cor = getColor(s);
                      const alm = getAlma(s);
                      const perM = colorCostPerM(cor) + almaCostPerM(alm) + freightPerM;
                      const cost = perM * len;
                      const rowMargin = marginBySize[s] ?? margin;
                      const price = cost * (1 + (rowMargin || 0) / 100);
                      return (
                        <tr key={s} className="border-t">
                          <td className="px-3 py-2 font-semibold">{s}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {len > 0 ? len.toFixed(2) : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={cor}
                              onValueChange={(v) =>
                                setColorBySize((prev) => ({ ...prev, [s]: v as ColoracaoKey }))
                              }
                            >
                              <SelectTrigger className="max-w-[140px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="brim">Brim</SelectItem>
                                <SelectItem value="oxford">Oxford</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={alm}
                              onValueChange={(v) =>
                                setAlmaBySize((prev) => ({ ...prev, [s]: v as AlmaKey }))
                              }
                            >
                              <SelectTrigger className="max-w-[160px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lona">Lona de algodão</SelectItem>
                                <SelectItem value="eva">EVA</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-right font-bold">{brl(cost)}</td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              step={1}
                              value={Number.isFinite(rowMargin) ? rowMargin : 0}
                              onChange={(e) =>
                                setMarginBySize((prev) => ({
                                  ...prev,
                                  [s]: Number(e.target.value) || 0,
                                }))
                              }
                              className="ml-auto max-w-[90px] text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              step={0.01}
                              value={Number.isFinite(price) ? Number(price.toFixed(2)) : 0}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value) || 0;
                                const newMargin = cost > 0 ? (newPrice / cost - 1) * 100 : 0;
                                setMarginBySize((prev) => ({
                                  ...prev,
                                  [s]: Number(newMargin.toFixed(2)),
                                }));
                              }}
                              className="ml-auto max-w-[120px] text-right font-bold text-primary"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
        <Field label="R$ / metro" value={value.pricePerMeter} onChange={(v) => onChange({ ...value, pricePerMeter: v })} />
        <Field label="Largura do rolo (m)" value={value.fabricWidth} onChange={(v) => onChange({ ...value, fabricWidth: v })} />
        <Field label="Largura usada (m)" value={value.usedWidth} onChange={(v) => onChange({ ...value, usedWidth: v })} />
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
