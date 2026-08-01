import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import {
  amRename,
  amUpdateBidStrategy,
  amUpdateBudget,
  amUpdateSchedule,
} from "@/lib/ads/ads-manager.functions";

export type EditTarget = {
  id: string;
  name: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  bidStrategy: string | null;
  startAt: string | null;
  stopAt: string | null;
};

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function EditDrawer({
  target,
  onOpenChange,
}: {
  target: EditTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const rename = useServerFn(amRename);
  const updBudget = useServerFn(amUpdateBudget);
  const updBid = useServerFn(amUpdateBidStrategy);
  const updSchedule = useServerFn(amUpdateSchedule);

  const [name, setName] = useState("");
  const [daily, setDaily] = useState("");
  const [lifetime, setLifetime] = useState("");
  const [bid, setBid] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (!target) return;
    setName(target.name);
    setDaily(target.dailyBudget != null ? String(target.dailyBudget) : "");
    setLifetime(target.lifetimeBudget != null ? String(target.lifetimeBudget) : "");
    setBid(target.bidStrategy ?? "");
    setStart(toDateInput(target.startAt));
    setEnd(toDateInput(target.stopAt));
  }, [target]);

  const save = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const jobs: Array<Promise<unknown>> = [];
      if (name.trim() && name.trim() !== target.name)
        jobs.push(rename({ data: { id: target.id, name: name.trim() } }));

      const nextDaily = daily ? Number(daily) : undefined;
      const nextLifetime = lifetime ? Number(lifetime) : undefined;
      if (
        (nextDaily !== undefined && nextDaily !== target.dailyBudget) ||
        (nextLifetime !== undefined && nextLifetime !== target.lifetimeBudget)
      ) {
        jobs.push(
          updBudget({
            data: {
              id: target.id,
              ...(nextDaily !== undefined && nextDaily !== target.dailyBudget
                ? { dailyBudget: nextDaily }
                : {}),
              ...(nextLifetime !== undefined && nextLifetime !== target.lifetimeBudget
                ? { lifetimeBudget: nextLifetime }
                : {}),
            },
          }),
        );
      }

      if (bid && bid !== target.bidStrategy)
        jobs.push(updBid({ data: { id: target.id, bidStrategy: bid } }));

      if (
        (start && start !== toDateInput(target.startAt)) ||
        (end && end !== toDateInput(target.stopAt))
      ) {
        jobs.push(
          updSchedule({
            data: {
              id: target.id,
              ...(start && start !== toDateInput(target.startAt) ? { startAt: start } : {}),
              ...(end && end !== toDateInput(target.stopAt) ? { endAt: end } : {}),
            },
          }),
        );
      }

      if (jobs.length === 0) throw new Error("Nenhuma alteração para salvar");
      await Promise.all(jobs);
    },
    onSuccess: () => {
      toast.success("Alterações aplicadas na Meta");
      void qc.invalidateQueries({ queryKey: ["ads-manager"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar</SheetTitle>
          <SheetDescription className="break-all font-mono text-[11px]">{target?.id}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ed-name">Nome</Label>
            <Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ed-daily">Orçamento diário (R$)</Label>
              <Input
                id="ed-daily"
                type="number"
                min={5}
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ed-lifetime">Orçamento vitalício (R$)</Label>
              <Input
                id="ed-lifetime"
                type="number"
                min={20}
                value={lifetime}
                onChange={(e) => setLifetime(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Estratégia de lance</Label>
            <Select value={bid} onValueChange={setBid}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOWEST_COST_WITHOUT_CAP">Menor custo</SelectItem>
                <SelectItem value="LOWEST_COST_WITH_BID_CAP">Limite de lance</SelectItem>
                <SelectItem value="COST_CAP">Limite de custo</SelectItem>
                <SelectItem value="LOWEST_COST_WITH_MIN_ROAS">ROAS mínimo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ed-start">Início</Label>
              <Input id="ed-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ed-end">Fim</Label>
              <Input id="ed-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
