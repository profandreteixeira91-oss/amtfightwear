import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyHome } from "@/lib/student/student.functions";
import {
  CalendarDays,
  QrCode,
  Film,
  Award,
  FileBadge,
  Wallet,
  Trophy,
  User,
  FileText,
  Settings,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/app/_student/home")({
  head: () => ({ meta: [{ title: "Início — Portal do Aluno" }] }),
  component: HomePage,
});

const cards = [
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/checkin", label: "Check-in", icon: QrCode },
  { to: "/app/videos", label: "Vídeos", icon: Film },
  { to: "/app/graduations", label: "Graduações", icon: Award },
  { to: "/app/certificates", label: "Certificados", icon: FileBadge },
  { to: "/app/finance", label: "Financeiro", icon: Wallet },
  { to: "/app/competitions", label: "Competições", icon: Trophy },
  { to: "/app/profile", label: "Meu Perfil", icon: User },
  { to: "/app/documents", label: "Documentos", icon: FileText },
  { to: "/app/settings", label: "Configurações", icon: Settings },
] as const;

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function HomePage() {
  const homeFn = useServerFn(getMyHome);
  const { data, isLoading } = useQuery({ queryKey: ["student", "home"], queryFn: () => homeFn({}) });

  const student = data?.student;
  const belt = data?.belt;
  const openInvoices = data?.openInvoices ?? [];

  return (
    <div className="space-y-5">
      {/* Card do aluno */}
      <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
        <div className="flex items-center gap-4">
          {student?.photo_url ? (
            <img src={student.photo_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-400">
              {student?.full_name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{student?.full_name ?? (isLoading ? "…" : "—")}</div>
            <div className="mt-1 flex items-center gap-2">
              {belt && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ background: belt.color_hex }}
                >
                  {belt.name}
                  {student?.current_degree ? ` · ${student.current_degree}º grau` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Info label="Último check-in" value={fmtDate(data?.lastCheckin?.checked_in_at)} />
          <Info
            label="Faturas abertas"
            value={openInvoices.length ? `${openInvoices.length} pend.` : "Em dia"}
            tone={openInvoices.length ? "warn" : "ok"}
          />
        </div>
      </section>

      {/* Cobranças pendentes */}
      {openInvoices.length > 0 && (
        <Link to="/app/finance" className="block">
          <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-900">Você tem cobranças em aberto</div>
                <div className="mt-0.5 text-xs text-amber-800">
                  Próximo vencimento em {new Date(openInvoices[0].due_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-700" />
            </div>
          </section>
        </Link>
      )}

      {/* Grid de acessos rápidos */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Acesso rápido</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {cards.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-neutral-100 transition active:scale-95"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-xl text-white transition-transform group-hover:scale-105"
                style={{ background: "var(--sa-primary, #dc2626)" }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-neutral-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
