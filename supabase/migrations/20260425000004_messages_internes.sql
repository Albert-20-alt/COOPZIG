CREATE TABLE IF NOT EXISTS public.messages_internes (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  from_name     text,
  to_user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  subject       text        NOT NULL,
  body          text        NOT NULL,
  is_read       boolean     DEFAULT false,
  deleted_by_sender    boolean DEFAULT false,
  deleted_by_recipient boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.messages_internes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_select" ON public.messages_internes
  FOR SELECT USING (
    (auth.uid() = from_user_id AND NOT deleted_by_sender)
    OR (auth.uid() = to_user_id AND NOT deleted_by_recipient)
  );

CREATE POLICY "msg_insert" ON public.messages_internes
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "msg_update" ON public.messages_internes
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "msg_delete" ON public.messages_internes
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE INDEX IF NOT EXISTS idx_messages_to_user ON public.messages_internes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON public.messages_internes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages_internes(is_read);
