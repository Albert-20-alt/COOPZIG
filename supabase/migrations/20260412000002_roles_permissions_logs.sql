-- ─── Nouveaux rôles opérationnels ────────────────────────────────────────────
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technique';

-- ─── Table des permissions par module ────────────────────────────────────────
CREATE TABLE public.user_permissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module      text        NOT NULL,
  can_access  boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage all permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users view own permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── Table des logs d'activité ────────────────────────────────────────────────
CREATE TABLE public.activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text,
  user_name   text,
  action      text        NOT NULL,  -- 'create' | 'update' | 'delete' | 'reply' | 'view' | 'login'
  module      text        NOT NULL,  -- 'commandes' | 'messages' | 'demandes' | etc.
  entity_type text,
  entity_id   text,
  label       text,                  -- Description lisible ex: "Commande #CMD-001 → Livrée"
  details     jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins view all logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins view all logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_activity_logs_user_id   ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_module    ON public.activity_logs(module);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
