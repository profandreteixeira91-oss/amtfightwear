import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSizePresets, type SizePreset } from "@/lib/store/sizes.functions";

export type SizeLine = { size: string; quantity: number; unit_price: number };

type Row = { quantity: string; price: number };

const BRL = (n: number): string => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Detecta o preset de tamanhos pelo nome do produto (faixa, kimono, ...). */
export function detectPresetKey(name: string): string | null {
  const n = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\bfaixas?\b/.test(n)) return "faixa";
  if (/\b(kimonos?|gis?)\b/.test(n)) return "kimono";
  if (/\brash ?guards?\b/.test(n)) return "rashguard";
  if (/\bcamisetas?\b/.test(n)) return "camiseta";
  return null;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  defaultPrice: number;
  initialPresetKey: string | null;
  onConfirm: (lines: SizeLine[]) => void;
};

export function QuoteSizeGridDialog({ open, onOpenChange, productName, defaultPrice, initialPresetKey, onConfirm }: Props) {
  const listFn = useServerFn(listSizePresets);
  const presets = useQuery({ queryKey: ["store", "size-presets"], queryFn: () => listFn(), staleTime: 60_000 });
  const [presetKey, setPresetKey] = useState<string>("");
  const [rows, setRows] = useState<Record<string, Row>>({});

  const list: SizePreset[] = presets.data ?? [];
  const preset = useMemo(() => list.find((p) => p.category_key === presetKey) ?? null, [list, presetKey]);

  useEffect(() => {
    if (!open) return;
    setPresetKey(initialPresetKey ?? list[0]?.category_key ?? "");
    setRows({});
  }, [open, initialPresetKey, list]);

  const rowOf = (size: string): Row => rows[size] ?? { quantity: "", price: defaultPrice };
  const setRow = (size: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [size]: { ...rowOf(size), ...patch } }));

  const lines: SizeLine[] = (preset?.sizes ?? [])
    .map((size) => ({ size, quantity: Number(rowOf(size).quantity) || 0, unit_price: rowOf(size).price }))
    .filter((l) => l.quantity > 0);
  const totalQty = lines.reduce((a, l) => a + l.quantity, 0);
  const total = lines.reduce((a, l) => a + l.quantity * l.unit_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grade de tamanhos</DialogTitle>
          <DialogDescription>{productName || "Item livre"} — informe a quantidade e o valor de cada tamanho.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Tabela de tamanhos</Label>
          <Select value={presetKey} onValueChange={(v) => { setPresetKey(v); setRows({}); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {list.map((p) => <SelectItem key={p.id} value={p.category_key}>{p.category_label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {presets.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando tamanhos…</p>
        ) : !preset || preset.sizes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum tamanho cadastrado nesta tabela.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[110px_1fr_1fr_90px] gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
              <span>Tam.</span><span>Qtd</span><span>Valor unit.</span><span className="text-right">Subtotal</span>
            </div>
            {preset.sizes.map((size) => {
              const r = rowOf(size);
              const qty = Number(r.quantity) || 0;
              return (
                <div key={size} className="grid grid-cols-[110px_1fr_1fr_90px] items-center gap-2">
                  <span className="text-sm font-semibold">{size}</span>
                  <Input className="h-8" type="number" min={0} inputMode="numeric" aria-label={`Quantidade ${size}`}
                    value={r.quantity} onChange={(e) => setRow(size, { quantity: e.target.value.replace(/[^\d]/g, "") })} />
                  <Input className="h-8" inputMode="decimal" aria-label={`Valor ${size}`}
                    value={r.price ? r.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                    onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setRow(size, { price: d ? Number(d) / 100 : 0 }); }} />
                  <span className="text-right text-sm tabular-nums">{BRL(qty * r.price)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <span>{totalQty} peça(s)</span>
          <span className="font-bold tabular-nums">Total: {BRL(total)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={lines.length === 0} onClick={() => { onConfirm(lines); onOpenChange(false); }}>
            Aplicar tamanhos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
