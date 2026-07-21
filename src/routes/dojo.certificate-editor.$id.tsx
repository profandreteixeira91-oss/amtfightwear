import { createFileRoute } from "@tanstack/react-router";
import { CertificateStudio } from "@/components/dojo/certificates-studio/CertificateStudio";

export const Route = createFileRoute("/dojo/certificate-editor/$id")({
  head: () => ({ meta: [{ title: "Editor de Certificados — AMT Dojo Manager" }] }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  return <CertificateStudio templateId={id as any} />;
}
