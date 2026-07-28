import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, FileText, ExternalLink } from "lucide-react";
import { getMyContract } from "@/lib/student/student.functions";

export const Route = createFileRoute("/app/_student/documents/$id")({
  head: () => ({ meta: [{ title: "Contrato — Portal do Aluno" }] }),
  component: ContractDetailPage,
});

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ContractDetailPage() {
  const { id } = useParams({ from: "/app/_student/documents/$id" });
  const fn = useServerFn(getMyContract);
  const { data, isLoading, error } = useQuery({
    queryKey: ["student", "contract", id],
    queryFn: () => fn({ data: { id } }),
  });

  const html = data
    ? `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><style>
      html,body{margin:0;padding:0;background:#fff;color:#111;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55}
      .doc{padding:20px 18px;max-width:780px;margin:0 auto}
      .doc h1,.doc h2,.doc h3{color:#111}
      .doc img{max-width:100%;height:auto}
      .doc table{width:100%;border-collapse:collapse}
      .doc hr{border:0;border-top:1px solid #e5e7eb;margin:16px 0}
      header,footer{color:#6b7280;font-size:12px}
    </style></head><body><div class="doc">
      ${data.header_html || ""}
      ${data.content || ""}
      ${data.footer_html || ""}
    </div></body></html>`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/app/documents"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        {data?.pdf_url ? (
          <a
            href={data.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100 text-sm text-neutral-500">Carregando…</div>
      ) : error || !data ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          Contrato indisponível.
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in oklab, var(--sa-primary, #dc2626) 12%, white)" }}
              >
                <FileText className="h-5 w-5" style={{ color: "var(--sa-primary, #dc2626)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-bold text-neutral-900">{data.title}</h1>
                <p className="text-xs text-neutral-500">
                  {data.contract_number ? `Nº ${data.contract_number} • ` : ""}
                  Status: <span className="font-medium capitalize">{data.status}</span>
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-neutral-500">Plano</dt>
                <dd className="font-medium text-neutral-900">{data.plan_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Mensalidade</dt>
                <dd className="font-medium text-neutral-900">{fmtMoney(data.monthly_value)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Início</dt>
                <dd className="font-medium text-neutral-900">{fmtDate(data.start_date)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Assinado em</dt>
                <dd className="font-medium text-neutral-900">{fmtDate(data.signed_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100">
            <iframe
              title={data.title}
              srcDoc={html}
              sandbox=""
              className="h-[70vh] w-full"
            />
          </div>

          {data.pdf_url ? (
            <a
              href={data.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:underline"
            >
              Abrir PDF em nova aba <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </>
      )}
    </div>
  );
}
