-- AMT Dojo Manager: alerta no Control Center (push do /admin) quando uma academia
-- envia o pedido de implantação assistida. Usa public.admin_notify (Vault
-- 'admin_push_secret' → Edge Function admin-push do amt-sistemas). Falha no
-- alerta nunca impede o envio.

create or replace function public.dojo_implementation_notify_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_students int;
begin
  if new.status <> 'enviada' or (tg_op = 'UPDATE' and old.status = 'enviada') then
    return new;
  end if;
  v_name := coalesce(nullif(new.payload->'academy'->>'trade_name', ''),
                     (select trade_name from public.dojo_academy_profile where owner_id = new.owner_id),
                     'Academia');
  v_students := coalesce(jsonb_array_length(new.payload->'students'), 0);
  begin
    perform public.admin_notify(
      'Implantação solicitada',
      v_name || ' · ' || v_students || ' alunos',
      '/admin/implantacoes',
      'dojo-implementation-' || new.id::text);
  exception when others then
    raise warning 'dojo_implementation_notify_admin: %', sqlerrm;
  end;
  return new;
end
$$;

drop trigger if exists trg_dojo_implementation_notify_admin on public.dojo_implementation_requests;
create trigger trg_dojo_implementation_notify_admin
  after insert or update of status on public.dojo_implementation_requests
  for each row execute function public.dojo_implementation_notify_admin();
