import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, Clock,
  Sprout, Droplets, Zap, Users, Globe, TrendingUp, Leaf, Building,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

type ProjectStatus = "en_cours" | "termine" | "planifie";
type Filter = "tous" | ProjectStatus;

interface Project {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: ProjectStatus;
  period: string | null;
  budget: string | null;
  beneficiaires: string | null;
  tags: string[];
  icon_name: string;
  image_url: string | null;
  sort_order: number;
  title_en?: string;
  description_en?: string;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; dot: string; badge: string; icon: React.ElementType }> = {
  en_cours: { label: "En cours",  dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-100",          icon: Clock },
  termine:  { label: "Terminé",   dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-100",  icon: CheckCircle2 },
  planifie: { label: "Planifié",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-100",         icon: Clock },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "tous",     label: "Tous" },
  { key: "en_cours", label: "En cours" },
  { key: "planifie", label: "Planifiés" },
  { key: "termine",  label: "Terminés" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Sprout, Droplets, Users, Globe, Zap, Leaf, Building,
};

const Projets = () => {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<Filter>("tous");
  const { data: configs } = useSiteConfig();
  const cfg = (key: string, fallback: string) => configs?.find((c) => c.cle === key)?.valeur || fallback;
  const heroTitle    = cfg("projets_hero_title",    t("public_projects.hero.title", "Projets & programmes"));
  const heroSubtitle = cfg("projets_hero_subtitle", t("public_projects.hero.subtitle", "Des investissements concrets pour renforcer les capacités de nos producteurs, moderniser la filière et ouvrir de nouveaux marchés."));
  const ctaTitle     = cfg("projets_cta_title",     t("public_projects.cta.title", "Vous souhaitez soutenir nos projets ?"));
  const ctaSubtitle  = cfg("projets_cta_subtitle",  t("public_projects.cta.subtitle", "Partenaires, bailleurs ou investisseurs — contactez-nous pour contribuer au développement de la coopérative."));

  const isEn = i18n.language.startsWith("en");
  const getTitle = (p: any) => isEn && p.title_en ? p.title_en : p.title;
  const getDescription = (p: any) => isEn && p.description_en ? p.description_en : p.description;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["public-projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Project[];
    },
  });

  const filtered = filter === "tous" ? projects : projects.filter((p) => p.status === filter);

  const counts = {
    total:    projects.length,
    en_cours: projects.filter((p) => p.status === "en_cours").length,
    planifie: projects.filter((p) => p.status === "planifie").length,
    termine:  projects.filter((p) => p.status === "termine").length,
  };

  const totalBudget = (() => {
    const vals = projects.map((p) => parseFloat((p.budget ?? "0").replace(/[^\d.]/g, ""))).filter((n) => !isNaN(n));
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum > 0 ? `${sum}M` : "—";
  })();

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#071410] pt-36 pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-900/[0.15] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 text-[16vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          PROJETS
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em] mb-7">
              {t("public_projects.hero.badge", "Nos Initiatives")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-white mb-5 sm:mb-7">
              {heroTitle}
            </h1>
            <p className="text-lg text-white/[0.45] font-light leading-relaxed max-w-xl">
              {heroSubtitle}
            </p>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap sm:flex-nowrap sm:divide-x divide-white/10 border-t border-white/10 pt-8 sm:pt-10 gap-6 sm:gap-0 overflow-x-auto"
          >
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="px-8 first:pl-0 animate-pulse space-y-2">
                    <div className="h-8 w-14 bg-white/10 rounded" />
                    <div className="h-2 w-24 bg-white/5 rounded" />
                  </div>
                ))
              : [
                  { value: String(counts.total),                               label: t("public_projects.stats.total", "Projets au total") },
                  { value: totalBudget + t("public_projects.stats.fcfa", " FCFA"),                              label: t("public_projects.stats.budget", "Budget mobilisé") },
                  { value: String(counts.en_cours + counts.planifie),          label: t("public_projects.stats.active", "Projets actifs") },
                  { value: String(counts.termine),                             label: t("public_projects.stats.finished", "Projets terminés") },
                ].map((s, i) => (
                  <div key={i} className="px-8 first:pl-0">
                    <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">{s.value}</p>
                    <p className="text-[10px] text-white/[0.35] uppercase tracking-[0.2em] font-medium mt-1">{s.label}</p>
                  </div>
                ))}
          </motion.div>
        </div>
      </section>

      {/* ── Filter + Grid ─────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Filter tabs */}
          <motion.div {...fadeUp} className="flex flex-wrap items-center gap-2 mb-14">
            {FILTERS.map((f) => {
              const count = f.key === "tous" ? counts.total
                : f.key === "en_cours" ? counts.en_cours
                : f.key === "planifie" ? counts.planifie
                : counts.termine;

              const label = f.key === "tous" ? t("public_projects.filters.all", "Tous")
                : f.key === "en_cours" ? t("public_projects.filters.ongoing", "En cours")
                : f.key === "planifie" ? t("public_projects.filters.planned", "Planifiés")
                : t("public_projects.filters.finished", "Terminés");
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                    filter === f.key
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                      : "bg-white text-gray-500 border-black/[0.07] hover:border-black/20 hover:text-gray-800"
                  }`}
                >
                  {label}
                  {!isLoading && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      filter === f.key ? "bg-white/20 text-white" : "bg-black/[0.05] text-gray-400"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* Cards */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden animate-pulse">
                  <div className="aspect-[16/8] bg-gray-100" />
                  <div className="p-7 space-y-3">
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="h-5 bg-gray-100 rounded w-4/5" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32 text-muted-foreground text-sm">
              {t("public_projects.list.empty", "Aucun projet dans cette catégorie.")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((project, i) => {
                const Icon = ICON_MAP[project.icon_name] ?? TrendingUp;
                const status = STATUS_CONFIG[project.status];
                const StatusIcon = status.icon;
                const statusLabel = project.status === "en_cours" ? t("public_projects.list.status.ongoing", "En cours")
                  : project.status === "termine" ? t("public_projects.list.status.finished", "Terminé")
                  : t("public_projects.list.status.planned", "Planifié");
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.5 }}
                  >
                    <Link
                      to={`/projets/${project.id}`}
                      className="group bg-white rounded-3xl border border-black/[0.05] overflow-hidden flex flex-col hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-400 h-full"
                    >
                      {/* Image or gradient header */}
                      {project.image_url ? (
                        <div className="aspect-[16/8] overflow-hidden relative">
                          <img
                            src={project.image_url}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                          />
                          {/* Status badge overlay */}
                          <div className="absolute top-4 right-4">
                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border backdrop-blur-sm ${status.badge}`}>
                              <StatusIcon size={10} />
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[16/8] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
                          <Icon size={40} className="text-gray-200" />
                          <div className="absolute top-4 right-4">
                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${status.badge}`}>
                              <StatusIcon size={10} />
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-7 flex flex-col flex-1">
                        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary/70 mb-2.5">
                          {t(`projects.categories.${project.category}`, project.category)}
                        </p>
                        <h3 className="text-lg font-bold leading-snug text-gray-900 mb-3 line-clamp-2">
                          {getTitle(project)}
                        </h3>
                        {getDescription(project) && (
                          <p className="text-sm text-muted-foreground font-light leading-relaxed flex-1 mb-5 line-clamp-3">
                            {getDescription(project)}
                          </p>
                        )}

                        {/* Tags */}
                        {project.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-5">
                            {project.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/[0.04] text-gray-500 uppercase tracking-wide">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Key figures */}
                        <div className="pt-5 border-t border-black/[0.04] grid grid-cols-3 gap-2 mt-auto">
                          {[
                            { label: t("public_projects.list.period", "Période"),       value: project.period ?? "—" },
                            { label: t("public_projects.list.budget", "Budget"),         value: project.budget ?? "—" },
                            { label: t("public_projects.list.beneficiaries", "Bénéficiaires"),  value: project.beneficiaires ?? "—" },
                          ].map((item) => (
                            <div key={item.label} className="text-center">
                              <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{item.label}</p>
                              <p className="text-[11px] font-bold text-gray-800 truncate">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-28 bg-[#071410] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 text-[14vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          SOUTIEN
        </div>

        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <motion.div {...fadeUp} className="space-y-7">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em]">
              Partenariats
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">
              {ctaTitle}
            </h2>
            <p className="text-white/[0.45] font-light leading-relaxed text-lg max-w-xl mx-auto">
              {ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/contact"
                className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl bg-primary text-white font-bold text-sm hover:shadow-[0_0_30px_rgba(27,77,33,0.5)] hover:scale-[1.02] transition-all duration-300"
              >
                {t("public_projects.cta.contact", "Nous contacter")}
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/qui-sommes-nous"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                {t("public_projects.cta.about", "La coopérative")} <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Projets;
