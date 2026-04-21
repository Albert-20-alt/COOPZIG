import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { useConfigValue } from "@/hooks/useSiteConfig";

const baseMoisLabels = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const lookupMoisLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const fallbackCalendar = [
  { produit: "Mangue Kent", niveaux: ["Faible", "Faible", "Moyen", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible"] },
  { produit: "Mangue Keitt", niveaux: ["Faible", "Faible", "Faible", "Faible", "Faible", "Moyen", "Fort", "Fort", "Fort", "Fort", "Faible", "Faible"] },
  { produit: "Mangue Amélie", niveaux: ["Faible", "Faible", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
  { produit: "Mangue Diorou", niveaux: ["Faible", "Faible", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
  { produit: "Mangue Bouko.", niveaux: ["Faible", "Faible", "Faible", "Moyen", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible"] },
  { produit: "Anacarde", niveaux: ["Faible", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
  { produit: "Miel", niveaux: ["Faible", "Faible", "Faible", "Moyen", "Fort", "Fort", "Faible", "Faible", "Faible", "Moyen", "Fort", "Faible"] },
  { produit: "Agrumes", niveaux: ["Fort", "Fort", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Fort", "Fort", "Fort"] },
  { produit: "Huile de Palme", niveaux: ["Faible", "Moyen", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
  { produit: "Papaye", niveaux: ["Moyen", "Moyen", "Moyen", "Fort", "Fort", "Fort", "Moyen", "Moyen", "Moyen", "Moyen", "Moyen", "Moyen"] },
  { produit: "Ditakh", niveaux: ["Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Fort", "Fort", "Moyen", "Faible", "Faible"] },
  { produit: "Riz (Récolte)", niveaux: ["Fort", "Fort", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Fort"] },
];

const niveauConfig: Record<string, { bg: string; dot: string }> = {
  Fort: { bg: "bg-primary/[0.15] border-primary/[0.25]", dot: "bg-primary shadow-[0_0_8px_hsl(148_42%_24%/0.4)]" },
  Moyen: { bg: "bg-secondary/[0.12] border-secondary/20", dot: "bg-secondary" },
  Faible: { bg: "bg-muted/40 border-border", dot: "bg-muted-foreground/20" },
};

import { useTranslation } from "react-i18next";

const CalendarSection = () => {
  const { t } = useTranslation();
  const { data: calData } = useQuery({
    queryKey: ["calendrier-public"],
    queryFn: async () => {
      const { data } = await supabase.from("calendrier_production").select("*").order("produit");
      return data && data.length > 0 ? data : null;
    },
  });

  const displayCalendar = calData
    ? Object.entries(
        calData.reduce<Record<string, string[]>>((acc, row) => {
          if (!acc[row.produit]) acc[row.produit] = Array(12).fill("Faible");
          const moisIndex = lookupMoisLabels.findIndex(
            (m) => row.mois.toLowerCase().startsWith(m.toLowerCase().replace("é", "e").replace("û", "u"))
          );
          if (moisIndex >= 0) acc[row.produit][moisIndex] = row.niveau;
          return acc;
        }, {})
      ).map(([produit, niveaux]) => ({ produit, niveaux }))
    : fallbackCalendar;

  const calendarTitle = useConfigValue("calendar_title", t("landing.calendar.title", "Calendrier de Disponibilité"));
  const calendarSubtitle = useConfigValue("calendar_subtitle", t("landing.calendar.subtitle", "Planifiez vos achats en fonction des périodes de récolte de chaque spéculation."));

  return (
    <section id="calendrier" className="py-16 sm:py-28 bg-card relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-secondary/4 blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary/[0.08] text-secondary text-xs font-semibold tracking-[0.15em] uppercase mb-6">
            {t("landing.calendar.badge", "Saisonnalité")}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold">
            {calendarTitle}
          </h2>
          <p className="text-muted-foreground mt-4 sm:mt-5 max-w-2xl mx-auto text-base sm:text-lg font-light">
            {calendarSubtitle}
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-10">
          {[
            { key: "Fort", label: t("landing.calendar.high", "Pleine saison") },
            { key: "Moyen", label: t("landing.calendar.medium", "Disponible") },
            { key: "Faible", label: t("landing.calendar.low", "Hors saison") },
          ].map((n) => (
            <div key={n.key} className="flex items-center gap-2.5 text-sm">
              <span className={`w-3 h-3 rounded-full ${niveauConfig[n.key].dot}`} />
              <span className="text-muted-foreground text-xs font-medium">{n.label}</span>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-background rounded-3xl border border-border shadow-elevated overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Calendar size={18} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold">{t("landing.calendar.table_title", "Calendrier de Production")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left p-5 font-semibold w-48 text-xs uppercase tracking-wider text-muted-foreground">{t("landing.calendar.product", "Produit")}</th>
                  {baseMoisLabels.map((m) => (
                    <th key={m} className="p-3 text-center text-[11px] font-semibold text-muted-foreground tracking-wider">{t(`landing.calendar.${m}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCalendar.map((row, i) => (
                  <motion.tr
                    key={row.produit}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/40 hover:bg-muted/15 transition-colors duration-300"
                  >
                    <td className="p-5 font-semibold whitespace-nowrap">{t(`landing.calendar.products.${row.produit}`, row.produit)}</td>
                    {row.niveaux.map((n, j) => (
                      <td key={j} className="p-2 text-center">
                        <span className={`inline-flex w-9 h-9 rounded-xl items-center justify-center border ${niveauConfig[n].bg} transition-all duration-300`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${niveauConfig[n].dot} transition-all`} />
                        </span>
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CalendarSection;
