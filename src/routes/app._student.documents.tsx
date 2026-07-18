import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/app/_student/documents")({
  head: () => ({ meta: [{ title: "Documentos — Portal do Aluno" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Documentos</h1>
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
        <FileText className="mx-auto h-10 w-10 text-neutral-300" />
        <p className="mt-3 text-sm text-neutral-500">
          Contratos, LGPD, atestados e autorizações aparecerão aqui quando anexados pela academia.
        </p>
      </div>
    </div>
  );
}
