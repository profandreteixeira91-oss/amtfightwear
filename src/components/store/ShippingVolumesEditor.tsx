import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShipmentVolumesSchema, type ShipmentVolume } from "@/lib/store/shipping-preflight";

const measurements = [
  { key: "length", label: "Comprimento (cm)" }, { key: "width", label: "Largura (cm)" },
  { key: "height", label: "Altura (cm)" }, { key: "weight", label: "Peso total (kg)" },
] as const;

export function ShippingVolumesEditor({ volumes, dirty, disabled, onChange, onSave }: {
  volumes: ShipmentVolume[]; dirty: boolean; disabled: boolean;
  onChange: (volumes: ShipmentVolume[]) => void; onSave: () => void;
}): React.ReactNode {
  return <fieldset disabled={disabled} className="space-y-3 border-t pt-4">
    <legend className="font-semibold">Embalagem deste pedido</legend>
    {volumes.map((volume, index) => <div key={`volume-${index + 1}`} className="space-y-2">
      <div className="flex items-center justify-between"><span className="text-sm font-medium">Volume {index + 1}</span>
        <Button type="button" size="icon" variant="ghost" aria-label={`Remover volume ${index + 1}`} disabled={disabled || volumes.length === 1} onClick={() => onChange(volumes.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{measurements.map(({ key, label }) => <div key={key}>
        <Label htmlFor={`volume-${index + 1}-${key}`}>{label}</Label>
        <Input id={`volume-${index + 1}-${key}`} type="number" inputMode="decimal" min="0.001" step="any" value={volume[key] || ""} onChange={(event) => onChange(volumes.map((v, i) => i === index ? { ...v, [key]: Number(event.target.value) } : v))} />
      </div>)}</div>
    </div>)}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={disabled || volumes.length >= 50} onClick={() => onChange([...volumes, { length: 30, width: 20, height: 10, weight: 1 }])}><Plus className="mr-2 h-4 w-4" />Adicionar volume</Button>
      {dirty ? <Button type="button" variant="outline" disabled={disabled || !ShipmentVolumesSchema.safeParse(volumes).success} onClick={onSave}><Save className="mr-2 h-4 w-4" />Salvar embalagem</Button> : null}
    </div>
  </fieldset>;
}