-- ════════════════════════════════════════════════════════════════════════════
-- SUPERVISION — Tables pour la page /supervision
-- Copier-coller dans le SQL Editor de Supabase, puis cliquer sur "Run"
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Journal d'activité ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  user_name   TEXT,
  action      TEXT        NOT NULL,
  module      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  label       TEXT,
  details     JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_select_admin"  ON public.activity_logs;
DROP POLICY IF EXISTS "logs_insert_own"    ON public.activity_logs;
CREATE POLICY "logs_select_admin" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
  );
CREATE POLICY "logs_insert_own" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs_delete_superadmin" ON public.activity_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  );
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module     ON public.activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ─── 2. Sessions utilisateurs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email       TEXT,
  user_name        TEXT,
  user_agent       TEXT,
  logged_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_out_at    TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN logged_out_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (logged_out_at - logged_in_at))::integer
      ELSE NULL
    END
  ) STORED
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_own"   ON public.user_sessions;
DROP POLICY IF EXISTS "sessions_admin" ON public.user_sessions;
CREATE POLICY "sessions_own" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_admin" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
  );
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id   ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_logged_in ON public.user_sessions(logged_in_at DESC);

-- ─── 3. Notifications admin ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  body         TEXT,
  actor_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  TEXT,
  actor_name   TEXT,
  target_id    TEXT,
  target_email TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_read      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_notif_all" ON public.admin_notifications;
CREATE POLICY "admin_notif_all" ON public.admin_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
  )
  WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_admin_notifs_is_read    ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifs_created_at ON public.admin_notifications(created_at DESC);
