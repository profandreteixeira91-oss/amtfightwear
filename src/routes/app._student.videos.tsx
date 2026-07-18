import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyVideos } from "@/lib/student/student.functions";
import { Film, Play } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/_student/videos")({
  head: () => ({ meta: [{ title: "Vídeos — Portal do Aluno" }] }),
  component: VideosPage,
});

function VideosPage() {
  const fn = useServerFn(getMyVideos);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["student", "videos", q],
    queryFn: () => fn({ data: { q: q || undefined } }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Vídeos</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar vídeo…"
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <Film className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">Nenhum vídeo disponível ainda.</p>
        </div>
      )}
      <ul className="grid gap-3">
        {(data ?? []).map((v) => (
          <li key={v.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100">
            <div className="relative aspect-video bg-neutral-100">
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-neutral-300">
                  <Film className="h-10 w-10" />
                </div>
              )}
              <div className="absolute inset-0 grid place-items-center bg-black/20">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 shadow-lg">
                  <Play className="h-5 w-5 text-neutral-800" fill="currentColor" />
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold">{v.title}</div>
              {v.description && <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{v.description}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
