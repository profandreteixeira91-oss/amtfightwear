Vou transformar o Dojo Manager em um SaaS independente, servido no subdomínio `dojo.amtfightwear.com.br`, com acesso liberado apenas para quem tem assinatura ativa (R$ 59,90/mês, trial de 14 dias) via Mercado Pago.

## Estrutura de rotas

```text
/dojo                       → Landing pública (pitch, preço, CTA "Começar trial")
/dojo/auth                  → Login/cadastro dedicado do Dojo Manager
/dojo/checkout              → Iniciar assinatura Mercado Pago (preapproval)
/dojo/billing               → Portal do assinante (status, cancelar, atualizar cartão)
/dojo/app                   → Layout autenticado + protegido por assinatura
/dojo/app/dashboard         → Dashboard financeiro/alunos
/dojo/app/students          → Alunos (migra de /dojo/students)
/dojo/app/students/:id      → Prontuário
/dojo/app/graduations       → Graduações
/dojo/app/certificates      → Certificados
/dojo/app/plans             → Planos de mensalidade
/dojo/app/units             → Unidades
/dojo/app/financials        → Financeiro/faturas
/dojo/app/checkin           → Check-in (Fase 2)
/dojo/app/integrations      → GymPass/TotalPass (Fase 2)
```

- Remove todo o Dojo Manager do `AppTopNav` administrativo da loja — os dois sistemas passam a ser independentes.
- O subdomínio `dojo.amtfightwear.com.br` aponta para o mesmo projeto; um pequeno middleware no `__root` reescreve `/` → `/dojo` quando o host é o subdomínio, para o cliente enxergar a landing direto na raiz.

## Isolamento por usuário

- Adiciono coluna `owner_id uuid` (FK `auth.users`) em todas as tabelas `dojo_*` existentes.
- Migro os registros atuais para o e-mail do administrador (`profandreteixeira91@gmail.com`) para não perder os dados já cadastrados.
- Substituo as policies "admin only" por policies escopadas a `auth.uid() = owner_id`, mantendo o admin com acesso total via `has_role('admin')`.
- Todas as server functions `dojo/*` passam a filtrar por `owner_id = context.userId`.

## Assinatura (Mercado Pago Preapproval)

- Nova tabela `dojo_subscriptions` (`owner_id`, `mp_preapproval_id`, `status`, `plan_amount`, `trial_ends_at`, `current_period_end`, timestamps).
- `createDojoSubscription` server function: cria `preapproval` no Mercado Pago (R$ 59,90, frequência mensal, `free_trial: { frequency: 14, frequency_type: "days" }`) e retorna o `init_point` para redirecionamento.
- Webhook em `/api/public/hooks/mercadopago-dojo`: consome eventos `preapproval` e sincroniza `status` (`authorized`, `paused`, `cancelled`, `pending`).
- Middleware `requireDojoSubscription` (compõe com `requireSupabaseAuth`): consulta `dojo_subscriptions`; libera se `status IN ('authorized','trialing')` **ou** se o usuário é admin. Redireciona para `/dojo/checkout` caso contrário.
- Página `/dojo/billing` mostra status, próxima cobrança, botão de cancelar (chama `cancelDojoSubscription` que atualiza o preapproval no MP para `cancelled`).

## Landing `/dojo`

- Hero: "Gestão completa do seu Dojo em um só lugar"
- Blocos: Alunos & Graduações · Financeiro & Mensalidades · Certificados · Check-in & GymPass · WhatsApp (em breve)
- Preço destacado: R$ 59,90/mês · 14 dias grátis · cancele quando quiser
- CTA principal → `/dojo/auth?redirect=/dojo/checkout`
- Rodapé próprio (não usa o da loja)

## Passos de execução

1. **Migração SQL**: coluna `owner_id`, backfill, RLS, tabela `dojo_subscriptions`.
2. **Backend**: `src/lib/dojo/subscription.functions.ts` + `subscription.server.ts` + webhook público.
3. **Layout**: `src/components/dojo/DojoShell.tsx` (nav própria do SaaS) + `_dojo` pathless layout com guarda de assinatura.
4. **Rotas**: cria `/dojo`, `/dojo/auth`, `/dojo/checkout`, `/dojo/billing`, move as telas dojo para `/dojo/app/*` (mantendo redirects das antigas `/dojo/*`).
5. **Nav**: remove grupo Dojo Manager do `AppTopNav.tsx`.
6. **DNS**: você aponta `dojo.amtfightwear.com.br` para o Lovable em Project Settings → Domains após publicar; te passo as instruções.

## Detalhes técnicos

- Uso `preapproval_plan` do Mercado Pago (recorrência mensal com trial). Segredo já existe: `MERCADOPAGO_ACCESS_TOKEN`.
- Webhook: valida assinatura via `x-signature` do MP (segredo `MERCADOPAGO_WEBHOOK_SECRET` já configurado).
- Preservo dados existentes: migração faz `UPDATE ... SET owner_id = <admin uuid>` antes de aplicar `NOT NULL`.
- O admin da loja (`has_role('admin')`) continua acessando o Dojo Manager sem precisar de assinatura, para fins de teste/suporte.

Aprova para eu executar?