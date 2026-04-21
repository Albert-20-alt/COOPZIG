import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { usePublicStats } from "@/hooks/usePublicStats";
import { formatCompact } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, MapPin,
  BarChart3, Search, Download, Leaf,
  ShieldCheck, Star, Phone, ArrowUpRight, FileText, X
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_PRIX_MARCHE = [
  { id: "m1", produit: "Riz Local",    marche: "Ziguinchor (Escale)", prix: 450, unite_prix: "CFA/kg", date_releve: "2024-05-15", tendance: "hausse" },
  { id: "m2", produit: "Riz Local",    marche: "Ziguinchor (Escale)", prix: 450, unite_prix: "CFA/kg", date_releve: "2024-05-16", tendance: "stable" },
  { id: "m3", produit: "Riz Local",    marche: "Ziguinchor (Escale)", prix: 460, unite_prix: "CFA/kg", date_releve: "2024-05-17", tendance: "hausse" },
  { id: "m4", produit: "Riz Local",    marche: "Ziguinchor (Escale)", prix: 455, unite_prix: "CFA/kg", date_releve: "2024-05-18", tendance: "baisse" },
  { id: "m5", produit: "Riz Local",    marche: "Ziguinchor (Escale)", prix: 465, unite_prix: "CFA/kg", date_releve: "2024-05-19", tendance: "hausse" },
  { id: "f1", produit: "Mangue Kent",  marche: "Dakar (Castors)",     prix: 800, unite_prix: "CFA/kg", date_releve: "2024-05-15", tendance: "baisse" },
  { id: "f2", produit: "Mangue Kent",  marche: "Dakar (Castors)",     prix: 820, unite_prix: "CFA/kg", date_releve: "2024-05-16", tendance: "hausse" },
  { id: "f3", produit: "Mangue Kent",  marche: "Dakar (Castors)",     prix: 850, unite_prix: "CFA/kg", date_releve: "2024-05-17", tendance: "hausse" },
  { id: "f4", produit: "Mangue Kent",  marche: "Dakar (Castors)",     prix: 840, unite_prix: "CFA/kg", date_releve: "2024-05-18", tendance: "baisse" },
  { id: "f5", produit: "Mangue Kent",  marche: "Dakar (Castors)",     prix: 880, unite_prix: "CFA/kg", date_releve: "2024-05-19", tendance: "hausse" },
  { id: "n1", produit: "Anacarde",     marche: "Kolda",               prix: 500, unite_prix: "CFA/kg", date_releve: "2024-05-15", tendance: "stable" },
  { id: "n2", produit: "Anacarde",     marche: "Kolda",               prix: 510, unite_prix: "CFA/kg", date_releve: "2024-05-16", tendance: "hausse" },
  { id: "n3", produit: "Anacarde",     marche: "Kolda",               prix: 520, unite_prix: "CFA/kg", date_releve: "2024-05-17", tendance: "hausse" },
  { id: "n4", produit: "Anacarde",     marche: "Kolda",               prix: 515, unite_prix: "CFA/kg", date_releve: "2024-05-18", tendance: "baisse" },
  { id: "n5", produit: "Anacarde",     marche: "Kolda",               prix: 530, unite_prix: "CFA/kg", date_releve: "2024-05-19", tendance: "hausse" },
];

