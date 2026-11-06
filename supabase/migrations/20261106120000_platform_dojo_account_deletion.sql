-- Exclusão de contas de academias do AMT Dojo Manager pelo Control Center da AMT (amtsistemas.com.br/admin).
--
-- Chamada só pelo servidor (service_role), pela Edge Function platform-overview do projeto, que confere antes se
-- quem pede é admin do Control Center. Com p_execute = false devolve só a prévia (registros, logins e arquivos).
--
-- Regras:
-- - Só contas de academia (perfil, assinatura ou dojo_users dono). Contas amt_admin / dono do SaaS nunca.
-- - Academia pagante (assinatura ativa com pagamento aprovado) ou ainda ligada ao Mercado Pago: recusa.
-- - Apaga os dados da academia em todas as tabelas dojo_* / academy_* com owner_id, e os registros filhos sem
--   owner_id que bloqueariam a exclusão (FK sem cascade). Tudo numa transação: se sobrar algo, nada é apagado.
-- - Logins do dono, da equipe e dos alunos só são apagados quando não estão ligados a mais nada no banco
--   (outra academia, cliente da Fight Wear, papéis além de "user"); os demais ficam.
-- - Arquivos do Storage não podem ser apagados por SQL: a função devolve os caminhos para a Edge Function.
--
-- A antiga public.admin_delete_dojo_owner fica como está (não é usada pelo app).

