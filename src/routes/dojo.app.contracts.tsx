import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Scale, LayoutGrid, FileText, FolderTree } from "lucide-react";
import { PinGate } from "@/components/dojo/PinGate";

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
    `flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active
        ? "bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)]"
        : "text-neutral-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <PinGate
      moduleName="Central de Contratos"
      description="A Central de Contratos contém dados jurídicos sensíveis. Digite seu PIN de 6 dígitos para liberar o acesso por 24 horas."
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:gap-7 md:p-6">
        {/* ============ HERO — RUBY NOIR ============ */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
              <Scale className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">Central de Contratos</h1>
              <p className="mt-1 max-w-2xl text-sm text-neutral-300">
                Módulo jurídico — modelos versionados, emissões, timeline e ciclo de vida completo.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navegação — Ruby ribbon */}
        <nav className="overflow-x-auto rounded-xl border border-red-500/15 bg-neutral-950/60 p-1 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)]">
          <div className="flex w-max min-w-full flex-nowrap gap-1">
            <Link to="/dojo/app/contracts" className={tabCls(tab === "dashboard")}>
              <LayoutGrid className="h-4 w-4" /> Dashboard
            </Link>
            <Link to="/dojo/app/contracts/templates" className={tabCls(tab === "templates")}>
              <FolderTree className="h-4 w-4" /> Modelos
            </Link>
            <Link to="/dojo/app/contracts/issued" className={tabCls(tab === "issued")}>
              <FileText className="h-4 w-4" /> Emitidos
            </Link>
          </div>
        </nav>

        <Outlet />
      </div>
    </PinGate>
  );
}
