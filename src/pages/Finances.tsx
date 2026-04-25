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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"];

const FinanceStatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-5 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
    
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
        variant === "gold" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : 
        variant === "rose" ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : 
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
      )}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      {trend && (
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
          variant === "rose" ? "text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 border-rose-100/50 dark:border-rose-500/20" : 
          "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-500/20"
        )}>
          {trend}
        </span>
      )}
    </div>
    
    <div className="relative z-10">
      <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-1">{value}</h3>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      {description && <p className="text-[11px] text-gray-500 mt-2 font-medium italic">{description}</p>}
    </div>
  </div>
);

const ApplicationCard = ({ to, label, desc, icon: Icon, colorClass }: any) => (
  <Link to={to} className="group block bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all p-6 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/[0.03] rounded-full blur-3xl pointer-events-none" />
    <div className="flex items-start justify-between mb-6">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", colorClass)}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-[#1A2E1C] group-hover:text-white transition-all duration-300">
        <ArrowRight size={14} strokeWidth={3} />
      </div>
    </div>
    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-[#1A2E1C] dark:group-hover:text-emerald-400 transition-colors">Module Pilotage</h3>
    <p className="text-base font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{label}</p>
    <p className="text-[11px] font-bold text-gray-400 mt-2 italic">{desc}</p>
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

        {/* Global Stats - Quantum Editorial Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <FinanceStatCard title="Flux Entrants" value={`${(totalEntrees / 1000000).toFixed(2)}M`} icon={TrendingUp} description="Recettes consolidées" variant="green" trend="+12%" />
           <FinanceStatCard title="Dépenses & Sorties" value={`${(totalSorties / 1000000).toFixed(2)}M`} icon={TrendingDown} description="Charges opérationnelles" variant="rose" trend="-5%" />
           <FinanceStatCard title="Fonds Cotisations" value={`${(totalCotisations / 1000000).toFixed(2)}M`} icon={PiggyBank} description="Épargne collective" variant="gold" />
           <FinanceStatCard title="Trésorerie Nette" value={`${(solde / 1000000).toFixed(2)}M`} icon={Wallet} description="Liquidités disponibles" variant={solde >= 0 ? "green" : "rose"} />
        </div>

        {/* ── Toolbar - Quantum Unified ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2 mb-6">
          <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto shrink-0">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20 whitespace-nowrap">
              <TrendingUp size={14} />
              <span>Vue Consolidée</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 whitespace-nowrap transition-all">
              <BookOpen size={14} />
              <span>Analytique</span>
            </button>
          </div>

          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input 
              placeholder="Chercher une écriture, un montant, une facture..." 
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11 text-base w-full" 
            />
          </div>

          <div className="flex items-center gap-1 px-1">
             <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                <button className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm transition-all">6 mois</button>
                <button className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all">1 an</button>
                <button className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all">Global</button>
             </div>
             <Button variant="outline" className="h-10 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 text-[10px] font-black uppercase tracking-widest gap-2 ml-1 transition-all hover:bg-gray-50 dark:hover:bg-white/10">
                <TrendingDown size={14} strokeWidth={3} />
                Exporter
             </Button>
          </div>
        </div>

        {/* Navigation / Modules Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {modules.map(m => (
             <ApplicationCard key={m.to} {...m} />
           ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
           
           {/* Area Chart - Cashflow - Quantum Style */}
           <div className="lg:col-span-8 bg-white dark:bg-[#131d2e] border border-gray-100 dark:border-[#1e2d45] shadow-sm rounded-2xl p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                       <TrendingUp size={18} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Trajectoire Financière</h3>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Évolution de la Trésorerie</p>
                    </div>
                 </div>
                 <div className="flex gap-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 px-3 py-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"/> <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Entrées</span></div>
                    <div className="flex items-center gap-2 px-3 py-1.5"><div className="w-2 h-2 rounded-full bg-[#EF4444]"/> <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Sorties</span></div>
                 </div>
              </div>

              {fluxData.length > 0 ? (
                <div className="flex-1 min-h-[300px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fluxData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                             <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSorties" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                             <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.1} />
                       <XAxis 
                         dataKey="mois" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                         dy={10} 
                       />
                       <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                         tickFormatter={v => `${(v/1000000).toFixed(1)}M`} 
                       />
                       <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', backgroundColor: 'white' }}
                          itemStyle={{ fontSize: '11px', fontWeight: 800 }}
                          formatter={(v: number) => [`${v.toLocaleString()} FCFA`, undefined]}
                       />
                       <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#10B981" strokeWidth={4} fill="url(#colorEntrees)" />
                       <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#EF4444" strokeWidth={4} fill="url(#colorSorties)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-[#1e2d45] rounded-2xl my-4 py-16">
                   <Banknote className="text-gray-300 dark:text-gray-700 mb-3" size={48} />
                   <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Données insuffisantes</p>
                </div>
              )}
           </div>

           {/* Pie Chart - Expenses distribution - Quantum Style */}
           <div className="lg:col-span-4 bg-white dark:bg-[#131d2e] border border-gray-100 dark:border-[#1e2d45] p-6 rounded-2xl shadow-sm flex flex-col min-h-[400px] relative group overflow-hidden">
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                   <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Répartition Sectorielle</h3>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Distribution des Dépenses</p>
                </div>
              </div>
              
              {pieData.length > 0 ? (
                <div className="flex-1 flex flex-col relative z-10">
                  <div className="h-[200px] w-full relative mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie 
                            data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} 
                            paddingAngle={5} dataKey="value" strokeWidth={0}
                          >
                             {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px' }}
                             itemStyle={{ fontWeight: 800 }}
                             formatter={(v: number) => `${v.toLocaleString()} FCFA`}
                          />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-1">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Sorties</p>
                       <p className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">{(totalSorties / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                     {pieData.map((d, i) => (
                       <div key={d.name} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 group/row hover:bg-white dark:hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                             <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight truncate max-w-[100px]">{d.name}</span>
                          </div>
                          <span className="text-[11px] font-black text-gray-900 dark:text-gray-100">{(d.value / 1000).toFixed(0)}k <span className="text-[8px] text-gray-400 ml-0.5">FCFA</span></span>
                       </div>
                     ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-xs font-black text-gray-400 uppercase tracking-widest py-16">
                   Aucune écriture
                </div>
              )}
           </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Finances;
