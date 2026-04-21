import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { usePublicStats } from "@/hooks/usePublicStats";

const AnimatedNumber = ({ value }: { value: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const numericMatch = value.match(/^[\d,]+/);
    if (!numericMatch) { setDisplay(value); return; }
    const target = parseInt(numericMatch[0].replace(/,/g, ""));
    const rest = value.slice(numericMatch[0].length);
    const duration = 1800;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(eased * target);
      setDisplay(current.toLocaleString("fr-FR") + rest);
      if (progress < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [isInView, value]);

  return <span ref={ref}>{display}</span>;
};

import { useTranslation } from "react-i18next";

const StatsSection = () => {
  const { data: stats } = usePublicStats();
  const { t } = useTranslation();

  const displayStats = [
    { cle: "producteurs", valeur: stats?.totalProducers?.toString() || "0", description: t("landing.stats.producers", "Producteurs membres"),     short: t("landing.stats.producers_short", "Producteurs") },
    { cle: "hectares",   valeur: stats?.totalHectares?.toString() || "0",  description: t("landing.stats.hectares", "Hectares cultivés"),      short: t("landing.stats.hectares_short", "Hectares") },
    { cle: "production", valeur: stats ? `${stats.annualProduction} T` : "0 T",  description: t("landing.stats.tons", "Tonnes / an"),   short: t("landing.stats.tons_short", "Tonnes/an") },
    { cle: "taux_vente", valeur: stats ? `${stats.tauxCommercialisation}%` : "0%", description: t("landing.stats.commercialization", "Taux commerc."), short: t("landing.stats.commercialization_short", "Commerc.") },
    { cle: "zones",      valeur: stats?.zonesCount?.toString() || "0",      description: t("landing.stats.zones", "Zones de production"),  short: t("landing.stats.zones_short", "Zones") },
    { cle: "varietes",   valeur: stats?.varietesCount?.toString() || "0",   description: t("landing.stats.varieties", "Variétés certifiées"), short: t("landing.stats.varieties_short", "Variétés") },
  ];

  return (
    <section id="stats" className="relative bg-[#0D1510] border-b border-white/5">
      {/* Subtle amber glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-white/5 sm:divide-x"
        >
          {displayStats.map((stat, i) => (
            <motion.div
              key={stat.cle}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
            className="group py-7 sm:py-10 px-3 sm:px-6 text-center hover:bg-white/[0.02] transition-colors duration-500 cursor-default border-b border-white/5 sm:border-b-0"
            >
              <p
                className="text-2xl sm:text-3xl font-bold text-white mb-1.5 sm:mb-2 transition-colors duration-300 group-hover:text-amber-400"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <AnimatedNumber value={stat.valeur} />
              </p>
              <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.25em] text-white/30 font-medium group-hover:text-white/50 transition-colors duration-300">
                <span className="sm:hidden">{stat.short}</span>
                <span className="hidden sm:inline">{stat.description}</span>
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom border line */}
      <div className="absolute left-0 bottom-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/15 to-transparent" />
    </section>
  );
};

export default StatsSection;
