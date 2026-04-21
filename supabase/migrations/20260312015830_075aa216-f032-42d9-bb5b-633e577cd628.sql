
-- Plan comptable (chart of accounts)
CREATE TABLE public.plan_comptable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  libelle text NOT NULL,
  classe text NOT NULL,
  type text NOT NULL DEFAULT 'Général',
  solde_initial numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_comptable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan_comptable" ON public.plan_comptable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plan_comptable" ON public.plan_comptable FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Écritures comptables (journal entries)
CREATE TABLE public.ecritures_comptables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_ecriture date NOT NULL DEFAULT CURRENT_DATE,
  numero_piece text,
  libelle text NOT NULL,
  compte_debit_id uuid REFERENCES public.plan_comptable(id),
  compte_credit_id uuid REFERENCES public.plan_comptable(id),
  montant numeric NOT NULL DEFAULT 0,
  categorie text DEFAULT 'Opération courante',
  reference_id uuid,
  reference_type text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ecritures_comptables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ecritures" ON public.ecritures_comptables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage ecritures" ON public.ecritures_comptables FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Cotisations des membres
CREATE TABLE public.cotisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producteur_id uuid REFERENCES public.producteurs(id) ON DELETE CASCADE NOT NULL,
  montant numeric NOT NULL,
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  periode text NOT NULL,
  mode_paiement text DEFAULT 'Espèces',
  statut text NOT NULL DEFAULT 'Payé',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cotisations" ON public.cotisations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cotisations" ON public.cotisations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trésorerie (mouvements de caisse)
CREATE TABLE public.tresorerie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_mouvement date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'Entrée',
  categorie text NOT NULL DEFAULT 'Autre',
  libelle text NOT NULL,
  montant numeric NOT NULL DEFAULT 0,
  solde_apres numeric DEFAULT 0,
  mode_paiement text DEFAULT 'Espèces',
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tresorerie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tresorerie" ON public.tresorerie FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tresorerie" ON public.tresorerie FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Factures
CREATE TABLE public.factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_facture text NOT NULL UNIQUE,
  date_facture date NOT NULL DEFAULT CURRENT_DATE,
  date_echeance date,
  client_nom text NOT NULL,
  client_contact text,
  type text NOT NULL DEFAULT 'Vente',
  lignes jsonb NOT NULL DEFAULT '[]'::jsonb,
  montant_ht numeric NOT NULL DEFAULT 0,
  tva numeric NOT NULL DEFAULT 0,
  montant_ttc numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'Brouillon',
  commande_id uuid REFERENCES public.commandes(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view factures" ON public.factures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage factures" ON public.factures FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
