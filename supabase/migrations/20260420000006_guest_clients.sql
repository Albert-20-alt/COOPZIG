-- Allow guest clients in Commandes
ALTER TABLE public.commandes ALTER COLUMN acheteur_id DROP NOT NULL;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS client_nom TEXT;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS client_telephone TEXT;

-- Refresh PostgREST cache handled automatically by Supabase start/push
