-- Link producteurs to auth users
ALTER TABLE public.producteurs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_producteurs_user_id ON public.producteurs(user_id);

-- Allow a producer to read their own row
CREATE POLICY IF NOT EXISTS "producteur_self_read"
  ON public.producteurs FOR SELECT
  USING (auth.uid() = user_id);

-- Allow a producer to read their own vergers
CREATE POLICY IF NOT EXISTS "producteur_own_vergers_read"
  ON public.vergers FOR SELECT
  USING (
    producteur_id IN (
      SELECT id FROM public.producteurs WHERE user_id = auth.uid()
    )
  );

-- Allow a producer to read their own récoltes
CREATE POLICY IF NOT EXISTS "producteur_own_recoltes_read"
  ON public.recoltes FOR SELECT
  USING (
    producteur_id IN (
      SELECT id FROM public.producteurs WHERE user_id = auth.uid()
    )
  );

-- Allow a producer to read their own cotisations
CREATE POLICY IF NOT EXISTS "producteur_own_cotisations_read"
  ON public.cotisations FOR SELECT
  USING (
    producteur_id IN (
      SELECT id FROM public.producteurs WHERE user_id = auth.uid()
    )
  );