const SPEC_STYLE: Record<string, { emoji: string; color: string; bgLight: string; border: string; accent: string; accentLight: string }> = {
  mangue:   { emoji: "🥭", color: "from-amber-500 to-orange-400",  bgLight: "from-amber-50 to-orange-50",  border: "border-amber-200/60",  accent: "#F59E0B", accentLight: "#FEF3C7" },
  anacarde: { emoji: "🌰", color: "from-yellow-600 to-amber-500",  bgLight: "from-yellow-50 to-amber-50",  border: "border-yellow-200/60", accent: "#D97706", accentLight: "#FEF9C3" },
  riz:      { emoji: "🌾", color: "from-emerald-500 to-green-400", bgLight: "from-emerald-50 to-green-50", border: "border-emerald-200/60",accent: "#10B981", accentLight: "#D1FAE5" },
  banane:   { emoji: "🍌", color: "from-yellow-400 to-lime-400",   bgLight: "from-yellow-50 to-lime-50",   border: "border-yellow-200/60", accent: "#84CC16", accentLight: "#ECFCCB" },
  mais:     { emoji: "🌽", color: "from-yellow-500 to-amber-400",  bgLight: "from-yellow-50 to-amber-50",  border: "border-yellow-200/60", accent: "#EAB308", accentLight: "#FEF9C3" },
  arachide: { emoji: "🥜", color: "from-orange-500 to-red-400",    bgLight: "from-orange-50 to-red-50",    border: "border-orange-200/60", accent: "#F97316", accentLight: "#FED7AA" },
};
const DEFAULT_SPEC_STYLE = { emoji: "🌿", color: "from-green-500 to-emerald-400", bgLight: "from-green-50 to-emerald-50", border: "border-green-200/60", accent: "#22C55E", accentLight: "#DCFCE7" };

const DEFAULT_SPECULATIONS = [
  { id: "mangue",   nom: "Mangue Kent",     categorie: "Fruits",     prixCoop: 750, prixMarche: 880, unite: "CFA / kg", saison: "Avr – Juil",   tendance: "hausse", changePercent: 2.4,  volumeDisponible: "12 t", certification: "Bio certifiée",         description: "Mangue Kent de calibre A+, récoltée à maturité optimale dans les vergers coopératifs de Casamance." },
  { id: "anacarde", nom: "Anacarde",        categorie: "Noix",       prixCoop: 490, prixMarche: 530, unite: "CFA / kg", saison: "Mar – Mai",     tendance: "hausse", changePercent: 1.8,  volumeDisponible: "28 t", certification: "Traçabilité certifiée", description: "Noix de cajou brute de première qualité, séchée naturellement et conditionnée par nos producteurs membres." },
  { id: "riz",      nom: "Riz Local",       categorie: "Céréales",   prixCoop: 420, prixMarche: 465, unite: "CFA / kg", saison: "Oct – Jan",     tendance: "stable", changePercent: 0,    volumeDisponible: "45 t", certification: "Origine contrôlée",     description: "Riz paddy de Casamance, variétés locales à haute valeur nutritive, cultivé sans intrants chimiques." },
  { id: "banane",   nom: "Banane Plantain", categorie: "Fruits",     prixCoop: 280, prixMarche: 320, unite: "CFA / kg", saison: "Toute l'année", tendance: "baisse", changePercent: -1.2, volumeDisponible: "18 t", certification: "Production durable",    description: "Banane plantain mûre, cultivée en agroforesterie sur les rives de la Casamance." },
  { id: "mais",     nom: "Maïs Séché",      categorie: "Céréales",   prixCoop: 195, prixMarche: 225, unite: "CFA / kg", saison: "Sep – Nov",     tendance: "stable", changePercent: 0,    volumeDisponible: "32 t", certification: "Séché naturellement",   description: "Maïs blanc séché au soleil, idéal pour la transformation locale et la consommation directe." },
  { id: "arachide", nom: "Arachide",        categorie: "Oléagineux", prixCoop: 310, prixMarche: 350, unite: "CFA / kg", saison: "Nov – Fév",     tendance: "hausse", changePercent: 3.1,  volumeDisponible: "22 t", certification: "Tri manuel",            description: "Arachide coques de qualité supérieure, triée manuellement et conditionnée en sacs certifiés." },
];

