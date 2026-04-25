import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, Package, X, Navigation, TreePine, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

// ── Static geography (SVG paths are fixed — they represent real map shapes) ──
const REGIONS = [
  {
    id: "bignona",
    name: "Bignona",
    path: "M 50,50 L 150,30 L 220,80 L 180,150 L 60,130 Z",
    colorFill: "rgba(16,185,129,0.15)",
    colorHover: "rgba(16,185,129,0.30)",
    stroke: "rgba(16,185,129,0.3)",
  },
  {
    id: "ziguinchor",
    name: "Ziguinchor",
    path: "M 60,130 L 180,150 L 160,220 L 40,200 Z",
    colorFill: "rgba(245,158,11,0.15)",
    colorHover: "rgba(245,158,11,0.30)",
    stroke: "rgba(245,158,11,0.3)",
  },
  {
    id: "oussouye",
    name: "Oussouye",
    path: "M 40,200 L 160,220 L 120,280 L 20,260 Z",
    colorFill: "rgba(139,92,246,0.12)",
    colorHover: "rgba(139,92,246,0.25)",
    stroke: "rgba(139,92,246,0.3)",
  },
];

const WAREHOUSES = [
  { name: "Entrepôt Ziguinchor Nord", x: 100, y: 160 },
  { name: "Centre Collecte Bignona",  x: 120, y: 70  },
  { name: "Unité Transformation Sédhiou", x: 220, y: 100 },
];

// ── Match a zone string from DB to a region id ────────────────────────────────
const zoneToRegionId = (zone: string | null): string => {
  if (!zone) return "ziguinchor";
  const z = zone.toLowerCase();
  if (z.includes("bignona"))    return "bignona";
  if (z.includes("oussouye"))   return "oussouye";
  return "ziguinchor";
};

// ── Format production: kg → T if >= 1000 ─────────────────────────────────────
const fmtProd = (kg: number): string => {
  if (kg === 0) return "—";
  if (kg >= 1000) return `${Math.round(kg / 1000).toLocaleString("fr-FR")} T`;
  return `${Math.round(kg).toLocaleString("fr-FR")} kg`;
};

// ── Verger point placement (deterministic from id hash) ───────────────────────
const getVergerPoint = (verger: { id: string; zone?: string | null }) => {
  const hash = verger.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const rid = zoneToRegionId(verger.zone ?? null);
  if (rid === "bignona")  return { x: 70  + (hash % 100), y: 45  + (hash % 70) };
  if (rid === "oussouye") return { x: 40  + (hash % 80),  y: 205 + (hash % 55) };
  return                         { x: 70  + (hash % 80),  y: 145 + (hash % 50) };
};

