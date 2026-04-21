-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: superadmin must have full write access to all tables that currently only
-- check the 'admin' role.  We drop each admin-only policy and recreate it to
-- accept both roles.  SELECT-only ("Anyone can view …") policies are unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── produits ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage produits" ON public.produits;
CREATE POLICY "Admins manage produits" ON public.produits
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── stocks ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage stocks" ON public.stocks;
CREATE POLICY "Admins manage stocks" ON public.stocks
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── commandes ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acheteurs manage own commandes" ON public.commandes;
DROP POLICY IF EXISTS "View all commandes"             ON public.commandes;
CREATE POLICY "Commandes access" ON public.commandes
  FOR ALL TO authenticated
  USING (
    auth.uid() = acheteur_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    auth.uid() = acheteur_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── producteurs ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Producteurs can manage own" ON public.producteurs;
DROP POLICY IF EXISTS "Anyone can view producteurs" ON public.producteurs;
CREATE POLICY "Producteurs access" ON public.producteurs
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- SELECT-only for non-owners kept via the ALL policy above (superadmin/admin can SELECT too)
CREATE POLICY "Anyone can view producteurs" ON public.producteurs
  FOR SELECT TO authenticated
  USING (true);

-- ── vergers ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View all vergers"   ON public.vergers;
DROP POLICY IF EXISTS "Manage own vergers" ON public.vergers;
DROP POLICY IF EXISTS "Update own vergers" ON public.vergers;
DROP POLICY IF EXISTS "Delete own vergers" ON public.vergers;

CREATE POLICY "View all vergers" ON public.vergers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage vergers" ON public.vergers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── recoltes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View all recoltes"           ON public.recoltes;
DROP POLICY IF EXISTS "Manage own recoltes insert"  ON public.recoltes;
DROP POLICY IF EXISTS "Manage own recoltes update"  ON public.recoltes;
DROP POLICY IF EXISTS "Manage own recoltes delete"  ON public.recoltes;

CREATE POLICY "View all recoltes" ON public.recoltes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage recoltes" ON public.recoltes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── livraisons ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View all livraisons"   ON public.livraisons;
DROP POLICY IF EXISTS "Admins manage livraisons" ON public.livraisons;

CREATE POLICY "View all livraisons" ON public.livraisons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage livraisons" ON public.livraisons
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── notifications ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users see own notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Admins manage notifications"  ON public.notifications;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── calendrier_production ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view calendrier" ON public.calendrier_production;
DROP POLICY IF EXISTS "Admins manage calendrier"   ON public.calendrier_production;

CREATE POLICY "Anyone can view calendrier" ON public.calendrier_production
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage calendrier" ON public.calendrier_production
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── plan_comptable ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage plan_comptable" ON public.plan_comptable;
CREATE POLICY "Admins manage plan_comptable" ON public.plan_comptable
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── ecritures_comptables ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage ecritures" ON public.ecritures_comptables;
CREATE POLICY "Admins manage ecritures" ON public.ecritures_comptables
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── cotisations ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage cotisations" ON public.cotisations;
CREATE POLICY "Admins manage cotisations" ON public.cotisations
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── tresorerie ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage tresorerie" ON public.tresorerie;
CREATE POLICY "Admins manage tresorerie" ON public.tresorerie
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ── factures ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage factures" ON public.factures;
CREATE POLICY "Admins manage factures" ON public.factures
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );

