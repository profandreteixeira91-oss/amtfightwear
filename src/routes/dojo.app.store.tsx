import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StoreHeader } from "@/components/dojo/store/StoreHeader";

export const Route = createFileRoute("/dojo/app/store")({
  head: () => ({
    meta: [
      { title: "AMT Store — Dojo Manager" },
      {
        name: "description",
        content:
          "Loja premium AMT Fight Wear para academias: faixas, kimonos, patches e rash guards com atacado automático.",
      },
    ],
  }),
  component: StoreLayout,
});

function StoreLayout() {
  return (
    <div className="relative">
      {/* Plano de fundo premium — muito sutil, sem interferir no conteúdo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-gradient-to-b from-[color:var(--dojo-surface-2)] via-[color:var(--dojo-surface-1)] to-transparent"
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-8 px-3 pb-16 sm:px-4">
        <StoreHeader />
        <Outlet />
      </div>
    </div>
  );
}
