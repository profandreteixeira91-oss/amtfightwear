import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordStoreVisit } from "@/lib/store/visits.functions";


import { LandingNav } from "@/components/dojo/landing/LandingNav";
import { Hero } from "@/components/dojo/landing/Hero";
import { Benefits } from "@/components/dojo/landing/Benefits";
import { ModulesShowcase } from "@/components/dojo/landing/ModulesShowcase";
import { RealScreenshots } from "@/components/dojo/landing/RealScreenshots";
import { Differentiators } from "@/components/dojo/landing/Differentiators";
import { Integrations } from "@/components/dojo/landing/Integrations";
import { Plans } from "@/components/dojo/landing/Plans";
import { FAQ } from "@/components/dojo/landing/FAQ";
import { FreeTools } from "@/components/dojo/landing/FreeTools";
import { FinalCTA } from "@/components/dojo/landing/FinalCTA";
import { Footer } from "@/components/dojo/landing/Footer";

export const Route = createFileRoute("/dojo/")({
  head: () => ({
    meta: [
      { title: "AMT Dojo Manager — Gestão para academias de artes marciais" },
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
  const track = useServerFn(recordStoreVisit);
  useEffect(() => {
    try {
      const KEY = "amt_sid";
      let sid = localStorage.getItem(KEY);
      if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem(KEY, sid);
      }
      track({
        data: {
          session_id: sid,
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent.slice(0, 500),
        },
      }).catch(() => {});
    } catch {}
  }, [track]);

  return (
    <div className="dojo-theme min-h-screen overflow-x-clip bg-white text-[#111111] antialiased hyphens-none break-normal">
      <LandingNav />

      <main>
        <Hero />
        <Benefits />
        <ModulesShowcase />
        <RealScreenshots />
        <Differentiators />
        <Integrations />
        <Plans />
        <FAQ />
        <FreeTools />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
