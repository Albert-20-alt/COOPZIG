-- ─── Producteurs : lecture pour tous, écriture réservée ──────────────────────

DROP POLICY IF EXISTS "producteurs_select" ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_insert" ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_update" ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_delete" ON public.producteurs;
DROP POLICY IF EXISTS "Allow admin full access to producteurs" ON public.producteurs;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.producteurs;

-- Lecture : tous les utilisateurs authentifiés
CREATE POLICY "producteurs_read_all" ON public.producteurs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Écriture : superadmin OU permission explicite accordée
CREATE POLICY "producteurs_write_authorized" ON public.producteurs
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true
    )
  );

CREATE POLICY "producteurs_update_authorized" ON public.producteurs
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true
    )
  );

CREATE POLICY "producteurs_delete_authorized" ON public.producteurs
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true
    )
  );

-- ─── Vergers : même logique ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "vergers_select" ON public.vergers;
DROP POLICY IF EXISTS "vergers_insert" ON public.vergers;
DROP POLICY IF EXISTS "vergers_update" ON public.vergers;
DROP POLICY IF EXISTS "vergers_delete" ON public.vergers;
DROP POLICY IF EXISTS "Allow admin full access to vergers" ON public.vergers;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.vergers;

CREATE POLICY "vergers_read_all" ON public.vergers
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "vergers_write_authorized" ON public.vergers
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true
    )
  );

CREATE POLICY "vergers_update_authorized" ON public.vergers
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true
    )
  );

CREATE POLICY "vergers_delete_authorized" ON public.vergers
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true
    )
  );
