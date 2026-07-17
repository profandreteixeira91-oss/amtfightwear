
CREATE OR REPLACE FUNCTION public.sync_product_price_from_variants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_product uuid;
  new_price numeric;
BEGIN
  target_product := COALESCE(NEW.product_id, OLD.product_id);
  IF target_product IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT MIN(price) INTO new_price
  FROM public.store_product_variants
  WHERE product_id = target_product AND active = true AND price IS NOT NULL;

  IF new_price IS NOT NULL THEN
    UPDATE public.products
    SET price = new_price
    WHERE id = target_product AND price IS DISTINCT FROM new_price;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_price_ins ON public.store_product_variants;
DROP TRIGGER IF EXISTS trg_sync_product_price_upd ON public.store_product_variants;
DROP TRIGGER IF EXISTS trg_sync_product_price_del ON public.store_product_variants;

CREATE TRIGGER trg_sync_product_price_ins
AFTER INSERT ON public.store_product_variants
FOR EACH ROW EXECUTE FUNCTION public.sync_product_price_from_variants();

CREATE TRIGGER trg_sync_product_price_upd
AFTER UPDATE OF price, active ON public.store_product_variants
FOR EACH ROW EXECUTE FUNCTION public.sync_product_price_from_variants();

CREATE TRIGGER trg_sync_product_price_del
AFTER DELETE ON public.store_product_variants
FOR EACH ROW EXECUTE FUNCTION public.sync_product_price_from_variants();
