import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Star, ArrowRight, ShieldCheck, Zap, ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { formatNumber, formatCompact } from "@/lib/utils";
import { logEvent } from "@/utils/analytics";

// Intelligent image mapping based on product name/variety keywords
const getProductImage = (p: any): string => {
  const name = (p.nom || "").toLowerCase();
  const variete = (p.variete || "").toLowerCase();
  const combined = `${name} ${variete}`;

  // Anacarde / Cajou
  if (combined.includes("anacarde") || combined.includes("cajou") || combined.includes("cashew")) {
    return "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=800&auto=format&fit=crop";
  }
  // Papaye
  if (combined.includes("papaye") || combined.includes("papaya")) {
    return "https://images.unsplash.com/photo-1524342066836-4e27b37c4c95?q=80&w=800&auto=format&fit=crop";
  }
  // Agrumes / Citron / Orange
  if (combined.includes("agrume") || combined.includes("citron") || combined.includes("orange") || combined.includes("mandarine") || combined.includes("pamplemousse")) {
    return "https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=800&auto=format&fit=crop";
  }
  // Banane
  if (combined.includes("banane") || combined.includes("banana") || combined.includes("plantain")) {
    return "https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=800&auto=format&fit=crop";
  }
  // Ananas
  if (combined.includes("ananas") || combined.includes("pineapple")) {
    return "https://images.unsplash.com/photo-1550258114-68bd29973847?q=80&w=800&auto=format&fit=crop";
  }
  // Miel / Honey
  if (combined.includes("miel") || combined.includes("honey")) {
    return "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?q=80&w=800&auto=format&fit=crop";
  }
  // Keitt mango variety
  if (combined.includes("keitt")) {
    return "https://images.unsplash.com/photo-1621506821199-a99a74997516?q=80&w=800&auto=format&fit=crop";
  }
  // Amélie / Gouverneur variety
  if (combined.includes("amélie") || combined.includes("amelie") || combined.includes("gouverneur")) {
    return "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?q=80&w=800&auto=format&fit=crop";
  }
  // Default: Kent mango
  return "https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=800&auto=format&fit=crop";
};

const fallbackProducts = [
  { id: "1", nom: "Mangue Kent", variete: "Kent", zone_production: "Bignona", saison: "Mars – Juillet", quantite_estimee: 1800, norme_qualite: "Export", description: "La reine de l'exportation. Chair ferme, sucrée et sans fibres. Excellente tenue." },
  { id: "2", nom: "Mangue Keitt", variete: "Keitt", zone_production: "Ziguinchor", saison: "Juillet – Octobre", quantite_estimee: 1200, norme_qualite: "Export", description: "Variété tardive. Gros fruits à chair fondante, très appréciée en fin de saison." },
  { id: "3", nom: "Mangue Amélie", variete: "Gouverneur", zone_production: "Oussouye", saison: "Mars – Mai", quantite_estimee: 600, norme_qualite: "Local", description: "Parfum intense et chair très beurrée, un délice traditionnel de début de saison." },
  { id: "4", nom: "Mangue Diorou", variete: "Diorou", zone_production: "Sédhiou", saison: "Mars – Avril", quantite_estimee: 450, norme_qualite: "Local", description: "Variété locale très hâtive. Fruits colorés et parfumés, annonçant le retour des mangues." },
];

const qualityColors: Record<string, string> = {
  Export: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Local: "bg-amber-50 text-amber-700 border-amber-100",
};

import { useTranslation } from "react-i18next";

