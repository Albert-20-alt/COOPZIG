-- ─── Replace placeholder seed data with real Casamance/Ziguinchor content ─────
TRUNCATE TABLE public.blog_articles RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.projects      RESTART IDENTITY CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- BLOG ARTICLES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.blog_articles
  (title, excerpt, content, category, image_url, status, featured, read_time, published_at, created_at, updated_at)
VALUES

-- 1 ── MANGUE (FEATURED) ───────────────────────────────────────────────────────
(
  'Mangue Kent de Casamance : les clés d''une filière d''export qui performe',
  'Avec plus de 60 % de la production nationale, la Casamance s''impose comme le premier bassin mangue du Sénégal. La variété Kent, très prisée sur les marchés européens, représente à elle seule 70 % des volumes exportés de la région. Comment la coopérative structure-t-elle cette filière pour en maximiser la valeur ?',
  E'## Une géographie favorable\n\nLa région de Ziguinchor bénéficie d''un ensoleillement de 2 800 heures par an, d''une pluviométrie comprise entre 1 200 et 1 600 mm et de sols argilo-sableux profonds — un terroir idéal pour la mangue. Les vergers s''étendent principalement le long du fleuve Casamance et dans les corridors de Bignona et Oussouye.\n\n## La variété Kent, reine de l''export\n\nIntroduite dans les années 1990, la mangue Kent s''est rapidement imposée grâce à sa chair sans fibres, sa faible acidité et sa tenue au transport. Elle représente aujourd''hui plus de 70 % des volumes exportés vers l''Europe, notamment via les hubs de Dakar et Saint-Louis.\n\n## Les défis post-récolte\n\nLe principal goulot d''étranglement reste la chaîne du froid. Plus de 30 % des mangues sont perdues avant d''atteindre le marché d''export. La coopérative a lancé en 2024 un programme de plateformes de stockage réfrigéré en partenariat avec des opérateurs privés.\n\n## Perspectives 2025\n\nLa campagne 2025 s''annonce exceptionnelle : les estimations préliminaires tablent sur 18 000 tonnes commercialisables, soit une hausse de 18 % par rapport à 2024. Trois nouveaux accords avec des importateurs européens ont été signés en mars.',
  'Agriculture',
  'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80',
  'published', true, '7 min',
  now() - interval '2 days', now() - interval '2 days', now() - interval '2 days'
),

-- 2 ── ANACARDE ────────────────────────────────────────────────────────────────
(
  'Anacarde : l''or de Casamance face aux enjeux de la transformation locale',
  'Le Sénégal est le 5ème producteur mondial de noix de cajou et la Casamance en produit plus de 80 %. Pourtant, plus de 95 % des noix brutes sont exportées sans transformation. Un immense manque à gagner que la coopérative entend corriger.',
  E'## La Casamance, cœur de la production sénégalaise\n\nAvec une production estimée à 180 000 tonnes pour la campagne 2024-2025, le Sénégal confirme sa place de 5ème producteur mondial d''anacarde. La région de Ziguinchor concentre à elle seule 45 % de la production nationale, suivie par Sédhiou et Kolda.\n\n## Un prix volatile et des producteurs vulnérables\n\nLe prix bord-champ de la noix brute oscille entre 350 et 750 FCFA/kg selon les années, soumis aux fluctuations du marché mondial dominé par le Vietnam et l''Inde. Les producteurs, faute de capacités de stockage, vendent souvent en urgence au moment de la récolte, au plus bas des prix.\n\n## La transformation locale, levier de valeur ajoutée\n\nUne noix brute à 500 FCFA/kg peut générer 4 500 FCFA/kg de noix transformée. Plusieurs petites unités artisanales ont émergé à Ziguinchor, mais les volumes restent marginaux (moins de 3 % de la production). La coopérative a lancé une étude de faisabilité pour une unité semi-industrielle de 500 tonnes/an.\n\n## La certification comme levier prix\n\nLe programme de certification GlobalG.A.P, en cours depuis 2023, vise à positionner la noix de cajou casamançaise dans les circuits premium européens, avec un différentiel de prix attendu de +15 à 20 % par rapport au marché spot.',
  'Agriculture',
  'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=1200&q=80',
  'published', false, '8 min',
  now() - interval '5 days', now() - interval '5 days', now() - interval '5 days'
),

-- 3 ── RIZ ─────────────────────────────────────────────────────────────────────
(
  'Riziculture en Casamance : les vallées sous pression face à la salinisation',
  'Les plaines alluviales de Casamance ont fait la réputation de la région comme « grenier à riz » du Sénégal. Mais la remontée saline, accélérée par les sécheresses et la déforestation, ronge chaque année des centaines d''hectares de rizières. Un défi existentiel pour les communautés rurales.',
  E'## Les tannes salées gagnent du terrain\n\nDepuis les grandes sécheresses des années 1970-80, les tannes — terres stériles salées — se sont étendues à plus de 80 000 ha dans le bassin versant de la Casamance. Chaque saison des pluies insuffisante repousse un peu plus la ligne de dessalement naturel.\n\n## Un savoir-faire ancestral menacé\n\nLa riziculture de bas-fonds en Casamance repose sur un système de digues anti-sel (les « bolons ») construit et entretenu collectivement depuis des siècles. Ce patrimoine technique, géré principalement par les femmes dans les ethnies Diola et Mandingue, est aujourd''hui fragilisé par le manque de main-d''œuvre et l''entretien insuffisant des ouvrages.\n\n## Des variétés adaptées comme réponse partielle\n\nL''ISRA (Institut Sénégalais de Recherches Agricoles) a développé plusieurs variétés tolérantes au sel, comme la SNDR-2 et la CG14. La coopérative a distribué 8 tonnes de semences certifiées en 2024 à 240 producteurs.\n\n## La réhabilitation des digues, priorité du moment\n\nUn programme de réhabilitation de 45 km de digues anti-sel a été lancé en 2024 dans les communes de Kabrousse, Nyassia et Diouloulou, avec l''appui financier de l''USAID et de l''AFD. L''objectif : récupérer 1 200 ha de rizières abandonnées.',
  'Agriculture',
  'https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=1200&q=80',
  'published', false, '6 min',
  now() - interval '8 days', now() - interval '8 days', now() - interval '8 days'
),

-- 4 ── MARAÎCHAGE FEMMES ───────────────────────────────────────────────────────
(
  'Maraîchage péri-urbain à Ziguinchor : les femmes en première ligne de la sécurité alimentaire',
  'Dans les quartiers périphériques de Ziguinchor — Kandé, Lyndiane, Belfort — des centaines de femmes cultivent légumes et condiments sur de petites parcelles irriguées. Un maillon discret mais essentiel de l''alimentation locale, qui se professionnalise sous l''impulsion de la coopérative.',
  E'## 3 500 femmes maraîchères dans le département de Ziguinchor\n\nLe recensement agricole de 2023 identifie 3 500 femmes pratiquant le maraîchage dans le département, sur des parcelles allant de 200 m² à 1 ha. Tomates, oignons, aubergines, piments, gombo, moringa — la diversité des productions assure des revenus quasi-permanents sur l''année.\n\n## L''eau, contrainte principale\n\n80 % des maraîchères s''approvisionnent en eau via des puits traditionnels. En saison sèche (décembre-avril), le niveau phréatique peut baisser de plus de 6 mètres, rendant l''arrosage manuel épuisant. La pose de pompes solaires dans 12 groupements féminins a permis d''augmenter les surfaces cultivées de 35 % en 2024.\n\n## Les marchés de proximité comme débouché\n\nLe marché de Boucotte et le marché central de Ziguinchor absorbent l''essentiel de la production. Quelques groupements bien organisés approvisionnent directement les hôtels et restaurants de la ville, avec des prix négociés à l''avance.\n\n## La coopérative accompagne la structuration\n\nDepuis 2023, la CRPAZ soutient 8 groupements de femmes maraîchères via des formations en compostage, gestion de stock et tenue de comptabilité simplifiée. Un fonds de garantie de 5 millions FCFA a été constitué pour faciliter l''accès aux micro-crédits.',
  'Vie coopérative',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
  'published', false, '5 min',
  now() - interval '12 days', now() - interval '12 days', now() - interval '12 days'
),

