
-- ============ INSTAGRAM HUB MODULE ============

-- 1) IG ACCOUNTS
CREATE TABLE public.ig_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.meta_connections(id) ON DELETE SET NULL,
  ig_user_id text NOT NULL,
  username text,
  name text,
  biography text,
  website text,
  profile_picture_url text,
  category text,
  followers_count integer DEFAULT 0,
  follows_count integer DEFAULT 0,
  media_count integer DEFAULT 0,
  account_type text,
  status text NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ig_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_accounts TO authenticated;
GRANT ALL ON public.ig_accounts TO service_role;
ALTER TABLE public.ig_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_accounts" ON public.ig_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ig_accounts_updated BEFORE UPDATE ON public.ig_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) IG CONVERSATIONS
CREATE TABLE public.ig_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ig_account_id uuid REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'instagram',
  participant_igsid text NOT NULL,
  participant_username text,
  participant_name text,
  participant_avatar_url text,
  status text NOT NULL DEFAULT 'novo_lead',
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}'::text[],
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  window_expires_at timestamptz,
  ai_summary text,
  ai_intent text,
  ai_priority integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel, participant_igsid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_conversations TO authenticated;
GRANT ALL ON public.ig_conversations TO service_role;
ALTER TABLE public.ig_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_conversations" ON public.ig_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ig_conversations_updated BEFORE UPDATE ON public.ig_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_ig_conv_user_status ON public.ig_conversations(user_id, status, last_message_at DESC);

-- 3) IG MESSAGES
CREATE TABLE public.ig_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.ig_conversations(id) ON DELETE CASCADE,
  mid text,
  direction text NOT NULL,
  text text,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_echo boolean DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, mid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_messages TO authenticated;
GRANT ALL ON public.ig_messages TO service_role;
ALTER TABLE public.ig_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_messages" ON public.ig_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ig_msg_conv_time ON public.ig_messages(conversation_id, sent_at DESC);

-- 4) IG COMMENTS
CREATE TABLE public.ig_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ig_account_id uuid REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  media_id text,
  comment_id text NOT NULL,
  parent_id text,
  from_username text,
  from_id text,
  text text,
  replied boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_comments TO authenticated;
GRANT ALL ON public.ig_comments TO service_role;
ALTER TABLE public.ig_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_comments" ON public.ig_comments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) IG MEDIA CACHE
CREATE TABLE public.ig_media_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ig_account_id uuid REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_type text,
  caption text,
  permalink text,
  thumbnail_url text,
  media_url text,
  timestamp timestamptz,
  like_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_media_cache TO authenticated;
GRANT ALL ON public.ig_media_cache TO service_role;
ALTER TABLE public.ig_media_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_media" ON public.ig_media_cache FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6) IG EVENTS (timeline)
CREATE TABLE public.ig_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.ig_conversations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_events TO authenticated;
GRANT ALL ON public.ig_events TO service_role;
ALTER TABLE public.ig_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_events" ON public.ig_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ig_events_conv_time ON public.ig_events(conversation_id, created_at DESC);

-- 7) IG AUTOMATIONS
CREATE TABLE public.ig_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger text NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  runs_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_automations TO authenticated;
GRANT ALL ON public.ig_automations TO service_role;
ALTER TABLE public.ig_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_automations" ON public.ig_automations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ig_automations_updated BEFORE UPDATE ON public.ig_automations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) IG WEBHOOK LOG
CREATE TABLE public.ig_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  object text,
  entry_id text,
  event_type text,
  signature_valid boolean,
  payload jsonb,
  processed boolean DEFAULT false,
  error text
);
GRANT SELECT ON public.ig_webhook_log TO authenticated;
GRANT ALL ON public.ig_webhook_log TO service_role;
ALTER TABLE public.ig_webhook_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed read webhook logs" ON public.ig_webhook_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- 9) IG SYNC LOG
CREATE TABLE public.ig_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ig_account_id uuid REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL,
  items_count integer DEFAULT 0,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ig_sync_log TO authenticated;
GRANT ALL ON public.ig_sync_log TO service_role;
ALTER TABLE public.ig_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync log" ON public.ig_sync_log FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 10) leads extension
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ig_conversation_id uuid REFERENCES public.ig_conversations(id) ON DELETE SET NULL;

-- 11) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_events;
