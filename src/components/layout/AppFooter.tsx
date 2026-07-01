export function AppFooter() {
  return (
    <footer className="border-t bg-background/60 px-4 py-3 text-xs text-muted-foreground">
      <div className="flex flex-col items-center justify-between gap-1 sm:flex-row">
        <span>
          © {new Date().getFullYear()} <span className="font-semibold text-foreground">AMT Fight Wear</span> · Growth Engine
        </span>
        <span className="uppercase tracking-widest">v1.0.0</span>
      </div>
    </footer>
  );
}
