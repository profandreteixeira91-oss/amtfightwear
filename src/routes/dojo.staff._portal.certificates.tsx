import { createFileRoute } from "@tanstack/react-router";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffNoAccess } from "@/components/dojo/staff/StaffShell";
import { CertificatesPage } from "./dojo.app.certificates";

export const Route = createFileRoute("/dojo/staff/_portal/certificates")({
  head: () => ({ meta: [{ title: "Certificados — Portal da Equipe" }] }),
  component: StaffCertificatesRoute,
});

function StaffCertificatesRoute() {
  const level = useStaffLevel("certificates");
  if (level === "none") return <StaffNoAccess label="Certificados" />;

  return <CertificatesPage />;
}
