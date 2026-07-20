# Onboarding obrigatório do dono do dojo

## Contexto (análise da imagem "Análise cadastral" do Asaas)
A imagem lista 5 blocos exigidos pelo Asaas: **Aprovação geral do cadastro, Dados comerciais, Dados bancários, Dados do boleto, Documentos**. Hoje o sistema coleta parcialmente Dados comerciais e endereço, mas deixa passar Dados bancários (chave PIX / conta) e Documentos — por isso a subconta cai em "Pendente" e exige e-mail de confirmação.

Ao terminar todo o preenchimento, a criação da subconta Asaas já sai como `APPROVED` (sem verificação manual) e o sistema é liberado.

## Objetivo do fluxo
1. Usuário cria conta (email/senha ou Google).
2. Se `dojo_academy_profile.onboarding_completed = false` **ou** faltar qualquer campo obrigatório → redireciona para `/dojo/onboarding` em **tela única, fullscreen, sem sidebar/topbar**.
3. Só depois de todos os campos preenchidos + subconta Asaas criada com sucesso → marca `onboarding_completed=true` e libera acesso ao `/dojo/app/*`.

## Campos obrigatórios (mapeados para Asaas)

**1. Dados pessoais do responsável**
- Nome completo (`legal_name`)
- CPF ou CNPJ (`cnpj`) — se CPF → exige `birth_date`; se CNPJ → exige `company_type` (MEI/LTDA/INDIVIDUAL/ASSOCIATION) + razão social
- E-mail (`email`)
- Celular com DDD (`whatsapp` — usado como `mobilePhone` no Asaas)
- Telefone fixo (opcional, `phone`)

**2. Dados comerciais do dojo**
- Nome fantasia (`trade_name`)
- Faturamento mensal estimado (`monthly_income`, mínimo R$ 1.000)
- Modalidade principal (`modalities`)
- Site/Instagram (opcional)

**3. Endereço completo** (CEP puxa via ViaCEP)
- CEP (`zip`), Logradouro (`address`), Número (`address_number`), Complemento (opcional), Bairro (`neighborhood`), Cidade (`city`), UF (`state`)

**4. Dados bancários / Recebimento** (novo)
- Chave PIX (`pix_key` + `pix_key_type`) — obrigatória para saques
- Aceite dos termos AMT Pay (checkbox) — condição para split de 5%

**5. Documentos** (novo — upload no bucket `dojo-documents`)
- Documento de identidade (RG/CNH) — frente/verso
- CNPJ: Cartão CNPJ ou Contrato Social
- Comprovante de endereço (últimos 90 dias)

## Mudanças técnicas

**Banco (`supabase--migration`)**
- Nova tabela `dojo_onboarding_documents` (owner_id, doc_type, file_url, uploaded_at) com RLS por `owner_id`.
- Novo bucket público=false `dojo-documents` + policies (SELECT/INSERT owner-only, admin all).
- Adicionar coluna `onboarding_completed boolean default false` e `onboarding_completed_at timestamptz` em `dojo_academy_profile`.

**Rota nova `/dojo/onboarding`**
- Fora do layout `dojo.app.tsx` — página fullscreen com logo AMT no topo, progresso em 5 passos (stepper), botões "Voltar / Continuar" e "Concluir cadastro".
- Cada passo valida antes de avançar (zod).
- Ao concluir → chama `createMyAsaasSubaccount` + marca `onboarding_completed=true`; erro do Asaas mantém no último passo.

**Gate no `dojo.app.tsx`**
- No loader/`beforeLoad` de `_dojo` (ou hook no layout): carrega perfil; se `!onboarding_completed` **ou** falta campo obrigatório → `redirect({ to: "/dojo/onboarding" })`.
- Signup (`dojo.auth.tsx`): após login bem-sucedido, se perfil incompleto → redireciona para `/dojo/onboarding` em vez de `/dojo/app`.

**Server functions**
- Atualizar `asaasCreateSubaccount` para incluir `incomeValue`, `birthDate`, `companyType`, `loginEmail=email`, `mobilePhone` — garante APPROVED sem confirmação.
- Nova `uploadOnboardingDocument({ docType, fileBase64, mime })` grava no bucket e registra.
- Nova `finishOnboarding()` valida tudo, cria subconta e marca `onboarding_completed=true`.

## Fora de escopo desta iteração
- Editar documentos após conclusão (o AMT Pay já permite redefinir/upload extra depois).
- Verificação automática do status dos documentos no Asaas (Asaas exige upload via painel deles pra alguns tipos — mantemos o link "Completar cadastro Asaas" já existente).
