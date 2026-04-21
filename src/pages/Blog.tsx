import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { ArrowRight, ArrowUpRight, Calendar, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import heroImage from "@/assets/hero-premium.jpg";
import harvestImage from "@/assets/about-harvest.jpg";
import teamImage from "@/assets/about-team.jpg";
import productsImage from "@/assets/products-premium.jpg";
import orchardImage from "@/assets/hero-orchard.jpg";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  image_url: string | null;
  status: string;
  featured: boolean;
  read_time: string;
  published_at: string | null;
  created_at: string;
  title_en?: string;
  excerpt_en?: string;
}

const FALLBACK_IMAGES = [heroImage, harvestImage, productsImage, orchardImage, teamImage];
const getFallback = (i: number) => FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

// Assign a soft colour per category
const CATEGORY_COLORS: Record<string, string> = {
  Export:       "text-amber-700  bg-amber-50  border-amber-100",
  Filière:      "text-blue-700   bg-blue-50   border-blue-100",
  Production:   "text-emerald-700 bg-emerald-50 border-emerald-100",
  Marché:       "text-violet-700 bg-violet-50 border-violet-100",
  Formation:    "text-rose-700   bg-rose-50   border-rose-100",
  Environnement:"text-teal-700   bg-teal-50   border-teal-100",
};
const categoryColor = (cat: string) =>
  CATEGORY_COLORS[cat] ?? "text-gray-700 bg-gray-100 border-gray-200";

const Blog = () => {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState<string>("tous");
  const { data: configs } = useSiteConfig();
  const cfg = (key: string, fallback: string) => configs?.find((c) => c.cle === key)?.valeur || fallback;
  const heroTitle    = cfg("blog_hero_title",    t("blog.hero.title", "Actualités"));
  const heroSubtitle = cfg("blog_hero_subtitle", t("blog.hero.subtitle", "Nouvelles de la coopérative, de nos producteurs, des marchés et de l'agriculture durable en Casamance."));
  const ctaTitle     = cfg("blog_cta_title",     t("blog.cta.title", "Restez informé"));
  const ctaSubtitle  = cfg("blog_cta_subtitle",  t("blog.cta.subtitle", "Suivez les actualités, les campagnes de récolte et les offres de la coopérative."));

  const isEn = i18n.language.startsWith("en");
  const getTitle = (a: any) => isEn && a.title_en ? a.title_en : a.title;
  const getExcerpt = (a: any) => isEn && a.excerpt_en ? a.excerpt_en : a.excerpt;

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["public-blog-articles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_articles")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  const featured = articles.find((a) => a.featured) ?? articles[0] ?? null;
  const rest = featured ? articles.filter((a) => a.id !== featured.id) : [];
  const categories = ["tous", ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = category === "tous" ? rest : rest.filter((a) => a.category === category);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#071410] pt-36 pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-900/[0.15] rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 text-[16vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          ACTU
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em] mb-7">
              {t("blog.hero.badge", "Journal")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-white mb-5 sm:mb-7">
              {heroTitle}
            </h1>
            <p className="text-lg text-white/[0.45] font-light leading-relaxed max-w-xl">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Featured article ─────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 sm:px-8 border-b border-black/[0.04]">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="w-full h-96 rounded-3xl bg-gray-100 animate-pulse" />
          ) : featured ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              <Link
                to={`/blog/${featured.id}`}
                className="group grid grid-cols-1 md:grid-cols-[1fr_1fr] lg:grid-cols-[3fr_2fr] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border border-black/[0.05] hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 bg-white"
              >
                {/* Image */}
                <div className="relative overflow-hidden aspect-[4/3] md:aspect-auto min-h-[320px]">
                  <img
                    src={featured.image_url ?? getFallback(0)}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {/* À la une badge */}
                  <div className="absolute top-5 left-5">
                    <span className="px-3 py-1.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                      {t("blog.featured.badge", "À la une")}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-between bg-white">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border mb-6 ${categoryColor(featured.category)}`}>
                      {t(`blog.categories.${featured.category}`, featured.category)}
                    </span>
                    <div className="flex items-start gap-3 mb-4 sm:mb-5">
                      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-snug tracking-tight text-gray-900 flex-1">
                        {getTitle(featured)}
                      </h2>
                      {isEn && !featured.title_en && (
                        <span className="shrink-0 text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded mt-1">FR</span>
                      )}
                    </div>
                    <p className="text-muted-foreground font-light leading-relaxed text-base line-clamp-4">
                      {getExcerpt(featured)}
                    </p>
                  </div>

                  <div className="mt-10 flex items-center justify-between border-t border-black/[0.05] pt-6">
                    <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatDate(featured.published_at ?? featured.created_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {featured.read_time}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 group-hover:gap-2.5 transition-all">
                      {t("blog.featured.read", "Lire l'article")}
                      <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ) : null}
        </div>
      </section>

      {/* ── Articles grid ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Category filter */}
          {categories.length > 1 && (
            <motion.div {...fadeUp} className="flex flex-wrap gap-2 mb-14">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                    category === c
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-black/[0.07] hover:border-black/20 hover:text-gray-800"
                  }`}
                >
                  {c === "tous" ? t("blog.list.all", "Tous les articles") : t(`blog.categories.${c}`, c)}
                </button>
              ))}
            </motion.div>
          )}

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden animate-pulse">
                  <div className="aspect-[16/9] bg-gray-100" />
                  <div className="p-7 space-y-3">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-5 bg-gray-100 rounded w-4/5" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32 text-muted-foreground text-sm">
              {t("blog.list.empty", "Aucun article dans cette catégorie.")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                >
                  <Link
                    to={`/blog/${article.id}`}
                    className="group bg-white rounded-3xl border border-black/[0.05] overflow-hidden hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-400 flex flex-col h-full"
                  >
                    <div className="aspect-[16/9] overflow-hidden relative">
                      <img
                        src={article.image_url ?? getFallback(i)}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      />
                      {/* Category badge over image */}
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm ${categoryColor(article.category)}`}>
                          {t(`blog.categories.${article.category}`, article.category)}
                        </span>
                      </div>
                    </div>
                    <div className="p-7 flex flex-col flex-1">
                      <div className="flex items-start gap-2 mb-3">
                        <h3 className="text-[17px] font-bold leading-snug text-gray-900 flex-1 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                          {getTitle(article)}
                        </h3>
                        {isEn && !article.title_en && (
                          <span className="shrink-0 text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-0.5">FR</span>
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground font-light leading-relaxed mb-5 line-clamp-2">
                          {getExcerpt(article)}
                        </p>
                      )}
                      <div className="pt-4 border-t border-black/[0.04] flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(article.published_at ?? article.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {article.read_time}
                          </span>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-28 bg-[#071410] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 text-[14vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          JOURNAL
        </div>

        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <motion.div {...fadeUp} className="space-y-7">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em]">
              {t("blog.cta.badge", "Newsletter")}
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              {ctaTitle}
            </h2>
            <p className="text-white/[0.45] font-light text-lg leading-relaxed max-w-md mx-auto">
              {ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/contact"
                className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl bg-primary text-white font-bold text-sm hover:shadow-[0_0_30px_rgba(27,77,33,0.5)] hover:scale-[1.02] transition-all duration-300"
              >
                {t("blog.cta.contact", "Nous contacter")}
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                {t("blog.cta.home", "Retour à l'accueil")} <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
