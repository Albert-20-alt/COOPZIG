
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'producteur', 'acheteur');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  entreprise TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- Producteurs
CREATE TABLE public.producteurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  localisation TEXT NOT NULL DEFAULT '',
  superficie NUMERIC DEFAULT 0,
  cultures TEXT[] DEFAULT '{}',
  certification TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.producteurs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_producteurs_updated_at BEFORE UPDATE ON public.producteurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vergers
CREATE TABLE public.vergers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producteur_id UUID REFERENCES public.producteurs(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  culture TEXT NOT NULL,
  superficie NUMERIC DEFAULT 0,
  etat TEXT NOT NULL DEFAULT 'Repos',
  estimation_rendement NUMERIC DEFAULT 0,
  localisation TEXT,
  zone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vergers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_vergers_updated_at BEFORE UPDATE ON public.vergers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Récoltes
CREATE TABLE public.recoltes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producteur_id UUID REFERENCES public.producteurs(id) ON DELETE CASCADE NOT NULL,
  verger_id UUID REFERENCES public.vergers(id) ON DELETE CASCADE NOT NULL,
  produit TEXT NOT NULL,
  quantite NUMERIC NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'kg',
  qualite TEXT NOT NULL DEFAULT 'Local',
  date_disponibilite DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recoltes ENABLE ROW LEVEL SECURITY;

-- Produits
CREATE TABLE public.produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  variete TEXT,
  zone_production TEXT,
  saison TEXT,
  quantite_estimee NUMERIC DEFAULT 0,
  norme_qualite TEXT,
  usage_type TEXT DEFAULT 'Local',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_produits_updated_at BEFORE UPDATE ON public.produits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stocks
CREATE TABLE public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id UUID REFERENCES public.produits(id) ON DELETE CASCADE,
  producteur_id UUID REFERENCES public.producteurs(id) ON DELETE CASCADE,
  produit_nom TEXT NOT NULL,
  quantite_disponible NUMERIC NOT NULL DEFAULT 0,
  quantite_reservee NUMERIC NOT NULL DEFAULT 0,
  quantite_vendue NUMERIC NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'kg',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON public.stocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commandes
CREATE TABLE public.commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acheteur_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  produit_id UUID REFERENCES public.produits(id),
  produit_nom TEXT NOT NULL,
  quantite NUMERIC NOT NULL,
  unite TEXT NOT NULL DEFAULT 'kg',
  mois_souhaite TEXT,
  est_precommande BOOLEAN DEFAULT false,
  lieu_livraison TEXT,
  type_lieu TEXT DEFAULT 'Ville',
  mode_paiement TEXT DEFAULT 'En ligne',
  statut_paiement TEXT DEFAULT 'En attente',
  statut TEXT NOT NULL DEFAULT 'En attente',
  montant NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_commandes_updated_at BEFORE UPDATE ON public.commandes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Livraisons
CREATE TABLE public.livraisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID REFERENCES public.commandes(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  type_destination TEXT DEFAULT 'Ville',
  statut TEXT NOT NULL DEFAULT 'Planifiée',
  date_prevue DATE,
  date_livraison DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Calendrier production
CREATE TABLE public.calendrier_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit TEXT NOT NULL,
  mois TEXT NOT NULL,
  niveau TEXT NOT NULL DEFAULT 'Moyen',
  zone TEXT,
  annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendrier_production ENABLE ROW LEVEL SECURITY;

-- Profiles triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- producteurs
CREATE POLICY "Producteurs can manage own" ON public.producteurs FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view producteurs" ON public.producteurs FOR SELECT TO authenticated USING (true);

-- vergers (fixed: reference producteur_id correctly)
CREATE POLICY "View all vergers" ON public.vergers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage own vergers" ON public.vergers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update own vergers" ON public.vergers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Delete own vergers" ON public.vergers FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- recoltes
CREATE POLICY "View all recoltes" ON public.recoltes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage own recoltes insert" ON public.recoltes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Manage own recoltes update" ON public.recoltes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Manage own recoltes delete" ON public.recoltes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.producteurs p WHERE p.id = producteur_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- produits
CREATE POLICY "Anyone can view produits" ON public.produits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage produits" ON public.produits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- stocks
CREATE POLICY "Anyone can view stocks" ON public.stocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stocks" ON public.stocks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- commandes
CREATE POLICY "Acheteurs manage own commandes" ON public.commandes FOR ALL TO authenticated USING (auth.uid() = acheteur_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "View all commandes" ON public.commandes FOR SELECT TO authenticated USING (true);

-- livraisons
CREATE POLICY "View all livraisons" ON public.livraisons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage livraisons" ON public.livraisons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- calendrier_production
CREATE POLICY "Anyone can view calendrier" ON public.calendrier_production FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage calendrier" ON public.calendrier_production FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
