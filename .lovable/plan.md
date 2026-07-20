
# Cobrança recorrente de mensalidades via Asaas (modo NextFit)

## Diagnóstico do fluxo atual

Hoje, ao matricular um aluno em um plano (`enrollStudentWithPlan`):

1. Criamos matrícula em `dojo_enrollments`.
2. Criamos **apenas** a primeira fatura em `dojo_invoices` (local).
3. Opcionalmente geramos link de checkout Mercado Pago da 1ª mensalidade.
4. As mensalidades seguintes são geradas **localmente por um cron mensal** (`generateMonthlyInvoices` / `/api/public/hooks/generate-dojo-invoices`) — sem gateway, sem QR/boleto/link automáticos.

Ou seja: o Asaas não conhece o plano do aluno. Não há assinatura, não há emissão automática de PIX/Boleto/Cartão, e não há webhook para conciliar pagamentos. Não é o modelo NextFit.

## Modelo alvo (NextFit)

Plano criado → aluno matriculado no plano → **criamos uma Subscription no Asaas** com o ciclo do plano → o Asaas passa a **emitir cada cobrança automaticamente** na data de vencimento e nos envia os eventos → nós apenas **espelhamos** as cobranças em `dojo_invoices` via webhook. Cancelamento da matrícula cancela a subscription.

```text
[Plano]  ──▶  [Matrícula]  ──▶  [Asaas Customer + Subscription]
                                        │  emite cobrança a cada ciclo
                                        ▼
                              [Webhook Asaas] ──▶ dojo_invoices (upsert)
```

## Escopo

### 1. Banco (uma migration)
- `dojo_students`: adicionar `asaas_customer_id text` (cache do customer no Asaas).
- `dojo_enrollments`: adicionar `asaas_subscription_id text`, `billing_type text` (PIX/BOLETO/CREDIT_CARD/UNDEFINED), `payment_method_code text`.
- Índices em `dojo_invoices(asaas_charge_id)` e `dojo_enrollments(asaas_subscription_id)` para o webhook.

### 2. Cliente Asaas (`src/lib/asaas/client.server.ts`)
- Adicionar `asaasListSubscriptionPayments(subId, apiKey?)` para puxar a 1ª cobrança emitida logo após criar a subscription.
- Reaproveitar `asaasCreateSubscription`, `asaasCancelSubscription`, `asaasCreateCustomer`, `asaasFindCustomerByCpfCnpj` (já existem).

### 3. Helper novo (`src/lib/asaas/enrollment.server.ts`)
- `ensureAsaasCustomerForStudent(supabase, student)` — busca por CPF; cria se não existir; grava `asaas_customer_id` no aluno.
- `mapFrequencyToAsaasCycle(plan)` — `monthly→MONTHLY`, `bimonthly→BIMONTHLY`, `quarterly→QUARTERLY`, `quadrimestral→QUARTERLY` (Asaas não tem quadrimestral; será tratada como QUARTERLY + validação), `semiannual→SEMIANNUALLY`, `annual→YEARLY`. `custom` bloqueia com mensagem clara (Asaas não expõe ciclo arbitrário em meses).
- `mapPaymentMethodToBillingType(code)` — `pix→PIX`, `boleto→BOLETO`, `credit_card→CREDIT_CARD`, `payment_link|recurring→UNDEFINED` (Asaas deixa o aluno escolher na página de pagamento).
- `resolveDojoApiKey(profile)` — se o dojo tem `asaas_api_key_encrypted` (subconta), usa; senão cai na chave AMT. Split de 5% para `ASAAS_WALLET_ID_AMT` só quando a chave usada é da subconta do dojo.

