ALTER TABLE public.fiches_analytiques
  ADD COLUMN IF NOT EXISTS date_fiche       date        NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS producteurs_noms text[]      NOT NULL DEFAULT '{}';