const ProductsSection = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const { data: products } = useQuery({
    queryKey: ["produits-public"],
    queryFn: async () => {
      const { data } = await supabase.from("produits").select("*").order("nom");
      return data && data.length > 0 ? data : null;
    },
  });

  const productsTitle = useConfigValue("products_title", t("landing.products.title", "Les Produits de Casamance"));
  const productsSubtitle = useConfigValue("products_subtitle", t("landing.products.subtitle", "Fruits tropicaux d'exception, cultivés dans le respect de l'environnement."));
  const displayProducts = (products || fallbackProducts).slice(0, 10); // Limit to top 10 for demonstration

  // Pagination logic
  const totalPages = Math.ceil(displayProducts.length / itemsPerPage);
  const paginatedProducts = displayProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOrderClick = (productName?: string) => {
    logEvent("Conversion", "Click_Commander", productName || "Catalogue_Complet");
    document.querySelector("#commander")?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.getElementById("produits")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="produits" className="py-8 sm:py-20 bg-[#FDFCFB] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[100px] -ml-24 -mb-24 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-[2px] bg-[#D48A14]" />
              <span className="text-[#D48A14] text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase">{t("landing.products.badge", "Collections Exclusives")}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-[1.1] tracking-[-0.02em] text-[#1A2E1C]">
              {productsTitle}
            </h2>
            <p className="text-gray-500 mt-5 text-base sm:text-lg font-light leading-relaxed max-w-lg">
              {productsSubtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <button
              onClick={() => handleOrderClick()}
              className="px-8 py-4 rounded-full border border-gray-200 text-[#1A2E1C] font-semibold hover:border-[#1A2E1C] hover:bg-[#1A2E1C] hover:text-white transition-all duration-500 flex items-center gap-3 group text-[11px] uppercase tracking-[0.15em] bg-white shadow-sm"
            >
              {t("landing.products.full_catalog", "Catalogue Complet")}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 1 }}
              className="mt-8 sm:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 border-t border-black/5 pt-8 sm:pt-12"
            >
                {paginatedProducts.map((p, i) => {
                  // Sanitize season display (consistent with admin)
                  const cleanSaison = (p.saison || "")
                    .split(/[\s-]+/)
                    .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
                    .join(" - ");

                  return (
                    <motion.div
                      key={p.id || i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.6 }}
                      className="group relative bg-white rounded-[24px] border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-700 flex flex-col"
                    >
                      {/* Image Section */}
                      <div className="relative h-40 sm:h-56 md:h-64 overflow-hidden bg-gray-50 flex-shrink-0">
                        <img 
                           src={p.photo_url || getProductImage(p)} 
                           alt={p.nom} 
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                           onError={(e) => {
                             const target = e.target as HTMLImageElement;
                             target.src = "https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=800&auto=format&fit=crop";
                           }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <span className="absolute top-5 right-5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-[#1A2E1C] shadow-sm">
                          {p.norme_qualite || "Local"}
                        </span>
                      </div>
    
                      <div className="p-4 sm:p-6 md:p-8 flex flex-col flex-grow bg-white relative">
                        <h3 className="text-base sm:text-xl md:text-2xl font-bold mb-2 tracking-tight transition-colors duration-500 group-hover:text-[#D48A14] line-clamp-2 text-[#1A2E1C]">
                          {p.nom}
                        </h3>
                        
                        <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-8 line-clamp-2 leading-relaxed font-light">
                          {p.description || t("landing.products.fallback_desc", "Qualité premium cultivée avec soin dans nos vergers de Casamance.")}
                        </p>
    
                        <div className="grid grid-cols-2 gap-x-2 sm:gap-x-6 gap-y-3 sm:gap-y-5 mb-4 sm:mb-8 mt-auto">
                          <div>
                            <p className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-gray-400 mb-1">
                              <Star size={10} className="text-[#D48A14]" /> {t("landing.products.quality", "Qualité")}
                            </p>
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm break-words leading-tight">{p.variete || "Premium"}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-gray-400 mb-1">
                              <MapPin size={10} className="text-emerald-600" /> {t("landing.products.origin", "Origine")}
                            </p>
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm break-words leading-tight">{p.zone_production || "Casamance"}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-gray-400 mb-1">
                              <Calendar size={10} className="text-blue-500" /> {t("landing.products.window", "Fenêtre")}
                            </p>
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm break-words leading-tight">{cleanSaison || t("landing.products.in_progress", "En cours")}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-gray-400 mb-1">
                              <Scale size={10} className="text-rose-500" /> {t("landing.products.volume", "Volume")}
                            </p>
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm break-words leading-tight">{formatCompact(p.quantite_estimee || 0)} T</p>
                          </div>
                        </div>
    
                        <div className="mt-auto pt-2">
                          <button
                            onClick={() => handleOrderClick(p.nom)}
                            className="w-full h-12 rounded-xl border border-gray-200 bg-white text-[#1A2E1C] font-semibold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#1A2E1C] hover:border-[#1A2E1C] hover:text-white transition-all duration-500 group/btn"
                          >
                             {t("landing.products.order", "Commander")}
                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Compressed Pagination */}
        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center transition-all hover:border-[#1A2E1C] hover:text-[#1A2E1C] hover:bg-gray-50 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:bg-transparent text-gray-400 bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300 ${
                    currentPage === page ? "text-white" : "text-gray-500 hover:text-[#1A2E1C]"
                  }`}
                >
                  {currentPage === page && (
                    <motion.div layoutId="activePageBg" className="absolute inset-0 bg-[#1A2E1C] rounded-full" />
                  )}
                  <span className="relative z-10">{page.toString().padStart(2, '0')}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center transition-all hover:border-[#1A2E1C] hover:text-[#1A2E1C] hover:bg-gray-50 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:bg-transparent text-gray-400 bg-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
