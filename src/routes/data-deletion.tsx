import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/data-deletion")({
  component: DataDeletionPage,
  head: () => ({
    meta: [
      { title: "Exclusão de Dados — AMT Fight Wear" },
      {
        name: "description",
        content:
          "Como solicitar a exclusão dos seus dados pessoais e a revogação da integração com Facebook e Instagram na AMT Fight Wear.",
      },
      { property: "og:title", content: "Exclusão de Dados — AMT Fight Wear" },
      {
        property: "og:description",
        content:
          "Instruções para revogar o acesso e excluir dados coletados pela AMT Fight Wear via Meta.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://marketing.amtfightwear.com.br/data-deletion",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://marketing.amtfightwear.com.br/data-deletion",
      },
    ],
  }),
});

function DataDeletionPage() {
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
            <Link to="/terms" className="hover:text-foreground">
              Termos
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Exclusão de Dados do Usuário</h1>

        <section className="mt-8 space-y-6 text-[15px] leading-relaxed">
          <p>
            Você pode solicitar a exclusão de todos os dados pessoais e dados de integração
            Meta (Facebook/Instagram) mantidos pela AMT Fight Wear a qualquer momento, sem
            custo.
          </p>

          <h2 className="text-xl font-semibold">Opção 1 — Revogar direto na Meta</h2>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              Acesse{" "}
              <a
                className="underline"
                href="https://www.facebook.com/settings?tab=business_tools"
                target="_blank"
                rel="noreferrer noopener"
              >
                Configurações do Facebook → Integrações Empresariais
              </a>
              .
            </li>
            <li>Localize o app "AMT Growth Engine".</li>
            <li>Clique em <strong>Remover</strong>. A revogação é imediata.</li>
          </ol>

          <h2 className="text-xl font-semibold">Opção 2 — Solicitação por e-mail</h2>
          <p>
            Envie um e-mail para{" "}
            <a className="underline" href="mailto:amtfightwear@gmail.com?subject=Exclus%C3%A3o%20de%20Dados">
              amtfightwear@gmail.com
            </a>{" "}
            com o assunto <em>"Exclusão de Dados"</em>, informando:
          </p>
          <ul className="list-disc pl-6">
            <li>Nome completo</li>
            <li>E-mail cadastrado na plataforma</li>
            <li>ID/username do Instagram ou Facebook conectado (se aplicável)</li>
          </ul>

          <h2 className="text-xl font-semibold">Prazo</h2>
          <p>
            Confirmaremos o recebimento em até <strong>48 horas úteis</strong> e concluiremos a
            exclusão em até <strong>15 dias</strong>, conforme a LGPD. Tokens e caches são
            revogados imediatamente.
          </p>

          <h2 className="text-xl font-semibold">O que é excluído</h2>
          <ul className="list-disc pl-6">
            <li>Perfil de usuário e credenciais</li>
            <li>Tokens de acesso Meta</li>
            <li>Mensagens, comentários e mídias sincronizadas do Instagram/Facebook</li>
            <li>Registros de conversas do CRM vinculados à sua conta</li>
          </ul>

          <p className="text-sm text-muted-foreground">
            Retemos apenas o mínimo exigido por obrigação legal ou fiscal.
          </p>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} AMT Fight Wear.
        </footer>
      </main>
    </div>
  );
}
