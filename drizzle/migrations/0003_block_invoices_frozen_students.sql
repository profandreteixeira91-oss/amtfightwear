CREATE OR REPLACE FUNCTION public.dojo_invoices_block_inactive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text;
BEGIN
  IF NEW.student_id IS NULL OR NEW.status IN ('paid','canceled') THEN RETURN NEW; END IF;
  SELECT status INTO s FROM public.dojo_students WHERE id = NEW.student_id;
  IF s = 'inactive' THEN
    RAISE EXCEPTION 'Aluno inativo não pode receber cobrança. Reative o cadastro do aluno para gerar cobranças.' USING ERRCODE = 'P0001';
  ELSIF s = 'frozen' THEN
    RAISE EXCEPTION 'Aluno trancado não pode receber cobrança. Reative o cadastro do aluno para gerar cobranças.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;