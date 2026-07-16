DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname ILIKE '%auto-instagram%' OR jobname ILIKE '%auto_post%' OR jobname ILIKE '%auto-post%'
  LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;
UPDATE public.auto_post_settings SET enabled = false WHERE singleton = true;