import { useEffect, type ReactNode } from "react";
import type { Appearance } from "@/lib/student-app/schema";

type Branding = {
  trade_name?: string | null;
  logo_url?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
} | null | undefined;

export function StudentThemeProvider({
  branding,
  appearance,
  children,
}: {
  branding?: Branding;
  appearance?: Appearance;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const primary = appearance?.brand_primary || branding?.brand_primary || "#dc2626";
    const secondary = appearance?.brand_secondary || branding?.brand_secondary || "#0a0a0a";
    root.style.setProperty("--sa-primary", primary);
    root.style.setProperty("--sa-secondary", secondary);
    root.style.setProperty("--sa-button", appearance?.button_color || primary);
    root.style.setProperty("--sa-bottom-nav", appearance?.bottom_nav_color || "#ffffff");
    root.style.setProperty("--sa-card", appearance?.card_color || "#ffffff");
    root.style.setProperty("--sa-title", appearance?.title_color || "#0a0a0a");
    if (appearance?.font_family) {
      root.style.setProperty("--sa-font", appearance.font_family);
    }

    const name = appearance?.app_name || branding?.trade_name;
    if (name) {
      const originalTitle = document.title;
      document.title = name;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [
    appearance?.brand_primary,
    appearance?.brand_secondary,
    appearance?.button_color,
    appearance?.bottom_nav_color,
    appearance?.card_color,
    appearance?.title_color,
    appearance?.font_family,
    appearance?.app_name,
    branding?.brand_primary,
    branding?.brand_secondary,
    branding?.trade_name,
  ]);
  return <div className="sa-scope" style={{ fontFamily: appearance?.font_family ? `${appearance.font_family}, system-ui, sans-serif` : undefined }}>{children}</div>;
}
