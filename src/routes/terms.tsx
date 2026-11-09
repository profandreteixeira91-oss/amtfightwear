import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Termos de Serviço — AMT Fight Wear" },
      {
        name: "description",
        content:
          "Termos de Serviço das ferramentas AMT Growth Engine e AMT Social, operadas pela AMT Fight Wear, incluindo a integração com a Meta (Facebook e Instagram).",
      },
      { property: "og:title", content: "Termos de Serviço — AMT Fight Wear" },
      {
        property: "og:description",
        content: "Condições de uso das ferramentas AMT Growth Engine e AMT Social e da integração com a Meta.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://amtfightwear.com.br/terms" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/terms" }],
  }),
});

const UPDATED = "9 de novembro de 2026";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

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

      <main className="container mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed">
        <h1 className="text-3xl font-bold tracking-tight">Termos de Serviço</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {UPDATED}</p>

        <p className="mt-6">
          Estes Termos de Serviço regem o uso das ferramentas <b>AMT Growth Engine</b> e <b>AMT Social</b>
          (em conjunto, a "Plataforma"), operadas pela <b>AMT Fight Wear</b> ("AMT", "nós"), inclusive a
          integração com produtos da Meta Platforms, Inc. (Facebook, Instagram e API de Marketing). Ao acessar ou
          usar a Plataforma, você concorda com estes termos e com a nossa{" "}
          <Link to="/privacy" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>

        <Secao titulo="1. O que é a Plataforma e quem pode usar">
          <p>
            A Plataforma é um conjunto de ferramentas internas da AMT para gerenciar as presenças oficiais das marcas
            <b> AMT Fight Wear</b> e <b>AMT Dojo Manager</b> no Instagram e no Facebook. O acesso é restrito à equipe
            da AMT e a parceiros expressamente autorizados, maiores de 18 anos e para uso comercial. Cada pessoa é
            responsável por manter seu acesso em sigilo.
          </p>
        </Secao>

        <Secao titulo="2. O que a Plataforma faz">
          <ul className="list-disc space-y-1 pl-5">
            <li>Publica nas contas próprias da AMT os conteúdos (posts, stories e reels) aprovados pela equipe.</li>
            <li>Lê métricas das publicações e das contas (alcance, engajamento, seguidores) para relatórios internos.</li>
            <li>
              Lê e responde comentários e mensagens diretas recebidos nas contas da AMT, inclusive respostas automáticas
              por palavra-chave, sempre para quem interagiu primeiro com a marca.
            </li>
            <li>
              Cria e acompanha anúncios na conta de anúncios da própria AMT, a partir de publicações das marcas. Os
              anúncios são criados <b>pausados</b> e só passam a veicular quando um responsável da AMT os ativa
              manualmente, definindo orçamento e duração.
            </li>
            <li>
              Apoia a prospecção comercial B2B com informações de fontes públicas. O envio de mensagens a contatos que
              não falaram conosco antes é sempre feito manualmente por uma pessoa, nunca de forma automática.
            </li>
          </ul>
        </Secao>

        <Secao titulo="3. Integração com a Meta">
          <p>
            O uso de Facebook, Instagram e da API de Marketing segue os Termos da Plataforma, as Políticas para
            Desenvolvedores, os Padrões de Publicidade e as Diretrizes da Comunidade da Meta. As permissões solicitadas à
            Meta são usadas exclusivamente para as Páginas, contas do Instagram e contas de anúncios da própria AMT,
            para as finalidades descritas acima.
          </p>
          <p>
            Tokens de acesso são guardados de forma protegida e nunca são compartilhados. Dados recebidos da Meta não são
            vendidos nem cedidos a terceiros, exceto aos prestadores necessários à operação listados na Política de
            Privacidade. A integração pode ser desconectada a qualquer momento removendo o app em{" "}
            <a
              className="underline"
              href="https://www.facebook.com/settings?tab=business_tools"
              target="_blank"
              rel="noreferrer noopener"
            >
              facebook.com/settings?tab=business_tools
            </a>
            , e a exclusão de dados pode ser solicitada na página de{" "}
            <Link to="/data-deletion" className="underline">
              Exclusão de dados
            </Link>
            .
          </p>
        </Secao>

        <Secao titulo="4. Uso proibido">
          <p>Não é permitido usar a Plataforma para:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>spam, mensagens automáticas não solicitadas ou qualquer forma de contato abusivo;</li>
            <li>publicar ou anunciar conteúdo enganoso, ilícito ou que viole direitos de terceiros;</li>
            <li>coletar dados por raspagem (scraping) ou burlar limites e controles da Meta;</li>
            <li>engenharia reversa, acesso não autorizado ou uso fora das finalidades descritas nestes termos.</li>
          </ul>
        </Secao>

        <Secao titulo="5. Conteúdo, marcas e anúncios">
          <p>
            Os conteúdos publicados e as marcas AMT Fight Wear e AMT Dojo Manager pertencem à AMT. Materiais de terceiros
            só são usados com autorização. Orçamento, duração e público dos anúncios são definidos e aprovados pela AMT;
            a análise, a aprovação, a veiculação e a cobrança dos anúncios são feitas pela Meta, conforme as regras dela.
          </p>
        </Secao>

        <Secao titulo="6. Disponibilidade e responsabilidade">
          <p>
            A Plataforma é fornecida "no estado em que se encontra". Ela depende de serviços de terceiros, como a Meta, que
            podem mudar, limitar ou interromper recursos sem aviso. Na medida permitida pela lei, a AMT não responde por
            indisponibilidades desses serviços, por decisões da Meta sobre publicações e anúncios, nem por danos indiretos
            decorrentes do uso da Plataforma.
          </p>
        </Secao>

        <Secao titulo="7. Privacidade e dados pessoais">
          <p>
            O tratamento de dados pessoais segue a Lei Geral de Proteção de Dados (Lei 13.709/2018) e está descrito na
            nossa{" "}
            <Link to="/privacy" className="underline">
              Política de Privacidade
            </Link>
            . Pedidos de acesso, correção ou exclusão podem ser feitos pela página de{" "}
            <Link to="/data-deletion" className="underline">
              Exclusão de dados
            </Link>{" "}
            ou pelo e-mail abaixo.
          </p>
        </Secao>

        <Secao titulo="8. Suspensão e encerramento">
          <p>
            A AMT pode suspender ou encerrar o acesso de quem violar estes termos ou as políticas da Meta, e pode
            descontinuar a Plataforma a qualquer momento.
          </p>
        </Secao>

        <Secao titulo="9. Alterações">
          <p>
            Estes termos podem ser atualizados. A data da última atualização aparece no topo da página, e o uso
            continuado da Plataforma após a mudança significa concordância com a nova versão.
          </p>
        </Secao>

        <Secao titulo="10. Lei aplicável">
          <p>Estes termos são regidos pelas leis da República Federativa do Brasil.</p>
        </Secao>

        <Secao titulo="11. Contato">
          <p>
            Dúvidas sobre estes termos:{" "}
            <a className="underline" href="mailto:amtfightwear@gmail.com">
              amtfightwear@gmail.com
            </a>{" "}
            · Site oficial:{" "}
            <a className="underline" href="https://amtfightwear.com.br">
              amtfightwear.com.br
            </a>
          </p>
        </Secao>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} AMT Fight Wear.
        </footer>
      </main>
    </div>
  );
}
