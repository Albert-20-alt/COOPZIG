-- ─── Fiche Analytique des Dépenses et Recettes ───────────────────────────────
CREATE TABLE public.fiches_analytiques (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- En-tête
  produit                     text        NOT NULL,
  code_produit                text,
  campagne                    text        NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::text,
  variete                     text,
  superficie                  numeric     NOT NULL DEFAULT 0,
  zone                        text,
  prix_unitaire               numeric     NOT NULL DEFAULT 0,
  id_producteur_externe       text,
  quantite_totale             numeric     NOT NULL DEFAULT 0,
  contacts                    text,
  producteur_id               uuid        REFERENCES public.producteurs(id) ON DELETE SET NULL,

  -- Charges (JSONB : [{code,nom,pct_defaut,montant_unitaire}])
  charges_variables           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  charges_fixes               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  couts_commercialisation     jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Partie 2 — distribution du résultat d'exploitation
  taux_taxes                  numeric     NOT NULL DEFAULT 0.05,
  taux_commission_producteur  numeric     NOT NULL DEFAULT 0.65,
  taux_commission_etaam       numeric     NOT NULL DEFAULT 0.30,

  -- Statut workflow
  statut                      text        NOT NULL DEFAULT 'brouillon',  -- brouillon | validé | archivé

  notes                       text,
  created_by                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fiches_analytiques ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fiches_analytiques_updated_at
  BEFORE UPDATE ON public.fiches_analytiques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage fiches analytiques" ON public.fiches_analytiques
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'superadmin'::app_role)
  );