// ── Main component ────────────────────────────────────────────────────────────
export const DashboardMap = ({ vergers: initialVergers }: { vergers?: any[] }) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [hoverRegionId,    setHoverRegionId]    = useState<string | null>(null);

  // Fetch all vergers (zone + estimation_rendement + producteur_id)
  const { data: vergers = [], isLoading: loadingV } = useQuery({
    queryKey: ["vergers-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vergers")
        .select("id, zone, estimation_rendement, producteur_id, nom, etat");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !initialVergers,
  });

  // Fetch all recoltes (quantite + unite + verger_id) for real production totals
  const { data: recoltes = [], isLoading: loadingR } = useQuery({
    queryKey: ["recoltes-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recoltes")
        .select("verger_id, quantite, unite");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !initialVergers,
  });

  const allVergers = initialVergers ?? vergers;
  const isLoading  = !initialVergers && (loadingV || loadingR);

  // ── Compute real per-region stats ──────────────────────────────────────────
  const regionStats = useMemo(() => {
    const stats: Record<string, { producers: Set<string>; vergerCount: number; productionKg: number }> = {
      bignona:    { producers: new Set(), vergerCount: 0, productionKg: 0 },
      ziguinchor: { producers: new Set(), vergerCount: 0, productionKg: 0 },
      oussouye:   { producers: new Set(), vergerCount: 0, productionKg: 0 },
    };

    // Build verger_id → regionId map
    const vergerToRegion: Record<string, string> = {};
    for (const v of allVergers) {
      const rid = zoneToRegionId(v.zone ?? null);
      vergerToRegion[v.id] = rid;
      stats[rid].producers.add(v.producteur_id);
      stats[rid].vergerCount++;
      // estimation_rendement is in T by convention — convert to kg for uniform calc
      stats[rid].productionKg += (Number(v.estimation_rendement) || 0) * 1000;
    }

    // Add real harvested quantities from recoltes
    for (const r of recoltes) {
      const rid = vergerToRegion[r.verger_id];
      if (!rid) continue;
      const qty = Number(r.quantite) || 0;
      // If unite is "t" or "T" → convert to kg; else treat as kg
      const kg = (r.unite?.toLowerCase() === "t") ? qty * 1000 : qty;
      stats[rid].productionKg += kg;
    }

    return stats;
  }, [allVergers, recoltes]);

  const selectedRegion = REGIONS.find(r => r.id === selectedRegionId);
  const stats = selectedRegionId ? regionStats[selectedRegionId] : null;

  return (
    <div className="relative w-full h-full bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-xl group shadow-2xl">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50 mix-blend-overlay pointer-events-none" />

      {/* Header */}
      <div className="absolute top-8 left-8 z-20 space-y-2 pointer-events-none">
        <h3 className="text-2xl font-semibold text-foreground flex items-center gap-3 drop-shadow-md">
          <Navigation className="text-primary animate-pulse" size={24} />
          Cartographie Interactive
        </h3>
        <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.3em] bg-white/5 w-fit px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
          Région de la Casamance — Live Operations
        </p>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* SVG Map */}
      <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl translate-y-4 scale-105 transition-transform duration-1000 group-hover:scale-110">
        {/* Region shapes */}
        <g>
          {REGIONS.map((reg) => {
            const isSelected = selectedRegionId === reg.id;
            const isHovered  = hoverRegionId   === reg.id;
            return (
              <motion.path
                key={reg.id}
                d={reg.path}
                fill={isSelected || isHovered ? reg.colorHover : reg.colorFill}
                stroke={reg.stroke}
                strokeWidth={isSelected ? 1.2 : 0.5}
                className="cursor-pointer transition-all duration-300"
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedRegionId(isSelected ? null : reg.id)}
                onHoverStart={() => setHoverRegionId(reg.id)}
                onHoverEnd={() => setHoverRegionId(null)}
              />
            );
          })}
        </g>

        {/* Logistics routes */}
        <path d="M 120,70 Q 110,115 100,160" stroke="rgba(16,185,129,0.2)" fill="none" strokeWidth="0.5" strokeDasharray="3,3" />
        <path d="M 100,160 Q 160,130 220,100" stroke="rgba(16,185,129,0.2)" fill="none" strokeWidth="0.5" strokeDasharray="3,3" />

        {/* Real verger markers */}
        <g>
          {allVergers.map((v: any) => {
            const pt = getVergerPoint(v);
            const isActive = v.etat?.toLowerCase() !== "repos";
            return (
              <motion.g
                key={v.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.random() * 0.3 }}
                className="cursor-pointer"
                onClick={() => setSelectedRegionId(zoneToRegionId(v.zone ?? null))}
              >
                <circle cx={pt.x} cy={pt.y} r="2.5" fill={isActive ? "#10b981" : "#6b7280"} opacity={0.9} />
                {isActive && (
                  <circle cx={pt.x} cy={pt.y} r="5" stroke="#10b981" strokeWidth="0.5" fill="transparent" opacity={0.4} className="animate-ping" style={{ animationDuration: "2s" }} />
                )}
              </motion.g>
            );
          })}
        </g>

        {/* Warehouse markers */}
        <g>
          {WAREHOUSES.map((w) => (
            <motion.g key={w.name} whileHover={{ scale: 1.3 }}>
              <rect x={w.x - 4} y={w.y - 4} width="8" height="8" rx="2" fill="#f59e0b" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              <text x={w.x + 6} y={w.y + 3} fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.45)" className="uppercase tracking-tight">
                {w.name}
              </text>
            </motion.g>
          ))}
        </g>
      </svg>

      {/* Info panel */}
      <div className="absolute top-20 right-8 z-20 w-80 max-h-[calc(100%-120px)] overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {selectedRegion && stats ? (
            <motion.div
              key={selectedRegion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-5 shadow-3xl space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold uppercase text-primary tracking-[0.2em]">Données Zone</span>
                <button onClick={() => setSelectedRegionId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X size={14} className="text-white/70" />
                </button>
              </div>

              <div className="flex items-end gap-3">
                <h4 className="text-3xl font-semibold text-white">{selectedRegion.name}</h4>
                <span className="text-xs text-primary font-bold mb-1.5 animate-pulse">Live</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                  <Users className="text-primary mb-2 opacity-60" size={16} />
                  <p className="text-[10px] text-white/70 uppercase font-semibold tracking-widest">Producteurs</p>
                  <p className="text-2xl font-bold text-white mt-2">
                    {stats.producers.size > 0 ? stats.producers.size : <span className="text-base text-white/40">—</span>}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                  <TreePine className="text-emerald-400 mb-2 opacity-60" size={16} />
                  <p className="text-[10px] text-white/70 uppercase font-semibold tracking-widest">Vergers</p>
                  <p className="text-2xl font-bold text-white mt-2">
                    {stats.vergerCount > 0 ? stats.vergerCount : <span className="text-base text-white/40">—</span>}
                  </p>
                </div>
                <div className="col-span-2 bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                  <Package className="text-amber-400 mb-2 opacity-60" size={16} />
                  <p className="text-[10px] text-white/70 uppercase font-semibold tracking-widest">Production estimée</p>
                  <p className="text-2xl font-bold text-amber-400 mt-2">{fmtProd(stats.productionKg)}</p>
                </div>
              </div>

              <Link
                to="/recoltes"
                className="w-full mt-2 py-4 rounded-2xl bg-primary text-white font-semibold text-xs uppercase tracking-widest shadow-glow hover:scale-[1.02] transition-all flex items-center justify-center"
              >
                Voir toutes les récoltes
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-3xl"
            >
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-primary/20">
                  <MapPin className="text-primary animate-bounce" size={28} />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Sélectionnez une zone</h4>
                <p className="text-sm text-white/50 max-w-[200px] mx-auto leading-relaxed">
                  Cliquez sur une zone de la carte pour voir les données réelles.
                </p>
                {/* Global summary */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {REGIONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRegionId(r.id)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-2.5 transition-colors cursor-pointer"
                    >
                      <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">{r.name}</p>
                      <p className="text-sm font-bold text-white">{regionStats[r.id]?.vergerCount || 0}</p>
                      <p className="text-[9px] text-white/40">vergers</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-8 z-20 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">Vergers Actifs</span>
        </div>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">Entrepôts</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5 shadow-lg opacity-50">
          <span className="w-4 h-[1px] bg-primary/40" style={{ transform: "rotate(-45deg)" }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">Routes Logistiques</span>
        </div>
      </div>
    </div>
  );
};
