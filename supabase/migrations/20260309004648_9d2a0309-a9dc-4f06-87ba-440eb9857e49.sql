-- Allow superadmin to manage all user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can manage roles" ON public.user_roles;

CREATE POLICY "Superadmins can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Allow superadmin to view all user_roles (not just their own)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'));