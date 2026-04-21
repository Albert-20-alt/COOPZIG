-- Fix prix_marche RLS: allow both 'admin' and 'superadmin' to manage market prices
-- The existing policy only checks for 'admin', but users may have 'superadmin' role

-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins manage prix" ON public.prix_marche;

-- 2. Create a permissive policy for both admin and superadmin that supports INSERT, UPDATE, DELETE
CREATE POLICY "Admins and superadmins manage prix" ON public.prix_marche
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );
