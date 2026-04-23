-- ─────────────────────────────────────────────────────────────────────────────
-- 1. blog_articles — marketing can manage
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage blog articles" ON public.blog_articles;
CREATE POLICY "Admins manage blog articles" ON public.blog_articles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. projects — marketing can manage
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage projects" ON public.projects;
CREATE POLICY "Admins manage projects" ON public.projects
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. contact_messages — marketing can read (not delete/update)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins manage messages" ON public.contact_messages;

CREATE POLICY "Marketing can read messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  );

CREATE POLICY "Admins manage messages" ON public.contact_messages
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. newsletter_subscriptions — marketing can read
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read newsletter" ON public.newsletter_subscriptions;

CREATE POLICY "Marketing can read newsletter" ON public.newsletter_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. campagnes_email table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campagnes_email (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titre               text        NOT NULL,
  sujet               text        NOT NULL,
  contenu             text        NOT NULL DEFAULT '',
  type                text        NOT NULL DEFAULT 'newsletter',
  statut              text        NOT NULL DEFAULT 'brouillon',
  destinataires       text        NOT NULL DEFAULT 'tous',
  nb_destinataires    integer,
  nb_ouverts          integer     NOT NULL DEFAULT 0,
  nb_clics            integer     NOT NULL DEFAULT 0,
  date_envoi_prevu    timestamptz,
  date_envoi_reel     timestamptz,
  tags                text[]      NOT NULL DEFAULT '{}',
  notes               text,
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campagnes_email ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_campagnes_email_updated_at
  BEFORE UPDATE ON public.campagnes_email
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Manage campagnes email" ON public.campagnes_email
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role) OR
    public.has_role(auth.uid(), 'marketing'::app_role)
  );
