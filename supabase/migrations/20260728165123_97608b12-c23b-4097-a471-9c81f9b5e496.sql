ALTER PUBLICATION supabase_realtime ADD TABLE public.dojo_class_students;
ALTER TABLE public.dojo_class_students REPLICA IDENTITY FULL;