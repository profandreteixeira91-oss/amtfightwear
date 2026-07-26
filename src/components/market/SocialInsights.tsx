import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Facebook, Instagram, Heart, MessageCircle, Users, ImageIcon, ExternalLink, AlertCircle } from "lucide-react";
import { getMetaOverview } from "@/lib/meta.functions";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const nf = new Intl.NumberFormat("pt-BR");

export function SocialInsights() {
  const fetchOverview = useServerFn(getMetaOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta", "overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <SectionCard title="Presença social (Meta)" className="mt-6">
        <EmptyState
          title="Conta Meta não conectada"
          description="Conecte sua Página do Facebook e Instagram Business para ver seguidores, alcance e posts recentes."
          action={
            <Button asChild size="sm">
              <Link to="/admin/conexoes">Conectar agora</Link>
            </Button>
          }
        />
      </SectionCard>
    );
  }

  const { page, instagram, media } = data;

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Fãs do Facebook"
          value={nf.format(page.fans)}
          icon={Facebook}
          hint={page.name ?? undefined}
        />
        {instagram ? (
          <>
            <StatCard
              label="Seguidores Instagram"
              value={nf.format(instagram.followers)}
              icon={Instagram}
              hint={`@${instagram.username ?? ""}`}
            />
            <StatCard
              label="Posts publicados"
              value={nf.format(instagram.posts)}
              icon={ImageIcon}
              hint={`Seguindo ${nf.format(instagram.following)}`}
            />
          </>
        ) : (
          <div className="col-span-2 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <div className="font-medium">Instagram não vinculado</div>
              <div className="text-xs text-muted-foreground">
                Vincule uma conta Instagram Business à Página no Business Manager para exibir dados.
              </div>
            </div>
          </div>
        )}
      </div>

      <SectionCard
        title="Últimas publicações do Instagram"
        action={instagram && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> @{instagram.username}</Badge>}
      >
        {media.length === 0 ? (
          <EmptyState title="Sem publicações" description="Ainda não há posts na conta conectada." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((post, i) => (
              <motion.a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                {post.url ? (
                  <img src={post.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ExternalLink className="ml-auto h-4 w-4 text-white" />
                  <div className="flex items-center gap-3 text-xs font-medium text-white">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {nf.format(post.likes)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {nf.format(post.comments)}</span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
