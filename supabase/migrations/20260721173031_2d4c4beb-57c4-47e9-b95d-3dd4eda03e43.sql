-- Add amt_admin super-role for global belt management
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='app_role' AND e.enumlabel='amt_admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'amt_admin';
  END IF;
END $$;
