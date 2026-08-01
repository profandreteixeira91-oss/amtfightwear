import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  Copy,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  amBulkAction,
  amDelete,
  amDuplicate,
  amSetStatus,
} from "@/lib/ads/ads-manager.functions";

export type BulkKind = "campaign" | "adset" | "ad";

export function useEntityActions(kind: BulkKind) {
  const qc = useQueryClient();
  const setStatus = useServerFn(amSetStatus);
  const duplicate = useServerFn(amDuplicate);
  const remove = useServerFn(amDelete);
  const bulk = useServerFn(amBulkAction);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["ads-manager"] });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED" }) =>
      setStatus({ data: { ...v, level: kind } }),
    onSuccess: () => {
      toast.success("Status atualizado na Meta");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicate({ data: { id, kind } }),
    onSuccess: () => {
      toast.success("Cópia criada como pausada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id, kind } }),
    onSuccess: () => {
      toast.success("Excluído na Meta");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: (v: {
      ids: string[];
      action:
        | "activate"
        | "pause"
        | "archive"
        | "delete"
        | "duplicate"
        | "budget"
        | "budget_percent"
        | "schedule";
      dailyBudget?: number;
      percent?: number;
      startAt?: string;
      endAt?: string;
    }) => bulk({ data: { ...v, kind } as never }),
    onSuccess: (r) => {
      const res = r as { ok?: number; failed?: number } | undefined;
      toast.success(
        `Ação aplicada${res?.ok !== undefined ? ` em ${res.ok} item(ns)` : ""}`,
        res?.failed ? { description: `${res.failed} falha(s)` } : undefined,
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { statusMut, dupMut, delMut, bulkMut };
}

export function RowMenu({
  id,
  status,
  kind,
  onEdit,
  onReport,
}: {
  id: string;
  status?: string | null;
  kind: BulkKind;
  onEdit?: () => void;
  onReport?: () => void;
}) {
  const { statusMut, dupMut, delMut } = useEntityActions(kind);
  const [confirm, setConfirm] = useState(false);
  const isActive = (status ?? "").toUpperCase() === "ACTIVE";
  const busy = statusMut.isPending || dupMut.isPending || delMut.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
          )}
          {onReport && (
            <DropdownMenuItem onClick={onReport}>
              <MoreHorizontal className="mr-2 h-4 w-4" /> Abrir relatório
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => statusMut.mutate({ id, status: isActive ? "PAUSED" : "ACTIVE" })}
          >
            {isActive ? (
              <>
                <Pause className="mr-2 h-4 w-4" /> Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => dupMut.mutate(id)}>
            <Copy className="mr-2 h-4 w-4" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => statusMut.mutate({ id, status: "ARCHIVED" })}>
            <Archive className="mr-2 h-4 w-4" /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirm(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é permanente na Meta e remove o histórico de veiculação deste item do
              gerenciador. Métricas já consolidadas em relatórios anteriores permanecem, mas o item
              não poderá ser reativado. Considere arquivar em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => delMut.mutate(id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SelectAllBox({
  ids,
  selected,
  setSelected,
}: {
  ids: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  const all = ids.length > 0 && ids.every((i) => selected.includes(i));
  return (
    <Checkbox
      checked={all}
      onCheckedChange={(v) => setSelected(v ? ids : [])}
      aria-label="Selecionar todos"
    />
  );
}

export function useSelection() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const clear = () => setSelected([]);
  return useMemo(() => ({ selected, setSelected, toggle, clear }), [selected]);
}
