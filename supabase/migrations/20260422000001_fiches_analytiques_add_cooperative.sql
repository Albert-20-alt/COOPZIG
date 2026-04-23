ALTER TABLE public.fiches_analytiques
  ADD COLUMN IF NOT EXISTS taux_commission_cooperative numeric NOT NULL DEFAULT 0.10;
