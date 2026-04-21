import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt, 
  ArrowRight, BookOpen, Banknote
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"];

const StatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "gold" ? "bg-amber-50 text-amber-600" :
        variant === "rose" ? "bg-rose-50 text-rose-600" :
        "bg-emerald-50 text-emerald-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          variant === "rose" ? "bg-rose-50 text-rose-600" : "text-emerald-600 bg-emerald-50"
        )}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

const ApplicationCard = ({ to, label, desc, icon: Icon, colorClass }: any) => (
  <Link to={to} className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 relative overflow-hidden">
    <div className="flex items-start justify-between mb-4">
      <div className={cn("p-3 rounded-xl mb-4 text-white inline-flex", colorClass)}>
        <Icon size={24} />
      </div>
      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">
        <ArrowRight size={16} />
      </div>
    </div>
    <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">{label}</h3>
    <p className="text-sm font-medium text-gray-500 mt-1">{desc}</p>
  </Link>
);

const Finances = () => {
  const { data: tresorerie = [] } = useQuery({
    queryKey: ["tresorerie"],
    queryFn: async () => {
      const { data } = await supabase.from("tresorerie").select("*").order("date_mouvement", { ascending: false });
      return data || [];
    },
  });

  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: async () => { const { data } = await supabase.from("cotisations").select("*"); return data || []; } });
  const { data: factures = [] } = useQuery({ queryKey: ["factures"], queryFn: async () => { const { data } = await supabase.from("factures").select("*"); return data || []; } });
  const { data: ecritures = [] } = useQuery({ queryKey: ["ecritures-full"], queryFn: async () => { const { data } = await supabase.from("ecritures_comptables").select("*").order("date_ecriture", { ascending: true }); return data || []; } });

  const totalEntrees = tresorerie.filter((m: any) => m.type === "Entrée").reduce((s: number, m: any) => s + Number(m.montant), 0);
  const totalSorties = tresorerie.filter((m: any) => m.type === "Sortie").reduce((s: number, m: any) => s + Number(m.montant), 0);
  const totalCotisations = cotisations.filter((c: any) => c.statut === "Payé").reduce((s: number, c: any) => s + Number(c.montant), 0);
  const solde = totalEntrees - totalSorties;

  // Monthly trends
  const chartMap = new Map<string, { entrees: number; sorties: number }>();
  tresorerie.forEach((m: any) => {
    const mois = format(new Date(m.date_mouvement), "MMM", { locale: fr });
    const cur = chartMap.get(mois) || { entrees: 0, sorties: 0 };
    if (m.type === "Entrée") cur.entrees += Number(m.montant); else cur.sorties += Number(m.montant);
    chartMap.set(mois, cur);
  });
  const fluxData = Array.from(chartMap.entries()).map(([mois, v]) => ({ mois: mois.toUpperCase(), ...v, solde: v.entrees - v.sorties })).reverse().slice(-6);

  // Expense categories
  const catMap = new Map<string, number>();
  tresorerie.filter((m: any) => m.type === "Sortie").forEach((m: any) => { catMap.set(m.categorie, (catMap.get(m.categorie) || 0) + Number(m.montant)); });
  const pieData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  const modules = [
    { to: "/journal-comptable", label: "Grand Livre Comptable", desc: `${ecritures.length} écritures validées`, icon: BookOpen, colorClass: "bg-gray-800" },
    { to: "/cotisations", label: "Cotisations Membres", desc: `Perçu: ${(totalCotisations / 1000000).toFixed(2)}M FCFA`, icon: PiggyBank, colorClass: "bg-emerald-600" },
    { to: "/tresorerie", label: "Trésorerie & Opérations", desc: `Solde: ${(solde / 1000000).toFixed(2)}M FCFA`, icon: Wallet, colorClass: "bg-blue-600" },
    { to: "/facturation", label: "Factures & Devis", desc: `${factures.length} documents émis`, icon: Receipt, colorClass: "bg-amber-500" },
  ];

  return (
    <DashboardLayout title="Finances & Comptabilité" subtitle="Pilotage central des indicateurs économiques de la coopérative">
      <div className="space-y-6">

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard title="Flux Entrants" value={`${(totalEntrees / 1000000).toFixed(2)}M`} icon={TrendingUp} description="Cumul global des recettes" variant="green" />
           <StatCard title="Dépenses & Sorties" value={`${(totalSorties / 1000000).toFixed(2)}M`} icon={TrendingDown} description="Total des dépenses encourues" variant="rose" />
           <StatCard title="Fonds Cotisations" value={`${(totalCotisations / 1000000).toFixed(2)}M`} icon={PiggyBank} description="Total des versements perçus" variant="gold" />
           <StatCard title="Trésorerie Nette" value={`${(solde / 1000000).toFixed(2)}M`} icon={Wallet} description="Solde actuel total consolidé" variant={solde >= 0 ? "green" : "rose"} />
        </div>

        {/* Navigation / Modules Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {modules.map(m => (
             <ApplicationCard key={m.to} {...m} />
           ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
           
           {/* Area Chart - Cashflow */}
           <div className="lg:col-span-8 bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-900">Évolution de la Trésorerie</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Comparatif mensuel des entrées et sorties (6 derniers mois)</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"/> <span className="text-xs font-semibold text-gray-600 uppercase">Entrées</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500"/> <span className="text-xs font-semibold text-gray-600 uppercase">Sorties</span></div>
                 </div>
              </div>

              {fluxData.length > 0 ? (
                <div className="flex-1 min-h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fluxData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSorties" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                       <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                       <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                          formatter={(v: number) => [`${v.toLocaleString()} FCFA`, undefined]}
                       />
                       <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#10B981" strokeWidth={3} fill="url(#colorEntrees)" />
                       <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#EF4444" strokeWidth={3} fill="url(#colorSorties)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl my-4 py-12">
                   <Banknote className="text-gray-300 mb-2" size={48} />
                   <p className="text-sm text-gray-500 font-medium">Données insuffisantes pour le graphique</p>
                </div>
              )}
           </div>

           {/* Pie Chart - Expenses distribution */}
           <div className="lg:col-span-4 bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <div>
                 <h4 className="text-lg font-bold text-gray-900">Distribution des Dépenses</h4>
                 <p className="text-sm font-medium text-gray-500 mt-1">Répartition globale par nature comptable</p>
              </div>
              
              {pieData.length > 0 ? (
                <div className="flex-1 mt-6 flex flex-col">
                  <div className="h-[200px] w-full relative mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie 
                            data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} 
                            paddingAngle={5} dataKey="value" strokeWidth={0}
                          >
                             {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                             formatter={(v: number) => `${v.toLocaleString()} FCFA`}
                          />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-1">
                       <p className="text-xs font-semibold text-gray-400 uppercase">Sorties Nettes</p>
                       <p className="text-base font-bold text-gray-900">{(totalSorties / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     {pieData.map((d, i) => (
                       <div key={d.name} className="flex flex-col gap-1 p-2 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                               <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                               <span className="font-semibold text-gray-700 truncate max-w-[120px]">{d.name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{(d.value / 1000).toFixed(0)}k</span>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-500 font-medium py-12">
                   Aucune écriture de dépense
                </div>
              )}
           </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Finances;
