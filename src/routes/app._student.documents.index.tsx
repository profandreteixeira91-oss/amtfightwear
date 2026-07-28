import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ChevronRight, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { listMyContracts } from "@/lib/student/student.functions";

export const Route = createFileRoute("/app/_student/documents")({
  head: () => ({ meta: [{ title: "Contratos — Portal do Aluno" }] }),
  component: DocumentsPage,
});

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  signed: { label: "Assinado", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  sent: { label: "Enviado", icon: Send, className: "bg-blue-50 text-blue-700 ring-blue-200" },
  draft: { label: "Rascunho", icon: Clock, className: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-50 text-amber-700 ring-amber-200" },
  cancelled: { label: "Cancelado", icon: XCircle, className: "bg-rose-50 text-rose-700 ring-rose-200" },
  expired: { label: "Expirado", icon: XCircle, className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function fmtMoney(v?: number | null) {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DocumentsPage() {
  const listFn = useServerFn(listMyContracts);
  const { data, isLoading, error } = useQuery({
    queryKey: ["student", "contracts"],
    queryFn: () => listFn({}),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--sa-title)" }}>Contratos</h1>
        <p className="text-sm text-neutral-500">Seus contratos vinculados à academia.</p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100 text-sm text-neutral-500">
          Carregando…
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          Não foi possível carregar seus contratos.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <FileText className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">
            Nenhum contrato disponível no momento. Assim que sua academia anexar um documento ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.draft;
            const Icon = meta.icon;
            const money = fmtMoney(c.monthly_value as number | null);
            return (
              <li key={c.id}>
                <Link
                  to="/app/documents/$id"
                  params={{ id: c.id }}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-100 transition hover:ring-neutral-200 active:scale-[0.99]"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "color-mix(in oklab, var(--sa-primary, #dc2626) 12%, white)" }}
                  >
                    <FileText className="h-5 w-5" style={{ color: "var(--sa-primary, #dc2626)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-neutral-900">{c.title}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${meta.className}`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
                      {c.contract_number ? <span>Nº {c.contract_number}</span> : null}
                      {c.plan_name ? <span className="truncate">{c.plan_name}</span> : null}
                      {money ? <span>{money}/mês</span> : null}
                      <span>Emitido em {fmtDate(c.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
