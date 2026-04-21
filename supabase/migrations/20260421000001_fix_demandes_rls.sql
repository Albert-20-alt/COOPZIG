-- Fix: demandes was only readable by 'admin' role, excluding 'superadmin'
DROP POLICY IF EXISTS "Admins manage demandes" ON public.demandes;

CREATE POLICY "Admins manage demandes" ON public.demandes
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );
