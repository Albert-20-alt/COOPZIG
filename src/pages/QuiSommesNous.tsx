import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Heart, Sprout, Target, Shield,
  MapPin, CheckCircle2, ArrowUpRight, Quote,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { usePublicStats } from "@/hooks/usePublicStats";
import { formatCompact } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import aboutTeam from "@/assets/about-team.jpg";
import heroImage from "@/assets/hero-premium.jpg";
import aboutHarvest from "@/assets/about-harvest.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const VALUE_ICONS = [Heart, Sprout, Shield, Target];

const DEFAULT_TIMELINE = [
  { year: "2009", title: "Fondation", desc: "Création de la coopérative par 30 producteurs pionniers à Ziguinchor." },
  { year: "2013", title: "Première Export", desc: "Première livraison de mangues Kent à l'international, certifiée qualité export." },
  { year: "2017", title: "Certification Bio", desc: "Obtention de la certification biologique pour 60% de la production." },
  { year: "2020", title: "Digitalisation", desc: "Lancement de la plateforme numérique de gestion et de vente en ligne." },
  { year: "2024", title: "248 Membres", desc: "La coopérative atteint 248 producteurs répartis sur 4 zones de Casamance." },
];

const DEFAULT_ZONES = [
  { name: "Ziguinchor", members: "82", specialty: "Anacarde & Mangue" },
  { name: "Bignona", members: "65", specialty: "Mangue Kent" },
  { name: "Oussouye", members: "48", specialty: "Agrumes" },
  { name: "Sédhiou", members: "53", specialty: "Banane & Ditakh" },
];

const DEFAULT_VALUES = [
  { title: "Solidarité", desc: "Mutualisation des moyens et partage équitable des bénéfices entre tous les membres." },
  { title: "Durabilité", desc: "Pratiques agroécologiques respectueuses de notre terre et des générations futures." },
  { title: "Qualité", desc: "Normes internationales et traçabilité complète de la parcelle à l'acheteur." },
  { title: "Innovation", desc: "Adoption de technologies modernes pour optimiser la production et la commercialisation." },
];

const QuiSommesNous = () => {
  const { t } = useTranslation();
  const { data: configs } = useSiteConfig();
  const { data: stats } = usePublicStats();
  const cfg = (key: string, fallback: string) =>
    configs?.find((c) => c.cle === key)?.valeur || fallback;

  // Stats auto-computed from live DB — site_config values used as manual override if set
  const stat1Value = cfg("about_stat_1_value", "") || (stats ? formatCompact(stats.totalHectares) : "…");
  const stat1Label = cfg("about_stat_1_label", t("about.stat1", "Hectares"));
  const stat2Value = cfg("about_stat_2_value", "") || (stats ? formatCompact(stats.annualProduction) + " T" : "…");
  const stat2Label = cfg("about_stat_2_label", t("about.stat2", "Tonnes Export"));
  const stat3Value = cfg("about_stat_3_value", "") || (stats ? `${stats.tauxCommercialisation}%` : "…");
  const stat3Label = cfg("about_stat_3_label", t("about.stat3", "Taux Vente"));
  const stat4Value = cfg("about_stat_4_value", "") || (stats ? String(stats.totalProducers) : "…");
  const stat4Label = cfg("about_stat_4_label", t("about.stat4", "Membres actifs"));
  const heroBadge    = cfg("about_hero_badge",    t("about.hero.badge", "Notre Histoire"));
  const heroTitle    = cfg("about_hero_title",    t("about.hero.title", "L'excellence agricole au cœur de la Casamance."));
  const heroSubtitle = cfg("about_hero_subtitle", t("about.hero.subtitle", "Depuis 2009, nous unissons les forces de la région pour produire, valoriser et exporter collectivement les richesses authentiques de notre terroir."));
  const missionTitle = cfg("about_mission_title", t("about.mission.title", "Structurer et développer la filière fruitière."));
  const missionP1    = cfg("about_mission_p1",    t("about.mission.p1", "Notre mission est d'offrir à nos producteurs les outils, la formation et les débouchés nécessaires pour vivre dignement de leur terre, tout en garantissant l'excellence à nos clients."));
  const missionP2    = cfg("about_mission_p2",    t("about.mission.p2", "Nous croyons qu'une agriculture organisée, tracée et certifiée peut transformer durablement les conditions de vie de milliers de familles tout en préservant les écosystèmes uniques de la Casamance."));
  const valuesTitle   = cfg("about_values_title",   t("about.values.title", "Ce qui nous guide"));
  const timelineTitle = cfg("about_timeline_title", t("about.timeline.title", "15 ans d'engagement"));
  const zonesTitle    = cfg("about_zones_title",    t("about.zones.title", "Nos Zones de Production"));
  const ctaTitle      = cfg("about_cta_title",      t("about.cta.title", "Rejoignez le mouvement"));
  const ctaSubtitle   = cfg("about_cta_subtitle",   t("about.cta.subtitle", "Que vous soyez producteur, acheteur ou partenaire, bâtissons ensemble l'agriculture de demain."));

  const valuesRaw = configs?.find((c) => c.cle === "about_values")?.valeur;
  const values: { title: string; desc: string }[] = (() => {
    if (!valuesRaw) return DEFAULT_VALUES;
    try { return JSON.parse(valuesRaw); } catch { return DEFAULT_VALUES; }
  })();
  const resolvedValues = DEFAULT_VALUES.map((def, i) => ({
    title: cfg(`about_value_${i + 1}_title`, values[i]?.title ?? def.title),
    desc:  cfg(`about_value_${i + 1}_desc`,  values[i]?.desc  ?? def.desc),
  }));

  const timelineRaw = configs?.find((c) => c.cle === "about_timeline")?.valeur;
  const timeline: { year: string; title: string; desc: string }[] = (() => {
    if (!timelineRaw) return DEFAULT_TIMELINE;
    try { return JSON.parse(timelineRaw); } catch { return DEFAULT_TIMELINE; }
  })();

  const zonesRaw = configs?.find((c) => c.cle === "about_zones")?.valeur;
  const zones: { name: string; members: string; specialty: string }[] = (() => {
    if (!zonesRaw) return DEFAULT_ZONES;
    try { return JSON.parse(zonesRaw); } catch { return DEFAULT_ZONES; }
  })();

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col justify-end overflow-hidden">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040e07] via-[#071410]/70 to-[#071410]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#040e07]/60 via-transparent to-transparent" />
        </div>

        {/* Decorative large text watermark */}
        <div className="absolute bottom-0 right-0 text-[22vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          CRPAZ
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pb-20 pt-52">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white/70 text-[10px] font-semibold uppercase tracking-[0.3em] mb-8">
              {heroBadge}
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-white max-w-4xl mb-6 sm:mb-8">
              {heroTitle}
            </h1>

            <p className="text-lg md:text-xl text-white/55 font-light leading-relaxed max-w-2xl mb-14">
              {heroSubtitle}
            </p>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap items-center gap-0 divide-x divide-white/10"
          >
            {[
              { value: stat1Value, label: stat1Label },
              { value: stat2Value, label: stat2Label },
              { value: stat3Value, label: stat3Label },
              { value: stat4Value, label: stat4Label },
            ].map((s, i) => (
              <div key={i} className="px-8 first:pl-0">
                <p className="text-3xl md:text-4xl font-semibold text-white tracking-tight">{s.value}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-32 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left: images stacked */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="rounded-[2.5rem] overflow-hidden aspect-[4/5] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)]">
                <img src={aboutTeam} alt="Équipe coopérative" className="w-full h-full object-cover" />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-8 -right-4 md:-right-10 bg-white rounded-3xl p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12)] border border-black/[0.04] w-60">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                    <Sprout size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-black/50">{t("about.static.founded", "Fondée en")}</span>
                </div>
                <p className="text-4xl font-semibold tracking-tight text-gray-900">2009</p>
                <p className="text-xs text-muted-foreground mt-1 font-light">Ziguinchor, Casamance</p>
              </div>
              {/* Year badge */}
              <div className="absolute -top-6 -left-4 md:-left-8 bg-primary text-white rounded-2xl px-5 py-3 shadow-lg">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{t("about.static.since", "Depuis")}</p>
                <p className="text-2xl font-semibold tracking-tight">{t("about.static.15years", "15 ans")}</p>
              </div>
            </motion.div>

            {/* Right: text */}
            <motion.div {...fadeUp} className="space-y-8">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block">
                Notre Mission
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.05] tracking-tight text-gray-900">
                {missionTitle}
              </h2>

              {/* Pull quote */}
              <div className="relative pl-6 border-l-2 border-primary/30 py-2">
                <Quote size={18} className="text-primary/40 mb-3" />
                <p className="text-lg text-gray-600 font-light leading-relaxed italic">
                  {missionP1}
                </p>
              </div>

              <p className="text-base text-muted-foreground font-light leading-relaxed">
                {missionP2}
              </p>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-black/[0.05]">
                {[
                  { value: stat1Value, label: stat1Label },
                  { value: stat2Value, label: stat2Label },
                  { value: stat3Value, label: stat3Label },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-semibold tracking-tight text-gray-900">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.15em] font-semibold">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-32 bg-[#071410] relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <motion.div {...fadeUp} className="mb-20">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-4">
              Nos Valeurs
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white max-w-lg leading-tight">
              {valuesTitle}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {resolvedValues.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? Heart;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="group relative p-8 rounded-3xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-500 backdrop-blur-sm overflow-hidden"
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/[0.15] border border-primary/20 flex items-center justify-center mb-7 group-hover:bg-primary/25 transition-colors duration-300">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{v.title}</h3>
                    <p className="text-sm text-white/[0.45] font-light leading-relaxed">{v.desc}</p>
                  </div>

                  {/* Large decorative number */}
                  <span className="absolute -bottom-4 -right-2 text-8xl font-black text-white/[0.025] leading-none select-none pointer-events-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Timeline — 15 ans d'engagement ───────────────────────────────────── */}
      <section className="py-16 sm:py-32 bg-[#FDFCFB] relative overflow-hidden">
        {/* Decorative large background text */}
        <div className="absolute -top-10 -left-8 text-[18vw] font-black text-black/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          15
        </div>

        <div className="max-w-5xl mx-auto px-6 sm:px-8 relative z-10">
          <motion.div {...fadeUp} className="mb-20">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-4">
              Notre Parcours
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              {timelineTitle}
            </h2>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Center vertical line */}
            <div className="hidden md:block absolute left-1/2 -translate-x-px top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary/60 via-primary/20 to-primary/5" />

            <div className="space-y-6 md:space-y-0">
              {timeline.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className={`relative md:flex items-center md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  {/* Card */}
                  <div className={`md:w-[46%] ${i % 2 === 0 ? "md:pr-14" : "md:pl-14"}`}>
                    <div className={`group relative bg-white rounded-3xl border border-black/[0.05] p-8 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden ${i % 2 === 0 ? "" : ""}`}>
                      {/* Year as background decor */}
                      <span className="absolute -top-3 -right-2 text-7xl font-black text-black/[0.04] leading-none select-none pointer-events-none tracking-tight">
                        {item.year}
                      </span>

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider">
                            {item.year}
                          </span>
                          <div className="h-px flex-1 bg-black/[0.05]" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">{item.title}</h3>
                        <p className="text-sm text-muted-foreground font-light leading-relaxed">{item.desc}</p>
                      </div>

                      {/* Hover accent line */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-3xl" />
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-primary shadow-[0_0_0_4px_rgba(27,77,33,0.12)] z-10 items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>

                  {/* Mobile: left dot */}
                  <div className="md:hidden absolute -left-[5px] top-10 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#FDFCFB]" />

                  <div className="hidden md:block md:w-[46%]" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Image break ──────────────────────────────────────────────────────── */}
      <div className="relative h-[50vh] overflow-hidden">
        <img src={aboutHarvest} alt="Récolte Casamance" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFB] via-transparent to-[#FDFCFB]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-white text-4xl md:text-6xl font-semibold tracking-tight text-center px-6 drop-shadow-2xl max-w-3xl"
          >
            {t("about.static.quote", "\"La terre de Casamance nourrit des milliers de familles.\"")}
          </motion.p>
        </div>
      </div>

      {/* ── Zones ────────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-32 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div {...fadeUp} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-20">
            <div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-4">
                {t("about.static.geography", "Géographie")}
              </span>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
                {zonesTitle}
              </h2>
            </div>
            <p className="text-muted-foreground font-light max-w-sm text-sm leading-relaxed">
              {t("about.static.vision", "Quatre territoires, une vision commune : valoriser les spéculations locales à l'échelle internationale.")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {zones.map((zone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="group relative bg-white rounded-3xl border border-black/[0.05] p-8 hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden"
              >
                {/* Background large number */}
                <span className="absolute -bottom-4 -right-2 text-8xl font-black text-black/[0.03] leading-none select-none pointer-events-none">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-primary/[0.08] border border-primary/[0.15] flex items-center justify-center mb-7 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                    <MapPin size={18} className="text-primary group-hover:text-white transition-colors duration-400" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{zone.name}</h3>
                  <p className="text-xs text-primary font-semibold uppercase tracking-[0.15em] mt-2 mb-8">
                    {zone.specialty}
                  </p>

                  <div className="pt-6 border-t border-black/[0.04] flex items-end justify-between">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t("about.static.members", "Membres")}</p>
                      <p className="text-4xl font-semibold tracking-tight text-gray-900">{zone.members}</p>
                    </div>
                    <CheckCircle2 size={20} className="text-primary/30 group-hover:text-primary/60 transition-colors duration-400 mb-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-32 bg-[#071410] relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-900/[0.15] rounded-full blur-[100px] pointer-events-none" />

        {/* Decorative text */}
        <div className="absolute bottom-0 right-0 text-[16vw] font-black text-white/[0.02] leading-none select-none pointer-events-none tracking-tighter">
          JOIN
        </div>

        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <motion.div {...fadeUp} className="space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em]">
              {t("about.static.join_badge", "Nous rejoindre")}
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-[1.05]">
              {ctaTitle}
            </h2>

            <p className="text-lg text-white/[0.45] font-light max-w-xl mx-auto leading-relaxed">
              {ctaSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/auth"
                className="group w-full sm:w-auto px-10 py-5 rounded-2xl bg-primary text-white font-bold text-sm hover:shadow-[0_0_40px_rgba(27,77,33,0.5)] hover:scale-[1.02] transition-all duration-400 flex items-center justify-center gap-3"
              >
                {t("about.cta.join", "Devenir Membre")}
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/20 transition-all duration-400 flex items-center justify-center gap-3 backdrop-blur-sm"
              >
                {t("about.cta.contact", "Nous Contacter")}
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default QuiSommesNous;
