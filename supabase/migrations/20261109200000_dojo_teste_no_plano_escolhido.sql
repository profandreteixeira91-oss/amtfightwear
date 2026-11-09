-- AMT Dojo Manager: o teste grátis passa a valer no plano escolhido no
-- cadastro (/dojo/planos), não mais sempre no Premium.
--
-- O cadastro cria a assinatura pelo servidor já com o plano escolhido
-- (status 'trialing'). Os limites seguem esse plano também durante o teste.
-- Contas legacy não mudam. Sem assinatura ainda continua valendo o Premium.
-- Manter igual a effectivePlanCode() em src/lib/dojo/saas-plans.ts.

create or replace function public.dojo_plan_effective(p_owner uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.owner_id is null then 'premium'          -- ainda sem assinatura
    else s.plan_code                                -- legacy ou o plano escolhido
  end
  from (select 1) as one
  left join lateral (
    select owner_id, plan_code
    from public.dojo_subscriptions
    where owner_id = p_owner
    order by updated_at desc
    limit 1
  ) s on true
$$;
