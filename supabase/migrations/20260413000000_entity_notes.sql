-- ─── Table des notes internes (sur commandes, demandes, clients) ──────────────
CREATE TABLE public.entity_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text        NOT NULL,  -- 'commande' | 'demande' | 'client'
  entity_id   text        NOT NULL,
  content     text        NOT NULL,
  author_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_notes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read notes
CREATE POLICY "Authenticated users view notes" ON public.entity_notes
  FOR SELECT TO authenticated USING (true);

-- Users can only insert their own notes
CREATE POLICY "Users insert own notes" ON public.entity_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Admins/superadmins can delete any note
CREATE POLICY "Admins delete notes" ON public.entity_notes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Index for fast entity lookup
CREATE INDEX idx_entity_notes_entity ON public.entity_notes(entity_type, entity_id);
CREATE INDEX idx_entity_notes_created ON public.entity_notes(created_at DESC);
