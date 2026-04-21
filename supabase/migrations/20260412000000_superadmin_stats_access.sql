-- Allow superadmins to manage stats_publiques (previously only 'admin' role was allowed)
DROP POLICY IF EXISTS "Admins manage stats" ON public.stats_publiques;

CREATE POLICY "Admins and superadmins manage stats" ON public.stats_publiques
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );
