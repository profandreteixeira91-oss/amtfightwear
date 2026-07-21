import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyTeamPermissions } from "@/lib/dojo/team.functions";
import { canAccess, type AccessLevel, type PermissionMap } from "@/lib/dojo/permissions";

type Ctx = {
  isOwner: boolean;
  permissions: PermissionMap | null;
  loading: boolean;
  can: (moduleKey: string, need?: AccessLevel) => boolean;
};

const PermissionContext = createContext<Ctx | null>(null);

export function DojoPermissionsProvider({ children }: { children: ReactNode }) {
  const fn = useServerFn(getMyTeamPermissions);
  const q = useQuery({
    queryKey: ["dojo-my-permissions"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  const isOwner = q.data?.isOwner ?? false;
  const permissions = (q.data?.permissions ?? null) as PermissionMap | null;

  const can = (moduleKey: string, need: AccessLevel = "read") => {
    if (q.isLoading) return true; // não bloqueia UI enquanto carrega
    if (isOwner) return true;
    return canAccess(permissions, moduleKey, need);
  };

  return (
    <PermissionContext.Provider value={{ isOwner, permissions, loading: q.isLoading, can }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function useDojoPermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    // fallback fora do provider: libera tudo (evita crashes em rotas legadas)
    return { isOwner: true, permissions: null, loading: false, can: () => true } as Ctx;
  }
  return ctx;
}
