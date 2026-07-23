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
    <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-16">
      <StoreHeader />
      <Outlet />
    </div>
  );
}
