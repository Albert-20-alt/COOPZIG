import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Users, Package, Sprout,
  Globe, FileSearch, ChevronRight, BarChart3, Truck,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { cn } from "@/lib/utils";

// ─── Default data ─────────────────────────────────────────────────────────────
const defaultKpiData = {
  annuel:      { prod: { act: 1850, prev: 1540, trend: "+20%" }, ventes: { act: 1720, prev: 1480, trend: "+16%" }, partenaires: { act: 45, prev: 38, trend: "+18%" } },
  semestriel:  { prod: { act: 900,  prev: 750,  trend: "+20%" }, ventes: { act: 850,  prev: 710,  trend: "+19%" }, partenaires: { act: 45, prev: 42, trend: "+7%"  } },
  trimestriel: { prod: { act: 450,  prev: 380,  trend: "+18%" }, ventes: { act: 420,  prev: 350,  trend: "+20%" }, partenaires: { act: 45, prev: 44, trend: "+2%"  } },
  mensuel:     { prod: { act: 150,  prev: 130,  trend: "+15%" }, ventes: { act: 140,  prev: 120,  trend: "+16%" }, partenaires: { act: 45, prev: 45, trend: "0%"   } },
};

const defaultSpeculations = [
  { name: "Mangue Kent", prod: 800, target: 1000, color: "bg-emerald-500" },
  { name: "Anacarde",    prod: 600, target: 500,  color: "bg-amber-500"   },
  { name: "Agrumes",     prod: 250, target: 400,  color: "bg-blue-500"    },
  { name: "Banane",      prod: 200, target: 200,  color: "bg-indigo-500"  },
];

const defaultRegions = [
  { nom: "Saint-Louis", prixTonne: 60000 },
  { nom: "Dakar",       prixTonne: 45000 },
  { nom: "Thiès",       prixTonne: 40000 },
  { nom: "Diourbel",    prixTonne: 35000 },
  { nom: "Kaolack",     prixTonne: 30000 },
  { nom: "Kolda",       prixTonne: 15000 },
  { nom: "Ziguinchor",  prixTonne: 10000 },
];

const defaultPricing = [
  { nom: "Mangue Kent", prixActuel: "350", prixPasse: "320" },
  { nom: "Anacarde",    prixActuel: "420", prixPasse: "450" },
  { nom: "Agrumes",     prixActuel: "200", prixPasse: "180" },
  { nom: "Banane",      prixActuel: "250", prixPasse: "250" },
];

const periodes = ["Annuel", "Semestriel", "Trimestriel", "Mensuel"];
const annees   = ["2026 (En cours)", "2025 (Année Passée)"];

const intervallesQuantite = [
  { label: "1 à 5 Tonnes",       min: 1,  max: 5  },
  { label: "6 à 10 Tonnes",      min: 6,  max: 10 },
  { label: "11 à 25 Tonnes",     min: 11, max: 25 },
  { label: "Plus de 25 Tonnes",  min: 26, max: 50 },
];

