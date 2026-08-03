CREATE TYPE public.macro_dm_queue_status AS ENUM ('waiting', 'preparing', 'executing', 'paused', 'completed', 'failed');

CREATE TABLE public.macro_dm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    message_templates TEXT[] NOT NULL DEFAULT '{}',
    cooldown_min_sec INTEGER NOT NULL DEFAULT 45,
    cooldown_max_sec INTEGER NOT NULL DEFAULT 90,
    max_per_hour INTEGER NOT NULL DEFAULT 15,
    max_per_day INTEGER NOT NULL DEFAULT 40,
    simulated_human_behavior BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.macro_dm_campaigns TO authenticated;
GRANT ALL ON public.macro_dm_campaigns TO service_role;
ALTER TABLE public.macro_dm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own macro campaigns" ON public.macro_dm_campaigns 
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.macro_dm_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.macro_dm_campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    status public.macro_dm_queue_status NOT NULL DEFAULT 'waiting',
    total_leads INTEGER NOT NULL DEFAULT 0,
    processed_leads INTEGER NOT NULL DEFAULT 0,
    error_leads INTEGER NOT NULL DEFAULT 0,
    current_lead_id UUID,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.macro_dm_queues TO authenticated;
GRANT ALL ON public.macro_dm_queues TO service_role;
ALTER TABLE public.macro_dm_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own macro queues" ON public.macro_dm_queues 
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.macro_dm_queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    queue_id UUID REFERENCES public.macro_dm_queues(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.prospect_companies(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, skipped
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.macro_dm_queue_items TO authenticated;
GRANT ALL ON public.macro_dm_queue_items TO service_role;
ALTER TABLE public.macro_dm_queue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own macro queue items" ON public.macro_dm_queue_items 
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.macro_dm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    queue_id UUID REFERENCES public.macro_dm_queues(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.macro_dm_logs TO authenticated;
GRANT ALL ON public.macro_dm_logs TO service_role;
ALTER TABLE public.macro_dm_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own macro logs" ON public.macro_dm_logs 
    FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own macro logs" ON public.macro_dm_logs 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Indice para performance
CREATE INDEX idx_macro_dm_queue_items_queue_status ON public.macro_dm_queue_items(queue_id, status);
CREATE INDEX idx_macro_dm_logs_queue ON public.macro_dm_logs(queue_id);
