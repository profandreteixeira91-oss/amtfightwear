import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyInvoices } from "@/lib/student/student.functions";
import { Wallet, QrCode } from "lucide-react";
import { brDate } from "@/lib/format";
import { todayISO } from "@/lib/dates";

export const Route = createFileRoute("/app/_student/finance")({
  head: () => ({ meta: [{ title: "Financeiro — Portal do Aluno" }] }),
  component: FinancePage,
});

const statusLabel: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-800" },
  upcoming: { label: "A vencer", className: "bg-sky-100 text-sky-800" },
  overdue: { label: "Vencido", className: "bg-red-100 text-red-800" },
  canceled: { label: "Cancelado", className: "bg-neutral-100 text-neutral-600" },
};

function derivedStatus(inv: { status: string; due_date: string }) {
  if (inv.status === "pending" && inv.due_date > todayISO()) return "upcoming";
  return inv.status;
}

function FinancePage() {
  const fn = useServerFn(getMyInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["student", "invoices"], queryFn: () => fn({}) });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Financeiro</h1>
      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <Wallet className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">Sem cobranças registradas.</p>
        </div>
      )}
      <ul className="space-y-2">
        {(data ?? []).map((inv) => {
          const effective = derivedStatus(inv);
          const s = statusLabel[effective] ?? { label: inv.status, className: "bg-neutral-100 text-neutral-600" };
          const canPay = inv.status !== "paid" && inv.status !== "canceled";
          return (
            <li key={inv.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{inv.description ?? "Mensalidade"}</div>
                  <div className="text-xs text-neutral-500">
                    Venc: {brDate(inv.due_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold">R$ {Number(inv.amount).toFixed(2)}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.className}`}>
                    {s.label}
                  </span>
                </div>
              </div>
              {canPay && (
                <Link
                  to="/app/invoice/$id"
                  params={{ id: inv.id }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-center text-xs font-semibold text-white"
                  style={{ background: "var(--sa-primary, #dc2626)" }}
                >
                  <QrCode className="h-4 w-4" />
                  Pagar com Pix
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
