import { createFileRoute } from "@tanstack/react-router";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffNoAccess } from "@/components/dojo/staff/StaffShell";
import { SalesPage } from "./dojo.app.sales";

export const Route = createFileRoute("/dojo/staff/_portal/sales")({
  meta: () => [{ title: "Vendas — Portal da Equipe" }],
  component: StaffSalesRoute,
});

function StaffSalesRoute() {
  const level = useStaffLevel("sales");
  if (level === "none") return <StaffNoAccess label="Vendas" />;

  return <SalesPage />;
}
