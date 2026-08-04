import { createFileRoute } from "@tanstack/react-router";
import AiAdGenerator from "@/components/ads-manager/AiAdGenerator";

export const Route = createFileRoute("/_authenticated/admin/ads/gerador-ia")({
  head: () => ({
    meta: [
      { title: "Gerador Criativo IA | AMT Fight Wear" },
      {
        name: "description",
        content: "Crie anúncios profissionais com IA estruturados para alta conversão no Instagram.",
      },
    ],
  }),
  component: AiAdGenerator,
});
