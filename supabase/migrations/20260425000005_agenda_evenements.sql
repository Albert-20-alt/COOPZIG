CREATE TABLE IF NOT EXISTS public.agenda_evenements (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL,
  description text,
  date_debut  timestamptz NOT NULL,
  date_fin    timestamptz,
  lieu        text,
  type        text        DEFAULT 'reunion',
  all_day     boolean     DEFAULT false,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.agenda_evenements ENABLE ROW LEVEL SECURITY;

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
