import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock } from "lucide-react";

export const Route = createFileRoute("/dojo/checkout")({
  head: () => ({ meta: [{ title: "Assinar AMT Dojo Manager" }, { name: "robots", content: "noindex" }] }),
  component: DojoCheckout,
});

function DojoCheckout() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/dojo" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" /> AMT Dojo Manager
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-lg">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Assinatura em breve</h1>
            <p className="text-muted-foreground">
              O pagamento recorrente pelo Mercado Pago está sendo finalizado. Enquanto isso, entre em
              contato para liberar seu acesso beta gratuito de 14 dias.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Button asChild>
                <a href="https://wa.me/5582920016732?text=Quero%20testar%20o%20AMT%20Dojo%20Manager" target="_blank" rel="noreferrer">
                  Falar no WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dojo">Voltar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
