import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getActiveAppNews } from "@/lib/student-app/config.functions";
import { Newspaper, Megaphone, CalendarDays, Sparkles, Gift } from "lucide-react";

export const Route = createFileRoute("/app/_student/news")({
  head: () => ({ meta: [{ title: "Notícias — Portal do Aluno" }] }),
  component: NewsFeedPage,
});

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  news: { label: "Notícia", icon: Newspaper, tone: "bg-blue-50 text-blue-700 ring-blue-200" },
  announcement: { label: "Comunicado", icon: Megaphone, tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  event: { label: "Evento", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  promo: { label: "Promoção", icon: Gift, tone: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200" },
  banner: { label: "Destaque", icon: Sparkles, tone: "bg-red-50 text-red-700 ring-red-200" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "news", label: "Notícias" },
  { key: "announcement", label: "Comunicados" },
  { key: "event", label: "Eventos" },
  { key: "promo", label: "Promoções" },
];

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function NewsFeedPage() {
  const fn = useServerFn(getActiveAppNews);
  const { data, isLoading } = useQuery({ queryKey: ["student", "app-news", "feed"], queryFn: () => fn({}) });
  const [filter, setFilter] = useState<string>("all");

  const items = (data ?? []).filter((n) => filter === "all" || n.kind === filter);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold" style={{ color: "var(--sa-title)" }}>Notícias & Comunicados</h1>
        <p className="text-xs text-neutral-500">Fique por dentro das novidades da academia.</p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 whitespace-nowrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                filter === f.key
                  ? "bg-neutral-900 text-white ring-neutral-900"
                  : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <Newspaper className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm font-medium text-neutral-600">Nenhuma novidade por aqui</p>
          <p className="mt-1 text-xs text-neutral-400">Quando sua academia publicar algo, você verá aqui.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const meta = KIND_META[n.kind] ?? KIND_META.news;
            const Icon = meta.icon;
            return (
              <li
                key={n.id}
                className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-neutral-100"
                style={{ background: "var(--sa-card)" }}
              >
                {n.image_url && (
                  <img src={n.image_url} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${meta.tone}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                    {n.created_at && (
                      <span className="text-[10px] text-neutral-400">{fmtDate(n.created_at)}</span>
                    )}
                  </div>
                  <h2 className="mt-2 text-sm font-semibold leading-snug" style={{ color: "var(--sa-title)" }}>
                    {n.title}
                  </h2>
                  {n.body && (
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-neutral-600">{n.body}</p>
                  )}
                  {n.cta_link && (
                    <a
                      href={n.cta_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition"
                      style={{ background: "var(--sa-primary)" }}
                    >
                      {n.cta_label ?? "Saiba mais"}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
