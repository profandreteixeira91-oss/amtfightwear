-- Planos do AMT Dojo Manager: Essencial (R$ 99,90), Profissional (R$ 159,90)
-- e Premium (R$ 229,90), só para contas novas.
--
-- * Contas existentes ficam em 'legacy': tudo liberado, mesmo valor, mesma
--   cobrança. Nada muda para elas.
-- * Conta nova: teste grátis de 14 dias no Premium; escolhe o plano ao assinar.
-- * Plano e valor só mudam pelo servidor (service role) — o dono continua
--   podendo atualizar a própria linha (fluxos atuais), mas não o plano.
-- * Limites por plano garantidos aqui (alunos ativos, unidades, usuários do
--   sistema). Manter igual a src/lib/dojo/saas-plans.ts no amtdojomanager.

-- 1) Plano da assinatura. A coluna nasce com 'legacy' (preenche as linhas
--    existentes) e depois o padrão passa a ser 'premium' (teste das novas).
alter table public.dojo_subscriptions
  add column if not exists plan_code text not null default 'legacy';

alter table public.dojo_subscriptions
  drop constraint if exists dojo_subscriptions_plan_code_check;
alter table public.dojo_subscriptions
  add constraint dojo_subscriptions_plan_code_check
  check (plan_code in ('legacy', 'essencial', 'profissional', 'premium'));

alter table public.dojo_subscriptions alter column plan_code set default 'premium';

comment on column public.dojo_subscriptions.plan_code is
  'Plano do Dojo Manager: legacy (contas anteriores aos planos, tudo liberado), essencial, profissional ou premium. Só o servidor altera.';

-- 2) Preço de cada plano (valor da mensalidade das contas novas).
create or replace function public.dojo_plan_price(p_plan text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case p_plan
    when 'essencial' then 99.90
    when 'profissional' then 159.90
    when 'premium' then 229.90
  end::numeric
$$;

-- 3) Guarda do plano. Contas criadas antes desta migration que ainda não têm
--    assinatura também entram como 'legacy' (o corte é o momento em que a
--    migration roda).
do $mig$
begin
  execute format($fn$
    create or replace function public.dojo_subscriptions_guard_plan()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $body$
    declare
      v_created timestamptz;
    begin
      -- Servidor (service role) e SQL direto (sem JWT) podem tudo.
      if coalesce(auth.role(), 'service_role') = 'service_role' then
        return new;
      end if;

      if tg_op = 'INSERT' then
        select created_at into v_created from auth.users where id = new.owner_id;
        if v_created is not null and v_created < %L::timestamptz then
          new.plan_code := 'legacy';          -- conta antiga: valor enviado mantido
        else
          new.plan_code := 'premium';         -- conta nova: teste no Premium
          new.plan_amount := public.dojo_plan_price('premium');
        end if;
      else
        new.plan_code := old.plan_code;
        new.plan_amount := old.plan_amount;
      end if;
      return new;
    end
    $body$;
  $fn$, now());
end
$mig$;

drop trigger if exists trg_dojo_subscriptions_guard_plan on public.dojo_subscriptions;
create trigger trg_dojo_subscriptions_guard_plan
  before insert or update on public.dojo_subscriptions
  for each row execute function public.dojo_subscriptions_guard_plan();

-- 4) Plano efetivo e limites.
create or replace function public.dojo_plan_effective(p_owner uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.owner_id is null then 'premium'          -- ainda sem assinatura: teste
    when s.plan_code = 'legacy' then 'legacy'
    when s.status = 'trialing' then 'premium'
    else s.plan_code
  end
  from (select 1) as one
  left join lateral (
    select owner_id, plan_code, status
    from public.dojo_subscriptions
    where owner_id = p_owner
    order by updated_at desc
    limit 1
  ) s on true
$$;

-- `null` = ilimitado.
create or replace function public.dojo_plan_limit(p_owner uuid, p_resource text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case public.dojo_plan_effective(p_owner)
    when 'essencial' then
      case p_resource when 'students' then 100 when 'units' then 1 when 'system_users' then 2 end
    when 'profissional' then
      case p_resource when 'students' then 300 when 'units' then 1 when 'system_users' then 5 end
    else null
  end
$$;

grant execute on function public.dojo_plan_effective(uuid) to authenticated, service_role;
grant execute on function public.dojo_plan_limit(uuid, text) to authenticated, service_role;

-- 5) Alunos ativos.
create or replace function public.dojo_enforce_student_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status is distinct from 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' and old.owner_id = new.owner_id then
    return new;
  end if;
  v_limit := public.dojo_plan_limit(new.owner_id, 'students');
  if v_limit is null then return new; end if;
  select count(*) into v_count
    from public.dojo_students
   where owner_id = new.owner_id and status = 'active' and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Seu plano permite até % alunos ativos. Faça upgrade do plano em Minha conta › Assinatura para cadastrar mais alunos.', v_limit;
  end if;
  return new;
end
$$;

drop trigger if exists trg_dojo_students_plan_limit on public.dojo_students;
create trigger trg_dojo_students_plan_limit
  before insert or update of status, owner_id on public.dojo_students
  for each row execute function public.dojo_enforce_student_limit();

-- 6) Unidades ativas.
create or replace function public.dojo_enforce_unit_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.active is not true then return new; end if;
  if tg_op = 'UPDATE' and old.active is true and old.owner_id = new.owner_id then
    return new;
  end if;
  v_limit := public.dojo_plan_limit(new.owner_id, 'units');
  if v_limit is null then return new; end if;
  select count(*) into v_count
    from public.dojo_units
   where owner_id = new.owner_id and active is true and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Seu plano permite % unidade(s). Faça upgrade para o Premium em Minha conta › Assinatura para cadastrar filiais.', v_limit;
  end if;
  return new;
end
$$;

drop trigger if exists trg_dojo_units_plan_limit on public.dojo_units;
create trigger trg_dojo_units_plan_limit
  before insert or update of active, owner_id on public.dojo_units
  for each row execute function public.dojo_enforce_unit_limit();

-- 7) Usuários do sistema (logins de equipe ativos).
create or replace function public.dojo_enforce_system_user_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.user_id is null or new.status is distinct from 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.user_id is not null and old.status = 'active'
     and old.owner_id = new.owner_id then
    return new;
  end if;
  v_limit := public.dojo_plan_limit(new.owner_id, 'system_users');
  if v_limit is null then return new; end if;
  select count(*) into v_count
    from public.dojo_team_members
   where owner_id = new.owner_id and status = 'active' and user_id is not null and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Seu plano permite até % usuários do sistema. Faça upgrade do plano em Minha conta › Assinatura para criar mais logins.', v_limit;
  end if;
  return new;
end
$$;

drop trigger if exists trg_dojo_team_members_plan_limit on public.dojo_team_members;
create trigger trg_dojo_team_members_plan_limit
  before insert or update of user_id, status, owner_id on public.dojo_team_members
  for each row execute function public.dojo_enforce_system_user_limit();
