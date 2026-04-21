-- ─── Table newsletter_subscriptions ─────────────────────────────────────────
-- Stocke les abonnements newsletter du footer public

CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut s'inscrire
CREATE POLICY "Public can subscribe newsletter"
  ON public.newsletter_subscriptions FOR INSERT
  TO public
  WITH CHECK (true);

-- Seuls les admins peuvent lire
CREATE POLICY "Admins can view newsletter subscriptions"
  ON public.newsletter_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS newsletter_subscriptions_email_idx ON public.newsletter_subscriptions (email);
CREATE INDEX IF NOT EXISTS newsletter_subscriptions_created_at_idx ON public.newsletter_subscriptions (created_at DESC);
