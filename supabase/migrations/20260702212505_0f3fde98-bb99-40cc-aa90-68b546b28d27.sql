
ALTER TABLE public.prospect_settings
  ADD COLUMN IF NOT EXISTS daily_ma_sweep_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_ma_presets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_ma_states text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_ma_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_ma_per_preset integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS daily_ma_last_run_at timestamptz;
