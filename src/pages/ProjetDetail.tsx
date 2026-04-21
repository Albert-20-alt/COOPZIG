import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Clock,
  Sprout, Droplets, Zap, Users, Globe, TrendingUp, Leaf, Building,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useTranslation } from "react-i18next";

type ProjectStatus = "en_cours" | "termine" | "planifie";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: React.ElementType }> = {
  en_cours: { label: "En cours",  color: "text-blue-700 bg-blue-50 border-blue-100",          icon: Clock },
  termine:  { label: "Terminé",   color: "text-emerald-700 bg-emerald-50 border-emerald-100",  icon: CheckCircle2 },
  planifie: { label: "Planifié",  color: "text-amber-700 bg-amber-50 border-amber-100",         icon: Clock },
};

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Sprout, Droplets, Users, Globe, Zap, Leaf, Building,
};

const ProjetDetail = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const isEn = i18n.language.startsWith("en");
  const getTitle = (p: any) => isEn && p.title_en ? p.title_en : p.title;
  const getDescription = (p: any) => isEn && p.description_en ? p.description_en : p.description;

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", id)
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
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-4 bg-gray-100 rounded ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-[#FDFCFB]">
        <Navbar forceScrolled />
        <div className="max-w-3xl mx-auto px-6 pt-40 pb-24 text-center">
          <p className="text-gray-400 mb-6">{t("project_detail.not_found", "Projet introuvable.")}</p>
          <Link to="/projets" className="text-sm font-semibold underline">← {t("project_detail.back", "Retour aux projets")}</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const Icon = ICON_MAP[project?.icon_name ?? ""] ?? TrendingUp;
  const STATUS_CONFIG_I18N: Record<ProjectStatus, { label: string; color: string; icon: React.ElementType }> = {
    en_cours: { label: t("project_detail.status.ongoing", "En cours"),  color: "text-blue-700 bg-blue-50 border-blue-100",          icon: Clock },
    termine:  { label: t("project_detail.status.finished", "Terminé"),   color: "text-emerald-700 bg-emerald-50 border-emerald-100",  icon: CheckCircle2 },
    planifie: { label: t("project_detail.status.planned", "Planifié"),  color: "text-amber-700 bg-amber-50 border-amber-100",         icon: Clock },
  };

  const status = STATUS_CONFIG_I18N[project.status as ProjectStatus] ?? STATUS_CONFIG_I18N.planifie;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <Navbar forceScrolled />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 sm:px-8 pt-24 sm:pt-36 pb-16 sm:pb-28">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Link
            to="/projets"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10"
          >
            <ArrowLeft size={14} /> {t("project_detail.back", "Retour aux projets")}
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center">
              <Icon size={18} className="text-gray-700" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
              {t(`projects.categories.${project.category}`, project.category)}
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${status.color}`}>
              <StatusIcon size={11} />
              {status.label}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-gray-900 mb-5 sm:mb-6">
            {getTitle(project)}
          </h1>

          {getDescription(project) && (
            <p className="text-base sm:text-xl text-gray-500 font-light leading-relaxed border-l-2 border-amber-400 pl-4 sm:pl-5">
              {getDescription(project)}
            </p>
          )}
        </motion.div>

        {/* Cover image */}
        {project.image_url ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="mb-8 sm:mb-12 rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100"
          >
            <img
              src={project.image_url}
              alt={project.title}
              className="w-full aspect-[16/7] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </motion.div>
        ) : (
          <div className="mb-8 sm:mb-12 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 aspect-[16/7] flex items-center justify-center">
            <Icon size={48} className="text-gray-200" />
          </div>
        )}

        {/* Key figures */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="grid grid-cols-3 gap-0 bg-white rounded-2xl border border-black/[0.06] overflow-hidden mb-8 sm:mb-12"
        >
          {[
            { label: t("project_detail.meta.period", "Période"),        value: project.period ?? "—" },
            { label: t("project_detail.meta.budget", "Budget"),          value: project.budget ?? "—" },
            { label: t("project_detail.meta.beneficiaries", "Bénéficiaires"),   value: project.beneficiaires ?? "—" },
          ].map((item, i) => (
            <div key={item.label} className={`px-2 sm:px-6 py-4 sm:py-5 text-center ${i < 2 ? "border-r border-black/[0.06]" : ""}`}>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-gray-400 font-semibold mb-1 sm:mb-1.5">{item.label}</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900 leading-tight break-words">{item.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-wrap gap-2 mb-12"
          >
            {project.tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-black/[0.04] text-gray-600 border border-black/[0.05]">
                {tag}
              </span>
            ))}
          </motion.div>
        )}

        {/* Footer nav */}
        <div className="mt-10 pt-8 border-t border-black/[0.06]">
          <Link
            to="/projets"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={14} /> {t("project_detail.back", "Retour aux projets")}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProjetDetail;