-- 5 ── CITRUS ──────────────────────────────────────────────────────────────────
(
  'Agrumes en Casamance : une filière à fort potentiel qui cherche ses débouchés',
  'Oranges, clémentines, pamplemousses, citrons — la Casamance produit une grande diversité d''agrumes, principalement dans la zone d''Oussouye et la commune de Niaguis. Malgré une qualité organoleptique reconnue, la filière peine à s''organiser face à la concurrence des importations marocaines.',
  E'## Une production historique mais mal valorisée\n\nLes premiers vergers d''agrumes en Casamance datent de la période coloniale française (années 1930-40), introduits dans les missions catholiques de Ziguinchor et Oussouye. Aujourd''hui, on estime la production à 8 500 tonnes par an, mais plus de 40 % est perdue faute de débouchés organisés.\n\n## La concurrence des importations\n\nLe marché sénégalais est largement approvisionné par des oranges marocaines bon marché (prix de vente à 150-200 FCFA/kg), rendant difficile la compétitivité des agrumes locaux sur les seuls critères prix. L''avantage des producteurs casamançais réside dans la fraîcheur et l''absence de traitement post-récolte.\n\n## Des débouchés à développer\n\nTrois pistes sont explorées : (1) la transformation en jus frais pour la restauration et l''hôtellerie de Ziguinchor et Cap Skirring, (2) l''approvisionnement des marchés de Dakar en insistant sur l''argument « local et bio », (3) l''export vers la Gambie et la Guinée-Bissau voisines.\n\n## Un programme pilote de pressing artisanal\n\nLa coopérative teste depuis 2024 un atelier de pressage d''oranges à Oussouye avec trois groupements. Les premiers litrages ont été commercialisés auprès des hôtels de Cap Skirring à 800 FCFA/litre — un prix quatre fois supérieur à la valeur de l''orange brute.',
  'Marchés',
  'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&w=1200&q=80',
  'published', false, '6 min',
  now() - interval '15 days', now() - interval '15 days', now() - interval '15 days'
),

-- 6 ── PERTES POST-RÉCOLTE ─────────────────────────────────────────────────────
(
  'Pertes post-récolte : comment la coopérative a réduit le gaspillage de mangues de 30 % en deux ans',
  'En 2022, près d''un tiers des mangues récoltées en Casamance n''atteignaient jamais le consommateur final — un gâchis économique et humain considérable. Grâce à un programme d''équipements et de formation, la coopérative est parvenue à réduire ces pertes à 20 % en 2024.',
  E'## Le problème : une chaîne de valeur trouée\n\nLes pertes post-récolte de la mangue en Casamance étaient estimées à 30-35 % avant 2022. Elles se répartissent entre la récolte (chocs mécaniques), le transport (véhicules non adaptés), la manipulation au marché (empilement excessif) et le stockage (absence de froid).\n\n## Les interventions ciblées de la coopérative\n\n**Formation à la récolte raisonnée** : 180 producteurs ont suivi une formation sur les techniques de cueillette à l''aide de gaules munies de filets, qui réduisent les chocs de 60 % par rapport à la récolte au sol.\n\n**Caissettes plastiques normalisées** : la coopérative a distribué 4 500 caissettes de 10 kg aux membres, remplaçant les sacs et paniers tressés traditionnels. Résultat : les taux de brunissement à l''export ont diminué de 45 %.\n\n**Deux plateformes de collecte réfrigérées** : construites à Bignona et Oussouye en 2023, elles permettent de maintenir les mangues à 8-12°C pendant 72 heures avant le chargement export.\n\n## Résultats mesurés\n\nLe taux de pertes est passé de 33 % (2022) à 24 % (2023) puis 20 % (2024). Sur la base d''une production de 15 000 tonnes, cela représente 1 950 tonnes supplémentaires valorisées, soit environ 195 millions FCFA de revenus additionnels pour les membres.',
  'Actualités',
  'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=80',
  'published', false, '9 min',
  now() - interval '18 days', now() - interval '18 days', now() - interval '18 days'
),

