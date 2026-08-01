import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { addDaysISO, todayISO } from "@/lib/dates";

export type AdsRange = { since: string; until: string };

type Ctx = {
  accountId: string | null;
  setAccountId: (v: string | null) => void;
  range: AdsRange;
  setRange: (v: AdsRange) => void;
  preset: string;
  setPreset: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  refreshKey: number;
  refresh: () => void;
};

const AdsManagerCtx = createContext<Ctx | null>(null);

export const RANGE_PRESETS: Array<{ id: string; label: string; days: number }> = [
  { id: "today", label: "Hoje", days: 0 },
  { id: "7d", label: "Últimos 7 dias", days: 6 },
  { id: "14d", label: "Últimos 14 dias", days: 13 },
  { id: "30d", label: "Últimos 30 dias", days: 29 },
  { id: "90d", label: "Últimos 90 dias", days: 89 },
];

export function rangeFromPreset(id: string): AdsRange {
  const preset = RANGE_PRESETS.find((p) => p.id === id) ?? RANGE_PRESETS[1]!;
  const until = todayISO();
  return { since: addDaysISO(until, -preset.days), until };
}

export function AdsManagerProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [preset, setPresetState] = useState("30d");
  const [range, setRange] = useState<AdsRange>(() => rangeFromPreset("30d"));
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const value = useMemo<Ctx>(
    () => ({
      accountId,
      setAccountId,
      range,
      setRange,
      preset,
      setPreset: (id: string) => {
        setPresetState(id);
        setRange(rangeFromPreset(id));
      },
      search,
      setSearch,
      refreshKey,
      refresh: () => setRefreshKey((k) => k + 1),
    }),
    [accountId, range, preset, search, refreshKey],
  );

  return <AdsManagerCtx.Provider value={value}>{children}</AdsManagerCtx.Provider>;
}

export function useAdsManager() {
  const ctx = useContext(AdsManagerCtx);
  if (!ctx) throw new Error("useAdsManager deve ser usado dentro de AdsManagerProvider");
  return ctx;
}
