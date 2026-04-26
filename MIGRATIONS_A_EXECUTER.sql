-- ════════════════════════════════════════════════════════════════════════════
-- COOPÉRATIVE — Migrations à exécuter dans le SQL Editor de Supabase
-- Copier-coller l'intégralité de ce fichier, puis cliquer sur "Run"
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tâches personnelles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taches (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre            TEXT        NOT NULL,
  description      TEXT,
  type             TEXT        NOT NULL DEFAULT 'tache'
    CHECK (type IN ('tache','note','rdv','visite_terrain','enquete','suivi_evaluation','etude','activite','planning')),
  statut           TEXT        NOT NULL DEFAULT 'a_faire'
    CHECK (statut IN ('a_faire','en_cours','termine','annule')),
  priorite         TEXT        NOT NULL DEFAULT 'normale'
    CHECK (priorite IN ('basse','normale','haute','urgente')),
  date_debut       TIMESTAMPTZ,
  date_fin         TIMESTAMPTZ,
  date_echeance    DATE,
  lieu             TEXT,
  participants     TEXT[]      DEFAULT '{}',
  tags             TEXT[]      DEFAULT '{}',
  couleur          TEXT        DEFAULT '#10B981',
  is_all_day       BOOLEAN     DEFAULT false,
  rappel_minutes   INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "taches_own_all" ON public.taches;
CREATE POLICY "taches_own_all" ON public.taches
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_taches_user_id  ON public.taches(user_id);
CREATE INDEX IF NOT EXISTS idx_taches_statut   ON public.taches(statut);
CREATE INDEX IF NOT EXISTS idx_taches_type     ON public.taches(type);
CREATE INDEX IF NOT EXISTS idx_taches_echeance ON public.taches(date_echeance);

-- ─── 2. Notifications utilisateurs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'info',
  title       TEXT        NOT NULL,
  body        TEXT,
  metadata    JSONB       DEFAULT '{}',
  is_read     BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_notif_select" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notif_update" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notif_insert" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notif_delete" ON public.user_notifications;
CREATE POLICY "user_notif_select" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_notif_update" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_notif_insert" ON public.user_notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    OR auth.uid() = user_id
  );
CREATE POLICY "user_notif_delete" ON public.user_notifications
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  );
CREATE INDEX IF NOT EXISTS idx_user_notif_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_is_read ON public.user_notifications(is_read);

-- ─── 3. Messagerie interne ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages_internes (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  from_name            TEXT,
  to_user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  subject              TEXT        NOT NULL,
  body                 TEXT        NOT NULL,
  is_read              BOOLEAN     DEFAULT false,
  deleted_by_sender    BOOLEAN     DEFAULT false,
  deleted_by_recipient BOOLEAN     DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.messages_internes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg_select" ON public.messages_internes;
DROP POLICY IF EXISTS "msg_insert" ON public.messages_internes;
DROP POLICY IF EXISTS "msg_update" ON public.messages_internes;
DROP POLICY IF EXISTS "msg_delete" ON public.messages_internes;
CREATE POLICY "msg_select" ON public.messages_internes
  FOR SELECT USING (
    (auth.uid() = from_user_id AND NOT deleted_by_sender)
    OR (auth.uid() = to_user_id AND NOT deleted_by_recipient)
  );
CREATE POLICY "msg_insert" ON public.messages_internes
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "msg_update" ON public.messages_internes
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id)
  WITH CHECK (auth.uid() = to_user_id OR auth.uid() = from_user_id);
CREATE POLICY "msg_delete" ON public.messages_internes
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user   ON public.messages_internes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON public.messages_internes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read   ON public.messages_internes(is_read);

-- ─── 4. Agenda coopératif ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_evenements (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  date_debut  TIMESTAMPTZ NOT NULL,
  date_fin    TIMESTAMPTZ,
  lieu        TEXT,
  type        TEXT        DEFAULT 'reunion',
  all_day     BOOLEAN     DEFAULT false,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agenda_evenements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agenda_select" ON public.agenda_evenements;
DROP POLICY IF EXISTS "agenda_insert" ON public.agenda_evenements;
DROP POLICY IF EXISTS "agenda_update" ON public.agenda_evenements;
DROP POLICY IF EXISTS "agenda_delete" ON public.agenda_evenements;
CREATE POLICY "agenda_select" ON public.agenda_evenements
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "agenda_insert" ON public.agenda_evenements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );
CREATE POLICY "agenda_update" ON public.agenda_evenements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );
CREATE POLICY "agenda_delete" ON public.agenda_evenements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );
CREATE INDEX IF NOT EXISTS idx_agenda_date_debut ON public.agenda_evenements(date_debut);

