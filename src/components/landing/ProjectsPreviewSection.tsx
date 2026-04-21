import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Clock,
  Sprout, Droplets, Zap, Users, Globe, TrendingUp, Leaf, Building,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type ProjectStatus = "en_cours" | "termine" | "planifie";

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Sprout, Droplets, Users, Globe, Zap, Leaf, Building,
};

const ProjectsPreviewSection = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith("en");
  const getTitle = (p: any) => isEn && p.title_en ? p.title_en : p.title;
  const getDescription = (p: any) => isEn && p.description_en ? p.description_en : p.description;

  const getStatusConfig = (status: ProjectStatus) => {
    const config = {
      en_cours: { label: t("landing.projects.status.en_cours", "En cours"),  color: "text-blue-700 bg-blue-50 border-blue-100",          icon: Clock },
      termine:  { label: t("landing.projects.status.termine", "Terminé"),   color: "text-emerald-700 bg-emerald-50 border-emerald-100",  icon: CheckCircle2 },
      planifie: { label: t("landing.projects.status.planifie", "Planifié"),  color: "text-amber-700 bg-amber-50 border-amber-100",         icon: Clock },
    };
    return config[status] ?? config.planifie;
  };
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-preview"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("projects")
        .select("*")
        .order("sort_order", { ascending: true })
        .limit(3);
      return data ?? [];
    },
  });

  if (projects.length === 0) return null;

  return (
    <section className="py-14 sm:py-24 bg-white border-t border-black/[0.04]">
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
              {t("landing.blog.initiatives", "NOS INITIATIVES")}
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              {t("landing.projects.title", "Projets en cours")}
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/projets"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors group"
            >
              {t("landing.projects.view_all", "Voir tous les projets")}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {projects.map((project: any, i: number) => {
            const Icon = ICON_MAP[project.icon_name] ?? TrendingUp;
            const status = getStatusConfig(project.status as ProjectStatus);
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Link
                  to={`/projets/${project.id}`}
                  className="group flex flex-col bg-[#FDFCFB] rounded-3xl border border-black/[0.06] overflow-hidden hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-400 h-full"
                >
                  {/* Image or colored header */}
                  {project.image_url ? (
                    <div className="aspect-[16/8] overflow-hidden">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/8] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      <Icon size={36} className="text-gray-300" />
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    {/* Status + category */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        {t(`projects.categories.${project.category}`, project.category)}
                      </span>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${status.color}`}>
                        <StatusIcon size={10} />
                        {status.label}
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold leading-snug text-gray-900 mb-2 flex-1 line-clamp-2">
                      {getTitle(project)}
                    </h3>

                    {getDescription(project) && (
                      <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-2 mb-4">
                        {getDescription(project)}
                      </p>
                    )}

                    {/* Key figures */}
                    <div className="grid grid-cols-3 gap-1 pt-4 border-t border-black/[0.05] mt-auto">
                      {[
                        { label: t("landing.projects.metrics.period", "Période"),      value: project.period ?? "—" },
                        { label: t("landing.projects.metrics.budget", "Budget"),        value: project.budget ?? "—" },
                        { label: t("landing.projects.metrics.beneficiaries", "Bénéficiaires"), value: project.beneficiaires ?? "—" },
                      ].map((m) => (
                        <div key={m.label} className="text-center">
                          <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">{m.label}</p>
                          <p className="text-[11px] font-bold text-gray-800 mt-0.5 truncate">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile link */}
        <div className="mt-8 text-center sm:hidden">
          <Link to="/projets" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.projects.view_all", "Voir tous les projets")} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProjectsPreviewSection;
