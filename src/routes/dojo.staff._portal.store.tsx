import { createFileRoute } from "@tanstack/react-router";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffNoAccess } from "@/components/dojo/staff/StaffShell";
import { StoreHome } from "./dojo.app.store.index";

export const Route = createFileRoute("/dojo/staff/_portal/store")({
  head: () => ({ meta: [{ title: "AMT Store — Portal da Equipe" }] }),
  component: StaffStoreRoute,
});

function StaffStoreRoute() {
  const level = useStaffLevel("store");
  if (level === "none") return <StaffNoAccess label="AMT Store" />;

  return <StoreHome />;
}
