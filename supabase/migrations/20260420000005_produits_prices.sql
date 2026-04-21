-- Add pricing and ecommerce fields to produits for public catalog integration
ALTER TABLE public.produits 
ADD COLUMN IF NOT EXISTS prix_coop numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS prix_marche numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS categorie text,
ADD COLUMN IF NOT EXISTS in_ecommerce boolean DEFAULT true;

-- Basic backfill
UPDATE public.produits SET prix_coop = 750, prix_marche = 880, categorie = 'Fruits' WHERE nom ILIKE '%mangue%';
UPDATE public.produits SET prix_coop = 490, prix_marche = 530, categorie = 'Noix' WHERE nom ILIKE '%anacarde%';
UPDATE public.produits SET prix_coop = 420, prix_marche = 465, categorie = 'Céréales' WHERE nom ILIKE '%riz%';
