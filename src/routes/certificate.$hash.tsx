import { formatDegree, degreeSuffix, degreeUnit } from "@/lib/dojo/degree-label";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Download, ArrowLeft, ShieldCheck } from "lucide-react";
import { brDate } from "@/lib/format";

type CertPayload = {
  id: string;
  issued_at: string;
  pdf_url: string | null;
  values: Record<string, unknown> | null;
  student: { full_name: string | null } | null;
  belt: { name: string | null; color_hex: string | null } | null;
  graduation_date: string | null;
  degree: number | null;
  academy: { trade_name: string | null; legal_name: string | null } | null;
};

async function fetchCertificate(hash: string, origin: string): Promise<CertPayload | null> {
  const res = await fetch(`${origin}/api/public/certificate/${encodeURIComponent(hash)}`, {
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as CertPayload;
}

export const Route = createFileRoute("/certificate/$hash")({
  head: () => ({
    meta: [
      { title: "Validação de Certificado — AMT Dojo Manager" },
      { name: "description", content: "Verifique a autenticidade de um certificado emitido pelo AMT Dojo Manager." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params, location }) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (location as unknown as { origin?: string }).origin ?? "https://amtfightwear.com.br";
    const cert = await fetchCertificate(params.hash, origin);
    if (!cert) throw notFound();
    return { cert };
  },
  errorComponent: ({ error, reset }) => (
    <ValidationShell>
      <XCircle className="mx-auto h-12 w-12 text-red-500" />
      <h1 className="mt-3 text-lg font-semibold">Não foi possível validar</h1>
      <p className="mt-1 text-sm text-neutral-500">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
        Tentar novamente
      </button>
    </ValidationShell>
  ),
  notFoundComponent: () => (
    <ValidationShell>
      <XCircle className="mx-auto h-12 w-12 text-red-500" />
      <h1 className="mt-3 text-lg font-semibold">Certificado não encontrado</h1>
      <p className="mt-1 text-sm text-neutral-500">
        O código informado não corresponde a nenhum certificado emitido.
      </p>
    </ValidationShell>
  ),
  component: CertificateValidationPage,
});

function ValidationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-100">{children}</div>
      </div>
    </div>
  );
}

function CertificateValidationPage() {
  const { cert } = Route.useLoaderData();
  const { hash } = Route.useParams();
  const beltColor = cert.belt?.color_hex ?? "#111";
  const dojoName = cert.academy?.trade_name ?? cert.academy?.legal_name ?? "Dojo";
  const gradDate = cert.graduation_date ? brDate(cert.graduation_date) : null;
  const issuedAt = new Date(cert.issued_at).toLocaleDateString("pt-BR");

  return (
    <ValidationShell>
      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Certificado Autêntico
        </div>
        <h1 className="mt-3 text-xl font-bold text-neutral-900">{cert.student?.full_name ?? "Aluno"}</h1>
        <p className="text-sm text-neutral-500">{dojoName}</p>
      </div>

      <div className="mt-6 space-y-2 rounded-2xl bg-neutral-50 p-4 text-left text-sm">
        <Row label="Faixa">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full ring-1 ring-neutral-200" style={{ background: beltColor }} />
            {cert.belt?.name ?? "—"}
            {cert.degree != null && cert.degree > 0 ? ` · ${cert.degree}º ${degreeUnit((cert as any).belt?.modality)}` : ""}
          </span>
        </Row>
        {gradDate && <Row label="Data da graduação">{gradDate}</Row>}
        <Row label="Emitido em">{issuedAt}</Row>
        <Row label="Código">
          <code className="break-all font-mono text-[11px] text-neutral-500">{hash}</code>
        </Row>
      </div>

      {cert.pdf_url && (
        <a
          href={cert.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white"
        >
          <Download className="h-4 w-4" /> Baixar certificado (PDF)
        </a>
      )}
    </ValidationShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium text-neutral-900">{children}</span>
    </div>
  );
}
