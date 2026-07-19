import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMyEvaluations } from "@/lib/student/student.functions";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Award,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/app/_student/evaluations")({
  head: () => ({ meta: [{ title: "Minhas avaliações — Portal do Aluno" }] }),
  component: EvaluationsPage,
});

type Session = Awaited<ReturnType<typeof getMyEvaluations>>[number];

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const RESULT_META: Record<string, { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }> = {
  approved: { label: "Aprovado", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icon: CheckCircle2 },
  failed: { label: "Não aprovado", tone: "bg-red-50 text-red-800 ring-red-200", Icon: XCircle },
  conditional: { label: "Aprovado condicional", tone: "bg-amber-50 text-amber-800 ring-amber-200", Icon: Award },
  review: { label: "Em revisão", tone: "bg-blue-50 text-blue-800 ring-blue-200", Icon: Clock },
};
const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Rascunho", tone: "bg-neutral-100 text-neutral-700" },
  scheduled: { label: "Agendada", tone: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  in_progress: { label: "Em andamento", tone: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
  finished: { label: "Finalizada", tone: "bg-neutral-100 text-neutral-700" },
};

function EvaluationsPage() {
  const fn = useServerFn(getMyEvaluations);
  const { data, isLoading } = useQuery({ queryKey: ["student", "my-evaluations"], queryFn: () => fn({}) });
  const [selected, setSelected] = useState<Session | null>(null);

  const list = (data ?? []) as Session[];
  const stats = {
    total: list.length,
    approved: list.filter((s) => s.result === "approved").length,
    avg: (() => {
      const done = list.filter((s) => s.percentage != null);
      if (done.length === 0) return null;
      return Math.round(done.reduce((a, s) => a + (s.percentage ?? 0), 0) / done.length);
    })(),
  };

  if (selected) return <EvaluationDetail session={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold" style={{ color: "var(--sa-title)" }}>Minhas avaliações</h1>
        <p className="text-xs text-neutral-500">Acompanhe suas avaliações técnicas e notas.</p>
      </header>

      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total" value={stats.total} />
          <Stat label="Aprovadas" value={stats.approved} tone="ok" />
          <Stat label="Média" value={stats.avg != null ? `${stats.avg}%` : "—"} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <ClipboardCheck className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm font-medium text-neutral-600">Nenhuma avaliação ainda</p>
          <p className="mt-1 text-xs text-neutral-400">
            Quando seu instrutor registrar uma avaliação, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => {
            const result = s.result ? RESULT_META[s.result] : null;
            const status = STATUS_META[s.status ?? ""] ?? STATUS_META.draft;
            const pct = s.percentage;
            const finished = s.status === "finished";
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-neutral-100 transition active:scale-[0.99]"
                >
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: "var(--sa-primary, #dc2626)" }}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: "var(--sa-title)" }}>
                      {s.template?.title ?? "Avaliação"}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {finished && result ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${result.tone}`}>
                          <result.Icon className="h-3 w-3" />
                          {result.label}
                        </span>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.tone}`}>
                          {status.label}
                        </span>
                      )}
                      {pct != null && (
                        <span className="text-[10px] font-medium text-neutral-500">{pct}%</span>
                      )}
                      <span className="text-[10px] text-neutral-400">
                        {fmtDate(s.finished_at ?? s.scheduled_at ?? s.started_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        to="/app/graduations"
        className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100"
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--sa-title)" }}>Ver minhas graduações</div>
          <div className="text-xs text-neutral-500">Histórico de faixas e graus</div>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-300" />
      </Link>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" }) {
  return (
    <div
      className="rounded-2xl p-3 text-center shadow-sm ring-1 ring-neutral-100"
      style={{ background: "var(--sa-card, #fff)" }}
    >
      <div className={`text-lg font-bold ${tone === "ok" ? "text-emerald-600" : ""}`} style={tone ? undefined : { color: "var(--sa-title)" }}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
    </div>
  );
}

function EvaluationDetail({ session, onBack }: { session: Session; onBack: () => void }) {
  const structure = (session.template?.structure ?? { categories: [] }) as {
    categories: Array<{
      id: string;
      name: string;
      weight: number;
      criteria: Array<{ id: string; name: string; weight: number; max_score: number }>;
    }>;
  };
  const scores = (session.scores ?? {}) as Record<string, number>;
  const criteriaNotes = {} as Record<string, string>;
  const result = session.result ? RESULT_META[session.result] : null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">
          {session.template?.method ?? ""} {session.template?.modality ? `· ${session.template.modality}` : ""}
        </div>
        <h1 className="mt-0.5 text-lg font-bold" style={{ color: "var(--sa-title)" }}>
          {session.template?.title ?? "Avaliação"}
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Nota</div>
            <div className="text-2xl font-bold" style={{ color: "var(--sa-title)" }}>
              {session.total_score != null && session.max_score != null
                ? `${session.total_score.toFixed(1)}/${session.max_score}`
                : "—"}
            </div>
            {session.percentage != null && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, session.percentage)}%`,
                    background: session.result === "approved" ? "#10b981" : "var(--sa-primary, #dc2626)",
                  }}
                />
              </div>
            )}
            {session.template?.passing_score != null && (
              <div className="mt-1 text-[10px] text-neutral-500">
                Mínimo: {session.template.passing_score}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Resultado</div>
            {result ? (
              <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${result.tone}`}>
                <result.Icon className="h-3.5 w-3.5" /> {result.label}
              </div>
            ) : (
              <div className="mt-1 text-xs text-neutral-500">Aguardando</div>
            )}
            {session.finished_at && (
              <div className="mt-2 text-[10px] text-neutral-400">Concluída em {fmtDate(session.finished_at)}</div>
            )}
          </div>
        </div>
      </section>

      {structure.categories.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Detalhamento por critério
          </h2>
          {structure.categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
              <div className="mb-3 text-sm font-semibold" style={{ color: "var(--sa-title)" }}>{cat.name}</div>
              <ul className="space-y-2">
                {cat.criteria.map((c) => {
                  const score = scores[c.id];
                  const note = criteriaNotes[c.id];
                  const pct = score != null && c.max_score > 0 ? (score / c.max_score) * 100 : null;
                  return (
                    <li key={c.id} className="border-t border-neutral-100 pt-2 first:border-t-0 first:pt-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-neutral-700">{c.name}</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--sa-title)" }}>
                          {score != null ? `${score}/${c.max_score}` : "—"}
                        </span>
                      </div>
                      {pct != null && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, pct))}%`,
                              background: pct >= 60 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                      )}
                      {note && (
                        <div className="mt-1 rounded-lg bg-neutral-50 px-2 py-1.5 text-[11px] text-neutral-600">
                          {note}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      {session.observations && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Observações do instrutor</div>
          <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-700">{session.observations}</p>
        </section>
      )}
    </div>
  );
}
