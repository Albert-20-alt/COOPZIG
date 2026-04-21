-- Update livraisons table schema
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS chauffeur_nom TEXT;
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS vehicule_info TEXT;

-- Unified RLS Fix for Superadmins across all tables
-- We drop and recreate policies to ensure both 'admin' and 'superadmin' have full access.

-- 1. Producteurs
DROP POLICY IF EXISTS "Producteurs can manage own" ON public.producteurs;
CREATE POLICY "Admin/Superadmin manage producteurs" ON public.producteurs 
FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 2. Vergers
DROP POLICY IF EXISTS "Manage own vergers" ON public.vergers;
DROP POLICY IF EXISTS "Update own vergers" ON public.vergers;
DROP POLICY IF EXISTS "Delete own vergers" ON public.vergers;
CREATE POLICY "Admin/Superadmin manage vergers" ON public.vergers 
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- 3. Recoltes
DROP POLICY IF EXISTS "Manage own recoltes insert" ON public.recoltes;
DROP POLICY IF EXISTS "Manage own recoltes update" ON public.recoltes;
DROP POLICY IF EXISTS "Manage own recoltes delete" ON public.recoltes;
CREATE POLICY "Admin/Superadmin manage recoltes" ON public.recoltes 
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- 4. Produits
DROP POLICY IF EXISTS "Admins manage produits" ON public.produits;
CREATE POLICY "Admin/Superadmin manage produits" ON public.produits 
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 5. Stocks
DROP POLICY IF EXISTS "Admins manage stocks" ON public.stocks;
CREATE POLICY "Admin/Superadmin manage stocks" ON public.stocks 
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 6. Livraisons (Redo fix to be clean)
DROP POLICY IF EXISTS "Admins manage livraisons" ON public.livraisons;
CREATE POLICY "Admin/Superadmin manage livraisons" ON public.livraisons 
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 7. Notifications
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admin/Superadmin manage notifications" ON public.notifications 
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 8. Calendrier Production
DROP POLICY IF EXISTS "Admins manage calendrier" ON public.calendrier_production;
CREATE POLICY "Admin/Superadmin manage calendrier" ON public.calendrier_production 
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 9. User Roles (Crucial for superadmins to manage roles)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admin/Superadmin manage roles" ON public.user_roles 
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