// ─── Component ────────────────────────────────────────────────────────────────
const InvestisseursBoard = () => {
  const { data: configs } = useSiteConfig();

  const getJson = (key: string, fallback: any) => {
    if (!configs) return fallback;
    const item = configs.find((c) => c.cle === key);
    if (item?.valeur) { try { return JSON.parse(item.valeur); } catch { return fallback; } }
    return fallback;
  };

  const kpiData         = getJson("invest_kpi_data",    defaultKpiData);
  const speculationsData = getJson("invest_speculations", defaultSpeculations);
  const regionsTransport = getJson("invest_regions",      defaultRegions);
  const pricingHistory   = getJson("invest_pricing",      defaultPricing);

  const [periodeStr, setPeriodeStr] = useState("Annuel");
  const [anneeStr,   setAnneeStr]   = useState("2026 (En cours)");
  const periodeKey = periodeStr.toLowerCase() as keyof typeof kpiData;
  const isPastYear = anneeStr.includes("2025");
  const multiplier = isPastYear ? 0.75 : 1;
  const baseKPI    = kpiData[periodeKey] || defaultKpiData.annuel;

  const currentKPI = {
    prod:        { act: Math.round(baseKPI.prod.act * multiplier),        prev: baseKPI.prod.prev,        trend: isPastYear ? "+5%"  : (baseKPI.prod.trend        || "+20%") },
    ventes:      { act: Math.round(baseKPI.ventes.act * multiplier),      prev: baseKPI.ventes.prev,      trend: isPastYear ? "+8%"  : (baseKPI.ventes.trend      || "+16%") },
    partenaires: { act: isPastYear ? baseKPI.partenaires.prev : baseKPI.partenaires.act, prev: baseKPI.partenaires.prev, trend: isPastYear ? "+2%" : (baseKPI.partenaires.trend || "+18%") },
  };

  const [region,      setRegion]      = useState("");
  const [quantiteIdx, setQuantiteIdx] = useState("");
  const [estimation,  setEstimation]  = useState<{ min: number; max: number } | null>(null);

  const handleEstimate = () => {
    if (!region || !quantiteIdx) return;
    const r = regionsTransport.find((x: any) => x.nom === region);
    const q = intervallesQuantite[parseInt(quantiteIdx)];
    if (r && q) setEstimation({ min: r.prixTonne * q.min, max: r.prixTonne * q.max });
  };

  return (
    <div className="min-h-screen bg-[#071410] text-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-end overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1800&q=80"
            alt="Investisseurs"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071410]/60 via-[#071410]/50 to-[#071410]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071410]/80 via-transparent to-transparent" />
        </div>

        {/* Ambient glows */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-amber-900/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-20 pt-40 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-widest mb-6">
              <BarChart3 size={12} /> Espace Partenaires & Investisseurs
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-6 max-w-3xl">
              Indicateurs{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">
                de Performance
              </span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl leading-relaxed mb-10">
              Accédez aux métriques consolidées de la coopérative. Pilotez vos investissements avec une vision claire des flux de production et des dynamiques du marché.
            </p>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-6">
              {[
                { icon: Users, label: `${currentKPI.partenaires.act} Partenaires actifs` },
                { icon: Sprout, label: "Données en temps réel" },
                { icon: Globe, label: "Export international" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-white/60 font-medium">
                  <Icon size={15} className="text-emerald-400" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-24 space-y-10 -mt-2">

        {/* Controls bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.05] border border-white/10 backdrop-blur-sm p-5 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <FileSearch size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Période d'analyse</p>
              <p className="text-xs text-white/40">Sélectionnez la période à évaluer</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={anneeStr} onValueChange={setAnneeStr}>
              <SelectTrigger className="w-48 bg-white/[0.06] border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {annees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={periodeStr} onValueChange={setPeriodeStr}>
              <SelectTrigger className="w-36 bg-white/[0.06] border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { label: "Production Totale",     value: currentKPI.prod.act,        unit: "Tonnes",     icon: Sprout,  trend: currentKPI.prod.trend,        accent: "emerald", sub: "Volume consolidé" },
            { label: "Ventes & Transactions", value: currentKPI.ventes.act,      unit: "Tonnes",     icon: Package, trend: currentKPI.ventes.trend,      accent: "blue",    sub: "Volume commercialisé" },
            { label: "Réseau Actif",          value: currentKPI.partenaires.act, unit: "Partenaires",icon: Users,   trend: currentKPI.partenaires.trend,  accent: "amber",   sub: "Producteurs et investisseurs" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-7 overflow-hidden group hover:bg-white/[0.07] transition-colors"
            >
              {/* Glow */}
              <div className={cn(
                "absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity",
                kpi.accent === "emerald" ? "bg-emerald-500" : kpi.accent === "blue" ? "bg-blue-500" : "bg-amber-500"
              )} />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center border",
                    kpi.accent === "emerald" ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
                    : kpi.accent === "blue"  ? "bg-blue-500/15 border-blue-500/20 text-blue-400"
                    :                          "bg-amber-500/15 border-amber-500/20 text-amber-400"
                  )}>
                    <kpi.icon size={20} />
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    kpi.accent === "emerald" ? "bg-emerald-500/15 text-emerald-400"
                    : kpi.accent === "blue"  ? "bg-blue-500/15 text-blue-400"
                    :                          "bg-amber-500/15 text-amber-400"
                  )}>
                    {kpi.trend}
                  </span>
                </div>
                <p className="text-[2.5rem] font-black text-white leading-none mb-1">
                  {kpi.value.toLocaleString()}
                  <span className="text-base text-white/40 font-medium ml-2">{kpi.unit}</span>
                </p>
                <p className="text-sm font-semibold text-white/80 mt-2">{kpi.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{kpi.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Production + Calculator */}
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Production objectives */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 bg-white/[0.04] border border-white/10 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Sprout size={18} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Objectifs de Production</h3>
                <p className="text-xs text-white/40">Progression par filière stratégique</p>
              </div>
            </div>
            <div className="space-y-7">
              {speculationsData.map((spec: any) => {
                const percent = Math.min(100, Math.round((spec.prod / spec.target) * 100));
                return (
                  <div key={spec.name}>
                    <div className="flex justify-between items-end mb-2.5">
                      <div>
                        <h4 className="font-bold text-white text-sm">{spec.name}</h4>
                        <p className="text-xs text-white/40 mt-0.5">Objectif : {spec.target} T</p>
                      </div>
                      <span className="text-lg font-black text-white">{percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className={cn("h-full rounded-full", spec.color)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Logistics calculator */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5 bg-white/[0.04] border border-white/10 rounded-2xl p-8 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <Truck size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Calculateur Logistique</h3>
                <p className="text-xs text-white/40">Coûts de transport inter-régionaux</p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Destination</Label>
                <Select onValueChange={setRegion} value={region}>
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Choisir une région" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionsTransport.map((r: any) => (
                      <SelectItem key={r.nom} value={r.nom}>{r.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Volume estimé</Label>
                <Select onValueChange={setQuantiteIdx} value={quantiteIdx}>
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Choisir un volume" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervallesQuantite.map((q, i) => (
                      <SelectItem key={i} value={i.toString()}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleEstimate}
                className="w-full h-11 mt-2 font-bold rounded-xl text-white"
                style={{ background: "linear-gradient(135deg, #1A2E1C 0%, #2d5230 100%)" }}
              >
                Calculer l'estimation
              </Button>

              {estimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"
                >
                  <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-2">Estimation des frais</p>
                  <p className="text-3xl font-black text-emerald-400">
                    {estimation.min.toLocaleString("fr-FR")}
                    <span className="text-sm text-emerald-400/60 font-medium ml-2">FCFA</span>
                  </p>
                  <p className="text-xs text-white/30 mt-1.5">Variation possible (±8%)</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Pricing history */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Cotation Historique</h3>
              <p className="text-sm text-white/40">Évolution des prix moyens au kilo (FCFA)</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <Globe size={18} className="text-white/40" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pricingHistory.map((item: any, idx: number) => {
              const isDown = parseInt(item.prixActuel) < parseInt(item.prixPasse);
              const perc   = Math.round(Math.abs(((parseInt(item.prixActuel) - parseInt(item.prixPasse)) / parseInt(item.prixPasse)) * 100));
              return (
                <div key={idx} className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-white text-sm">{item.nom}</h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1",
                      isDown ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
                    )}>
                      {isDown ? <TrendingDown size={11} /> : <TrendingUp size={11} />} {perc}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between border-b border-white/[0.07] pb-3">
                      <div>
                        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Actuel</p>
                        <p className="text-2xl font-black text-white">{item.prixActuel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Précédent</p>
                        <p className="text-base font-semibold text-white/30 line-through">{item.prixPasse}</p>
                      </div>
                    </div>
                    <button className="w-full h-9 rounded-lg text-xs font-semibold text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1.5">
                      Analyse détaillée <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>

      <Footer />
    </div>
  );
};

export default InvestisseursBoard;