-- 7 ── SÉSAME ──────────────────────────────────────────────────────────────────
(
  'Sésame : la spéculation discrète qui transforme silencieusement les revenus en Casamance',
  'Peu médiatisé comparé à la mangue ou à l''anacarde, le sésame connaît une expansion remarquable dans les départements de Sédhiou et Kolda. Sa culture peu exigeante en intrants, sa facilité de conservation et la forte demande asiatique en font une alternative crédible pour les petits producteurs.',
  E'## Un marché mondial en forte demande\n\nLe sésame est l''une des oléagineuses les plus demandées d''Asie : le Japon, la Chine et la Corée du Sud en importent massivement pour la transformation alimentaire. Le prix FOB export a doublé entre 2018 et 2024, passant de 800 à 1 600 USD/tonne.\n\n## La Casamance, zone de production émergente\n\nLes sols légers et bien drainés du Sédhiou et de la zone nord de Ziguinchor conviennent parfaitement à la culture du sésame, qui nécessite peu de pluie à la floraison. La production régionale est estimée à 12 000 tonnes en 2024, en hausse de 40 % sur cinq ans.\n\n## Une culture accessible aux petits producteurs\n\nLe sésame demande peu d''intrants chimiques (naturellement résistant à plusieurs ravageurs), se cultive sur des parcelles de 0,5 à 2 ha et se récolte manuellement. Son principal défaut est la pénibilité de l''égrenage, qui mobilise beaucoup de main-d''œuvre féminine.\n\n## La coopérative s''y intéresse\n\nDepuis 2024, la CRPAZ accompagne un groupement pilote de 35 producteurs de sésame à Sédhiou, avec un appui à la certification « sans OGM » demandée par les acheteurs japonais. Un premier conteneur de 22 tonnes a été exporté en octobre 2024 via un courtier dakarois.',
  'Marchés',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=80',
  'published', false, '6 min',
  now() - interval '22 days', now() - interval '22 days', now() - interval '22 days'
),

-- 8 ── AGROFORESTERIE ──────────────────────────────────────────────────────────
(
  'Agroforesterie en Casamance : réconcilier productivité agricole et biodiversité forestière',
  'La Casamance a perdu plus de 60 % de son couvert forestier en 50 ans. Face à cette déforestation galopante, des producteurs de la coopérative expérimentent l''agroforesterie — cultiver sous et autour des arbres — pour restaurer les écosystèmes tout en maintenant leurs revenus.',
  E'## Une forêt casamançaise en recul alarmant\n\nDans les années 1960, la forêt dense couvrait encore 45 % du territoire casamançais. En 2023, elle n''en occupe plus que 18 %. Les causes : défrichements agricoles, exploitation du bois d''énergie (charbon de bois), conflits fonciers et faibles investissements publics dans le reboisement.\n\n## L''agroforesterie : une réponse systémique\n\nLe principe : maintenir ou planter des arbres dans les parcelles agricoles pour reconstituer les services écosystémiques — ombrage réduisant l''évapotranspiration, fixation d''azote (pour les légumineuses arborées comme le Faidherbia), recyclage des nutriments, habitat de la faune auxiliaire.\n\n## Les espèces emblématiques du système casamançais\n\n- **Parkia biglobosa (néré)** : ses gousses fermentées (soumbara) sont un condiment de base ; son ombrage réduit la température des sols de 4 à 6°C.\n- **Vitellaria paradoxa (karité)** : huile très prisée, ombrage léger favorable au mil et au sorgho.\n- **Faidherbia albida** : fixateur d''azote, perd ses feuilles en saison des pluies (ne concurrence pas les cultures).\n- **Mangifera indica (manguier)** : déjà intégré de facto dans la plupart des champs casamançais.\n\n## Le programme pilote de la coopérative\n\nDepuis 2024, 48 producteurs reboisent leurs parcelles en associant anacardiers, manguiers et espèces forestières locales. L''objectif est de planter 50 000 arbres d''ici 2026 sur 600 ha.',
  'Agriculture',
  'https://images.unsplash.com/photo-1500076656116-558758965081?auto=format&fit=crop&w=1200&q=80',
  'published', false, '7 min',
  now() - interval '28 days', now() - interval '28 days', now() - interval '28 days'
),

