-- Fix factures RLS: allow both 'admin' and 'superadmin' to manage invoices
-- The existing policy only checks for 'admin', but users may have 'superadmin' role

-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins manage factures" ON public.factures;

-- 2. Also ensure superadmin role exists in the enum (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 3. Create a permissive policy for both admin and superadmin
CREATE POLICY "Admins and superadmins manage factures" ON public.factures
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );

-- 4. Keep the SELECT-only policy for authenticated users (already exists as "Anyone can view factures")
-- but make sure it exists
DROP POLICY IF EXISTS "Anyone can view factures" ON public.factures;
CREATE POLICY "Anyone can view factures" ON public.factures
  FOR SELECT TO authenticated USING (true);
