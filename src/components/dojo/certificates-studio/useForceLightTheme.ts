import { useEffect } from "react";

const THEME_STORAGE_KEY = "amt-theme";

/**
 * O editor de certificados é sempre claro, independente do tema do sistema/navegador.
 * Remove `.dark` do <html> enquanto montado (inclusive se o ThemeProvider reaplicar depois)
 * e devolve o tema escolhido pelo usuário ao sair.
 */
export function useForceLightTheme(): void {
  useEffect(() => {
    const root = document.documentElement;
    const enforce = () => {
      if (root.classList.contains("dark")) root.classList.remove("dark");
      if (root.style.colorScheme !== "light") root.style.colorScheme = "light";
    };
    enforce();
    const mo = new MutationObserver(enforce);
    mo.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      mo.disconnect();
      const isDark = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };
  }, []);
}
