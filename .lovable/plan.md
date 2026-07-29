## Objetivo

Criar o módulo **Tutorial** no Dojo Manager (`/dojo/app/tutorial`): o dono escolhe uma dúvida ("Como cadastro um aluno?"), o sistema o leva ao módulo correto e o guia com um passo a passo sobreposto na tela real, destacando os botões que ele deve clicar.

## Como funciona (visão do usuário)

1. Entra em **Ajuda → Tutorial** (novo item no menu, também acessível por um botão "?" flutuante).
2. Vê a central de dúvidas: busca por texto + categorias (Primeiros passos, Alunos, Financeiro, Rotina, Graduações, App do aluno, Configurações).
3. Clica na dúvida. O sistema navega para o módulo correspondente e abre um **painel guia** (canto inferior direito, arrastável/minimizável).
4. O painel mostra "Passo 1 de 5" com a instrução, e um **destaque visual (spotlight)** cai sobre o botão/campo daquele passo.
5. O aluno-dono clica "Próximo" (ou o guia avança sozinho quando o passo é concluído, ex.: modal abriu). Pode pausar, voltar, sair ou marcar como concluído.
6. A trilha fica marcada como concluída e o progresso aparece na central e no onboarding inicial.

## Estrutura de conteúdo

Cada tutorial é uma **trilha declarativa** (arquivo TypeScript, sem banco para o conteúdo):

```text
{
  id: "cadastrar-aluno",
  titulo: "Como cadastrar um novo aluno",
  categoria: "Alunos",
  duracao: "2 min",
  rota: "/dojo/app/students",
  passos: [
    { texto: "Clique em Novo aluno", alvo: "[data-tour='students-new']", acao: "click" },
    { texto: "Preencha nome e telefone", alvo: "[data-tour='student-name']" },
    ...
  ]
}
```

- Cada passo aponta para um **`data-tour="..."`** já presente (ou a ser adicionado) no elemento real do módulo.
- Se o elemento não existir na tela (ex.: usuário fechou o modal), o guia mostra a instrução em texto sem spotlight — nunca quebra.

## Trilhas do primeiro lote (cobrindo o núcleo)

- **Primeiros passos**: configurar academia/logo/cores, criar unidade, criar planos, criar faixas (Modalidades e faixas), convidar equipe.
- **Alunos**: cadastrar aluno (wizard), matricular em plano, gerar cobrança, link de auto-matrícula pública, excluir/inativar.
- **Rotina**: criar turma, montar agenda, check-in (QR fixo, PIN, foto), ranking de presenças.
- **Financeiro**: cobrança avulsa x recorrência, marcar pago, inadimplência, AMT Pay (ativar gateway, taxas, saque).
- **Graduações**: critérios (tempo/aulas/mérito), graduar aluno, emitir certificado.
- **App do aluno**: como o aluno acessa, avisos e notificações push, múltiplos alunos por e-mail.
- **Loja/Vendas**: registrar venda, produtos, pedidos.

## Detalhes técnicos

- `src/lib/dojo/tutorial/tracks.ts` — catálogo das trilhas (conteúdo puro, tipado).
- `src/components/dojo/tutorial/TutorialProvider.tsx` — contexto global (trilha ativa, passo, iniciar/avançar/sair), montado em `src/routes/dojo.app.tsx` para sobreviver à navegação entre módulos.
- `src/components/dojo/tutorial/TourOverlay.tsx` — spotlight (recorte via box-shadow sobre o elemento alvo, com `getBoundingClientRect` + observer de resize/scroll) e o cartão de instrução; responsivo (em mobile o cartão vira barra inferior).
- `src/routes/dojo.app.tutorial.tsx` — central de dúvidas com busca, categorias, cards de trilha e progresso.
- `data-tour` adicionado nos botões-chave dos módulos alvo (mudança puramente de marcação, sem alterar lógica).
- Progresso salvo por usuário: tabela `dojo_tutorial_progress` (`owner_id`, `track_id`, `status`, `step`, `completed_at`) com RLS por `owner_id` e GRANTs; fallback em localStorage antes de sincronizar.
- Menu: novo item **Tutorial** no grupo "Conta"/Ajuda do `AppTopNav` + atalho "?" no cabeçalho vermelho do Dojo.
- Estética Ruby Noir, consistente com os demais módulos.

## Fora do escopo desta etapa

Vídeos gravados, tutorial para o app do aluno e tradução multi-idioma — podem entrar depois reutilizando a mesma engine.
