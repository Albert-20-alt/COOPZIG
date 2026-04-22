import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, MapPin, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-premium.jpg";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const badge    = useConfigValue("hero_badge",    t("landing.hero.badge", "Nouvelle campagne 2025"));
  const rawTitle = useConfigValue(
    "hero_title",
    t("landing.hero.raw_title", "Les Fruits Agricoles de la Casamance | L'Excellence de nos Terroirs | La Qualité Export depuis le Sénégal")
  );
  const subtitle = useConfigValue("hero_subtitle",  t("landing.hero.subtitle", "Des fruits cultivés avec soin par nos producteurs locaux, récoltés à maturité, et livrés directement aux acheteurs au juste prix."));

  // Parse custom titles separated by | or fallback to a default dynamic list
  const titles = rawTitle.includes("|")
    ? rawTitle.split("|").map((t) => t.trim()).filter(Boolean)
    : [rawTitle, "L'Excellence de nos Terroirs", "La Qualité Export du Sénégal"];

  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % titles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [titles.length]);


  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#060A06]">

      {/* Background image */}
      <div className="absolute inset-0">
        <motion.img
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 3.5, ease: [0.22, 1, 0.36, 1] }}
          src={heroImage}
          alt="Vergers de Casamance"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />

        {/* Left-to-right dark gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/[0.85] via-black/60 to-black/20" />

        {/* Bottom fade for smooth section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#060A06] to-transparent" />

        {/* Warm glow accent bottom-right */}
        <div className="absolute bottom-[-5%] right-[-5%] w-[600px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-10 lg:px-16 w-full pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-44 lg:pb-28">
          <div className="max-w-2xl lg:max-w-3xl">

            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 backdrop-blur-sm">
                <Sparkles size={11} className="text-amber-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
                  {badge}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-white/40">
                <MapPin size={11} />
                <span className="text-[11px] uppercase tracking-[0.25em] font-medium">
                  {t("landing.hero.badge_location", "Casamance, Sénégal")}
                </span>
              </div>
            </motion.div>

            {/* Main headline - Dynamic Carousel */}
            <div className="relative mb-6">
              {/* Invisible placeholder to maintain layout height based on longest string */}
              <h1
                className="font-bold text-transparent leading-[1.06] tracking-[-0.025em] select-none pointer-events-none"
                style={{ fontSize: "clamp(2.4rem, 6.5vw, 5rem)" }}
                aria-hidden="true"
              >
                {titles.reduce((a, b) => (a.length > b.length ? a : b))}
              </h1>

              <AnimatePresence>
                <motion.h1
                  key={titleIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="font-bold text-white leading-[1.06] tracking-[-0.025em] absolute top-0 left-0 w-full"
                  style={{ fontSize: "clamp(2.4rem, 6.5vw, 5rem)" }}
                >
                  {titles[titleIndex]}
                </motion.h1>
              </AnimatePresence>
            </div>

            {/* Amber accent line under headline */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="origin-left mb-8"
            >
              <div className="h-[2px] w-20 rounded-full" style={{ background: "linear-gradient(90deg, #F0B130, #e8851c)" }} />
            </motion.div>

            {/* Subtitle / description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-white/60 text-base sm:text-lg leading-relaxed max-w-xl font-light mb-8 sm:mb-12"
            >
              {subtitle}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, duration: 0.9 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              {/* Primary */}
              <button
                onClick={() => scrollTo("#produits")}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full overflow-hidden font-semibold text-sm text-[#060A06] transition-all duration-500 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #F5D386 0%, #F0B130 50%, #c77c10 100%)",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.2), 0 8px 24px -4px rgba(240,177,48,0.4)",
                }}
              >
                <span className="relative z-10">{t("landing.cta_order", "Commander nos produits")}</span>
                <ArrowRight size={15} className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "linear-gradient(135deg, #f7e09a 0%, #f5c048 50%, #d48a14 100%)" }} />
              </button>

              {/* Secondary */}
              <button
                onClick={() => navigate("/qui-sommes-nous")}
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold text-sm text-white/80 border border-white/[0.15] hover:border-white/[0.35] hover:text-white hover:bg-white/[0.06] transition-all duration-300 backdrop-blur-sm"
              >
                {t("landing.cta_learn_more", "Découvrir la coopérative")}
              </button>
            </motion.div>

          </div>
        </div>
      </div>



      {/* Scroll cue */}
      <motion.button
        onClick={() => scrollTo("#stats")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-28 right-10 hidden lg:flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors"
      >
        <span className="text-[9px] uppercase tracking-[0.3em] font-medium">{t("landing.hero.scroll", "Défiler")}</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
          <ChevronDown size={16} />
        </motion.div>
      </motion.button>

      {/* Vertical label — architectural accent */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-4 z-10">
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/[0.15]" />
        <p
          className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-medium select-none"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {t("landing.hero.vertical_label", "CRPAZ — Coopérative de Ziguinchor")}
        </p>
        <div className="w-px h-16 bg-gradient-to-t from-transparent to-white/[0.15]" />
      </div>
    </section>
  );
};

export default HeroSection;
