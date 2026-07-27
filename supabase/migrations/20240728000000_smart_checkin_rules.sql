-- Add configuration columns to dojo_checkin_settings
ALTER TABLE public.dojo_checkin_settings 
ADD COLUMN IF NOT EXISTS checkin_window_pre_mins INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS checkin_window_post_mins INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS allow_admin_exception BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_teacher_exception BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS block_duplicate_checkin BOOLEAN DEFAULT true;

-- Update column comments for documentation
COMMENT ON COLUMN public.dojo_checkin_settings.checkin_window_pre_mins IS 'Minutos antes do início da aula permitidos para check-in';
COMMENT ON COLUMN public.dojo_checkin_settings.checkin_window_post_mins IS 'Minutos após o início da aula permitidos para check-in';

-- Add log columns to dojo_attendance for auditability
ALTER TABLE public.dojo_attendance
ADD COLUMN IF NOT EXISTS validation_result TEXT DEFAULT 'success',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS validation_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indicators view/helper (optional, but good for dashboard performance)
CREATE OR REPLACE VIEW public.dojo_checkin_stats_v AS
SELECT 
    owner_id,
    COUNT(*) FILTER (WHERE validation_result = 'success') as valid_checkins,
    COUNT(*) FILTER (WHERE validation_result = 'rejected') as rejected_checkins,
    COUNT(*) FILTER (WHERE rejection_reason = 'outside_window') as outside_window_attempts,
    COUNT(*) FILTER (WHERE method = 'manual') as manual_checkins,
    COUNT(*) FILTER (WHERE method = 'qr') as qr_checkins,
    COUNT(*) FILTER (WHERE method = 'pin') as pin_checkins,
    COUNT(*) FILTER (WHERE method = 'photo') as photo_checkins
FROM public.dojo_attendance
GROUP BY owner_id;

GRANT SELECT ON public.dojo_checkin_stats_v TO authenticated;
GRANT ALL ON public.dojo_checkin_stats_v TO service_role;
