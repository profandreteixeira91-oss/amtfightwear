import { createFileRoute } from "@tanstack/react-router";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffNoAccess } from "@/components/dojo/staff/StaffShell";
import { BeltsPage } from "./dojo.app.belts";

export const Route = createFileRoute("/dojo/staff/_portal/belts")({
  head: () => ({ meta: [{ title: "Modalidades e Faixas — Portal da Equipe" }] }),
  component: StaffBeltsRoute,
});

function StaffBeltsRoute() {
  const level = useStaffLevel("belts");
  if (level === "none") return <StaffNoAccess label="Modalidades e Faixas" />;

  return <BeltsPage />;
}
