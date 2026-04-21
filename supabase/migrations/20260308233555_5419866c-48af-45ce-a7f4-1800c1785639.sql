
-- Table for public visitor order/inquiry requests (no auth required)
CREATE TABLE public.demandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_complet text NOT NULL,
  entreprise text,
  email text NOT NULL,
  telephone text NOT NULL,
  localisation text,
  produit text NOT NULL,
  quantite numeric NOT NULL,
  unite text NOT NULL DEFAULT 'tonnes',
  message text,
  statut text NOT NULL DEFAULT 'Nouvelle',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demandes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Public can submit demandes" ON public.demandes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/manage
CREATE POLICY "Admins manage demandes" ON public.demandes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also add a public stats view for landing page
CREATE TABLE public.stats_publiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle text NOT NULL UNIQUE,
  valeur text NOT NULL,
  description text,
  ordre integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stats_publiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stats" ON public.stats_publiques
  FOR SELECT USING (true);

CREATE POLICY "Admins manage stats" ON public.stats_publiques
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default public stats
INSERT INTO public.stats_publiques (cle, valeur, description, ordre) VALUES
  ('producteurs', '248', 'Producteurs Membres', 1),
  ('hectares', '1,250', 'Hectares de Vergers', 2),
  ('production', '3,400 T', 'Production Annuelle', 3),
  ('taux_vente', '85%', 'Taux de Vente', 4),
  ('zones', '4', 'Zones de Production', 5),
  ('varietes', '12', 'Variétés Cultivées', 6);
