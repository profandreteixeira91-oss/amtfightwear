import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, CalendarRange, Copy, Pause, Percent, Play, Trash2, Wallet, X } from "lucide-react";
import { useEntityActions, type BulkKind } from "./EntityActions";

export function BulkBar({
  kind,
  selected,
  clear,
}: {
  kind: BulkKind;
  selected: string[];
  clear: () => void;
}) {
  const { bulkMut } = useEntityActions(kind);
  const [budget, setBudget] = useState("50");
  const [pct, setPct] = useState("20");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selected.length === 0) return null;

  const run = (action: Parameters<typeof bulkMut.mutate>[0]["action"], extra = {}) =>
    bulkMut.mutate({ ids: selected, action, ...extra }, { onSuccess: clear });

  return (
    <div className="sticky bottom-3 z-20 mx-auto flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/95 p-2 shadow-lg backdrop-blur">
      <Badge className="shrink-0">{selected.length} selecionado(s)</Badge>

      <Button size="sm" variant="outline" onClick={() => run("activate")} disabled={bulkMut.isPending}>
        <Play className="mr-1.5 h-3.5 w-3.5" /> Ativar
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("pause")} disabled={bulkMut.isPending}>
        <Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("duplicate")} disabled={bulkMut.isPending}>
        <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicar
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("archive")} disabled={bulkMut.isPending}>
        <Archive className="mr-1.5 h-3.5 w-3.5" /> Arquivar
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <Wallet className="mr-1.5 h-3.5 w-3.5" /> Orçamento
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bulk-budget">Novo orçamento diário (R$)</Label>
            <Input
              id="bulk-budget"
              type="number"
              min={5}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => run("budget", { dailyBudget: Number(budget) })}
          >
            Aplicar em {selected.length}
          </Button>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <Percent className="mr-1.5 h-3.5 w-3.5" /> Ajuste %
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bulk-pct">Variação (%)</Label>
            <Input
              id="bulk-pct"
              type="number"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              placeholder="20 aumenta, -20 reduz"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => run("budget_percent", { percent: Number(pct) })}
          >
            Aplicar
          </Button>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <CalendarRange className="mr-1.5 h-3.5 w-3.5" /> Datas
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bulk-start">Início</Label>
            <Input id="bulk-start" type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bulk-end">Fim</Label>
            <Input id="bulk-end" type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() =>
              run("schedule", {
                ...(startAt ? { startAt } : {}),
                ...(endAt ? { endAt } : {}),
              })
            }
          >
            Aplicar
          </Button>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
      </Button>

      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clear} aria-label="Limpar seleção">
        <X className="h-4 w-4" />
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.length} item(ns)?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é permanente na Meta. Os itens deixam de veicular imediatamente e não podem
              ser reativados. Prefira arquivar quando quiser preservar o histórico ativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => run("delete")}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
