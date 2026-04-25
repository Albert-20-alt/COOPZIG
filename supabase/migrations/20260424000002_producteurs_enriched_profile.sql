-- ─── Enrichissement du profil producteur ─────────────────────────────────────
ALTER TABLE public.producteurs
  ADD COLUMN IF NOT EXISTS genre          text        CHECK (genre IN ('Homme','Femme','Autre')),
  ADD COLUMN IF NOT EXISTS numero_membre  text        UNIQUE,
  ADD COLUMN IF NOT EXISTS latitude       numeric,
  ADD COLUMN IF NOT EXISTS longitude      numeric;
