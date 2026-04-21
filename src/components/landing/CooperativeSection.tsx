import { motion } from "framer-motion";
import { Shield, Award, Truck, Globe, Users, Sprout } from "lucide-react";
import productsImage from "@/assets/about-harvest.jpg";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { usePublicStats } from "@/hooks/usePublicStats";
import { formatNumber } from "@/lib/utils";

import { useTranslation } from "react-i18next";

const CooperativeSection = () => {
  const { t } = useTranslation();
  const coopTitle = useConfigValue("cooperative_title", t("landing.coop.title", "Une organisation structurée pour des résultats concrets"));
  const coopSubtitle = useConfigValue("cooperative_subtitle", t("landing.coop.subtitle", "La Coopérative des Agriculteurs & Planteurs de Vergers de Casamance regroupe des producteurs engagés dans une démarche de qualité, de traçabilité et de vente collective."));
  const { data: stats } = usePublicStats();

  const dynamicHighlights = [
    { icon: Users, title: t("landing.coop.features.prods_title", `${formatNumber(stats?.totalProducers)} Producteurs`), desc: t("landing.coop.features.prods_desc", "Répartis dans 4 zones de la Casamance") },
    { icon: Shield, title: t("landing.coop.features.trace_title", "Traçabilité"), desc: t("landing.coop.features.trace_desc", "Chaque lot est tracé de la parcelle à l'acheteur") },
    { icon: Award, title: t("landing.coop.features.qual_title", "Qualité Export"), desc: t("landing.coop.features.qual_desc", "Normes internationales respectées") },
    { icon: Truck, title: t("landing.coop.features.log_title", "Logistique"), desc: t("landing.coop.features.log_desc", "Collecte et transport mutualisés") },
    { icon: Globe, title: t("landing.coop.features.mark_title", "Marchés"), desc: t("landing.coop.features.mark_desc", "Vente locale, nationale et à l'export") },
    { icon: Sprout, title: t("landing.coop.features.eco_title", "Agroécologie"), desc: t("landing.coop.features.eco_desc", "Pratiques durables et certifications bio") },
  ];

  return (
    <section id="cooperative" className="py-16 sm:py-28 bg-background relative overflow-hidden">
      <div className="absolute top-20 right-0 w-64 h-64 rounded-full bg-primary/4 blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-premium">
              <img src={productsImage} alt="Produits de la coopérative" className="w-full h-64 sm:h-[520px] object-cover" loading="lazy" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="absolute -bottom-6 right-0 sm:-bottom-8 sm:-right-4 md:-right-8 bg-card/95 backdrop-blur-xl rounded-2xl shadow-premium border border-border/60 p-4 sm:p-6 max-w-[200px] sm:max-w-[240px]"
            >
              <p className="text-4xl font-semibold text-gradient-primary">{t("landing.coop.exp_years", "+15 ans")}</p>
              <p className="text-sm text-muted-foreground mt-1 font-light">{t("landing.coop.exp_text", "d'expérience en agriculture collective")}</p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-earth/8 text-earth text-xs font-semibold tracking-[0.15em] uppercase mb-6">
              {t("landing.coop.badge", "Notre Coopérative")}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
              {coopTitle}
            </h2>
            <p className="text-muted-foreground mt-6 text-lg leading-relaxed font-light">
              {coopSubtitle}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {dynamicHighlights.map((h, i) => (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3.5 p-3.5 rounded-xl hover:bg-muted/40 transition-all duration-300 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0 group-hover:bg-gradient-hero group-hover:shadow-glow transition-all duration-500">
                    <h.icon size={18} className="text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{h.title}</p>
                    <p className="text-xs text-muted-foreground font-light">{h.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CooperativeSection;
