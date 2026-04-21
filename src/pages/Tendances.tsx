import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  TrendingUp, TrendingDown, Search, Loader2, BarChart3,
  Globe, Zap, Layers, Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const statutConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  Abondant: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Abondance", dot: "bg-emerald-500" },
  Stable:   { bg: "bg-amber-50",  text: "text-amber-700",   label: "Stabilité", dot: "bg-amber-500" },
  Rare:     { bg: "bg-rose-50",    text: "text-rose-700",    label: "Rareté",    dot: "bg-rose-500" },
};

const getStatut = (quantite: number): "Abondant" | "Stable" | "Rare" => {
  if (quantite >= 100) return "Abondant";
  if (quantite >= 20) return "Stable";
  return "Rare";
};

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "green" ? "bg-emerald-50 text-emerald-600" :
        variant === "gold" ? "bg-amber-50 text-amber-600" :
        variant === "purple" ? "bg-purple-50 text-purple-600" :
        "bg-blue-50 text-blue-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
  </div>
);

const Tendances = () => {
  const [search, setSearch] = useState("");

  const { data: stocks = [], isLoading: loadingStocks } = useQuery({ queryKey: ["stocks-tendances"], queryFn: async () => { const { data, error } = await supabase.from("stocks").select("*").order("produit_nom"); if (error) throw error; return data; } });
  const { data: prix = [], isLoading: loadingPrix } = useQuery({ queryKey: ["prix-tendances"], queryFn: async () => { const { data, error } = await supabase.from("prix_marche").select("*").order("date_releve", { ascending: false }); if (error) throw error; return data; } });
  const { data: calendrier = [], isLoading: loadingCal } = useQuery({ queryKey: ["calendrier-tendances"], queryFn: async () => { const { data, error } = await supabase.from("calendrier_production").select("*"); if (error) throw error; return data; } });

  const isLoading = loadingStocks || loadingPrix || loadingCal;

  const tendancesData = useMemo(() => {
    return stocks.map((s: any) => {
      const total = Number(s.quantite_disponible) + Number(s.quantite_reservee);
      const statut = getStatut(total);
      const prixReleves = prix.filter((p: any) => p.produit.toLowerCase().includes(s.produit_nom.toLowerCase().split(" ")[0]));
      const variation = prixReleves.length > 1 ? (((prixReleves[0].prix - prixReleves[1].prix) / prixReleves[1].prix) * 100).toFixed(0) : null;
      return { produit: s.produit_nom, statut, volume: total, variation: variation ? `${Number(variation) >= 0 ? "+" : ""}${variation}%` : "—", trend: variation ? (Number(variation) >= 0 ? "up" : "down") : "stable" };
    });
  }, [stocks, prix]);

  const filteredTendances = tendancesData.filter(t => t.produit.toLowerCase().includes(search.toLowerCase()));

  const historiqueData = useMemo(() => {
    const map: Record<number, number> = {};
    calendrier.forEach((c: any) => {
      const annee = c.annee ?? new Date().getFullYear();
      const niveauVal = c.niveau === "Élevé" ? 100 : c.niveau === "Moyen" ? 50 : 20;
      map[annee] = (map[annee] || 0) + niveauVal;
    });
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b)).map(([annee, score]) => ({ annee, production: score }));
  }, [calendrier]);

  return (
    <DashboardLayout title="Analyses & Tendances" subtitle="Baromètre des marchés et prévisions des récoltes">
      <div className="space-y-6">

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title="Volatilité Marché" value="2.4%" icon={Zap} variant="gold" />
           <StatCard title="Indice Demande" value="Élevé" icon={TrendingUp} variant="green" />
           <StatCard title="Indice Confiance" value="94%" icon={Globe} variant="blue" />
           <StatCard title="Filières Actives" value={tendancesData.length} icon={Layers} variant="purple" />
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
           
           {/* Detailed Table */}
           <div className="lg:col-span-8 bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-900">Baromètre des Spéculations</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Analyse des volumes et variations de prix</p>
                 </div>
                 <div className="relative w-full sm:w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input 
                      placeholder="Rechercher produit..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      className="pl-9 h-10 w-full"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                         <th className="px-6 py-4">Produit</th>
                         <th className="px-6 py-4 text-center">Disponibilité</th>
                         <th className="px-6 py-4 text-right">Volume Global</th>
                         <th className="px-6 py-4 text-right">Tendance Prix</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                         <tr><td colSpan={4} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Audit en cours...</td></tr>
                      ) : filteredTendances.length === 0 ? (
                         <tr><td colSpan={4} className="py-12 text-center text-gray-500">Aucune donnée correspondante</td></tr>
                      ) : (
                         filteredTendances.map((t, i) => (
                           <tr key={`${t.produit}-${i}`} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="font-bold text-gray-900">{t.produit}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <Badge variant="outline" className={cn("font-medium border-transparent shrink-0", statutConfig[t.statut].bg, statutConfig[t.statut].text)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statutConfig[t.statut].dot)} />
                                    {statutConfig[t.statut].label}
                                 </Badge>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900">
                                 {t.volume.toLocaleString("fr-FR")} <span className="text-xs text-gray-500 font-medium ml-1">kg</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 {t.variation === "—" ? (
                                   <span className="text-gray-400 font-medium">N/A</span>
                                 ) : (
                                   <span className={cn("font-bold inline-flex items-center justify-end gap-1", t.trend === "up" ? "text-emerald-600" : "text-rose-600")}>
                                      {t.trend === "up" ? <TrendingUp size={14}/> : <TrendingDown size={14}/>} {t.variation}
                                   </span>
                                 )}
                              </td>
                           </tr>
                         ))
                      )}
                   </tbody>
                </table>
              </div>
           </div>

           {/* Chart */}
           <div className="lg:col-span-4 bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <div className="flex items-center gap-4 mb-6">
                 <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BarChart3 size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-gray-900">Indice de Production</h3>
                    <p className="text-sm font-medium text-gray-500">Aperçu historique des volumes</p>
                 </div>
              </div>

              <div className="flex-1 w-full relative min-h-[200px]">
                 {historiqueData.length === 0 ? (
                   <div className="w-full h-full flex flex-col items-center justify-center text-sm text-gray-500">
                      Données insuffisantes
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historiqueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2} />
                               <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                         <XAxis dataKey="annee" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                         <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                         />
                         <Area type="monotone" dataKey="production" stroke="#A855F7" strokeWidth={3} fill="url(#areaGrad)" />
                      </AreaChart>
                   </ResponsiveContainer>
                 )}
              </div>
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tendances;
