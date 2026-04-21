import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, TreePine, Info, X, Navigation, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProducteurDetailModal } from "./crm/ProducteurDetailModal";

export const DashboardMap = ({ vergers: initialVergers }: { vergers?: any[] }) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedVerger, setSelectedVerger] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
 
  // Fetch vergers with their producers for markers if not provided
  const { data: fetchedVergers = [] } = useQuery({
    queryKey: ["vergers-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vergers")
        .select("*, producteurs(*, recoltes(*), stocks(*), vergers(*), cotisations(*), employes_producteur(*))");
      if (error) throw error;
      return data;
    },
    enabled: !initialVergers,
  });

  const vergers = initialVergers || fetchedVergers;

  // Simplified Ziguinchor Region SVG Paths (Conceptual for Casamance)
  const regions = [
    { id: "bignona", name: "Bignona", path: "M 50,50 L 150,30 L 220,80 L 180,150 L 60,130 Z", color: "fill-primary/20 hover:fill-primary/40", stats: { prod: "1,200T", producers: 64, vergers: 112 }, intensity: 0.8 },
    { id: "ziguinchor", name: "Ziguinchor", path: "M 60,130 L 180,150 L 160,220 L 40,200 Z", color: "fill-secondary/20 hover:fill-secondary/40", stats: { prod: "850T", producers: 82, vergers: 94 }, intensity: 0.5 },
    { id: "oussouye", name: "Oussouye", path: "M 40,200 L 160,220 L 120,280 L 20,260 Z", color: "fill-earth/20 hover:fill-earth/40", stats: { prod: "450T", producers: 48, vergers: 38 }, intensity: 0.3 },
  ];

  const warehouses = [
    { name: "Entrepôt Ziguinchor Nord", x: 100, y: 160, cap: "500T" },
    { name: "Centre Collecte Bignona", x: 120, y: 70, cap: "200T" },
    { name: "Unité Transformation Sédhiou", x: 220, y: 100, cap: "800T" },
  ];

  // Helper to get random points within region-like box for demo if lat/lng missing
  const getVergerPoint = (verger: any) => {
    const hash = (verger.id || "0").split('').reduce((a:any,b:any)=>a+b.charCodeAt(0),0);
    if (verger.zone?.toLowerCase().includes("bignona")) return { x: 80 + (hash % 80), y: 60 + (hash % 40) };
    if (verger.zone?.toLowerCase().includes("oussouye")) return { x: 50 + (hash % 60), y: 210 + (hash % 40) };
    return { x: 90 + (hash % 60), y: 150 + (hash % 30) }; // Ziguinchor default
  };

  return (
    <div className="relative w-full h-[500px] bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-xl group shadow-2xl">
      {/* Animated Gradient Background Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50 mix-blend-overlay" />

      {/* Header Overlay */}
      <div className="absolute top-8 left-8 z-20 space-y-2 pointer-events-none">
        <h3 className="text-3x1 font-semibold text-foreground flex items-center gap-3 drop-shadow-md">
          <Navigation className="text-primary animate-pulse" size={28} />
          Cartographie Interactive
        </h3>
        <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.3em] bg-white/5 w-fit px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
          Région de la Casamance — Live Operations
        </p>
      </div>

      {/* SVG Map */}
      <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl translate-y-4 scale-105 transition-transform duration-1000 group-hover:scale-110">
        {/* Regions */}
        <g className="transition-all duration-700">
          {regions.map((reg) => (
            <motion.path
              key={reg.id}
              d={reg.path}
              className={`${reg.color} stroke-white/5 stroke-[0.5] cursor-pointer transition-all duration-500`}
              whileHover={{ strokeWidth: 1, stroke: "rgba(255,255,255,0.2)" }}
              onClick={() => setSelectedZone(reg.name)}
            />
          ))}
        </g>

        {/* Logistic Routes (Subtle lines) */}
        <path d="M 120,70 Q 110,115 100,160" className="stroke-primary/20 fill-none stroke-[0.4] stroke-dash-2" />
        <path d="M 100,160 Q 160,130 220,100" className="stroke-primary/20 fill-none stroke-[0.4] stroke-dash-2" />

        {/* Verger Markers */}
        <g>
          {vergers.map((v: any) => {
            const point = getVergerPoint(v);
            return (
              <motion.g
                key={v.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.8 }}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVerger(v.producteurs);
                  setIsDetailOpen(true);
                }}
              >
                <circle cx={point.x} cy={point.y} r="3" className="fill-primary shadow-glow ring-2 ring-primary/20" />
                <circle cx={point.x} cy={point.y} r="6" className="stroke-primary/20 fill-transparent stroke-[0.5] animate-ping" />
              </motion.g>
            );
          })}
        </g>

        {/* Warehouses */}
        <g>
          {warehouses.map((w) => (
            <motion.g key={w.name} whileHover={{ scale: 1.2 }}>
              <rect x={w.x - 4} y={w.y - 4} width="8" height="8" rx="2" className="fill-secondary shadow-lg stroke-white/20 stroke-[0.5]" />
              <text x={w.x + 6} y={w.y + 3} className="text-[5px] font-semibold fill-white/40 uppercase tracking-tight transition-opacity group-hover:opacity-100 opacity-60">
                {w.name}
              </text>
            </motion.g>
          ))}
        </g>
      </svg>

      {/* Floating Panel */}
      <AnimatePresence>
        <div className="absolute top-24 right-8 z-20 w-80">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-3xl space-y-6"
          >
             {selectedZone ? (
               <div key={selectedZone}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-semibold uppercase text-primary tracking-[0.2em]">Données Zone</span>
                    <button onClick={() => setSelectedZone(null)} className="p-1 hover:bg-white/10 rounded-full">
                      <X size={14} className="text-white/90" />
                    </button>
                  </div>
                  <div className="flex items-end gap-3 mb-6">
                    <h4 className="text-3xl font-semibold text-white">{selectedZone}</h4>
                    <p className="text-xs text-primary font-bold mb-1.5 animate-pulse">Live</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group/card transition-all hover:bg-white/10">
                        <Users className="text-primary mb-2 opacity-60" size={16} />
                        <p className="text-[10px] text-white/90 uppercase font-semibold tracking-widest leading-none">Producteurs</p>
                        <p className="text-2xl font-semibold text-white mt-2">
                          {regions.find(r => r.name === selectedZone)?.stats.producers}
                        </p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group/card transition-all hover:bg-white/10">
                        <Package className="text-secondary mb-2 opacity-60" size={16} />
                        <p className="text-[10px] text-white/90 uppercase font-semibold tracking-widest leading-none">Production</p>
                        <p className="text-2xl font-semibold text-secondary mt-2">
                          {regions.find(r => r.name === selectedZone)?.stats.prod}
                        </p>
                     </div>
                  </div>
                  <button className="w-full mt-6 py-4 rounded-2xl bg-primary text-white font-semibold text-xs uppercase tracking-widest shadow-glow hover:scale-[1.02] transition-all">
                    Voir toutes les récoltes
                  </button>
               </div>
             ) : (
               <div className="text-center py-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-glow-sm">
                    <MapPin className="text-primary animate-bounce" size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Sélectionnez un site</h4>
                  <p className="text-sm text-white/90 max-w-[200px] mx-auto leading-relaxed">Cliquez sur une zone ou un verger pour accéder aux données analytiques détaillées.</p>
               </div>
             )}
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Legend Overlay */}
      <div className="absolute bottom-8 left-8 z-20 flex flex-wrap gap-4 items-center">
         <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">Vergers Actifs</span>
         </div>
         <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-lg bg-secondary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">Entrepôts</span>
         </div>
         <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/5 shadow-lg opacity-40">
            <span className="w-4 h-[1px] bg-primary/40 rotate-[-45deg]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">Routes Logistiques</span>
         </div>
      </div>


      {/* Interactive Detail Modal */}
      <ProducteurDetailModal 
         producteur={selectedVerger} 
         open={isDetailOpen} 
         onOpenChange={setIsDetailOpen} 
         isAdmin={true} 
      />
    </div>
  );
};

// DashboardMap component is now exported as a named export at the top.
