
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  sql TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles, permissive
    FROM pg_policies
    WHERE schemaname='public'
      AND (COALESCE(qual,'') LIKE '%has_role(auth.uid(), ''admin''::app_role)%'
        OR COALESCE(with_check,'') LIKE '%has_role(auth.uid(), ''admin''::app_role)%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    new_qual := replace(COALESCE(r.qual,''), 'has_role(auth.uid(), ''admin''::app_role)', 'has_role(auth.uid(), ''amt_admin''::app_role)');
    new_check := replace(COALESCE(r.with_check,''), 'has_role(auth.uid(), ''admin''::app_role)', 'has_role(auth.uid(), ''amt_admin''::app_role)');

    sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename, r.permissive, r.cmd, array_to_string(r.roles, ', '));

    IF r.qual IS NOT NULL THEN
      sql := sql || ' USING (' || new_qual || ')';
    END IF;
    IF r.with_check IS NOT NULL THEN
      sql := sql || ' WITH CHECK (' || new_check || ')';
    END IF;

    EXECUTE sql;
  END LOOP;
END $$;

DELETE FROM public.user_roles
WHERE user_id='8ea6d292-c6f3-4feb-b812-12232c82f52c'
  AND role IN ('admin','amt_admin');
