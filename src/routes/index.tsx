/**
 * Execute esta instrucao no projeto: # CORREÇÃO CRÍTICA — HISTÓRICO DE NF-e / CHAVE DE ACESSO / DOWNLOAD XML E PDF

## ROTA AFETADA

`/admin/fiscal`

## OBJETIVO

Corrigir definitivamente o módulo **Fiscal → Histórico de Notas Fiscais Emitidas**.

Atualmente o histórico está exibindo uma **chave de acesso com apenas 43 dígitos**, porém uma chave de acesso de NF-e deve possuir **44 dígitos**.

Além disso, os botões/ações de **download do XML e PDF (DANFE)** precisam estar efetivamente funcionais.

Não fazer uma correção visual superficial. Investigar a origem da informação, corrigir o armazenamento/processamento e garantir que novas NF-e também sejam registradas corretamente.

---

# 1. CORRIGIR A CHAVE DE ACESSO

Uma chave de acesso de NF-e deve possuir exatamente:

**44 dígitos numéricos**

Exemplo de estrutura:

`UF + AAMM + CNPJ + modelo + série + número + forma de emissão + código numérico + dígito verificador`

A chave exibida no histórico deve ser a chave oficial retornada/gerada pela emissão da NF-e.

### IMPORTANTE

NÃO simplesmente adicionar um `0` à esquerda ou à direita da chave atual para transformá-la em 44 dígitos.

Isso poderia produzir uma chave visualmente válida, mas incorreta.

Investigar por que o sistema está salvando/exibindo somente 43 dígitos.

---

# 2. AUDITAR A ORIGEM DA CHAVE

Faça uma auditoria completa do fluxo:

**Pedido/Orçamento → Fiscal → Emissão NF-e → Autorização → Armazenamento → Histórico**

Identifique:

* onde a chave de acesso é gerada;
* onde ela é recebida do provedor fiscal;
* onde ela é salva no banco;
* qual campo do banco armazena a chave;
* como a chave é recuperada;
* como é formatada no frontend;
* se existe algum `substring`, `slice`, máscara ou truncamento;
* se algum campo está sendo convertido para número;
* se zeros à esquerda estão sendo removidos;
* se existe diferença entre `access_key`, `chave_acesso`, `chave_nfe`, `chNFe` ou nomes equivalentes;
* se o provedor fiscal retorna a chave completa em outro campo.

### MUITO IMPORTANTE

A chave de acesso deve ser tratada como **STRING**, nunca como número.

Não utilizar:

```text
integer
bigint
number
parseInt()
Number()
```

para armazenar ou manipular a chave.

Uma chave com zeros à esquerda pode perder dígitos quando convertida para número.

---

# 3. BANCO DE DADOS

Verificar o tipo do campo responsável pela chave de acesso.

Garantir que seja adequado para armazenar:

**44 caracteres numéricos**

Preferencialmente:

`VARCHAR(44)` / `TEXT`

conforme o padrão já utilizado pelo banco.

Criar uma validação para impedir o armazenamento de chaves diferentes de 44 dígitos.

Regra:

```text
^[0-9]{44}$
```

A chave não pode conter:

* espaços;
* pontos;
* hífens;
* caracteres especiais;
* letras;
* somente 43 dígitos;
* mais de 44 dígitos.

---

# 4. CORRIGIR REGISTROS EXISTENTES

Não apagar o histórico de NF-e.

Localizar todas as notas fiscais que possuem:

* chave com 43 dígitos;
* chave incompleta;
* chave com espaços;
* chave com máscara;
* chave armazenada incorretamente.

Para cada registro, tentar recuperar a **chave oficial correta** a partir da fonte original da emissão.

Verificar:

* resposta da API fiscal;
* XML armazenado;
* protocolo de autorização;
* banco de dados;
* logs da emissão;
* campo `chNFe` do XML;
* informações retornadas pelo gateway/provedor fiscal.

### REGRA

Se a chave correta puder ser recuperada, atualizar o registro.

Se não puder ser recuperada com segurança:

**NÃO inventar, completar ou modificar a chave.**

Nesse caso, marcar o registro para reprocessamento/consulta da NF-e junto ao provedor fiscal.

---

# 5. VALIDAR A CHAVE PELO XML

Quando existir XML da NF-e, utilizar a informação oficial do XML.

Verificar o atributo/campo correspondente à chave da NF-e, normalmente relacionado ao:

`Id="NFe..."`

ou ao identificador oficial retornado pelo serviço fiscal.

A chave apresentada no histórico deve corresponder à NF-e real.

Não confiar somente no número da nota ou no número da série para reconstruir a chave.

---

# 6. VALIDAÇÃO DO DÍGITO VERIFICADOR

Além de validar 44 dígitos, implementar validação do **dígito verificador da chave de acesso da NF-e**.

A chave deve:

1. possuir 44 dígitos;
2. ser numérica;
3. possuir dígito verificador válido;
4. corresponder à NF-e correta.

Não considerar uma chave válida apenas porque possui 44 caracteres.

---

# 7. HISTÓRICO DE NF-e

Na tabela/listagem do histórico em:

`/admin/fiscal`

corrigir a coluna:

**Chave de acesso**

Ela deve exibir exatamente os 44 dígitos oficiais.

Evitar truncamento visual.

Se necessário, permitir:

* exibição completa;
* copiar chave;
* tooltip com chave completa;
* botão "Copiar".

Não alterar a chave apenas para melhorar a aparência visual.

---

# 8. DOWNLOAD DO XML

Habilitar o download do **XML oficial da NF-e** para cada nota autorizada.

Criar/ativar ação:

**Baixar XML**

O botão deve:

1. localizar o XML correto da NF-e;
2. verificar se o arquivo existe;
3. disponibilizar o arquivo para download;
4. utilizar nome de arquivo adequado.

Exemplo:

`NFe_352608XXXXXXXXXXXX55001000000012345678901234.xml`

ou nomenclatura equivalente.

O arquivo baixado deve ser o XML real da NF-e, e não um JSON convertido ou arquivo fictício.

---

# 9. DOWNLOAD DO PDF / DANFE

Habilitar o download do **PDF/DANFE** correspondente à NF-e.

Botão:

**Baixar PDF**

O sistema deve:

1. localizar o DANFE/PDF correspondente;
2. verificar se existe;
3. disponibilizar o download;
4. utilizar nome de arquivo adequado.

Exemplo:

`DANFE_NFe_352608XXXXXXXXXXXX55001000000012345678901234.pdf`

Se o sistema atualmente não armazena o PDF, verificar se o provedor fiscal disponibiliza o DANFE/PDF.

Se houver possibilidade de gerar o DANFE a partir do XML, utilizar a implementação fiscal já existente no projeto.

Não criar um PDF genérico apenas para satisfazer o botão.

---

# 10. VISUALIZAÇÃO ONLINE

Se a infraestrutura atual permitir, adicionar também:

**Visualizar PDF**

para abrir o DANFE em nova aba/modal antes do download.

Manter também o botão:

**Baixar PDF**

---

# 11. STATUS DOS ARQUIVOS

Na listagem do histórico, indicar claramente se os documentos estão disponíveis.

Exemplo:

| Documento | Status       | Ação                  |
| --------- | ------------ | --------------------- |
| XML       | Disponível   | Baixar XML            |
| PDF       | Disponível   | Visualizar / Baixar   |
| XML       | Indisponível | Recuperar XML         |
| PDF       | Indisponível | Gerar/Recuperar DANFE |

Não mostrar botão funcional quando não houver arquivo.

---

# 12. RECUPERAÇÃO DE DOCUMENTOS

Caso uma NF-e tenha sido autorizada mas o XML/PDF não esteja armazenado localmente:

Criar mecanismo seguro para tentar recuperar o documento através do provedor fiscal/API já integrada ao sistema.

Fluxo:

`NF-e autorizada`

→ localizar `chave de acesso`

→ consultar provedor

→ recuperar XML

→ armazenar XML

→ gerar/recuperar DANFE

→ disponibilizar download.

Não criar uma nova NF-e.

---

# 13. SEGURANÇA

Os downloads devem respeitar as permissões existentes do módulo fiscal.

Somente usuários autorizados devem conseguir acessar:

* XML;
* DANFE;
* informações fiscais;
* documentos de clientes.

Não expor arquivos fiscais através de URLs públicas sem proteção.

Se forem utilizados arquivos armazenados em storage:

* utilizar URLs assinadas quando apropriado;
* validar autorização do usuário;
* impedir acesso a documentos de outros estabelecimentos/tenants.

---

# 14. MULTI-TENANT

O AMT utiliza arquitetura multi-tenant.

Garantir que uma empresa/tenant não consiga acessar:

* XML;
* PDF;
* chave de acesso;
* NF-e;

de outro tenant.

Toda consulta deve considerar o contexto correto da empresa/tenant.

---

# 15. NOVAS NF-e

Corrigir também o fluxo de novas emissões.

Após uma NF-e ser autorizada:

1. obter chave oficial;
2. validar 44 dígitos;
3. validar dígito verificador;
4. salvar como string;
5. salvar XML;
6. salvar referência do PDF/DANFE;
7. registrar protocolo;
8. atualizar histórico.

Não permitir que uma emissão seja considerada concluída se a chave oficial não puder ser identificada corretamente.

---

# 16. TRATAMENTO DE ERROS

Se a API fiscal retornar uma chave inválida/incompleta:

Não registrar silenciosamente como emissão normal.

Registrar erro técnico e manter o status adequado.

Exemplo:

`Documento autorizado — aguardando sincronização dos dados fiscais`

ou status equivalente.

O sistema deve permitir nova tentativa de sincronização.

---

# 17. NÃO ALTERAR FUNCIONALIDADES EXISTENTES

Preservar integralmente:

* emissão de NF-e;
* cancelamento;
* consulta;
* inutilização;
* cartas de correção, se existentes;
* integração fiscal;
* pedidos;
* orçamentos;
* financeiro;
* estoque;
* clientes;
* produtos;
* tributações;
* NCM;
* CEST;
* CFOP;
* demais funcionalidades fiscais.

A correção deve ser isolada ao problema identificado e às dependências necessárias.

---

# 18. AUDITORIA DO CÓDIGO

Antes de implementar, procurar no projeto por todas as referências relacionadas a:

`chave`

`chave_acesso`

`access_key`

`accessKey`

`chNFe`

`NFe`

`nfe_key`

`xml`

`danfe`

`pdf`

`download`

`fiscal`

`invoice`

`invoice_key`

Identificar onde ocorre:

* criação;
* armazenamento;
* transformação;
* consulta;
* exibição;
* download.

Corrigir a origem do problema, não somente a interface.

---

# 19. TESTES OBRIGATÓRIOS

Após implementar, testar:

### TESTE 1

Emitir uma nova NF-e.

Resultado:

* chave possui exatamente 44 dígitos;
* chave é numérica;
* dígito verificador é válido;
* chave corresponde à NF-e.

### TESTE 2

Abrir `/admin/fiscal`.

Resultado:

* histórico mostra chave completa;
* nenhum registro novo apresenta 43 dígitos.

### TESTE 3

Baixar XML.

Resultado:

* arquivo `.xml` real;
* XML corresponde à NF-e;
* chave no XML corresponde à chave do histórico.

### TESTE 4

Baixar PDF.

Resultado:

* arquivo `.pdf` real;
* DANFE corresponde à NF-e.

### TESTE 5

Atualizar a página.

Resultado:

* chave continua correta;
* arquivos continuam disponíveis.

### TESTE 6

Sair e entrar novamente.

Resultado:

* histórico permanece correto;
* downloads continuam funcionando.

### TESTE 7

Testar uma NF-e antiga.

Resultado:

* recuperar chave oficial;
* disponibilizar XML/PDF quando existentes.

### TESTE 8

Testar permissões.

Resultado:

* usuário sem permissão fiscal não consegue acessar os documentos.

---

# 20. CRITÉRIO FINAL DE ACEITAÇÃO

A tarefa somente estará concluída quando:

* [ ] Todas as chaves exibidas possuírem 44 dígitos.
* [ ] As chaves forem as oficiais das NF-e.
* [ ] O dígito verificador for válido.
* [ ] As chaves forem armazenadas como string.
* [ ] O problema dos 43 dígitos estiver identificado e corrigido na origem.
* [ ] Novas NF-e não apresentarem o problema.
* [ ] Registros antigos forem corrigidos quando a chave oficial puder ser recuperada.
* [ ] XML estiver disponível para download.
* [ ] PDF/DANFE estiver disponível para download.
* [ ] Os arquivos corresponderem à NF-e correta.
* [ ] Os downloads respeitarem autenticação e multi-tenancy.
* [ ] Nenhuma funcionalidade fiscal existente for quebrada.

## IMPORTANTE

Não faça apenas uma alteração no frontend para exibir 44 caracteres.

**Investigue e corrija a origem do problema no backend/banco/integração fiscal.**

Não complete chaves de 43 dígitos por tentativa.

A chave correta deve ser recuperada da fonte fiscal oficial ou do XML/protocolo da NF-e.

Ao finalizar, apresente um resumo técnico contendo:

1. causa raiz do problema dos 43 dígitos;
2. tabelas/campos alterados;
3. arquivos/componentes alterados;
4. correções feitas no backend;
5. correções feitas no frontend;
6. correções de storage/download;
7. registros antigos corrigidos;
8. testes realizados;
9. eventuais NF-e que não puderam ser corrigidas automaticamente.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { listStorefrontHome, listStoreCategories } from "@/lib/store/store.functions";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Truck,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Factory,
  Shirt,
  Palette,
  PackageCheck,
  Star,
} from "lucide-react";
import { KimonoGuideCallout } from "@/components/store/KimonoGuideLink";
import { ProductImage } from "@/components/store/ProductImage";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import heroBanner from "@/assets/loja-hero-banner.jpg";
import amtLogo from "@/assets/amt-logo.jpg";

const homeQuery = queryOptions({
  queryKey: ["store", "home"],
  queryFn: () => listStorefrontHome(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homeQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "AMT Fight Wear | Equipamentos Premium para Artes Marciais" },
      { name: "description", content: "Kimonos, faixas e equipamentos direto da fábrica. Conheça também o AMT Dojo Manager para sua academia." },
      { property: "og:title", content: "AMT Fight Wear | Premium Fight Gear" },
      { property: "og:description", content: "Equipamentos de alta performance e gestão completa para dojos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://amtfightwear.com.br/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: "AMT Fight Wear",
        url: "https://amtfightwear.com.br/",
        logo: "https://amtfightwear.com.br/icon-512.png",
        image: "https://amtfightwear.com.br/icon-512.png",
        description: "Equipamentos premium e gestão para artes marciais.",
        areaServed: "BR",
        currenciesAccepted: "BRL",
      }),
    }],
  }),
  component: StoreHomePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.38em] text-primary">
            <span className="h-px w-8 bg-primary/50" />
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function StoreHomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  const kimonoSlug = categories.find((c) => /kimono/i.test(c.name))?.slug ?? "kimonos-de-jiu-jitsu";
  const faixaSlug = categories.find((c) => /faixa/i.test(c.name))?.slug ?? "faixas-de-jiu-jitsu";

  // Vitrines enxutas: mistura destaques + novidades como "Lançamentos & Destaques"
  const lancamentos = [...data.featured, ...data.newest].filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
  ).slice(0, 8);
  const maisVendidos = [...data.bjjBelts, ...data.judoBelts].slice(0, 8);
  const premium = data.kimonos.slice(0, 8);

  return (
    <StoreShell categories={categories}>
      {/* ============================================================
          HERO
         ============================================================ */}
      <section className="relative isolate overflow-hidden bg-black text-white">
        <img
          src={heroBanner}
          alt="Atleta AMT Fight Wear em treinamento"
          width={1920}
          height={912}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-80 sm:object-right"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-center px-6 py-24 sm:px-8 sm:py-32 lg:min-h-[82vh]">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur">
              <img src={amtLogo} alt="AMT Fight Wear" width={24} height={24} className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.38em] text-white/90">
                AMT Fight Wear · E-commerce oficial
              </span>
            </div>

            <h1 className="text-[2.75rem] font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Feito para <span className="italic text-primary">quem treina</span> de verdade.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Kimonos, faixas e equipamentos direto da fábrica com alta performance e envio para todo o Brasil.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-sm font-bold uppercase tracking-widest shadow-[0_10px_30px_-8px_rgba(220,38,38,0.55)]">
                <Link to="/loja/categoria/$slug" params={{ slug: kimonoSlug }}>
                  Comprar Kimonos <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-white/30 bg-white/5 px-8 text-sm font-bold uppercase tracking-widest text-white backdrop-blur hover:bg-white/10 hover:text-white">
                <Link to="/loja/custom-shop">
                  Custom Shop <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              <span className="inline-flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-primary" /> Frete grátis R$ 399+</span>
              <span className="inline-flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-primary" /> 10x sem juros</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Compra segura</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CATEGORIAS — atalhos de navegação (menos cliques até o produto)
         ============================================================ */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-16 sm:px-8">
          <SectionHeader eyebrow="Navegue rápido" title="Escolha sua categoria" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                to="/loja/categoria/$slug"
                params={{ slug: c.slug }}
                className="group relative overflow-hidden rounded-2xl border bg-background shadow-[var(--store-shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
              >
                <ProductImage
                  src={c.image_url ?? c.preview_image}
                  alt={c.name}
                  aspect="square"
                  imgClassName="transition-transform duration-500 group-hover:scale-105"
                />
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                  <span className="text-sm font-black leading-tight text-white drop-shadow">{c.name}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Guia do kimono — conteúdo de apoio à decisão */}
      <section className="mx-auto max-w-7xl px-6 pt-12 sm:px-8">
        <KimonoGuideCallout />
      </section>

      {/* ============================================================
          VITRINE 1 — Lançamentos & Destaques
         ============================================================ */}
      {lancamentos.length > 0 && (
        <section id="destaques" className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
          <SectionHeader
            eyebrow="Novidades"
            title="Lançamentos & Destaques"
            action={
              <Link to="/loja/categoria/$slug" params={{ slug: kimonoSlug }} className="hidden shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary sm:inline-flex">
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {lancamentos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          CUPOM AMT10
         ============================================================ */}
      <section className="mx-auto max-w-7xl px-6 pb-4 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground sm:p-12">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.38em] opacity-80">Cupom de boas-vindas</div>
              <h3 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                10% off na primeira compra
              </h3>
              <p className="mt-3 text-sm leading-relaxed opacity-90 sm:text-base">
                Use o código <span className="rounded bg-primary-foreground/15 px-2 py-0.5 font-mono text-[13px] font-bold tracking-widest">AMT10</span> no checkout. Válido em todo o site.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="h-12 shrink-0 rounded-full px-8 text-xs font-bold uppercase tracking-widest">
              <a href="#destaques">Aproveitar agora <ArrowRight className="h-3.5 w-3.5" /></a>
            </Button>
          </div>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>
      </section>

      {/* ============================================================
          VITRINE 2 — Mais Vendidos (Faixas)
         ============================================================ */}
      {maisVendidos.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
          <SectionHeader
            eyebrow="Alta rotação"
            title="Mais Vendidos"
            action={
              <Link to="/loja/categoria/$slug" params={{ slug: faixaSlug }} className="hidden shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary sm:inline-flex">
                Ver faixas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {maisVendidos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          VITRINE 3 — Kimonos Coleção Premium
         ============================================================ */}
      {premium.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
          <SectionHeader
            eyebrow="Ícones AMT"
            title="Kimonos Coleção Premium"
            action={
              <Link to="/loja/categoria/$slug" params={{ slug: kimonoSlug }} className="hidden shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary sm:inline-flex">
                Ver coleção <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {premium.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          CUSTOM SHOP — 3 passos
         ============================================================ */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(220,38,38,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.38em] text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Custom Shop
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Sua peça, do <span className="italic text-primary">seu jeito</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Customização direto da fábrica com padrão AMT. Três passos, resultado exclusivo.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              { n: "01", icon: Shirt, title: "Escolha a peça", desc: "Kimono, faixa ou rashguard AMT com fit e tecido premium." },
              { n: "02", icon: Palette, title: "Envie sua arte", desc: "Patches, bordados ou logotipos da sua academia." },
              { n: "03", icon: PackageCheck, title: "Receba em casa", desc: "Peça 100% exclusiva no padrão de fábrica AMT." },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.06]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-4xl font-black text-white/10">{n}</div>
                </div>
                <div className="text-xl font-bold tracking-tight">{title}</div>
                <div className="mt-2 text-sm leading-relaxed text-white/65">{desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Button asChild size="lg" className="h-12 rounded-full px-10 text-sm font-bold uppercase tracking-widest shadow-[0_10px_30px_-8px_rgba(220,38,38,0.55)]">
              <Link to="/loja/custom-shop">
                Customizar Agora <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST SIGNALS — barra horizontal
         ============================================================ */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4 sm:px-8 sm:py-12">
          {[
            { icon: Truck, title: "Frete grátis", desc: "Acima de R$ 399" },
            { icon: CreditCard, title: "10x sem juros", desc: "No cartão" },
            { icon: RefreshCw, title: "Troca fácil", desc: "7 dias" },
            { icon: Factory, title: "Direto da fábrica", desc: "Sem intermediários" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          AVALIAÇÕES — prova social
         ============================================================ */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <SectionHeader eyebrow="Prova social" title="Quem treina, aprova" />
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {[
            { name: "Rafael M.", role: "Faixa preta de Jiu-Jitsu", text: "Kimono impecável, costura reforçada e o caimento é perfeito. Chegou antes do prazo." },
            { name: "Juliana P.", role: "Competidora de Muay Thai", text: "Já é minha terceira compra. Qualidade de fábrica com preço justo e atendimento rápido." },
            { name: "Professor André", role: "Dono de academia", text: "Fizemos as faixas personalizadas do dojo. Acabamento premium e entrega dentro do combinado." },
          ].map((r) => (
            <figure key={r.name} className="card-elevated flex h-full flex-col gap-4 p-6">
              <div className="flex gap-0.5 text-primary" aria-label="Avaliação 5 de 5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">“{r.text}”</blockquote>
              <figcaption className="text-xs">
                <span className="font-bold text-foreground">{r.name}</span>
                <span className="block text-muted-foreground">{r.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <RecentlyViewed title="Continue de onde parou" />
      </div>

      {/* ============================================================
          DOJO MANAGER — banner institucional pré-footer
         ============================================================ */}

      <section id="dojo-manager" className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-neutral-50 via-white to-neutral-100 p-10 sm:p-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,rgba(220,38,38,0.08),transparent_70%)]" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.38em] text-primary">Para academias</div>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                Gerencia uma Academia de Artes Marciais?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Conheça o <strong className="text-foreground">AMT Dojo Manager</strong>: o software completo para controle de alunos, graduações e financeiro.
              </p>
            </div>
            <Button asChild size="lg" variant="outline" className="h-12 shrink-0 rounded-full px-8 text-xs font-bold uppercase tracking-widest">
              <a href="https://dojomanager.amtfightwear.com.br" target="_blank" rel="noreferrer">
                Conhecer Sistema <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {lancamentos.length === 0 && maisVendidos.length === 0 && premium.length === 0 && (
        <div className="mx-auto max-w-7xl px-6 py-24 text-center sm:px-8">
          <p className="text-lg text-muted-foreground">Catálogo em preparação. Em breve novos produtos.</p>
        </div>
      )}
    </StoreShell>
  );
}
