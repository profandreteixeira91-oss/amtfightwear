CREATE OR REPLACE FUNCTION public.dojo_invoices_block_inactive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.student_id IS NULL OR NEW.status IN ('paid','canceled') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.dojo_students WHERE id = NEW.student_id AND status = 'inactive') THEN
    RAISE EXCEPTION 'Aluno inativo não pode receber cobrança. Reative o cadastro do aluno para gerar cobranças.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dojo_invoices_block_inactive ON public.dojo_invoices;
CREATE TRIGGER trg_dojo_invoices_block_inactive
BEFORE INSERT ON public.dojo_invoices
FOR EACH ROW EXECUTE FUNCTION public.dojo_invoices_block_inactive();