create or replace function public.platform_dojo_account_deletion(p_owner uuid, p_execute boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub public.dojo_subscriptions%rowtype;
  v_name text;
  v_email text;
  v_tables text[];
  v_table text;
  v_count bigint;
  v_counts jsonb := '{}'::jsonb;
  v_total bigint := 0;
  v_left bigint := 0;
  v_storage jsonb;
  v_logins uuid[];
  v_uid uuid;
  v_deleted int := 0;
  v_kept int := 0;
  v_linked boolean;
  v_fk record;
  v_link_tables text[];
  v_link_cols text[];
  i int;
begin
  if p_owner is null then
    raise exception 'Conta não informada.';
  end if;
  if not exists (select 1 from public.dojo_academy_profile where owner_id = p_owner)
     and not exists (select 1 from public.dojo_subscriptions where owner_id = p_owner)
     and not exists (select 1 from public.dojo_users where owner_id = p_owner and role = 'owner') then
    raise exception 'Esta conta não é de uma academia do Dojo Manager.';
  end if;

  select email into v_email from auth.users where id = p_owner;
  if public.has_role(p_owner, 'amt_admin'::public.app_role) or lower(coalesce(v_email, '')) = 'profandreteixeira91@gmail.com' then
    raise exception 'Contas de administração da AMT não podem ser excluídas por aqui.';
  end if;

  select * into v_sub from public.dojo_subscriptions where owner_id = p_owner order by updated_at desc limit 1;
  if found then
    if v_sub.status in ('active', 'authorized') and v_sub.current_payment_status = 'approved' then
      raise exception 'A academia tem assinatura paga ativa. Cancele a assinatura antes de excluir a conta.';
    end if;
    if v_sub.mp_preapproval_id is not null and v_sub.status not in ('cancelled', 'canceled') then
      raise exception 'A assinatura ainda está ligada ao Mercado Pago. Cancele no Mercado Pago antes de excluir a conta.';
    end if;
  end if;

  select coalesce(nullif(trade_name, ''), nullif(legal_name, '')) into v_name
  from public.dojo_academy_profile where owner_id = p_owner;
  if v_name is null then
    select nullif(name, '') into v_name from public.dojo_users where owner_id = p_owner and role = 'owner' limit 1;
  end if;

  -- Tabelas do Dojo com owner_id.
  select array_agg(c.table_name::text order by c.table_name) into v_tables
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public' and c.column_name = 'owner_id'
    and (c.table_name like 'dojo\_%' or c.table_name like 'academy\_%');

  foreach v_table in array v_tables loop
    execute format('select count(*) from public.%I where owner_id = $1', v_table) into v_count using p_owner;
    if v_count > 0 then
      v_counts := v_counts || jsonb_build_object(v_table, v_count);
      v_total := v_total + v_count;
    end if;
  end loop;

  -- Logins ligados à academia (dono, equipe e alunos), levantados antes de apagar os dados.
  select array_agg(distinct uid) into v_logins from (
    select p_owner as uid
    union select user_id from public.dojo_students where owner_id = p_owner
    union select sa.auth_user_id from public.student_accounts sa join public.dojo_students s on s.id = sa.student_id where s.owner_id = p_owner
    union select auth_user_id from public.dojo_staff_accounts where owner_id = p_owner
    union select user_id from public.dojo_team_members where owner_id = p_owner
    union select auth_user_id from public.dojo_users where owner_id = p_owner
    union select user_id from public.dojo_unit_members where owner_id = p_owner
  ) x where uid is not null;

  select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb) into v_storage
  from storage.objects
  where bucket_id like 'dojo%'
    and (name like p_owner::text || '/%' or name like '%/' || p_owner::text || '/%');

  if not p_execute then
    return jsonb_build_object(
      'owner_id', p_owner, 'name', v_name, 'email', v_email, 'subscription_status', v_sub.status,
      'rows', v_total, 'tables', v_counts, 'logins', coalesce(array_length(v_logins, 1), 0),
      'files', jsonb_array_length(v_storage)
    );
  end if;

  -- Apaga em passadas: filhos sem owner_id que bloqueariam (FK sem cascade), depois as tabelas da academia.
  -- Uma tabela que ainda tem dependentes é tentada de novo na passada seguinte.
  for v_pass in 1..12 loop
    for v_fk in
      select ch.relname::text as child, a.attname::text as col, pa.relname::text as parent, pk.attname::text as pcol
      from pg_constraint con
      join pg_class ch on ch.oid = con.conrelid
      join pg_namespace n on n.oid = ch.relnamespace and n.nspname = 'public'
      join pg_class pa on pa.oid = con.confrelid
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
      join pg_attribute pk on pk.attrelid = con.confrelid and pk.attnum = con.confkey[1]
      where con.contype = 'f' and array_length(con.conkey, 1) = 1 and con.confdeltype in ('a', 'r')
        and pa.relname::text = any (v_tables) and not (ch.relname::text = any (v_tables))
    loop
      begin
        execute format('delete from public.%I where %I in (select %I from public.%I where owner_id = $1)',
          v_fk.child, v_fk.col, v_fk.pcol, v_fk.parent) using p_owner;
      exception when foreign_key_violation then null;
      end;
    end loop;

    foreach v_table in array v_tables loop
      begin
        execute format('delete from public.%I where owner_id = $1', v_table) using p_owner;
      exception when foreign_key_violation then null;
      end;
    end loop;

    v_left := 0;
    foreach v_table in array v_tables loop
      execute format('select count(*) from public.%I where owner_id = $1', v_table) into v_count using p_owner;
      v_left := v_left + v_count;
    end loop;
    exit when v_left = 0;
  end loop;

  if v_left > 0 then
    raise exception 'Não foi possível remover todos os dados da academia (restam % registros). Nada foi excluído.', v_left;
  end if;

  -- Notificações push do painel do dono: a tabela é por login (user_id), não por academia.
  delete from public.dojo_owner_push_subscriptions where user_id = p_owner;

  -- Colunas que ligam um login a outros dados: FKs para auth.users e colunas de usuário sem FK.
  select array_agg(t), array_agg(c) into v_link_tables, v_link_cols from (
    select distinct ch.relname::text as t, a.attname::text as c
    from pg_constraint con
    join pg_class ch on ch.oid = con.conrelid
    join pg_namespace n on n.oid = ch.relnamespace and n.nspname = 'public'
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
    where con.contype = 'f' and con.confrelid = 'auth.users'::regclass and array_length(con.conkey, 1) = 1
    union
    select c.table_name::text, c.column_name::text
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.data_type = 'uuid'
      and c.column_name in ('user_id', 'auth_user_id', 'owner_id', 'tenant_id', 'customer_user_id')
  ) x
  where x.t not in ('profiles', 'user_roles');

  foreach v_uid in array coalesce(v_logins, '{}'::uuid[]) loop
    v_linked := exists (select 1 from public.user_roles where user_id = v_uid and role::text <> 'user');
    i := 1;
    while not v_linked and i <= coalesce(array_length(v_link_tables, 1), 0) loop
      execute format('select exists (select 1 from public.%I where %I = $1)', v_link_tables[i], v_link_cols[i])
        into v_linked using v_uid;
      i := i + 1;
    end loop;
    if v_linked then
      v_kept := v_kept + 1;
    else
      delete from auth.users where id = v_uid;
      v_deleted := v_deleted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'owner_id', p_owner, 'name', v_name, 'email', v_email,
    'rows', v_total, 'tables', v_counts,
    'logins_deleted', v_deleted, 'logins_kept', v_kept,
    'storage', v_storage
  );
end;
$$;

revoke all on function public.platform_dojo_account_deletion(uuid, boolean) from public, anon, authenticated;
grant execute on function public.platform_dojo_account_deletion(uuid, boolean) to service_role;
