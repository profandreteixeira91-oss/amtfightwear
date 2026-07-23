import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { useUnitScope } from "./UnitScope";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function UnitSwitcher({ className = "" }: { className?: string }) {
  const { unitId, setUnitId } = useUnitScope();
  const listFn = useServerFn(listDojoUnits);
  const q = useQuery({ queryKey: ["dojo-units-switcher"], queryFn: () => listFn() });
  const units = (q.data ?? []).filter((u: any) => u.active !== false);

  // Não renderiza se só existe (ou nenhuma) unidade — evita ruído no MVP.
  if (units.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={unitId ?? ALL}
        onValueChange={(v) => setUnitId(v === ALL ? null : v)}
      >
        <SelectTrigger className="h-9 w-[220px]">
          <SelectValue placeholder="Todas as unidades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as unidades</SelectItem>
          {units.map((u: any) => (
            <SelectItem key={u.id} value={u.id}>
              {u.trade_name || u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
