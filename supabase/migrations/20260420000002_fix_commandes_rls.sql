-- Drop the old policy
DROP POLICY IF EXISTS "Acheteurs manage own commandes" ON public.commandes;

-- Recreate policy allowing admins AND superadmins to manage all, 
-- and buyers to manage their own (even if acheteur_id is null, it fails the first check but passes for admins)
CREATE POLICY "Acheteurs manage own commandes" ON public.commandes 
FOR ALL TO authenticated 
USING (
  auth.uid() = acheteur_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  auth.uid() = acheteur_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);
