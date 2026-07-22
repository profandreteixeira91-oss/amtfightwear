
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM public.profiles WHERE email = 'profandreteixeira91@gmail.com';
  IF uid IS NULL THEN RAISE NOTICE 'user not found'; RETURN; END IF;
  DELETE FROM public.prospect_timeline        WHERE owner_id = uid;
  DELETE FROM public.prospect_contacts        WHERE owner_id = uid;
  DELETE FROM public.prospect_enrichment_jobs WHERE owner_id = uid;
  DELETE FROM public.prospect_sequence_runs   WHERE owner_id = uid;
  DELETE FROM public.prospect_exports         WHERE owner_id = uid;
  DELETE FROM public.prospect_logs            WHERE owner_id = uid;
  DELETE FROM public.prospect_searches        WHERE owner_id = uid;
  DELETE FROM public.prospect_companies       WHERE owner_id = uid;
END $$;
