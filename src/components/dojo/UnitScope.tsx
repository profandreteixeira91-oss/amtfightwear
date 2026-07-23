import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type UnitScopeCtx = {
  unitId: string | null;
  setUnitId: (id: string | null) => void;
};

const Ctx = createContext<UnitScopeCtx>({ unitId: null, setUnitId: () => {} });
const STORAGE_KEY = "amt-dojo-scope-unit";

export function UnitScopeProvider({ children }: { children: ReactNode }) {
  const [unitId, setUnitIdState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUnitIdState(raw);
    } catch { /* ignore */ }
  }, []);

  const setUnitId = (id: string | null) => {
    setUnitIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  };

  return <Ctx.Provider value={{ unitId, setUnitId }}>{children}</Ctx.Provider>;
}

export function useUnitScope() {
  return useContext(Ctx);
}
