-- 1. Update dojo_students for LGPD
ALTER TABLE public.dojo_students ADD COLUMN IF NOT EXISTS facial_recognition_consent BOOLEAN DEFAULT FALSE;

-- 2. Reference photos for students
CREATE TABLE IF NOT EXISTS public.dojo_student_reference_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.dojo_students(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    face_embedding JSONB, -- For future use with embeddings
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_reference_photos TO authenticated;
GRANT ALL ON public.dojo_student_reference_photos TO service_role;
ALTER TABLE public.dojo_student_reference_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reference photos for their academy" ON public.dojo_student_reference_photos
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- 3. Class Photos (Sessions)
CREATE TABLE IF NOT EXISTS public.dojo_class_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    class_id UUID NOT NULL REFERENCES public.dojo_classes(id) ON DELETE CASCADE,
    lesson_history_id UUID REFERENCES public.dojo_lesson_history(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    professor_id UUID,
    faces_count INT DEFAULT 0,
    identified_count INT DEFAULT 0,
    manual_count INT DEFAULT 0,
    unknown_count INT DEFAULT 0,
    processing_time_ms INT DEFAULT 0,
    algorithm_version TEXT DEFAULT 'v1',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_class_photos TO authenticated;
GRANT ALL ON public.dojo_class_photos TO service_role;
ALTER TABLE public.dojo_class_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage class photos for their academy" ON public.dojo_class_photos
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- 4. Detected Faces
DO $$ BEGIN
    CREATE TYPE public.face_detection_status AS ENUM ('pending', 'confirmed', 'rejected', 'visitor', 'new_student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.dojo_detected_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_photo_id UUID REFERENCES public.dojo_class_photos(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.dojo_students(id) ON DELETE SET NULL,
    confidence FLOAT DEFAULT 0,
    status public.face_detection_status DEFAULT 'pending',
    box_json JSONB, -- {x, y, w, h}
    face_thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_detected_faces TO authenticated;
GRANT ALL ON public.dojo_detected_faces TO service_role;
ALTER TABLE public.dojo_detected_faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage detected faces for their academy" ON public.dojo_detected_faces
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- 5. Update Check-in Settings
ALTER TABLE public.dojo_checkin_settings 
ADD COLUMN IF NOT EXISTS face_recognition_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS face_allow_manual_confirmation BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS face_register_visitors BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS face_save_original_photo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS face_save_thumbnails BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS face_min_confidence FLOAT DEFAULT 0.95,
ADD COLUMN IF NOT EXISTS face_max_storage_days INT DEFAULT 365,
ADD COLUMN IF NOT EXISTS face_lgpd_policy TEXT;
