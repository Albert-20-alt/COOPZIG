-- Add English columns to blog_articles
ALTER TABLE public.blog_articles 
ADD COLUMN IF NOT EXISTS title_en text,
ADD COLUMN IF NOT EXISTS excerpt_en text,
ADD COLUMN IF NOT EXISTS content_en text;

-- Add English columns to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS title_en text,
ADD COLUMN IF NOT EXISTS description_en text;

-- Backfill english for blog_articles
UPDATE public.blog_articles 
SET title_en = '2025 Mango Campaign: Record Prospects for the Cooperative',
    excerpt_en = 'The 2025 season promises to be exceptional with favorable weather conditions and strong export demand.'
WHERE title LIKE 'Campagne mangue 2025%';

UPDATE public.blog_articles 
SET title_en = '65 Producers from Bignona Obtain Organic Certification',
    excerpt_en = 'After two years of agroecological transition supported by the cooperative, the Bignona area reaches a historic milestone.'
WHERE title LIKE '65 producteurs de Bignona%';

UPDATE public.blog_articles 
SET title_en = 'New Partnership with Three European Importers',
    excerpt_en = 'CRPAZ signs multi-year supply agreements with distributors in France, Spain, and Portugal.'
WHERE title LIKE 'Nouveau partenariat%';

UPDATE public.blog_articles 
SET title_en = '2025 General Assembly: Review and Directives for Members',
    excerpt_en = 'A look back at the annual general assembly which brought together 186 members in Ziguinchor.'
WHERE title LIKE 'Assemblée générale 2025%';

UPDATE public.blog_articles 
SET title_en = 'Oussouye Solar Irrigation Project Awarded in Dakar',
    excerpt_en = 'Our drip irrigation system powered by solar panels received the sustainable agricultural innovation award.'
WHERE title LIKE 'Le projet d''irrigation solaire%';

UPDATE public.blog_articles 
SET title_en = 'Cashew Prices: A Promising 2025 Season',
    excerpt_en = 'Global cashew nut prices show a 12% increase compared to 2024. Trend analysis and market strategy.'
WHERE title LIKE 'Prix de l''anacarde%';

-- Backfill english for projects
UPDATE public.projects 
SET title_en = 'Cooperative Digital Management Platform',
    description_en = 'Development of an integrated management system for producers, inventory, orders, and finances to modernize operations.'
WHERE title LIKE 'Plateforme numérique%';

UPDATE public.projects 
SET title_en = 'Organic Certification Bignona Zone',
    description_en = 'Transition program towards agroecology and international organic certification for Kent mango producers in the Bignona zone.'
WHERE title LIKE 'Certification biologique zone Bignona%';

UPDATE public.projects 
SET title_en = 'Solar Irrigation System — Oussouye',
    description_en = 'Installation of solar pumps and drip irrigation networks to secure water supply for plots during the dry season.'
WHERE title LIKE 'Système d''irrigation solaire%';

UPDATE public.projects 
SET title_en = 'Casamance Farmers'' School',
    description_en = 'Creation of a continuous training program on good agricultural practices, financial management, and direct marketing.'
WHERE title LIKE 'École des producteurs%';

UPDATE public.projects 
SET title_en = 'Access to European Markets — Organic Mango',
    description_en = 'Development of direct commercial partnerships with certified importers in France, Spain, and Portugal.'
WHERE title LIKE 'Accès aux marchés européens%';

UPDATE public.projects 
SET title_en = 'Processing and Packaging Unit',
    description_en = 'Construction of a post-harvest processing center to reduce losses and produce high value-added derivative products.'
WHERE title LIKE 'Unité de transformation%';
