CREATE OR REPLACE FUNCTION public.store_order_cancel_remove_production()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if lower(coalesce(new.status,'')) in ('cancelled','canceled','cancelado','refunded','reembolsado')
     or lower(coalesce(new.payment_status,'')) in ('cancelled','canceled','cancelado','refunded','reembolsado','charged_back') then
    delete from public.store_production_jobs
    where source = 'order' and source_id = new.id;
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_store_order_cancel_remove_production ON public.store_orders;
CREATE TRIGGER trg_store_order_cancel_remove_production
AFTER UPDATE OF status, payment_status ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.store_order_cancel_remove_production();

DELETE FROM public.store_production_jobs j
USING public.store_orders o
WHERE j.source = 'order' AND j.source_id = o.id
  AND (lower(coalesce(o.status,'')) IN ('cancelled','canceled','cancelado','refunded','reembolsado')
       OR lower(coalesce(o.payment_status,'')) IN ('cancelled','canceled','cancelado','refunded','reembolsado','charged_back'));