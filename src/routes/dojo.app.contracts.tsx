import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Scale, LayoutGrid, FileText, FolderTree } from "lucide-react";

export const Route = createFileRoute("/dojo/app/contracts")({
  head: () => ({
    meta: [
      { title: "Central de Contratos — AMT Dojo Manager" },
      { name: "description", content: "Módulo jurídico completo: modelos versionados, contratos emitidos, timeline e dashboard." },
      { property: "og:title", content: "Central de Contratos — AMT Dojo Manager" },
      { property: "og:description", content: "Gestão jurídica centralizada de contratos e modelos do dojo." },
    ],
  }),
  component: ContractsShell,
});

function ContractsShell() {
  const loc = useLocation();
  const tab = (() => {
    if (loc.pathname.includes("/contracts/templates")) return "templates";
    if (loc.pathname.includes("/contracts/issued")) return "issued";
    return "dashboard";
  })();

  const tabCls = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Central de Contratos</h1>
            <p className="text-sm text-muted-foreground">Módulo jurídico — modelos, emissões e ciclo de vida.</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 rounded-xl border p-1 bg-card">
          <Link to="/dojo/app/contracts" className={tabCls(tab === "dashboard")}>
            <LayoutGrid className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/dojo/app/contracts/templates" className={tabCls(tab === "templates")}>
            <FolderTree className="h-4 w-4" /> Modelos
          </Link>
          <Link to="/dojo/app/contracts/issued" className={tabCls(tab === "issued")}>
            <FileText className="h-4 w-4" /> Emitidos
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
