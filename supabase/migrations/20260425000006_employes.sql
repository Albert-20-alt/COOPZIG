CREATE TABLE IF NOT EXISTS public.employes (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  prenom        text    NOT NULL,
  nom           text    NOT NULL,
  poste         text,
  departement   text,
  producteur_id uuid    REFERENCES public.producteurs(id) ON DELETE SET NULL,
  date_embauche date,
  salaire       numeric,
  statut        text    DEFAULT 'actif',
  telephone     text,
  email_contact text,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employes_select" ON public.employes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "employes_insert" ON public.employes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );

CREATE POLICY "employes_update" ON public.employes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );

CREATE POLICY "employes_delete" ON public.employes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );

CREATE INDEX IF NOT EXISTS idx_employes_statut ON public.employes(statut);
CREATE INDEX IF NOT EXISTS idx_employes_producteur_id ON public.employes(producteur_id);
