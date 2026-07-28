# Seletor de Aluno no App (contas compartilhando e-mail)

Hoje o app do aluno resolve UM único cadastro a partir do usuário logado (via
`get_my_student_id()` e consultas `dojo_students … limit 1`). Se o mesmo e-mail
está vinculado a pai e filho (dois registros em `dojo_students`), apenas um é
exposto. A ideia é permitir que o mesmo usuário alterne entre os alunos que
ele legitimamente possa acessar.

## O que muda para o usuário

- No topo da home do app (`/app/*`) surge um seletor com todos os alunos
  vinculados ao e-mail do usuário logado (ou ao `user_id`).
- Um único seletor troca instantaneamente o "aluno ativo": home, faixas,
  frequência, ranking, contratos, mensalidades, check-ins, notificações,
  vídeos e ranking passam a refletir os dados daquele aluno.
- Se houver apenas um aluno vinculado, o seletor não aparece (comportamento
  atual preservado).
- A escolha fica salva em `localStorage` (por usuário) para persistir entre
  aberturas do PWA; ao trocar de usuário, o seletor reseta.

## Como fica tecnicamente

### 1. Banco: descobrir todos os alunos elegíveis
Nova RPC `list_my_students()` `SECURITY DEFINER` que retorna todos os
`dojo_students` cujo `user_id = auth.uid()` OU `email = auth.users.email` do
usuário logado, com `id, full_name, photo_url, owner_id, unit_id`.

A RPC não substitui `get_my_student_id()`; ela apenas lista candidatos.

### 2. Banco: "aluno ativo" via GUC de sessão
`get_my_student_id()` passa a ler `current_setting('app.active_student_id', true)`:
- Se o valor estiver definido E existir um aluno cujo `id = valor` e
  `user_id = auth.uid()` OU `email = auth.email()`, retorna esse id.
- Caso contrário, cai no comportamento atual (primeiro match, priorizando
  `user_id`).

Nova RPC `set_active_student(_id uuid)` `SECURITY DEFINER` que:
1. Valida elegibilidade (mesma condição do `list_my_students`).
2. Executa `perform set_config('app.active_student_id', _id::text, true)`.
3. Retorna o id validado.

Como o GUC com `is_local = true` vive apenas na transação atual, ele é
usado como "sub-rotina" chamada no início de cada server function.

### 3. Middleware: propagar o aluno ativo por request
- O cliente passa `x-active-student: <uuid>` em todas as chamadas de server fn
  (já usa `functionMiddleware`; adicionamos um attacher que injeta o header a
  partir do `localStorage`).
- `requireSupabaseAuth` (ou um novo middleware `resolveActiveStudent`) lê o
  header, chama `supabase.rpc('set_active_student', { _id })` em uma primeira
  query e guarda `context.activeStudentId`. Se o id for inválido, é ignorado
  (fallback silencioso).

Como cada query supabase-js roda em conexão separada, precisamos garantir
que as server functions passem o `student_id` explicitamente também: o
middleware adiciona `context.activeStudentId` para uso direto nas queries.

### 4. Server functions: usar `context.activeStudentId`
Substituir o padrão atual em ~15 arquivos:

```ts
// antes
const { data: me } = await ctx.supabase
  .from("dojo_students").select("id").limit(1).maybeSingle();

// depois
const me = await resolveMyStudent(ctx);  // novo helper
```

`resolveMyStudent(ctx)`:
1. Se `ctx.activeStudentId` está setado, faz `select` filtrando por esse id
   (RLS ainda garante que só retorna se o id for elegível).
2. Se não retornou, faz o fallback atual (`limit(1)`).

Arquivos afetados: `student.functions.ts`, `announcements.functions.ts`,
`ranking.functions.ts`, `competitions.functions.ts`,
`unit-qr-checkin.functions.ts`, `payments.functions.ts`, `push.functions.ts`,
`contracts.server.ts` e derivados.

### 5. RLS de `dojo_students` (SELECT)
Verificar se a policy atual já cobre `email = auth.email()`. Se cobrir apenas
`user_id = auth.uid()`, ampliar para incluir também o match por e-mail — sem
isso o `list_my_students` retorna vazio para o pai/filho.

### 6. UI: componente `StudentSwitcher`
- Novo componente em `src/components/student-app/StudentSwitcher.tsx`.
- Renderizado no cabeçalho do layout `app._student.tsx`.
- Usa `useQuery(listMyStudents)`; se ≤1 aluno, não renderiza nada.
- Ao trocar, grava `localStorage["student-app:active-student"]`, invalida
  todas as queries (`queryClient.invalidateQueries()`) e chama
  `router.invalidate()` para recarregar loaders.

### 7. Attacher no cliente
Adicionar um `functionMiddleware` (em `src/start.ts`) que lê o
`localStorage` e adiciona `x-active-student` ao request. Registrar após o
`attachSupabaseAuth` existente (append, não substituir).

## Fora de escopo

- Não altero o fluxo de auth/OAuth existente.
- Não crio contas novas; apenas expõe o que já está corretamente vinculado
  no banco.
- Não muda a UX do dono do dojo (dashboard admin).

## Impacto de segurança

- A elegibilidade continua validada no banco (RPCs `SECURITY DEFINER` +
  RLS por `user_id`/`email`). O header `x-active-student` só influencia
  QUAL aluno elegível o cliente vê; nunca dá acesso a alunos de terceiros.
- Um id inválido no header é ignorado e o app volta ao aluno padrão.

## Entregáveis

1. Migração SQL: `list_my_students`, `set_active_student`, ajuste em
   `get_my_student_id`, revisão da policy SELECT de `dojo_students`.
2. Helper `resolveMyStudent` + refactor dos ~15 server fns.
3. Middleware server (`resolveActiveStudent`) + attacher cliente
   (`attachActiveStudent`).
4. `StudentSwitcher.tsx` + integração no layout `app._student.tsx`.
5. Persistência em `localStorage` + invalidação de queries ao trocar.
