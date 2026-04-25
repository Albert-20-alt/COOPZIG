-- ─── Admin Notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text        NOT NULL,
  title         text        NOT NULL,
  body          text,
  actor_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   text,
  actor_name    text,
  target_id     text,
  target_email  text,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_read       boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage notifications" ON public.admin_notifications
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (true);

-- ─── User Sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email       text,
  user_name        text,
  user_agent       text,
  logged_in_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  logged_out_at    timestamptz,
  duration_seconds integer GENERATED ALWAYS AS (
    CASE
      WHEN logged_out_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (logged_out_at - logged_in_at))::integer
      ELSE NULL
    END
  ) STORED
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions" ON public.user_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins view all sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX idx_user_sessions_user_id    ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_logged_in  ON public.user_sessions(logged_in_at DESC);
CREATE INDEX idx_admin_notifs_is_read     ON public.admin_notifications(is_read);
CREATE INDEX idx_admin_notifs_created_at  ON public.admin_notifications(created_at DESC);