-- 9 ── BANANE ──────────────────────────────────────────────────────────────────
(
  'La banane casamançaise retrouve son marché face aux importations',
  'Longtemps concurrencée par la banane importée d''Équateur et de Côte d''Ivoire, la banane locale de Casamance reconquiert progressivement les marchés urbains grâce à son goût prononcé et l''argument circuit court. La zone de Santhiaba-Manjaque concentre les meilleurs vergers.',
  E'## Une production locale en déclin historique\n\nAu début des années 2000, la libéralisation des importations de bananes a profondément déstabilisé les producteurs locaux, incapables de rivaliser sur le prix avec les grandes plantations industrielles d''Amérique latine. La surface cultivée a chuté de 60 % entre 1995 et 2010.\n\n## Les atouts du circuit court\n\nLa banane casamançaise, récoltée à maturité et commercialisée en moins de 48 heures, présente un profil aromatique bien supérieur à la banane importée, cueillie verte et mûrie artifiquement au carbure. Ce différentiel qualitatif est de plus en plus valorisé dans la restauration et les marchés de produits frais.\n\n## La zone de Santhiaba-Manjaque\n\nCette commune du département de Ziguinchor concentre les principales plantations bananières, bénéficiant d''un microclimat humide et de sols alluviaux riches en matière organique. La variété dominante est la « Poyo » (Grande Naine), bien adaptée à la demande locale.\n\n## Perspectives de développement\n\nLa coopérative explore deux pistes : (1) le séchage de bananes pour les marchés touristiques (Cap Skirring, Ziguinchor) et l''export vers Dakar, et (2) la transformation en farine de banane verte, alternative à la farine de blé importée pour la pâtisserie artisanale.',
  'Marchés',
  'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1200&q=80',
  'published', false, '5 min',
  now() - interval '35 days', now() - interval '35 days', now() - interval '35 days'
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PROJECTS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.projects
  (title, description, category, status, period, budget, beneficiaires, tags, icon_name, image_url, sort_order, created_at, updated_at)
VALUES

-- 1 ── CHAÎNE FROID MANGUE ──────────────────────────────────────────────────────
(
  'Plateforme frigorifique mangue — Bignona & Oussouye',
  'Construction de deux entrepôts frigorifiques (100 m³ chacun) alimentés par panneaux solaires dans les zones de Bignona et Oussouye. Objectif : réduire les pertes post-récolte mangue de 33 % à 15 % d''ici 2026 en assurant le maintien de la chaîne du froid entre la récolte et le chargement export.',
  'Post-récolte & Logistique',
  'en_cours',
  '2024 – 2026',
  '85M FCFA',
  '280 producteurs mangue',
  ARRAY['Chaîne du froid', 'Mangue', 'Énergie solaire', 'Pertes post-récolte'],
  'Zap',
  'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=80',
  1, now(), now()
),

-- 2 ── CERTIFICATION ANACARDE ───────────────────────────────────────────────────
(
  'Certification GlobalG.A.P anacarde — Zone Sédhiou-Ziguinchor',
  'Programme d''accompagnement de 120 producteurs d''anacarde vers la double certification GlobalG.A.P et Rainforest Alliance. La certification ouvre l''accès aux acheteurs premium européens et japonais avec un différentiel de prix estimé à +18 % par rapport au marché spot. Comprend formation, audits et mise à niveau des pratiques.',
  'Commerce international',
  'en_cours',
  '2023 – 2026',
  '38M FCFA',
  '120 producteurs',
  ARRAY['Anacarde', 'Certification', 'GlobalG.A.P', 'Export', 'Premium'],
  'Globe',
  'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=1200&q=80',
  2, now(), now()
),

-- 3 ── RÉHABILITATION DIGUES ───────────────────────────────────────────────────
(
  'Réhabilitation de 45 km de digues anti-sel — Riziculture Casamance',
  'Réhabilitation de 45 km de digues anti-intrusion saline dans les communes de Kabrousse, Nyassia et Diouloulou. Le projet vise à récupérer 1 200 ha de rizières abandonnées depuis les sécheresses des années 1980-90. Financement conjoint AFD / USAID / CRPAZ. 620 familles rizicoles bénéficiaires.',
  'Eau & Infrastructures',
  'en_cours',
  '2024 – 2027',
  '320M FCFA',
  '620 familles',
  ARRAY['Riziculture', 'Salinisation', 'Digues', 'AFD', 'USAID', 'Réhabilitation'],
  'Droplets',
  'https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=1200&q=80',
  3, now(), now()
),

-- 4 ── UNITÉ TRANSFORMATION ANACARDE ───────────────────────────────────────────
(
  'Unité semi-industrielle de transformation de l''anacarde — Ziguinchor',
  'Étude de faisabilité et montage financier pour une unité de transformation de 500 tonnes/an de noix de cajou brute en amandes décortiquées. L''objectif est de multiplier par 8 la valeur ajoutée locale de l''anacarde (de 500 FCFA/kg brut à 4 500 FCFA/kg transformé) et de créer 80 emplois permanents, dont 60 % de femmes.',
  'Valorisation & Transformation',
  'planifie',
  '2026 – 2028',
  '480M FCFA',
  '350 producteurs + 80 emplois',
  ARRAY['Anacarde', 'Transformation', 'Valeur ajoutée', 'Emploi', 'Femmes'],
  'TrendingUp',
  'https://images.unsplash.com/photo-1542838686-4d07d73af57a?auto=format&fit=crop&w=1200&q=80',
  4, now(), now()
),

-- 5 ── MARAÎCHAGE FÉMININ ──────────────────────────────────────────────────────
(
  'Appui à la filière maraîchère féminine — 12 groupements de Ziguinchor',
  'Renforcement de 12 groupements de femmes maraîchères péri-urbaines à travers l''installation de pompes solaires d''irrigation, des formations en compostage et gestion de stock, et la mise en place d''un fonds de garantie de 5M FCFA pour l''accès aux micro-crédits. Cible : augmenter les revenus annuels de 35 % par maraîchère.',
  'Agriculture durable',
  'en_cours',
  '2023 – 2025',
  '28M FCFA',
  '340 femmes maraîchères',
  ARRAY['Femmes', 'Maraîchage', 'Irrigation solaire', 'Micro-crédit', 'Autonomisation'],
  'Sprout',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
  5, now(), now()
),

-- 6 ── AGROFORESTERIE ──────────────────────────────────────────────────────────
(
  'Reboisement agroforestier — 50 000 arbres sur 600 ha en Casamance',
  'Programme de plantation agroforestière associant espèces fruitières (manguiers, anacardiers) et forestières locales (Parkia biglobosa, Vitellaria paradoxa, Faidherbia albida) sur les parcelles des membres de la coopérative. Vise à restaurer le couvert forestier, améliorer la fertilité des sols et diversifier les revenus agricoles.',
  'Environnement & Agroécologie',
  'planifie',
  '2025 – 2027',
  '55M FCFA',
  '480 producteurs',
  ARRAY['Reboisement', 'Agroforesterie', 'Biodiversité', 'Carbone', 'Karité', 'Néré'],
  'Leaf',
  'https://images.unsplash.com/photo-1500076656116-558758965081?auto=format&fit=crop&w=1200&q=80',
  6, now(), now()
),

-- 7 ── ÉCOLE DES PRODUCTEURS ───────────────────────────────────────────────────
(
  'École des producteurs de Casamance — BPA Mangue & Anacarde',
  'Programme de formation continue de 3 ans centré sur les Bonnes Pratiques Agricoles (BPA) pour les filières mangue et anacarde. Module sur la gestion intégrée des ravageurs (sans pesticides), la tenue de fiches parcellaires (traçabilité) et la gestion financière simplifiée. 240 producteurs certifiés à l''issue du programme.',
  'Formation & Renforcement de capacités',
  'termine',
  '2021 – 2024',
  '22M FCFA',
  '240 producteurs',
  ARRAY['Formation', 'BPA', 'Traçabilité', 'Gestion', 'Mangue', 'Anacarde'],
  'Users',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
  7, now(), now()
),

-- 8 ── SÉSAME EXPORT ───────────────────────────────────────────────────────────
(
  'Développement de la filière sésame sans OGM — Export Japon & Corée',
  'Structuration d''un groupement de 80 producteurs de sésame dans le département de Sédhiou autour d''un cahier des charges « sans OGM / sans pesticides de synthèse » répondant aux exigences des acheteurs asiatiques. Programme de contractualisation sur 3 ans avec un exportateur dakarois pour 200 tonnes/an.',
  'Commerce international',
  'planifie',
  '2025 – 2028',
  '18M FCFA',
  '80 producteurs',
  ARRAY['Sésame', 'Export', 'Japon', 'Sans OGM', 'Asie', 'Contractualisation'],
  'Globe',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=80',
  8, now(), now()
),

-- 9 ── CITRUS PRESSAGE ─────────────────────────────────────────────────────────
(
  'Ateliers de pressage artisanal d''agrumes — Oussouye & Cap Skirring',
  'Installation de 5 ateliers artisanaux de pressage d''oranges, pamplemousses et citrons dans la zone d''Oussouye, visant à fournir du jus frais premium aux hôtels et restaurants touristiques de Cap Skirring et Ziguinchor. Prix de vente cible : 800 FCFA/litre contre 180 FCFA/kg pour le fruit brut.',
  'Valorisation & Transformation',
  'en_cours',
  '2024 – 2025',
  '12M FCFA',
  '45 producteurs agrumes',
  ARRAY['Agrumes', 'Transformation', 'Jus', 'Tourisme', 'Oussouye', 'Cap Skirring'],
  'TrendingUp',
  'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&w=1200&q=80',
  9, now(), now()
),

-- 10 ── NUMÉRIQUE ──────────────────────────────────────────────────────────────
(
  'Plateforme numérique CRPAZ — Gestion intégrée de la coopérative',
  'Déploiement d''un système de gestion numérique couvrant les producteurs, vergers, stocks, commandes, finances et facturation. La plateforme inclut un portail public de vente en ligne, un tableau de bord de transparence des prix du marché et des outils de reporting pour les partenaires financiers.',
  'Transformation digitale',
  'termine',
  '2023 – 2024',
  '45M FCFA',
  '248 membres + acheteurs',
  ARRAY['Digital', 'Gestion', 'Transparence', 'E-commerce', 'Reporting'],
  'Zap',
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80',
  10, now(), now()
);
