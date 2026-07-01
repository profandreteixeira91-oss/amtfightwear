
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS carousel_urls text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.auto_post_settings
  ADD COLUMN IF NOT EXISTS daily_plan jsonb NOT NULL DEFAULT
    '[
      {"hour_utc": 12, "type": "story",    "label": "Story matinal (09:00 BRT)"},
      {"hour_utc": 15, "type": "post",     "label": "Post principal (12:00 BRT)"},
      {"hour_utc": 22, "type": "carousel", "label": "Carrossel (19:00 BRT)"},
      {"hour_utc": 23, "type": "reel",     "label": "Reels (20:00 BRT)"},
      {"hour_utc": 0,  "type": "story",    "label": "Story noturno (21:00 BRT)"}
    ]'::jsonb;

-- Backfill: ensure the singleton row uses the new plan even if it existed before.
UPDATE public.auto_post_settings
SET daily_plan =
  '[
    {"hour_utc": 12, "type": "story",    "label": "Story matinal (09:00 BRT)"},
    {"hour_utc": 15, "type": "post",     "label": "Post principal (12:00 BRT)"},
    {"hour_utc": 22, "type": "carousel", "label": "Carrossel (19:00 BRT)"},
    {"hour_utc": 23, "type": "reel",     "label": "Reels (20:00 BRT)"},
    {"hour_utc": 0,  "type": "story",    "label": "Story noturno (21:00 BRT)"}
  ]'::jsonb,
    schedule_hours_utc = ARRAY[12,15,22,23,0]
WHERE singleton = true;
