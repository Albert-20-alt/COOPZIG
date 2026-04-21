-- Reset site_name back to CRPAZ
INSERT INTO public.site_config (cle, valeur, categorie, type, updated_at)
VALUES ('site_name', 'CRPAZ', 'branding', 'text', now())
ON CONFLICT (cle) DO UPDATE SET valeur = 'CRPAZ', updated_at = now();
