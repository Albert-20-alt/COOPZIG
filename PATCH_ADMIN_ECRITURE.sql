-- ════════════════════════════════════════════════════════════════════════════
-- PATCH : Droits d'écriture admin sur Producteurs, Vergers et Employés
-- Copier-coller dans le SQL Editor de Supabase, puis cliquer sur "Run"
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Producteurs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "producteurs_write_authorized"  ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_update_authorized" ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_delete_authorized" ON public.producteurs;

CREATE POLICY "producteurs_write_authorized" ON public.producteurs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true)
  );
CREATE POLICY "producteurs_update_authorized" ON public.producteurs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true)
  );
CREATE POLICY "producteurs_delete_authorized" ON public.producteurs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true)
  );

-- ─── Vergers ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vergers_write_authorized"  ON public.vergers;
DROP POLICY IF EXISTS "vergers_update_authorized" ON public.vergers;
DROP POLICY IF EXISTS "vergers_delete_authorized" ON public.vergers;

CREATE POLICY "vergers_write_authorized" ON public.vergers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true)
  );
CREATE POLICY "vergers_update_authorized" ON public.vergers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true)
  );
CREATE POLICY "vergers_delete_authorized" ON public.vergers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true)
  );

-- ─── Employés ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "employes_insert" ON public.employes;
DROP POLICY IF EXISTS "employes_update" ON public.employes;
DROP POLICY IF EXISTS "employes_delete" ON public.employes;

CREATE POLICY "employes_insert" ON public.employes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );
CREATE POLICY "employes_update" ON public.employes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );
CREATE POLICY "employes_delete" ON public.employes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );
