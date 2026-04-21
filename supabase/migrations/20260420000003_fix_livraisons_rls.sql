-- Fix livraisons RLS: allow both admin and superadmin to manage
DROP POLICY IF EXISTS "Admins manage livraisons" ON public.livraisons;

CREATE POLICY "Admins manage livraisons" ON public.livraisons 
FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);
