import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Users, TreePine, Package, TrendingUp, ShoppingCart, Truck, Sun, MapPin, Sparkles, Zap, ShieldCheck, ArrowRight, LayoutGrid, Globe, Activity, History, Mail, Bell, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardMap } from "@/components/DashboardMap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  "Confirmée": "bg-emerald-100 text-emerald-700",
  "En cours": "bg-blue-100 text-blue-700",
  "En attente": "bg-amber-100 text-amber-700",
  "Livrée": "bg-gray-100 text-gray-600",
  "Annulée": "bg-red-100 text-red-600",
};

const StatCard = ({ title, value, icon: Icon, trend, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-shadow hover:shadow-md">
    <div className="flex justify-between items-center mb-3">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "gold" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
      )}>
        <Icon size={18} strokeWidth={2} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
  </div>
);

export default function Dashboard() {
  const { data: producteursCount = 0 } = useQuery({ queryKey: ["producteurs-count"], queryFn: async () => { const { count } = await supabase.from("producteurs").select("*", { count: "exact", head: true }); return count || 0; } });
  const { data: vergersStats = [] } = useQuery({ queryKey: ["vergers-culture-stats"], queryFn: async () => { const { data } = await supabase.from("vergers").select("culture, superficie"); return data || []; } });
  const vergersCount = vergersStats.length;
  const { data: stocks = [] } = useQuery({ queryKey: ["stocks-dashboard"], queryFn: async () => { const { data } = await supabase.from("stocks").select("quantite_disponible"); return data || []; } });
  const { data: revenus = 0 } = useQuery({ queryKey: ["revenus-dashboard"], queryFn: async () => { const { data } = await supabase.from("tresorerie").select("montant").eq("type", "Entrée"); return (data || []).reduce((sum, item) => sum + Number(item.montant || 0), 0); } });
  const { data: commandes = [] } = useQuery({ queryKey: ["commandes-dashboard"], queryFn: async () => { const { data } = await supabase.from("commandes").select(`id, created_at, acheteur_id, produit_nom, quantite, statut, montant, unite, profiles ( full_name, entreprise )`).order("created_at", { ascending: false }).limit(6); return data || []; } });
  const { data: livraisonsCount = 0 } = useQuery({ queryKey: ["livraisons-count"], queryFn: async () => { const { count } = await supabase.from("livraisons").select("*", { count: "exact", head: true }); return count || 0; } });
  const { data: recoltes = [] } = useQuery({ queryKey: ["recoltes-dashboard"], queryFn: async () => { const { data } = await supabase.from("recoltes").select("produit, quantite, date_disponibilite").order("date_disponibilite", { ascending: true }); return data || []; } });

  // Communication KPIs
  const { data: unreadMessages = 0 } = useQuery({ queryKey: ["unread-messages-count"], queryFn: async () => { const { count } = await (supabase as any).from("contact_messages").select("*", { count: "exact", head: true }).eq("statut", "Nouvelle"); return count || 0; } });
  const { data: newsletterCount = 0 } = useQuery({ queryKey: ["newsletter-count"], queryFn: async () => { const { count } = await (supabase as any).from("newsletter_subscriptions").select("*", { count: "exact", head: true }); return count || 0; } });
  const { data: demandesCount = 0 } = useQuery({ queryKey: ["demandes-count"], queryFn: async () => { const { count } = await supabase.from("demandes").select("*", { count: "exact", head: true }).eq("statut", "Nouvelle"); return count || 0; } });

  const totalStock = stocks.reduce((sum, s) => sum + (Number(s.quantite_disponible) || 0), 0);
  const pendingOrders = commandes.filter(c => c.statut === "En attente").length;
  
  const productionMap = new Map<string, any>();
  recoltes.forEach((r) => {
    const mois = format(new Date(r.date_disponibilite || new Date()), "MMM", { locale: fr });
    const prodMois = productionMap.get(mois) || { mois, mangue: 0, anacarde: 0, agrumes: 0 };
    if (r.produit?.toLowerCase().includes("mangu")) prodMois.mangue += Number(r.quantite || 0);
    else if (r.produit?.toLowerCase().includes("anac")) prodMois.anacarde += Number(r.quantite || 0);
    else prodMois.agrumes += Number(r.quantite || 0);
    productionMap.set(mois, prodMois);
  });
  const finalProductionData = Array.from(productionMap.values());

  const cultureColors = ["#10B981", "#F0B130", "#0A1A0F", "#3B82F6", "#F43F5E", "#8B5CF6", "#E2E8F0"];
  
  const finalCultureData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    vergersStats.forEach((v: any) => {
      if (!v.culture) return;
      const c = v.culture.trim().charAt(0).toUpperCase() + v.culture.trim().slice(1).toLowerCase();
      const area = Number(v.superficie || 0);
      map.set(c, (map.get(c) || 0) + area);
      total += area;
    });
    
    return Array.from(map.entries())
      .map(([name, value], index) => ({
         name,
         value: Math.round(value), 
         percentage: total > 0 ? Math.round((value / total) * 100) : 0,
         color: cultureColors[index % cultureColors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [vergersStats]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <DashboardLayout title="Tableau de bord" subtitle="Vue d'ensemble de la coopérative">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        
        {/* Simple Date Banner */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{greeting}, administrateur</h2>
            <p className="text-sm text-gray-500 mt-1">L'écosystème affiche une croissance de <span className="font-semibold text-emerald-600">+24.8%</span> sur ce trimestre. • {format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0 px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">
            <Sun className="text-amber-500" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-900">32°C</p>
              <p className="text-xs font-medium text-amber-700">Ziguinchor MSL</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
           <StatCard title="Producteurs" value={producteursCount.toString()} icon={Users} trend="+12" />
           <StatCard title="Unité Vergers" value={vergersCount.toString()} icon={TreePine} trend="+3" />
           <StatCard title="Total Stock" value={`${(totalStock / 1000).toFixed(1)}T`} icon={Package} />
           <StatCard title="Revenus" value={`${(revenus / 1000000).toFixed(1)}M`} icon={TrendingUp} variant="gold" trend="+1.2M" />
           <StatCard title="Commandes" value={commandes.length.toString()} icon={ShoppingCart} trend={`${pendingOrders} att`} />
           <StatCard title="Livraisons" value={livraisonsCount.toString()} icon={Truck} />
        </div>

        {/* Communication KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/admin-messages" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className={cn("p-3 rounded-xl", unreadMessages > 0 ? "bg-blue-50" : "bg-gray-50")}>
              <Mail size={20} className={unreadMessages > 0 ? "text-blue-600" : "text-gray-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-gray-900">{unreadMessages}</h3>
                {unreadMessages > 0 && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Nouveau{unreadMessages > 1 ? "x" : ""}</span>}
              </div>
              <p className="text-sm font-medium text-gray-500">Messages non-lus</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
          </Link>
          <Link to="/admin-messages" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className="p-3 rounded-xl bg-emerald-50">
              <Bell size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-gray-900">{newsletterCount}</h3>
              <p className="text-sm font-medium text-gray-500">Abonnés newsletter</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
          </Link>
          <Link to="/demandes-public" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className={cn("p-3 rounded-xl", demandesCount > 0 ? "bg-amber-50" : "bg-gray-50")}>
              <Inbox size={20} className={demandesCount > 0 ? "text-amber-600" : "text-gray-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-gray-900">{demandesCount}</h3>
                {demandesCount > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">En attente</span>}
              </div>
              <p className="text-sm font-medium text-gray-500">Demandes de commande</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
          </Link>
        </div>

        {/* Maps and Pie Chart */}
        <div className="grid lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-6 relative h-[500px]">
              <div className="absolute top-4 left-6 z-10">
                 <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none px-3 py-1 font-medium text-xs flex gap-1.5 items-center">
                    <Globe size={12} className="text-emerald-500" />
                    Cartographie des Vergers
                 </Badge>
              </div>
              <div className="h-full w-full mt-2 rounded-xl overflow-hidden border border-gray-100">
                <DashboardMap />
              </div>
           </div>
           
           <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 flex flex-col">
              <div className="mb-6">
                 <h3 className="text-base font-semibold text-gray-900">Structure Culturale</h3>
                 <p className="text-sm text-gray-500">Répartition par variété</p>
              </div>
              
              <div className="h-[220px] w-full flex items-center justify-center mb-6">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie 
                         data={finalCultureData} 
                         cx="50%" cy="50%" 
                         innerRadius={65} outerRadius={90} 
                         paddingAngle={4} dataKey="value" stroke="none"
                       >
                          {finalCultureData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }} 
                       />
                    </PieChart>
                 </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                 {finalCultureData.slice(0, 4).map((c) => (
                   <div key={c.name} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                         <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                         <span className="text-xs font-medium text-gray-600 truncate">{c.name}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{c.percentage}% <span className="text-xs font-medium text-gray-400">({c.value}ha)</span></span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Global Production Flow Bar Chart */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
             <div>
                <h3 className="text-base font-semibold text-gray-900">Flux de Production</h3>
                <p className="text-sm text-gray-500">Évolution mensuelle par culture (en Tonnes)</p>
             </div>
             <div className="flex gap-4">
                {["Mangue", "Anacarde", "Agrumes"].map((l, i) => (
                   <div key={l} className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", i === 0 ? "bg-[#10B981]" : i === 1 ? "bg-[#F0B130]" : "bg-[#0A1A0F]")} />
                      <span className="text-sm font-medium text-gray-600">{l}</span>
                   </div>
                ))}
             </div>
          </div>

          <div className="h-[320px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalProductionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                   <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                   <Tooltip 
                     cursor={{ fill: '#f9fafb' }} 
                     contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                   />
                   <Bar dataKey="mangue" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                   <Bar dataKey="anacarde" fill="#F0B130" radius={[4, 4, 0, 0]} barSize={32} />
                   <Bar dataKey="agrumes" fill="#0A1A0F" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Table Row */}
        <div className="grid lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                 <div>
                    <h3 className="text-base font-semibold text-gray-900">Dernières Commandes</h3>
                    <p className="text-sm text-gray-500">Registre client récent</p>
                 </div>
                 <Button variant="outline" size="sm" className="font-medium">
                   Voir tout
                 </Button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                       <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Réf</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">État</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {commandes.length === 0 ? (
                         <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">Aucune commande récente</td></tr>
                       ) : (
                         commandes.map((order: any) => (
                           <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <span className="text-xs font-mono text-gray-500">#{order.id.slice(0,8).toUpperCase()}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <p className="text-sm font-medium text-gray-900">{order.profiles?.entreprise || order.profiles?.full_name || 'Prospect'}</p>
                                 <p className="text-xs text-gray-500">{format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <p className="text-sm font-medium text-gray-900">{order.produit_nom}</p>
                                 <p className="text-xs text-gray-500">{order.quantite} {order.unite}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusColors[order.statut] || 'bg-gray-100 text-gray-600')}>
                                    {order.statut}
                                 </span>
                              </td>
                           </tr>
                         ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Quick Actions Panel */}
           <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
                 <h3 className="text-base font-semibold text-gray-900 mb-4">Accès rapides</h3>
                 <div className="space-y-3">
                    {[
                      { label: "Producteurs", icon: Users, link: "/producteurs" },
                      { label: "Prix du marché", icon: Zap, link: "/prix-marche" },
                      { label: "Flux Logistiques", icon: Truck, link: "/logistique" }
                    ].map(a => (
                      <Link key={a.label} to={a.link} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 flex items-center justify-between cursor-pointer transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm"><a.icon size={16} /></div>
                            <span className="text-sm font-medium text-gray-700">{a.label}</span>
                         </div>
                         <ArrowRight size={16} className="text-gray-400" />
                      </Link>
                    ))}
                 </div>
              </div>
              
              <div className="bg-emerald-800 rounded-xl p-6 text-white overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-700 blur-[40px] -mr-10 -mt-10 rounded-full" />
                 <div className="relative z-10">
                    <ShieldCheck size={28} className="mb-4 text-emerald-300" />
                    <h3 className="text-lg font-bold mb-2">Gouvernance Active</h3>
                    <p className="text-sm text-emerald-100/80 mb-4">Audit et conformité des pratiques 2026</p>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                       <span>Score de sécurité</span>
                       <span className="text-emerald-300">94%</span>
                    </div>
                    <div className="h-2 w-full bg-emerald-900/50 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-400 w-[94%] rounded-full" />
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
