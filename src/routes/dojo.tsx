import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Users, ScrollText, ListChecks, DollarSign, Shield, Smartphone } from "lucide-react";

export const Route = createFileRoute("/dojo")({
  head: () => ({
    meta: [
      { title: "AMT Dojo Manager — Gestão completa para academias de artes marciais" },
      {
        name: "description",
        content:
          "Software de gestão para academias de jiu-jitsu: alunos, graduações, financeiro, certificados, check-in e integração com GymPass/TotalPass.",
      },
      { property: "og:title", content: "AMT Dojo Manager" },
      {
        property: "og:description",
        content:
          "Gerencie sua academia com facilidade — alunos, financeiro, graduações e check-in em um só lugar.",
      },
    ],
  }),
  component: DojoLanding,
});

const features = [
  { icon: Users, title: "Gestão de Alunos", desc: "Cadastro, frequência, histórico de graduações e códigos de check-in individuais." },
  { icon: Shield, title: "Graduações", desc: "Registre exames, emita certificados e acompanhe o progresso de cada faixa." },
  { icon: DollarSign, title: "Financeiro", desc: "Mensalidades, planos, faturas e controle de inadimplência." },
  { icon: ScrollText, title: "Certificados", desc: "Templates personalizáveis com assinatura digital dos professores." },
  { icon: ListChecks, title: "Check-in", desc: "Presença via PIN, QR Code e integração GymPass e TotalPass." },
  { icon: Smartphone, title: "Multi-unidades", desc: "Gerencie várias unidades e professores em uma única conta." },
];

function DojoLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6 text-primary" />
            AMT Dojo Manager
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dojo/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dojo/checkout">Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          A gestão completa da sua academia de artes marciais
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Alunos, graduações, financeiro, certificados, check-in e integrações — tudo em um só lugar,
          feito por quem entende do tatame.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/dojo/checkout">Iniciar teste grátis de 14 dias</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#recursos">Ver recursos</a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Sem cartão para começar. Cancele quando quiser.
        </p>
      </section>

      <section id="recursos" className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Tudo que sua academia precisa</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <f.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-primary">
            <CardContent className="pt-6 text-center">
              <div className="text-sm font-semibold text-primary mb-2">PLANO ÚNICO</div>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-5xl font-bold">R$ 59</span>
                <span className="text-2xl font-bold">,90</span>
              </div>
              <div className="text-muted-foreground mb-6">por mês, cancelamento a qualquer momento</div>
              <ul className="text-left space-y-2 mb-6">
                {[
                  "14 dias grátis para testar",
                  "Alunos e graduações ilimitados",
                  "Certificados personalizados",
                  "Check-in por PIN e QR Code",
                  "Integração GymPass e TotalPass",
                  "Multi-unidades",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" size="lg">
                <Link to="/dojo/checkout">Começar agora</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AMT Dojo Manager — Um produto AMT Fight Wear
        </div>
      </footer>
    </div>
  );
}
