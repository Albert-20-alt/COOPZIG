import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=800&q=80",
];

import { useTranslation } from "react-i18next";

const BlogPreviewSection = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith("en");
  const getTitle = (a: any) => isEn && a.title_en ? a.title_en : a.title;
  const getExcerpt = (a: any) => isEn && a.excerpt_en ? a.excerpt_en : a.excerpt;

  const { data: articles = [] } = useQuery({
    queryKey: ["blog-preview"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("blog_articles")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  if (articles.length === 0) return null;

  return (
    <section className="py-14 sm:py-24 bg-[#FDFCFB] border-t border-black/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.25em] mb-3 block">
              {t("landing.blog.journal", "Journal")}
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              {t("landing.blog.title", "Dernières actualités")}
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/blog"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors group"
            >
              {t("landing.blog.view_all", "Voir tous les articles")}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {articles.map((article: any, i: number) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link
                to={`/blog/${article.id}`}
                className="group flex flex-col bg-white rounded-3xl border border-black/[0.06] overflow-hidden hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-400 h-full"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={article.image_url ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-2">
                    {t(`blog.categories.${article.category}`, article.category)}
                  </span>
                  <div className="flex items-start gap-2 mb-3 flex-1">
                    <h3 className="text-[16px] font-bold leading-snug text-gray-900 line-clamp-2 flex-1">
                      {getTitle(article)}
                    </h3>
                    {isEn && !article.title_en && (
                      <span className="shrink-0 text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded mt-0.5">FR</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-2 mb-4">
                    {getExcerpt(article)}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-black/[0.05] mt-auto">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {formatDate(article.published_at ?? article.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {article.read_time}
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-800 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile link */}
        <div className="mt-8 text-center sm:hidden">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.blog.view_all", "Voir tous les articles")} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogPreviewSection;
