DO $$
DECLARE
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8';
  v_base text := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/';
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('generate-dojo-invoices','generate-dojo-invoices','0 7 * * *'),
      ('send-class-reminders-5min','send-class-reminders','*/5 * * * *'),
      ('daily-martial-arts-sweep','martial-arts-daily-sweep','0 12 * * *')
    ) AS t(jobname, hook, sched)
  LOOP
    BEGIN
      PERFORM cron.unschedule(r.jobname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      r.jobname,
      r.sched,
      format(
        $f$SELECT net.http_post(url := %L, headers := jsonb_build_object('Content-Type','application/json','apikey',%L), body := '{}'::jsonb);$f$,
        v_base || r.hook,
        v_key
      )
    );
  END LOOP;
END $$;