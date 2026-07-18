import { useEffect, type ReactNode } from "react";

type Branding = {
  trade_name?: string | null;
  logo_url?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
} | null | undefined;

export function StudentThemeProvider({ branding, children }: { branding: Branding; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const primary = branding?.brand_primary || "#dc2626";
    const secondary = branding?.brand_secondary || "#0a0a0a";
    root.style.setProperty("--sa-primary", primary);
    root.style.setProperty("--sa-secondary", secondary);
    if (branding?.trade_name) {
      const originalTitle = document.title;
      document.title = branding.trade_name;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [branding?.brand_primary, branding?.brand_secondary, branding?.trade_name]);
  return <div className="sa-scope">{children}</div>;
}
