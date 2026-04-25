-- ─── Table des tâches personnelles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taches (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre            TEXT        NOT NULL,
  description      TEXT,
  type             TEXT        NOT NULL DEFAULT 'tache'
    CHECK (type IN ('tache','note','rdv','visite_terrain','enquete','suivi_evaluation','etude','activite','planning')),
  statut           TEXT        NOT NULL DEFAULT 'a_faire'
    CHECK (statut IN ('a_faire','en_cours','termine','annule')),
  priorite         TEXT        NOT NULL DEFAULT 'normale'
    CHECK (priorite IN ('basse','normale','haute','urgente')),
  date_debut       TIMESTAMPTZ,
  date_fin         TIMESTAMPTZ,
  date_echeance    DATE,
  lieu             TEXT,
  participants     TEXT[]      DEFAULT '{}',
  tags             TEXT[]      DEFAULT '{}',
  couleur          TEXT        DEFAULT '#10B981',
  is_all_day       BOOLEAN     DEFAULT false,
  rappel_minutes   INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur gère uniquement ses propres tâches
CREATE POLICY "taches_own_all" ON public.taches
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_taches_user_id    ON public.taches(user_id);
CREATE INDEX IF NOT EXISTS idx_taches_statut     ON public.taches(statut);
CREATE INDEX IF NOT EXISTS idx_taches_type       ON public.taches(type);
CREATE INDEX IF NOT EXISTS idx_taches_echeance   ON public.taches(date_echeance);
