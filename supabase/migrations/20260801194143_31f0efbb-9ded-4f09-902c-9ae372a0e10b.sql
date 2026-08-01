create or replace function public.store_order_item_to_production()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.store_orders;
  meta jsonb;
  is_wholesale boolean;
  days int;
  q timestamptz;
begin
  select * into o from public.store_orders where id = new.order_id;
  if o.id is null then return new; end if;
  if lower(coalesce(o.status,'')) in ('cancelled','canceled','cancelado','refunded','reembolsado') then
    return new;
  end if;

  meta := coalesce(o.metadata, '{}'::jsonb);
  is_wholesale := (meta->>'wholesale') = 'true' or lower(coalesce(meta->>'channel','')) = 'wholesale';
  days := coalesce(nullif(o.max_production_days, 0), 10);
  q := coalesce(o.created_at, now());

  insert into public.store_production_jobs (
    source, source_id, source_item_key, reference, customer_name, product_name,
    variant_label, sku, image_url, quantity, unit_price, total_value,
    queued_at, deadline, order_type, payment_status, custom_config
  )
  select
    'order', new.order_id, new.id::text, o.order_number, o.customer_name,
    coalesce(new.product_name, 'Item do pedido'),
    new.variant_label, new.sku, new.image_url,
    coalesce(new.quantity, 1),
    new.unit_price,
    coalesce(new.total_price, new.unit_price * coalesce(new.quantity,1)),
    q,
    (q + (days || ' days')::interval)::date,
    case when new.custom_config is not null then 'custom'
         when is_wholesale then 'wholesale' else 'retail' end,
    coalesce(o.payment_status, 'pending'),
    new.custom_config
  where not exists (
    select 1 from public.store_production_jobs j
    where j.source = 'order' and j.source_id = new.order_id and j.source_item_key = new.id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_store_order_item_to_production on public.store_order_items;
create trigger trg_store_order_item_to_production
after insert on public.store_order_items
for each row execute function public.store_order_item_to_production();

-- Backfill dos itens de pedidos existentes que não estão na fila
insert into public.store_production_jobs (
  source, source_id, source_item_key, reference, customer_name, product_name,
  variant_label, sku, image_url, quantity, unit_price, total_value,
  queued_at, deadline, order_type, payment_status, custom_config
)
select
  'order', i.order_id, i.id::text, o.order_number, o.customer_name,
  coalesce(i.product_name, 'Item do pedido'),
  i.variant_label, i.sku, i.image_url,
  coalesce(i.quantity, 1), i.unit_price,
  coalesce(i.total_price, i.unit_price * coalesce(i.quantity,1)),
  coalesce(o.created_at, now()),
  (coalesce(o.created_at, now()) + (coalesce(nullif(o.max_production_days,0),10) || ' days')::interval)::date,
  case when i.custom_config is not null then 'custom'
       when (coalesce(o.metadata,'{}'::jsonb)->>'wholesale') = 'true'
         or lower(coalesce(coalesce(o.metadata,'{}'::jsonb)->>'channel','')) = 'wholesale' then 'wholesale'
       else 'retail' end,
  coalesce(o.payment_status, 'pending'),
  i.custom_config
from public.store_order_items i
join public.store_orders o on o.id = i.order_id
where lower(coalesce(o.status,'')) not in ('cancelled','canceled','cancelado','refunded','reembolsado')
  and not exists (
    select 1 from public.store_production_jobs j
    where j.source = 'order' and j.source_id = i.order_id and j.source_item_key = i.id::text
  );