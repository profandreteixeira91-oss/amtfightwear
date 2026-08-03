import { createFileRoute } from "@tanstack/react-router";
import { AdsAiAgent } from "@/components/ads-manager/ai-agent/AdsAiAgent";

export const Route = createFileRoute("/_authenticated/admin/ads/ia-agent")({
  head: () => ({
    meta: [
      { title: "Agente de Tráfego IA | AMT Fight Wear" },
      {
        name: "description",
        content: "Otimize suas campanhas de Meta Ads com inteligência artificial avançada.",
      },
    ],
  }),
  component: AdsAiAgentRoute,
});

function AdsAiAgentRoute() {
  return <AdsAiAgent />;
}
