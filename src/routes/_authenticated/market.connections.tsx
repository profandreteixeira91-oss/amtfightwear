import { createFileRoute } from "@tanstack/react-router";
import { Plug, Facebook, Instagram, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/market/connections")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Conexões e APIs" }] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Conexões e APIs"
        description="Integre o AMT MarketEngine com plataformas externas de mídia e vendas."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Meta Business (Facebook & Instagram)" icon={Plug}>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1"><Facebook className="h-3 w-3" /> Facebook Pages</Badge>
              <Badge variant="outline" className="gap-1"><Instagram className="h-3 w-3" /> Instagram Business</Badge>
              <Badge variant="secondary">Não conectado</Badge>
            </div>
            <p className="text-muted-foreground">
              A integração real com Meta Graph API exige um App Meta com permissões
              <code className="mx-1 rounded bg-muted px-1">pages_manage_posts</code> e
              <code className="mx-1 rounded bg-muted px-1">instagram_content_publish</code>,
              além de review da Meta. Cadastre o App em developers.facebook.com e me envie o
              <b> Access Token de Página</b> — eu armazeno como secret e libero postagem automática.
            </p>
            <Button variant="outline" asChild className="gap-1">
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">
                Abrir Meta for Developers <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Catálogo AMT Fight Wear" delay={0.1}>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">Conectado</Badge>
            </div>
            <p className="text-muted-foreground">
              Fonte oficial dos produtos: <b>amtfightwear.com.br</b>.
              O catálogo (203 produtos) está sincronizado no banco. Para atualizar,
              solicite uma nova sincronização por scraping.
            </p>
            <Button variant="outline" asChild className="gap-1">
              <a href="https://www.amtfightwear.com.br" target="_blank" rel="noreferrer">
                Ver loja <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
