import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { LeadsMap } from "@/components/common/LeadsMap";

export const Route = createFileRoute("/_authenticated/lead-scraper/map")({
  head: () => ({ meta: [{ title: "Mapa — Lead Scraper IA" }] }),
  component: MapPage,
});

function MapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leads-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, city, state, lat, lng, ai_score")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Mapa de leads"
        description="Visualização geográfica dos leads coletados com clusters. Priorizamos automaticamente a região Nordeste."
      />
      <SectionCard title="Distribuição geográfica">
        {isLoading ? <Skeleton className="h-[500px] w-full" /> : <LeadsMap leads={(data ?? []) as any} />}
      </SectionCard>
    </motion.div>
  );
}
