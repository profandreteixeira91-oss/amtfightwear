DELETE FROM public.user_roles
WHERE role = 'admin'
AND user_id IN (
    SELECT u.id
    FROM auth.users u
    JOIN public.dojo_students s ON u.email = s.email
    WHERE s.owner_id = '1a8ace06-6458-44c6-8bf6-772939ceef9c'
);