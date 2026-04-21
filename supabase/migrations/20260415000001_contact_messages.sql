-- ─── Table contact_messages ──────────────────────────────────────────────────
-- Reçoit les messages du formulaire public /contact
-- Géré depuis /admin-messages

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_complet text        NOT NULL,
  email       text        NOT NULL,
  sujet       text,
  message     text        NOT NULL,
  statut      text        NOT NULL DEFAULT 'Nouvelle'
                          CHECK (statut IN ('Nouvelle', 'Lue', 'Répondu', 'Archivée')),
  reponse     text,
  lu          boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut soumettre un message (formulaire public)
CREATE POLICY "Public can insert contact messages"
  ON public.contact_messages FOR INSERT
  TO public
  WITH CHECK (true);

-- Seuls les admins peuvent lire
CREATE POLICY "Admins can select contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

-- Seuls les admins peuvent mettre à jour (statut, reponse)
CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

-- Seuls les admins peuvent supprimer
CREATE POLICY "Admins can delete contact messages"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

-- Index pour performances
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_statut_idx     ON public.contact_messages (statut);

