import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordStoreVisit } from "@/lib/store/customers.functions";


import { LandingNav } from "@/components/dojo/landing/LandingNav";
import { Hero } from "@/components/dojo/landing/Hero";
import { Benefits } from "@/components/dojo/landing/Benefits";
import { Features } from "@/components/dojo/landing/Features";
import { Differentiators } from "@/components/dojo/landing/Differentiators";
import { ModulesGrid } from "@/components/dojo/landing/ModulesGrid";
import { RealScreenshots } from "@/components/dojo/landing/RealScreenshots";
import { FightWearIntegration } from "@/components/dojo/landing/FightWearIntegration";
import { Integrations } from "@/components/dojo/landing/Integrations";
import { Plans } from "@/components/dojo/landing/Plans";
import { FAQ } from "@/components/dojo/landing/FAQ";
import { FinalCTA } from "@/components/dojo/landing/FinalCTA";
import { Footer } from "@/components/dojo/landing/Footer";

export const Route = createFileRoute("/dojo/")({
  head: () => ({
    meta: [
      { title: "AMT Dojo Manager — Gestão completa para academias de artes marciais" },
      {
        name: "description",
        content:
          "Software de gestão para academias de Jiu-Jitsu, Judô e artes marciais: alunos, financeiro, graduações, certificados, competições e integração com AMT Fight Wear.",
      },
      { property: "og:title", content: "AMT Dojo Manager" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content:
          "Gerencie sua academia em um só lugar — alunos, financeiro, graduações, competições e vendas integradas.",
      },
      { property: "og:image", content: "https://amtfightwear.com.br/__l5e/assets-v1/a13608b2-2d5c-4d53-b64e-78e38c6083e9/dojo-manager-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://amtfightwear.com.br/__l5e/assets-v1/a13608b2-2d5c-4d53-b64e-78e38c6083e9/dojo-manager-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/dojo" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AMT Dojo Manager",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "Software de gestão completo para academias de artes marciais — alunos, financeiro, graduações, certificados e competições.",
          offers: { "@type": "Offer", priceCurrency: "BRL" },
        }),
      },
    ],
  }),
  component: DojoLanding,
});

function DojoLanding() {
  return (
    <div className="dojo-theme min-h-screen bg-white text-[#111111] antialiased">
      <LandingNav />
      <main>
        <Hero />
        <Benefits />
        <Features />
        <Differentiators />
        <ModulesGrid />
        <RealScreenshots />
        <FightWearIntegration />
        <Integrations />
        <Plans />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
