CREATE TABLE IF NOT EXISTS public.user_notifications (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL DEFAULT 'info',
  title       text        NOT NULL,
  body        text,
  metadata    jsonb       DEFAULT '{}',
  is_read     boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notif_select" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_notif_update" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_notif_insert" ON public.user_notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR auth.uid() = user_id
  );

CREATE POLICY "user_notif_delete" ON public.user_notifications
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  );

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
