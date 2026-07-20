import { useBlocker } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";

type Props = {
  when: boolean;
  title?: string;
  description?: string;
  discardLabel?: string;
  stayLabel?: string;
  onDiscard?: () => void;
};

/**
 * Bloqueia navegação (rota + refresh/close da aba) enquanto houver
 * alterações não salvas. Mostra um diálogo com opções de:
 * - Permanecer na página
 * - Descartar alterações e sair
 */
export function UnsavedChangesGuard({
  when,
  title = "Alterações não salvas",
  description = "Você tem edições que ainda não foram salvas. Deseja descartar as alterações ou permanecer na página?",
  discardLabel = "Descartar alterações",
  stayLabel = "Permanecer",
  onDiscard,
}: Props) {
  const blocker = useBlocker({
    shouldBlockFn: () => when,
    enableBeforeUnload: () => when,
    withResolver: true,
  });

  const open = blocker.status === "blocked";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && blocker.status === "blocked") blocker.reset();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              {stayLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() => {
                onDiscard?.();
                blocker.proceed?.();
              }}
            >
              {discardLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
