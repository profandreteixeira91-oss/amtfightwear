import { createContext, useContext, type ReactNode } from "react";

import type { StaffSession } from "@/lib/dojo/staff-portal.functions";
import { canAccess, type AccessLevel } from "@/lib/dojo/permissions";

const StaffCtx = createContext<StaffSession | null>(null);

export function StaffProvider({ value, children }: { value: StaffSession; children: ReactNode }) {
  return <StaffCtx.Provider value={value}>{children}</StaffCtx.Provider>;
}

/** Sessão da equipe. Só pode ser usada dentro do Portal do Professor. */
export function useStaff(): StaffSession {
  const ctx = useContext(StaffCtx);
  if (!ctx) throw new Error("useStaff deve ser usado dentro do Portal da Equipe");
  return ctx;
}

/** Nível de acesso do professor em um módulo (`none` | `read` | `write`). */
export function useStaffLevel(moduleKey: string): AccessLevel {
  const staff = useStaff();
  return staff.permissions[moduleKey] ?? "none";
}

export function useStaffCan(moduleKey: string, need: AccessLevel = "read"): boolean {
  const staff = useStaff();
  return canAccess(staff.permissions, moduleKey, need);
}
