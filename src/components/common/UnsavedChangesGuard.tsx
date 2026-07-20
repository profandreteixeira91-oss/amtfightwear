import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
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

/**
 * Guarda global de alterações não salvas.
 *
 * Uso:
 *   1) Envolva o layout com <UnsavedChangesProvider>.
 *   2) Em qualquer página de edição, chame `useUnsavedChanges(isDirty)`
 *      passando um boolean que reflita se há alterações pendentes.
 *
 * Quando o usuário tentar sair da rota (ou fechar/recarregar a aba)
 * com edições pendentes, mostramos um diálogo com "Permanecer" e
 * "Descartar alterações".
 */

type Ctx = {
  register: (id: string, dirty: boolean) => void;
  unregister: (id: string) => void;
};

const UnsavedCtx = createContext<Ctx | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

  const register = useCallback((id: string, dirty: boolean) => {
    setDirtyMap((prev) => {
      if (prev[id] === dirty) return prev;
      return { ...prev, [id]: dirty };
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setDirtyMap((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
  }, []);

  const isDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });

  const open = blocker.status === "blocked";

  const value = useMemo<Ctx>(() => ({ register, unregister }), [register, unregister]);

  return (
    <UnsavedCtx.Provider value={value}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o && blocker.status === "blocked") blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem edições que ainda não foram salvas nesta página. Deseja
              descartar as alterações ou permanecer na página?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={() => blocker.reset?.()}>
                Permanecer na página
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  setDirtyMap({});
                  blocker.proceed?.();
                }}
              >
                Descartar alterações
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedCtx.Provider>
  );
}

/**
 * Registra que a página atual possui alterações não salvas.
 * Passe `true` enquanto o formulário estiver "sujo"; volte para `false`
 * ao salvar/descartar com sucesso.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const ctx = useContext(UnsavedCtx);
  const id = useId();

  useEffect(() => {
    if (!ctx) return;
    ctx.register(id, isDirty);
    return () => ctx.unregister(id);
  }, [ctx, id, isDirty]);
}

/**
 * Componente drop-in — equivalente a chamar `useUnsavedChanges(when)`.
 * Útil para usar direto no JSX.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  useUnsavedChanges(when);
  return null;
}
