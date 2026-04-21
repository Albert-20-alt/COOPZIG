import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import heroImage from "@/assets/hero-premium.jpg";
import { useTranslation } from "react-i18next";

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const BlogArticle = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["blog-article", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_articles")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB]">
        <Navbar forceScrolled />
        <div className="max-w-3xl mx-auto px-6 pt-40 pb-24 space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-10 w-3/4 bg-gray-100 rounded" />
          <div className="aspect-[16/7] bg-gray-100 rounded-3xl" />
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`h-4 bg-gray-100 rounded ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen bg-[#FDFCFB]">
        <Navbar forceScrolled />
        <div className="max-w-3xl mx-auto px-6 pt-40 pb-24 text-center">
          <p className="text-gray-400 mb-6">{t("blog_article.not_found", "Article introuvable.")}</p>
          <Link to="/blog" className="text-sm font-semibold underline">← {t("blog_article.back", "Retour aux actualités")}</Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Render markdown-like content: split by \n\n, detect ## headings
  const renderContent = (text: string) => {
    if (!text) return null;
    return text.split("\n\n").map((block, i) => {
      if (block.startsWith("## ")) {
        return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4 tracking-tight">{block.replace("## ", "")}</h2>;
      }
      if (block.startsWith("**") && block.endsWith("**")) {
        return <p key={i} className="font-semibold text-gray-900">{block.replace(/\*\*/g, "")}</p>;
      }
      if (block.startsWith("- ")) {
        const items = block.split("\n").filter((l) => l.startsWith("- "));
        return (
          <ul key={i} className="list-disc list-outside pl-5 space-y-2 text-gray-600 font-light leading-relaxed">
            {items.map((item, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: item.replace("- ", "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
            ))}
          </ul>
        );
      }
      // Replace inline **bold**
      const html = block.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <p key={i} className="text-gray-600 font-light leading-relaxed text-[17px]"
          dangerouslySetInnerHTML={{ __html: html }} />
      );
    });
  };

  const isEn = i18n.language.startsWith("en");
  const getTitle = (a: any) => isEn && a.title_en ? a.title_en : a.title;
  const getExcerpt = (a: any) => isEn && a.excerpt_en ? a.excerpt_en : a.excerpt;
  const getContent = (a: any) => isEn && a.content_en ? a.content_en : a.content;

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <Navbar forceScrolled />

      <article className="max-w-3xl mx-auto px-6 sm:px-8 pt-36 pb-28">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10"
          >
            <ArrowLeft size={14} /> {t("blog_article.back", "Retour aux actualités")}
          </Link>
        </motion.div>

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">
              <Tag size={11} /> {t(`blog.categories.${article.category}`, article.category)}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
              <Calendar size={12} /> {formatDate(article.published_at ?? article.created_at)}
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
              <Clock size={12} /> {article.read_time} {t("blog_article.reading_time", "de lecture")}
            </span>
          </div>

          <div className="flex items-start gap-3 mb-6">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-gray-900 flex-1">
              {getTitle(article)}
            </h1>
            {isEn && !article.title_en && (
              <span className="shrink-0 mt-2 text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                FR only
              </span>
            )}
          </div>

          {getExcerpt(article) && (
            <p className="text-xl text-gray-500 font-light leading-relaxed border-l-2 border-amber-400 pl-5">
              {getExcerpt(article)}
            </p>
          )}
        </motion.div>

        {/* Cover image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="mb-12 rounded-3xl overflow-hidden"
        >
          <img
            src={article.image_url ?? heroImage}
            alt={article.title}
            className="w-full aspect-[16/7] object-cover"
          />
        </motion.div>

        {/* Body */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-6"
        >
          {getContent(article)
            ? renderContent(getContent(article))
            : <p className="text-gray-400 italic">{t("blog_article.coming_soon", "Contenu à venir.")}</p>
          }
        </motion.div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-black/[0.06]">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={14} /> {t("blog_article.back_list", "Voir tous les articles")}
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogArticle;
