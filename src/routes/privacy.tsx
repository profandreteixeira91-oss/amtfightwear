import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — AMT Fight Wear" },
      {
        name: "description",
        content:
          "Política de Privacidade da AMT Fight Wear: como coletamos, usamos, armazenamos e protegemos dados pessoais e dados de integrações com Meta (Facebook e Instagram).",
      },
      { property: "og:title", content: "Política de Privacidade — AMT Fight Wear" },
      {
        property: "og:description",
        content:
          "Como a AMT Fight Wear trata dados pessoais e dados obtidos via integrações com Facebook e Instagram.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://amtfightwear.com.br/privacy",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://amtfightwear.com.br/privacy",
      },
    ],
  }),
});

function PrivacyPage() {
  const updated = "02 de julho de 2026";

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
            <Link to="/data-deletion" className="hover:text-foreground">
              Exclusão de dados
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updated}</p>

        <section className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-6 text-[15px] leading-relaxed">
          <p>
            Esta Política de Privacidade descreve como a <strong>AMT Fight Wear</strong> ("nós",
            "AMT") coleta, utiliza, armazena e protege informações ao operar a plataforma AMT
            Growth Engine e ao integrar-se com serviços da Meta Platforms, Inc. (Facebook e
            Instagram). Ao usar nossos serviços, você concorda com os termos abaixo.
          </p>

          <h2 className="text-xl font-semibold">1. Responsável pelo tratamento</h2>
          <p>
            AMT Fight Wear — E-mail para contato:{" "}
            <a className="underline" href="mailto:amtfightwear@gmail.com">
              amtfightwear@gmail.com
            </a>
            . Site oficial: <a className="underline" href="https://www.amtfightwear.com.br">www.amtfightwear.com.br</a>.
          </p>

          <h2 className="text-xl font-semibold">2. Dados que coletamos</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Dados de conta:</strong> nome, e-mail e credenciais fornecidas ao criar
              acesso à plataforma.
            </li>
            <li>
              <strong>Dados de integração Meta:</strong> ao conectar sua Página do Facebook e/ou
              conta do Instagram Business, recebemos identificadores públicos da página/conta,
              tokens de acesso, métricas (seguidores, alcance, engajamento), mídias publicadas,
              comentários e mensagens diretas (DMs) — somente para as contas que você
              explicitamente autorizar.
            </li>
            <li>
              <strong>Dados de prospecção B2B:</strong> informações públicas de empresas
              coletadas em fontes abertas (site, redes sociais, buscadores) para fins de
              prospecção comercial.
            </li>
            <li>
              <strong>Logs técnicos:</strong> data/hora, IP, user-agent e eventos de uso, para
              segurança e diagnóstico.
            </li>
          </ul>

          <h2 className="text-xl font-semibold">3. Como usamos os dados</h2>
          <ul className="list-disc pl-6">
            <li>Operar recursos de gestão de conteúdo, inbox e CRM do Instagram e Facebook.</li>
            <li>Publicar conteúdos em suas contas mediante sua autorização.</li>
            <li>Gerar insights, sugestões e automações com apoio de IA.</li>
            <li>Realizar prospecção comercial B2B em conformidade com a LGPD.</li>
            <li>Prevenir fraudes, abusos e garantir a segurança da plataforma.</li>
          </ul>

          <h2 className="text-xl font-semibold">4. Base legal (LGPD)</h2>
          <p>
            Tratamos dados com base em: consentimento (art. 7º, I), execução de contrato (art.
            7º, V), legítimo interesse para prospecção B2B (art. 7º, IX) e cumprimento de
            obrigação legal ou regulatória.
          </p>

          <h2 className="text-xl font-semibold">5. Compartilhamento</h2>
          <p>
            Não vendemos dados. Compartilhamos apenas com prestadores necessários à operação:
            infraestrutura de nuvem (Lovable Cloud/Supabase), envio de e-mails, provedores de
            IA (Google Gemini/Lovable AI Gateway) e a própria Meta (Graph API). Todos operam
            sob obrigações de confidencialidade.
          </p>

          <h2 className="text-xl font-semibold">6. Retenção</h2>
          <p>
            Mantemos os dados enquanto sua conta estiver ativa ou pelo tempo necessário para
            cumprir finalidades legais. Tokens de acesso Meta são renovados/expirados conforme
            regras da própria Meta (long-lived tokens de 60 dias).
          </p>

          <h2 className="text-xl font-semibold">7. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção, portabilidade, revogação de consentimento e
            exclusão dos seus dados a qualquer momento pelo e-mail{" "}
            <a className="underline" href="mailto:amtfightwear@gmail.com">
              amtfightwear@gmail.com
            </a>{" "}
            ou pela nossa página de{" "}
            <Link to="/data-deletion" className="underline">
              Exclusão de dados
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold">8. Desconexão da integração com a Meta</h2>
          <p>
            Você pode desconectar a integração a qualquer momento em Configurações → Instagram
            Hub → Conta, ou removendo o app em{" "}
            <a
              className="underline"
              href="https://www.facebook.com/settings?tab=business_tools"
              target="_blank"
              rel="noreferrer noopener"
            >
              facebook.com/settings?tab=business_tools
            </a>
            . A desconexão revoga imediatamente nossos tokens e interrompe a coleta de novos
            dados.
          </p>

          <h2 className="text-xl font-semibold">9. Segurança</h2>
          <p>
            Aplicamos criptografia em trânsito (TLS), controle de acesso por RLS no banco de
            dados, segredos gerenciados fora do código e auditoria de acessos. Nenhum sistema
            é 100% seguro, mas adotamos boas práticas de mercado.
          </p>

          <h2 className="text-xl font-semibold">10. Cookies</h2>
          <p>
            Utilizamos cookies estritamente necessários para autenticação e preferências de
            interface (ex.: tema claro/escuro).
          </p>

          <h2 className="text-xl font-semibold">11. Menores de idade</h2>
          <p>A plataforma é destinada a maiores de 18 anos, para uso comercial.</p>

          <h2 className="text-xl font-semibold">12. Alterações</h2>
          <p>
            Podemos atualizar esta política periodicamente. Mudanças relevantes serão
            comunicadas na plataforma ou por e-mail.
          </p>

          <h2 className="text-xl font-semibold">13. Contato</h2>
          <p>
            Dúvidas sobre privacidade ou solicitações de titular:{" "}
            <a className="underline" href="mailto:amtfightwear@gmail.com">
              amtfightwear@gmail.com
            </a>
            .
          </p>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} AMT Fight Wear. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
