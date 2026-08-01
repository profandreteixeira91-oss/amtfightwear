import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso — AMT Fight Wear" },
      {
        name: "description",
        content:
          "Termos de Uso da plataforma AMT Growth Engine, operada pela AMT Fight Wear.",
      },
      { property: "og:title", content: "Termos de Uso — AMT Fight Wear" },
      {
        property: "og:description",
        content: "Condições de uso da plataforma AMT Growth Engine.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://amtfightwear.com.br/terms",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://amtfightwear.com.br/terms",
      },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            AMT Fight Wear
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/data-deletion" className="hover:text-foreground">
              Exclusão de dados
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
        <section className="mt-8 space-y-4 text-[15px] leading-relaxed">
          <p>
            Ao acessar e utilizar a plataforma AMT Growth Engine você concorda com estes
            termos. O serviço é fornecido "no estado em que se encontra", destinado a uso
            comercial da AMT Fight Wear e parceiros autorizados.
          </p>
          <p>
            É proibido usar a plataforma para atividades ilícitas, spam, engenharia reversa
            ou violação de direitos de terceiros. O uso das integrações com Meta
            (Facebook/Instagram) segue as políticas da própria Meta.
          </p>
          <p>
            Podemos suspender ou encerrar contas que violem estes termos. Para dúvidas:{" "}
            <a className="underline" href="mailto:amtfightwear@gmail.com">
              amtfightwear@gmail.com
            </a>
            .
          </p>
        </section>
        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} AMT Fight Wear.
        </footer>
      </main>
    </div>
  );
}