### 4. Refatorar `enrollStudentWithPlan` (`src/lib/dojo/dojo.functions.ts`)
- Passa a receber `payment_method_code` (pix / boleto / credit_card / payment_link / manual / cash) em vez do enum atual.
- Valida que o `payment_method_code` está habilitado no plano (`dojo_plans.payment_methods`).
- Cria a matrícula localmente.
- Se o método é gateway-based (não `manual`/`cash`):
  1. Garante o Asaas Customer do aluno.
  2. Cria a Subscription no Asaas com o ciclo do plano, `nextDueDate = first_due_date`, `value`, `description = "Mensalidade — <plano>"`, `externalReference = enrollment_id`, split 5% AMT quando aplicável.
  3. Grava `asaas_subscription_id` e `billing_type` no enrollment.
  4. Chama `asaasListSubscriptionPayments` para obter a **1ª cobrança emitida pelo Asaas** e faz upsert em `dojo_invoices` com `asaas_charge_id`, `asaas_invoice_url`, `payment_link`, `provider='asaas'`. (O webhook cuida das seguintes.)
- Se o método é `manual`/`cash`: mantém o comportamento atual (fatura local, sem gateway).
- Retorna `{ enrollment_id, invoice_id, invoice_url, asaas_subscription_id }`.

### 5. Cancelamento (`cancelEnrollment` novo)
- Marca enrollment `status = 'cancelled'`.
- Se tem `asaas_subscription_id`, chama `asaasCancelSubscription` para o Asaas parar de emitir cobranças.
- Cancela cobranças `pending` futuras opcionalmente (config no plano).

### 6. Webhook Asaas (`src/routes/api/public/hooks/asaas.ts`) — novo
- Valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN` (timing-safe).
- Trata eventos:
  - `PAYMENT_CREATED` → localiza `enrollment` pela `subscription` do payload, faz upsert em `dojo_invoices` (chave `asaas_charge_id`) com status `pending`, salva `invoice_url`, `pix_qrcode`, `pix_copypaste`.
  - `PAYMENT_UPDATED` → atualiza valor/vencimento.
  - `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `status='paid'`, `paid_at = now()`.
  - `PAYMENT_OVERDUE` → `status='overdue'`.
  - `PAYMENT_DELETED` / `PAYMENT_REFUNDED` → `status='cancelled'` ou `refunded`.
- Usa `supabaseAdmin` (webhook público). Idempotente (upsert por `asaas_charge_id`).
- Retorno 200 rápido; erros logam mas retornam 200 salvo assinatura inválida (401).

### 7. Cron de fallback
- `generateMonthlyInvoices` continua rodando, mas ignora enrollments que já têm `asaas_subscription_id` (Asaas emite). Cobre apenas matrículas `manual`/`cash`.

### 8. UI — mínimo necessário
- Diálogo de matrícula em `dojo.app.students.$id.tsx`: substituir o seletor "manual / mp_link" por um select das formas de pagamento habilitadas do plano; ao confirmar, chamar o novo `enrollStudentWithPlan` e exibir `invoice_url` (abrir em nova aba).
- Botão "Cancelar matrícula" que chama `cancelEnrollment`.
- Nenhuma outra tela precisa mudar — a lista de faturas já lê `dojo_invoices` e vai receber as cobranças automaticamente via webhook.

## Configuração pós-deploy (usuário faz uma única vez)
No painel Asaas → Integrações → Webhooks, cadastrar:
- URL: `https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/asaas`
- Token de autenticação: valor de `ASAAS_WEBHOOK_TOKEN` (já configurado)
- Eventos: `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`

## Pontos de atenção
- **Ciclo "custom" e "quadrimestral"**: Asaas Subscriptions não suporta ciclo arbitrário em meses. `custom` será rejeitado com mensagem clara ("Planos personalizados exigem cobrança manual"). `quadrimestral` cai para `QUARTERLY` com aviso, ou pode ser bloqueado — decisão sua.
- **Split 5% AMT**: só é aplicado quando a chave usada é da subconta do dojo. Se o dojo usa a conta AMT central, o split não faz sentido.
- **Idempotência**: matrícula com Asaas depende do CPF do aluno; alunos sem CPF caem obrigatoriamente em `manual`.

## Entrega
Aprovado o plano, executo em duas etapas: (1) migration; (2) todo o código (helpers, refactor do enroll, webhook, cron, UI mínima).
