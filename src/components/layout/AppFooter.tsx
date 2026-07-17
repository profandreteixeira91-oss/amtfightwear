export function AppFooter() {
  return (
    <footer className="border-t bg-background/60 px-4 py-3 text-xs text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="flex flex-col items-center justify-between gap-1 sm:flex-row">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-foreground">AMT Fight Wear</span> · Growth Engine
        </span>
        <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest">
          v1.0.0
        </span>
      </div>
    </footer>
  );
}