-- ─── 5. Employés / RH ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employes (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  prenom        TEXT    NOT NULL,
  nom           TEXT    NOT NULL,
  poste         TEXT,
  departement   TEXT,
  producteur_id UUID    REFERENCES public.producteurs(id) ON DELETE SET NULL,
  date_embauche DATE,
  salaire       NUMERIC,
  statut        TEXT    DEFAULT 'actif',
  telephone     TEXT,
  email_contact TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employes_select" ON public.employes;
DROP POLICY IF EXISTS "employes_insert" ON public.employes;
DROP POLICY IF EXISTS "employes_update" ON public.employes;
DROP POLICY IF EXISTS "employes_delete" ON public.employes;
CREATE POLICY "employes_select" ON public.employes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "employes_insert" ON public.employes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );
CREATE POLICY "employes_update" ON public.employes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );
CREATE POLICY "employes_delete" ON public.employes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'employes_ecriture' AND can_access = true)
  );
CREATE INDEX IF NOT EXISTS idx_employes_statut       ON public.employes(statut);
CREATE INDEX IF NOT EXISTS idx_employes_producteur   ON public.employes(producteur_id);

-- ─── 6. Politiques Producteurs & Vergers (lecture pour tous) ─────────────────
DROP POLICY IF EXISTS "producteurs_select"                      ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_insert"                      ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_update"                      ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_delete"                      ON public.producteurs;
DROP POLICY IF EXISTS "Allow admin full access to producteurs"  ON public.producteurs;
DROP POLICY IF EXISTS "Allow authenticated read"                ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_read_all"                    ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_write_authorized"            ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_update_authorized"           ON public.producteurs;
DROP POLICY IF EXISTS "producteurs_delete_authorized"           ON public.producteurs;

CREATE POLICY "producteurs_read_all" ON public.producteurs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "producteurs_write_authorized" ON public.producteurs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true)
  );
CREATE POLICY "producteurs_update_authorized" ON public.producteurs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true)
  );
CREATE POLICY "producteurs_delete_authorized" ON public.producteurs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'producteurs_ecriture' AND can_access = true)
  );

DROP POLICY IF EXISTS "vergers_select"                     ON public.vergers;
DROP POLICY IF EXISTS "vergers_insert"                     ON public.vergers;
DROP POLICY IF EXISTS "vergers_update"                     ON public.vergers;
DROP POLICY IF EXISTS "vergers_delete"                     ON public.vergers;
DROP POLICY IF EXISTS "Allow admin full access to vergers" ON public.vergers;
DROP POLICY IF EXISTS "Allow authenticated read"           ON public.vergers;
DROP POLICY IF EXISTS "vergers_read_all"                   ON public.vergers;
DROP POLICY IF EXISTS "vergers_write_authorized"           ON public.vergers;
DROP POLICY IF EXISTS "vergers_update_authorized"          ON public.vergers;
DROP POLICY IF EXISTS "vergers_delete_authorized"          ON public.vergers;

CREATE POLICY "vergers_read_all" ON public.vergers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vergers_write_authorized" ON public.vergers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true)
  );
CREATE POLICY "vergers_update_authorized" ON public.vergers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true)
  );
CREATE POLICY "vergers_delete_authorized" ON public.vergers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin','admin'))
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND module = 'vergers_ecriture' AND can_access = true)
  );
-- ─── 7. Configuration IA Chatbot ───────────────────────────────────────────
INSERT INTO public.site_config (cle, valeur, type, categorie)
VALUES 
  ('chatbot_api_key', '', 'password', 'ia_config'),
  ('chatbot_provider', 'openai', 'text', 'ia_config'),
  ('chatbot_model', 'gpt-4o', 'text', 'ia_config')
ON CONFLICT (cle) DO NOTHING;
