-- ─── Blog articles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_articles (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  excerpt      text,
  content      text,
  category     text        NOT NULL DEFAULT 'Actualités',
  image_url    text,
  status       text        NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'published')),
  featured     boolean     NOT NULL DEFAULT false,
  read_time    text        NOT NULL DEFAULT '5 min',
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
CREATE POLICY "Public read published articles" ON public.blog_articles
  FOR SELECT USING (status = 'published');

-- Admins have full access
CREATE POLICY "Admins manage blog articles" ON public.blog_articles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ─── Projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  description    text,
  category       text        NOT NULL DEFAULT 'Infrastructure',
  status         text        NOT NULL DEFAULT 'planifie'
                             CHECK (status IN ('en_cours', 'termine', 'planifie')),
  period         text,
  budget         text,
  beneficiaires  text,
  tags           text[]      NOT NULL DEFAULT '{}',
  icon_name      text        NOT NULL DEFAULT 'TrendingUp',
  image_url      text,
  sort_order     integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public can read all projects
CREATE POLICY "Public read projects" ON public.projects
  FOR SELECT USING (true);

-- Admins have full access
CREATE POLICY "Admins manage projects" ON public.projects
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );

-- ─── Storage bucket for CMS images ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read content images"       ON storage.objects;
DROP POLICY IF EXISTS "Admins upload content images"     ON storage.objects;
DROP POLICY IF EXISTS "Admins update content images"     ON storage.objects;
DROP POLICY IF EXISTS "Admins delete content images"     ON storage.objects;

CREATE POLICY "Public read content images" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-images');

CREATE POLICY "Admins upload content images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'content-images' AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  );

CREATE POLICY "Admins update content images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'content-images' AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  );

CREATE POLICY "Admins delete content images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'content-images' AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  );

-- ─── Seed blog articles ───────────────────────────────────────────────────────
INSERT INTO public.blog_articles (title, excerpt, category, status, featured, read_time, published_at) VALUES
(
  'Campagne mangue 2025 : des perspectives record pour la coopérative',
  'La saison 2025 s''annonce exceptionnelle avec des conditions climatiques favorables et une demande export en forte hausse. Nos producteurs anticipent une récolte supérieure de 18% à celle de l''an passé.',
  'Actualités', 'published', true, '4 min', now()
),
(
  '65 producteurs de Bignona obtiennent leur certification biologique',
  'Après deux ans de transition agroécologique accompagnée par la coopérative, la zone de Bignona franchit un cap historique avec l''obtention de la certification Ecocert.',
  'Agriculture', 'published', false, '6 min', now()
),
(
  'Nouveau partenariat avec trois importateurs européens',
  'CRPAZ signe des accords de fourniture pluriannuels avec des distributeurs en France, Espagne et Portugal, ouvrant un canal direct pour 400 tonnes de mangue bio dès 2026.',
  'Marchés', 'published', false, '5 min', now()
),
(
  'Assemblée générale 2025 : bilan et orientations pour les membres',
  'Retour sur l''AG annuelle qui a réuni 186 membres à Ziguinchor. Au programme : approbation des comptes 2024, élection du conseil d''administration et vote du plan d''action 2025-2026.',
  'Vie coopérative', 'published', false, '8 min', now()
),
(
  'Le projet d''irrigation solaire d''Oussouye primé à Dakar',
  'Notre système d''irrigation goutte-à-goutte alimenté par panneaux solaires a reçu le prix de l''innovation agricole durable lors du forum national de l''agriculture à Dakar.',
  'Agriculture', 'published', false, '3 min', now()
),
(
  'Prix de l''anacarde : une saison 2025 sous de bons auspices',
  'Les cours mondiaux de la noix de cajou affichent une progression de 12% par rapport à 2024. Analyse des tendances et stratégie de mise en marché de la coopérative.',
  'Marchés', 'published', false, '5 min', now()
);

-- ─── Seed projects ────────────────────────────────────────────────────────────
INSERT INTO public.projects (title, description, category, status, period, budget, beneficiaires, tags, icon_name, sort_order) VALUES
(
  'Plateforme numérique de gestion coopérative',
  'Développement d''un système intégré de gestion des producteurs, stocks, commandes et finances pour moderniser le fonctionnement interne de la coopérative.',
  'Infrastructure', 'en_cours', '2024 – 2025', '45M FCFA', '248 producteurs',
  ARRAY['Digital', 'Gestion', 'Innovation'], 'Zap', 1
),
(
  'Certification biologique zone Bignona',
  'Programme de transition vers l''agroécologie et certification biologique internationale pour les producteurs de mangue Kent de la zone de Bignona.',
  'Agriculture durable', 'en_cours', '2023 – 2026', '28M FCFA', '65 producteurs',
  ARRAY['Bio', 'Certification', 'Export'], 'Sprout', 2
),
(
  'Système d''irrigation solaire — Oussouye',
  'Installation de pompes solaires et de réseaux d''irrigation goutte-à-goutte pour sécuriser l''approvisionnement en eau des parcelles en saison sèche.',
  'Eau & Irrigation', 'termine', '2022 – 2023', '62M FCFA', '48 producteurs',
  ARRAY['Énergie solaire', 'Eau', 'Résilience'], 'Droplets', 3
),
(
  'École des producteurs de Casamance',
  'Création d''un programme de formation continue sur les bonnes pratiques agricoles, la gestion financière et la commercialisation directe.',
  'Formation', 'termine', '2021 – 2022', '18M FCFA', '180 producteurs',
  ARRAY['Formation', 'Capacités', 'Gouvernance'], 'Users', 4
),
(
  'Accès aux marchés européens — Mangue Bio',
  'Développement de partenariats commerciaux directs avec des importateurs certifiés en France, Espagne et Portugal pour l''export de mangue biologique.',
  'Commerce international', 'planifie', '2026 – 2027', '35M FCFA', '120 producteurs',
  ARRAY['Export', 'Europe', 'Partenariat'], 'Globe', 5
),
(
  'Unité de transformation et conditionnement',
  'Construction d''un centre de post-récolte et de transformation pour réduire les pertes et produire des produits dérivés à haute valeur ajoutée.',
  'Valorisation', 'planifie', '2026 – 2028', '120M FCFA', '248 producteurs',
  ARRAY['Transformation', 'Post-récolte', 'Valeur ajoutée'], 'TrendingUp', 6
);
