
-- Table pertes post-récolte
CREATE TABLE public.pertes_postrecolte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producteur_id UUID REFERENCES public.producteurs(id) ON DELETE CASCADE NOT NULL,
  produit TEXT NOT NULL,
  quantite_perdue NUMERIC NOT NULL DEFAULT 0,
  quantite_initiale NUMERIC NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'kg',
  cause TEXT NOT NULL DEFAULT 'Autre',
  date_constat DATE NOT NULL DEFAULT CURRENT_DATE,
  zone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pertes_postrecolte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View all pertes" ON public.pertes_postrecolte FOR SELECT USING (true);
CREATE POLICY "Manage own pertes insert" ON public.pertes_postrecolte FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM producteurs p WHERE p.id = pertes_postrecolte.producteur_id AND p.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Manage own pertes update" ON public.pertes_postrecolte FOR UPDATE USING (
  EXISTS (SELECT 1 FROM producteurs p WHERE p.id = pertes_postrecolte.producteur_id AND p.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Manage own pertes delete" ON public.pertes_postrecolte FOR DELETE USING (
  EXISTS (SELECT 1 FROM producteurs p WHERE p.id = pertes_postrecolte.producteur_id AND p.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- Table prix du marché
CREATE TABLE public.prix_marche (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit TEXT NOT NULL,
  marche TEXT NOT NULL,
  prix NUMERIC NOT NULL,
  unite_prix TEXT NOT NULL DEFAULT 'CFA/kg',
  date_releve DATE NOT NULL DEFAULT CURRENT_DATE,
  tendance TEXT DEFAULT 'stable',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prix_marche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prix" ON public.prix_marche FOR SELECT USING (true);
CREATE POLICY "Admins manage prix" ON public.prix_marche FOR ALL USING (has_role(auth.uid(), 'admin'));
