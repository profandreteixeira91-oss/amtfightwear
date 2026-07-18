import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCertificates } from "@/lib/student/student.functions";
import { FileBadge, Download, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/app/_student/certificates")({
  head: () => ({ meta: [{ title: "Certificados — Portal do Aluno" }] }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const fn = useServerFn(getMyCertificates);
  const { data, isLoading } = useQuery({ queryKey: ["student", "certificates"], queryFn: () => fn({}) });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Certificados</h1>
      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <FileBadge className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">Nenhum certificado emitido ainda.</p>
        </div>
      )}
      <ul className="space-y-2">
        {(data ?? []).map((c) => {
          const g = (c as { dojo_graduations?: { graduation_date?: string; dojo_belts?: { name?: string; color_hex?: string } } }).dojo_graduations;
          return (
            <li key={c.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              <div className="flex items-center gap-3">
                <div className="h-8 w-2 rounded-full" style={{ background: g?.dojo_belts?.color_hex ?? "#000" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{g?.dojo_belts?.name ?? "Certificado"}</div>
                  <div className="text-xs text-neutral-500">
                    Emitido em {new Date(c.issued_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {c.pdf_url && (
                  <a
                    href={c.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 py-2.5 text-xs font-semibold text-white"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </a>
                )}
                <a
                  href={`/certificate/${c.public_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Validar
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