const TrendIcon = ({ tendance, className = "" }: { tendance: string; className?: string }) => {
  if (tendance === "hausse") return <TrendingUp className={`w-4 h-4 ${className}`} />;
  if (tendance === "baisse") return <TrendingDown className={`w-4 h-4 ${className}`} />;
  return <Minus className={`w-4 h-4 ${className}`} />;
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const PrixPublic = () => {
  const [selectedSpec, setSelectedSpec] = useState<string>("mangue");
  const [filterProduit, setFilterProduit] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const { t } = useTranslation();

  const { data: configs } = useSiteConfig();
  const { data: liveStats } = usePublicStats();
  const cfg = (key: string, fallback: string) =>
    configs?.find((c) => c.cle === key)?.valeur || fallback;

  const heroTitle      = cfg("prix_hero_title",    t("markets.hero.title", "Transparence des prix agricoles en temps réel"));
  const heroSubtitle   = cfg("prix_hero_subtitle", t("markets.hero.subtitle", "Prix de vente directs proposés par la coopérative, mis à jour quotidiennement pour garantir la meilleure qualité au meilleur prix."));

  // Auto-computed from live DB; site_config acts as admin override
  const statCertifiees = cfg("prix_stat_certifiees", "") || (liveStats ? String(liveStats.catalogueCount) : "6");
  const statEconomie   = cfg("prix_stat_economie",   "~12%");
  const statStock      = cfg("prix_stat_stock",      "") || (liveStats ? formatCompact(liveStats.totalStock) + " T" : "157 t");
  const statZones      = cfg("prix_stat_zones",      "") || (liveStats ? String(liveStats.zonesCount) + "+" : "8+");

  const { data: dbProduits = [], isLoading: isLoadingProduits } = useQuery({
    queryKey: ["produits-public-ecommerce"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produits")
        .select("*")
        .eq("in_ecommerce", true)
        .order("nom");
      if (error) throw error;
      return data || [];
    },
  });

  const SPECULATIONS = useMemo(() => {
    if (dbProduits.length > 0) {
      return dbProduits.map((p: any) => {
        const key = Object.keys(SPEC_STYLE).find(k => p.nom.toLowerCase().includes(k)) || "mangue";
        const style = SPEC_STYLE[key] ?? DEFAULT_SPEC_STYLE;
        
        return {
          id: p.id,
          nom: p.nom,
          categorie: p.categorie || "Produit",
          prixCoop: Number(p.prix_coop) || 0,
          prixMarche: Number(p.prix_marche) || 0,
          unite: "CFA / kg",
          saison: p.saison || "En cours",
          tendance: Number(p.prix_marche) > Number(p.prix_coop) ? "baisse" : "stable",
          changePercent: 0,
          volumeDisponible: `${p.quantite_estimee || 0} t`,
          certification: p.norme_qualite || "Standard",
          description: p.description || "",
          ...style,
        };
      });
    }

    // Fallback if db is empty
    const raw = configs?.find((c) => c.cle === "prix_speculations")?.valeur;
    let data = DEFAULT_SPECULATIONS;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) data = parsed;
      } catch { /* use default */ }
    }
    return data.map((s: any) => ({
      ...s,
      prixCoop:      Number(s.prixCoop),
      prixMarche:    Number(s.prixMarche),
      changePercent: Number(s.changePercent),
      ...(SPEC_STYLE[s.id] ?? DEFAULT_SPEC_STYLE),
    }));
  }, [configs, dbProduits]);

  const { data: prix = MOCK_PRIX_MARCHE } = useQuery({
    queryKey: ["prix-marche-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prix_marche")
        .select("*")
        .order("date_releve", { ascending: true });
      if (error) throw error;
      return data && data.length > 0 ? data : MOCK_PRIX_MARCHE;
    },
  });

  const produits = useMemo(() => [...new Set(prix.map((p: any) => p.produit))], [prix]);
  const activeSpec = SPECULATIONS.find((s) => s.id === selectedSpec) || SPECULATIONS[0];

  const publicDocuments = useMemo(() => {
    const docConfig = configs?.find((c) => c.cle === "public_documents");
    if (docConfig && docConfig.valeur) {
      try {
        const docs = JSON.parse(docConfig.valeur);
        if (Array.isArray(docs)) return docs;
      } catch {
        return [];
      }
    }
    return [];
  }, [configs]);

  const chartData = useMemo(() => {
    const entries = prix.filter((p: any) =>
      activeSpec.nom.toLowerCase().includes(p.produit.toLowerCase()) ||
      p.produit.toLowerCase().includes(activeSpec.nom.split(" ")[0].toLowerCase())
    );
    const source = entries.length ? entries : prix.filter((p: any) => p.produit === produits[0]);
    const map = new Map<string, any>();
    source.forEach((p: any) => {
      if (!map.has(p.date_releve)) map.set(p.date_releve, { date: p.date_releve });
      map.get(p.date_releve)!["prix"] = Number(p.prix);
      map.get(p.date_releve)!["prixCoop"] = Math.round(Number(p.prix) * 0.87);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [prix, activeSpec, produits]);

  const filteredHistory = useMemo(() =>
    prix
      .filter((p: any) => {
        const matchesProduct = filterProduit === "all" || p.produit === filterProduit;
        const matchesSearch =
          p.produit.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.marche.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesProduct && matchesSearch;
      })
      .sort((a: any, b: any) => b.date_releve.localeCompare(a.date_releve)),
  [prix, filterProduit, searchTerm]);

  const economie = activeSpec && activeSpec.prixMarche > 0 ? Math.round(((activeSpec.prixMarche - activeSpec.prixCoop) / activeSpec.prixMarche) * 100) : 0;

  if (isLoadingProduits) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#071410] pt-24 sm:pt-36 pb-16 sm:pb-28 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.12] rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-900/[0.15] rounded-full blur-[100px] pointer-events-none" />
        {/* Watermark */}
        <div className="absolute bottom-0 right-0 text-[16vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          PRIX
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mb-10 sm:mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em] mb-5 sm:mb-7">
              {t("markets.hero.badge", "Marché & Tarifs")}
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold leading-[1.1] sm:leading-[1.03] tracking-tight text-white mb-5 sm:mb-7">
              {heroTitle}
            </h1>
            <p className="text-lg text-white/[0.45] font-light leading-relaxed max-w-xl mb-12">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => {
                  if (publicDocuments.length > 0) {
                    setDocsDialogOpen(true);
                  } else {
                    toast.custom((t_id) => (
                      <div className="bg-[#051109]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5 mx-auto w-[360px] pointer-events-auto">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                          <FileText size={18} className="text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[13px] font-semibold tracking-tight">Catalogue indisponible</p>
                          <p className="text-white/60 text-[11px] mt-0.5 leading-relaxed">{t("markets.hero.no_catalog", "Aucun catalogue ou document n'est disponible pour l'instant.")}</p>
                        </div>
                        <button onClick={() => toast.dismiss(t_id)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                    ), { duration: 5000 });
                  }
                }}
                className="group flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-primary text-white font-semibold text-sm hover:shadow-[0_0_30px_rgba(27,77,33,0.4)] hover:scale-[1.02] transition-all duration-300"
              >
                <Download size={16} />
                {t("markets.hero.download", "Télécharger le catalogue")}
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
              <button className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                <Phone size={16} />
                {t("markets.hero.order", "Passer commande")}
              </button>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap gap-x-0 gap-y-4 sm:divide-x sm:divide-white/10 border-t border-white/10 pt-8 sm:pt-10"
          >
            {[
              { label: t("markets.stats.certified", "Spéculations certifiées"), value: statCertifiees, icon: ShieldCheck },
              { label: t("markets.stats.savings", "Économie moyenne"),         value: statEconomie,   icon: TrendingDown },
              { label: t("markets.stats.stock", "Stock disponible"),         value: statStock,      icon: Leaf },
              { label: t("markets.stats.zones", "Zones de couverture"),      value: statZones,      icon: MapPin },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-8 first:pl-0 py-2 sm:py-0">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <s.icon size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white tracking-tight">{s.value}</p>
                  <p className="text-[10px] text-white/[0.35] uppercase tracking-[0.2em] font-medium mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trust bar ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-black/[0.05]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {[
              { icon: ShieldCheck, text: t("markets.trust.guaranteed", "Prix garantis aux producteurs") },
              { icon: Leaf,        text: t("markets.trust.sustainable", "Agriculture durable certifiée") },
              { icon: BarChart3,   text: t("markets.trust.verified", "Marchés vérifiés (ARM)") },
              { icon: Star,        text: t("markets.trust.traceability", "Traçabilité et qualité") },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
                <Icon size={14} className="text-primary" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Speculations grid ────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8">
          <motion.div {...fadeUp} className="mb-8 sm:mb-14">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-3 sm:mb-4">
              {t("markets.catalog.eyebrow", "Catalogue")}
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              {t("markets.catalog.title", "Nos produits disponibles")}
            </h2>
            <p className="text-muted-foreground font-light mt-3 max-w-lg">
              {t("markets.catalog.desc", "Prix exclusifs proposés par la coopérative, directement depuis |'|entrepôt.")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SPECULATIONS.map((spec, i) => {
              const isSelected = selectedSpec === spec.id;
              const discountPct = Math.round(((spec.prixMarche - spec.prixCoop) / spec.prixMarche) * 100);
              return (
                <motion.div
                  key={spec.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  onClick={() => setSelectedSpec(spec.id)}
                  className={`group relative bg-white rounded-3xl border p-7 cursor-pointer transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? "border-primary shadow-[0_0_0_1px_var(--primary),0_20px_40px_-10px_rgba(27,77,33,0.15)]"
                      : "border-black/[0.05] hover:border-black/[0.1] hover:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-primary/30 rounded-t-3xl" />
                  )}

                  {/* Emoji + name */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-13 h-13 rounded-2xl bg-gray-50 border border-black/[0.04] flex items-center justify-center text-3xl w-14 h-14">
                        {spec.emoji}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">{spec.nom}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{spec.categorie}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      spec.tendance === "hausse" ? "bg-emerald-50 text-emerald-700" :
                      spec.tendance === "baisse" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      <TrendIcon tendance={spec.tendance} />
                      {spec.changePercent > 0 ? "+" : ""}{spec.changePercent}%
                    </span>
                  </div>

                  {/* Price block */}
                  <div className="bg-[#F7FAF7] rounded-2xl p-5 mb-6 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">{t("markets.catalog.coop_price", "Prix Coopérative")}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-semibold text-gray-900 tracking-tight">
                        {spec.prixCoop.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-sm font-medium text-gray-500">{spec.unite}</span>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10">
                      <span className="text-sm text-gray-500">
                        {t("markets.catalog.market_price", "Marché local")} : <strong className="text-gray-700">{spec.prixMarche.toLocaleString("fr-FR")}</strong>
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        -{discountPct}%
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: t("markets.catalog.season", "Saison"),           value: spec.saison },
                      { label: t("markets.stats.stock", "Stock disponible"), value: spec.volumeDisponible },
                      { label: t("markets.catalog.certification", "Certification"),    value: spec.certification },
                    ].map((m) => (
                      <div key={m.label} className="flex justify-between items-center">
                        <span className="text-gray-400 font-medium">{m.label}</span>
                        <span className="font-semibold text-gray-800 text-xs">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Price Evolution Chart ─────────────────────────────────────────────── */}
      <section className="py-24 bg-[#071410] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-emerald-900/[0.15] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <motion.div {...fadeUp} className="mb-14">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-4">
              {t("markets.analysis.eyebrow", "Analyse")}
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              {t("markets.analysis.title", "Évolution des cours")}
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left panel */}
            <div className="lg:col-span-1 flex flex-col gap-5">
              {/* Active product card */}
              <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl">{activeSpec?.emoji}</span>
                  <div>
                    <h3 className="font-bold text-white">{activeSpec?.nom}</h3>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-0.5">{t("markets.analysis.status", "En analyse")}</p>
                  </div>
                </div>
                <p className="text-sm text-white/40 font-light leading-relaxed mb-7">{activeSpec?.description}</p>
                <div className="space-y-4 text-sm">
                  {[
                    { label: t("markets.analysis.coop_price", "Prix coopérative"), value: `${(activeSpec?.prixCoop || 0).toLocaleString("fr-FR")} CFA`, bold: true, accent: true },
                    { label: t("markets.analysis.market_price_avg", "Prix marché (moy.)"), value: `${(activeSpec?.prixMarche || 0).toLocaleString("fr-FR")} CFA`, bold: false, accent: false },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-white/40">{row.label}</span>
                      <span className={row.accent ? "font-bold text-primary" : "font-medium text-white/70"}>{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="font-semibold text-white/60">{t("markets.analysis.net_advantage", "Avantage net")}</span>
                    <span className="font-bold text-emerald-400 text-lg">-{economie}%</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 backdrop-blur-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-[2px] bg-primary rounded-full" />
                    <span className="text-sm font-medium text-white/60">{t("markets.catalog.coop_price", "Prix Coopérative")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-[2px] bg-white/30 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg,#ffffff55 0,#ffffff55 4px,transparent 4px,transparent 8px)" }} />
                    <span className="text-sm font-medium text-white/40">{t("markets.analysis.legend_market", "Prix Marché")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="lg:col-span-2 bg-white/[0.04] border border-white/10 rounded-3xl p-7 backdrop-blur-sm">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCoop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1B4D21" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#1B4D21" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#ffffff30" }}
                      tickFormatter={(str) => {
                        try { return format(new Date(str), "dd MMM", { locale: fr }); }
                        catch { return str; }
                      }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#ffffff30" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "#0d2416",
                        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)",
                        color: "#fff",
                      }}
                      labelStyle={{ fontWeight: 700, color: "#ffffff80", marginBottom: "6px", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="prix"     name={t("markets.analysis.legend_market_short", "Marché")}       stroke="#ffffff25" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#colorMarket)" dot={false} />
                    <Area type="monotone" dataKey="prixCoop" name={t("markets.analysis.legend_coop_short", "Coopérative")} stroke="#1B4D21"   strokeWidth={2.5} fill="url(#colorCoop)"  activeDot={{ r: 6, fill: "#1B4D21", stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Market History Table ──────────────────────────────────────────────── */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8">
          <motion.div {...fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-3 sm:mb-4">
                {t("markets.history.eyebrow", "Données")}
              </span>
              <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-gray-900">
                {t("markets.history.title", "Historique des relevés")}
              </h2>
              <p className="text-muted-foreground font-light mt-1 sm:mt-2 text-sm">{t("markets.history.desc", "Données issues des marchés locaux.")}</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1 sm:flex-none">
                <Input
                  placeholder={t("markets.history.search", "Rechercher...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 w-full sm:w-64 rounded-2xl border-black/[0.07] bg-white text-sm"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              </div>
              <Select value={filterProduit} onValueChange={setFilterProduit}>
                <SelectTrigger className="h-11 rounded-2xl border-black/[0.07] bg-white w-36 sm:w-44 text-sm">
                  <SelectValue placeholder={t("markets.history.filter", "Filtrer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("markets.history.all_products", "Tous les produits")}</SelectItem>
                  {produits.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {filteredHistory.slice(0, 10).map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl border border-black/[0.05] p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{p.produit}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{format(new Date(p.date_releve), "dd MMM yyyy", { locale: fr })}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    p.tendance === "hausse" ? "bg-red-50 text-red-600" :
                    p.tendance === "baisse" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    <TrendIcon tendance={p.tendance} />
                    {p.tendance.charAt(0).toUpperCase() + p.tendance.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 text-gray-300" />
                    {p.marche}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-sm">{Number(p.prix).toLocaleString("fr-FR")}</span>
                    <span className="text-xs text-gray-400 ml-1">{p.unite_prix}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-3xl border border-black/[0.05] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAFAF9] border-b border-black/[0.04] hover:bg-[#FAFAF9]">
                    <TableHead className="font-bold text-[11px] text-gray-400 uppercase tracking-[0.15em] px-7 py-5">{t("markets.history.col_date", "Date")}</TableHead>
                    <TableHead className="font-bold text-[11px] text-gray-400 uppercase tracking-[0.15em]">{t("markets.history.col_product", "Produit")}</TableHead>
                    <TableHead className="font-bold text-[11px] text-gray-400 uppercase tracking-[0.15em]">{t("markets.history.col_location", "Lieu du relevé")}</TableHead>
                    <TableHead className="text-right font-bold text-[11px] text-gray-400 uppercase tracking-[0.15em]">{t("markets.history.col_price", "Prix marché")}</TableHead>
                    <TableHead className="text-center font-bold text-[11px] text-gray-400 uppercase tracking-[0.15em] px-7">{t("markets.history.col_trend", "Tendance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-black/[0.03]">
                  {filteredHistory.slice(0, 10).map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-[#FAFAF9] transition-colors">
                      <TableCell className="px-7 py-5 text-sm font-semibold text-gray-800">
                        {format(new Date(p.date_releve), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900 text-sm">
                        {p.produit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-gray-300" />
                          {p.marche}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-gray-900 text-sm">{Number(p.prix).toLocaleString("fr-FR")}</span>
                        <span className="text-xs text-gray-400 ml-1">{p.unite_prix}</span>
                      </TableCell>
                      <TableCell className="text-center px-7">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${
                          p.tendance === "hausse" ? "bg-red-50 text-red-600" :
                          p.tendance === "baisse" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          <TrendIcon tendance={p.tendance} />
                          {p.tendance.charAt(0).toUpperCase() + p.tendance.slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 sm:px-7 py-4 border-t border-black/[0.03] bg-[#FAFAF9] flex items-center justify-between">
              <p className="text-[11px] text-gray-400 font-medium">{t("markets.history.source", "Source : Observatoire des prix ARM")}</p>
              <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold border-black/[0.07]">
                {t("markets.history.load_more", "Charger plus")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA newsletter ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#071410] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeUp}>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-6">
                {t("markets.newsletter.eyebrow", "Newsletter")}
              </span>
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-white mb-5">
                {t("markets.newsletter.title", "Ne manquez pas les meilleures offres")}
              </h2>
              <p className="text-white/40 font-light leading-relaxed">
                {t("markets.newsletter.desc", "Recevez chaque semaine l'analyse des cours du marché et nos tarifs exclusifs, directement dans votre boîte mail.")}
              </p>
            </motion.div>

            <motion.div {...fadeUp}>
              <form className="space-y-4">
                <Input
                  type="email"
                  placeholder={t("markets.newsletter.placeholder", "Votre adresse email")}
                  className="h-14 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/30 focus:border-primary/50 focus:bg-white/10 transition-all text-sm"
                />
                <button
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-sm hover:shadow-[0_0_30px_rgba(27,77,33,0.4)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {t("markets.newsletter.button", "S'abonner gratuitement")}
                  <ArrowUpRight size={16} />
                </button>
              </form>
              <p className="text-[11px] text-white/25 mt-4 text-center">
                {t("markets.newsletter.disclaimer", "Sans engagement. Désinscription à tout moment.")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Dialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-[#051109]/95 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-2xl ring-1 ring-white/5 [&>button]:bg-white/5 [&>button]:text-white/60 [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:w-8 [&>button]:h-8 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:top-6 [&>button]:right-6 transition-all duration-500">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white tracking-tight">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                <Download size={18} className="text-primary" />
              </div>
              {t("markets.docs.title", "Documents disponibles")}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-white/50 font-light mt-3 leading-relaxed">
              {t("markets.docs.desc", "Sélectionnez un document ou catalogue à télécharger depuis notre base documentaire sécurisée.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {publicDocuments.map((doc: any, i: number) => (
              <a
                key={doc.id || i}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-5 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(27,77,33,0.15)] transition-all duration-300 group relative overflow-hidden"
              >
                {/* Accent line on hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="w-12 h-12 rounded-[14px] bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0 shadow-sm border border-primary/20">
                  <FileText size={22} className="group-hover:drop-shadow-sm" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white/90 text-sm truncate pr-4 group-hover:text-white transition-colors duration-300">{doc.name}</p>
                  <div className="flex items-center gap-2.5 text-xs text-white/40 mt-1.5 uppercase tracking-wider font-bold">
                    <span className="bg-white/10 px-2 py-0.5 rounded-md text-[9px] border border-white/5">{doc.size || "FICHIER"}</span>
                    <span className="group-hover:text-primary transition-colors">{doc.date || "Téléchargement direct"}</span>
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(27,77,33,0.5)] transition-all duration-300 shrink-0">
                  <ArrowUpRight size={16} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                </div>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PrixPublic;
