
CREATE TABLE public.dojo_fight_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  opponent TEXT,
  event_name TEXT,
  video_date DATE,
  duration_seconds NUMERIC,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_fight_videos_student ON public.dojo_fight_videos(student_id, created_at DESC);
CREATE INDEX idx_dojo_fight_videos_owner ON public.dojo_fight_videos(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_fight_videos TO authenticated;
GRANT ALL ON public.dojo_fight_videos TO service_role;
ALTER TABLE public.dojo_fight_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages fight videos" ON public.dojo_fight_videos
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.dojo_fight_video_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.dojo_fight_videos(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL DEFAULT 0,
  title TEXT,
  note TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_fight_video_notes_video ON public.dojo_fight_video_notes(video_id, timestamp_seconds ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_fight_video_notes TO authenticated;
GRANT ALL ON public.dojo_fight_video_notes TO service_role;
ALTER TABLE public.dojo_fight_video_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages fight video notes" ON public.dojo_fight_video_notes
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER trg_dojo_fight_videos_updated
  BEFORE UPDATE ON public.dojo_fight_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dojo_fight_video_notes_updated
  BEFORE UPDATE ON public.dojo_fight_video_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for dojo-fight-videos: paths are prefixed with the owner user id
CREATE POLICY "fight videos owner select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dojo-fight-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fight videos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dojo-fight-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fight videos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dojo-fight-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fight videos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dojo-fight-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
