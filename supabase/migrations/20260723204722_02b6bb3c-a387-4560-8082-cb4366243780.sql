-- Support tickets for Dojo Manager clients
CREATE TABLE public.dojo_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'duvida',
  status text NOT NULL DEFAULT 'aberto',
  priority text NOT NULL DEFAULT 'normal',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_by_client integer NOT NULL DEFAULT 0,
  unread_by_admin integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_support_tickets TO authenticated;
GRANT ALL ON public.dojo_support_tickets TO service_role;

ALTER TABLE public.dojo_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own tickets"
  ON public.dojo_support_tickets FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'));

CREATE INDEX idx_dojo_support_tickets_owner ON public.dojo_support_tickets(owner_id);
CREATE INDEX idx_dojo_support_tickets_status ON public.dojo_support_tickets(status);
CREATE INDEX idx_dojo_support_tickets_last_msg ON public.dojo_support_tickets(last_message_at DESC);

CREATE TABLE public.dojo_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.dojo_support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role text NOT NULL, -- 'client' | 'support'
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_support_messages TO authenticated;
GRANT ALL ON public.dojo_support_messages TO service_role;

ALTER TABLE public.dojo_support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket parties access messages"
  ON public.dojo_support_messages FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'amt_admin')
    OR EXISTS (
      SELECT 1 FROM public.dojo_support_tickets t
      WHERE t.id = ticket_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'amt_admin')
    OR EXISTS (
      SELECT 1 FROM public.dojo_support_tickets t
      WHERE t.id = ticket_id AND t.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_dojo_support_messages_ticket ON public.dojo_support_messages(ticket_id, created_at);

-- Auto-update updated_at + last_message_at
CREATE OR REPLACE FUNCTION public.dojo_support_touch_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dojo_support_tickets
     SET last_message_at = NEW.created_at,
         updated_at = now(),
         unread_by_admin = CASE WHEN NEW.author_role = 'client' THEN unread_by_admin + 1 ELSE unread_by_admin END,
         unread_by_client = CASE WHEN NEW.author_role = 'support' THEN unread_by_client + 1 ELSE unread_by_client END,
         status = CASE
           WHEN NEW.author_role = 'support' AND status = 'aberto' THEN 'em_atendimento'
           ELSE status
         END
   WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dojo_support_touch
  AFTER INSERT ON public.dojo_support_messages
  FOR EACH ROW EXECUTE FUNCTION public.dojo_support_touch_ticket();

CREATE OR REPLACE FUNCTION public.dojo_support_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_dojo_support_tickets_updated
  BEFORE UPDATE ON public.dojo_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.dojo_support_set_updated_at();