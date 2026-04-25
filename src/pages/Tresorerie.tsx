import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Plus, Search, Loader2, 
  Activity, Pencil, Trash2, CheckCircle2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ title, value, icon: Icon, variant = "default", trend }: any) => (
  <div className="group bg-white dark:bg-[#0B1221] rounded-2xl border border-black/[0.03] dark:border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-none p-5 overflow-hidden relative transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:hover:bg-white/[0.07] hover:-translate-y-1">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={cn(
        "p-2.5 rounded-xl shadow-sm border transition-all group-hover:scale-110",
        variant === "green" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-500/20" :
        variant === "rose" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-500/20" :
        variant === "blue" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-500/20" :
        "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/10"
      )}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      {trend && (
        <span className={cn(
          "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider",
          trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="relative z-10">
      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1 group-hover:tracking-tighter transition-all font-sans">{value}</h3>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] ml-0.5 font-sans">{title}</p>
    </div>
  </div>
);

const Tresorerie = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const [editingMouvement, setEditingMouvement] = useState<any>(null);

  const [formData, setFormData] = useState({
    date_mouvement: new Date().toISOString().split("T")[0],
    type: "Entrée", categorie: "Vente", libelle: "", montant: "", mode_paiement: "Espèces", reference: "", notes: ""
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const [a, s] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" }),
      ]);
      return (a.data ?? false) || (s.data ?? false);
    },
    enabled: !!user,
  });

  const { data: statsData = [] } = useQuery({
    queryKey: ["tresorerie-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tresorerie").select("type, montant, date_mouvement").order("date_mouvement", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["tresorerie-list", page, search],
    queryFn: async () => {
      let q = supabase.from("tresorerie").select("*", { count: "exact" }).order("date_mouvement", { ascending: false });
      if (search) {
        q = q.or(`libelle.ilike.%${search}%,categorie.ilike.%${search}%,reference.ilike.%${search}%`);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { mouvements: data || [], total: count || 0 };
    },
  });

  const kpis = useMemo(() => {
    const entrees = statsData.filter((m: any) => m.type === "Entrée").reduce((s: number, m: any) => s + Number(m.montant), 0);
    const sorties = statsData.filter((m: any) => m.type === "Sortie").reduce((s: number, m: any) => s + Number(m.montant), 0);
    return { entrees, sorties, solde: entrees - sorties, count: statsData.length };
  }, [statsData]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const dataToSave = { ...payload, montant: Number(payload.montant), created_by: user?.id, reference: payload.reference || null, notes: payload.notes || null };
      if (payload.id) {
         const { error } = await supabase.from("tresorerie").update(dataToSave).eq("id", payload.id);
         if (error) throw error;
      } else {
         const { error } = await supabase.from("tresorerie").insert(dataToSave);
         if (error) throw error;
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["tresorerie-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["tresorerie-stats"] }); 
      toast.success("Mouvement enregistré"); closeForm(); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tresorerie").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["tresorerie-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["tresorerie-stats"] }); 
      toast.success("Mouvement supprimé"); 
    },
  });

  const closeForm = () => { setOpen(false); setEditingMouvement(null); setFormData({ date_mouvement: new Date().toISOString().split("T")[0], type: "Entrée", categorie: "Vente", libelle: "", montant: "", mode_paiement: "Espèces", reference: "", notes: "" }); };
  const handleEdit = (m: any) => { setEditingMouvement(m); setFormData({ ...m, montant: m.montant.toString(), reference: m.reference || "", notes: m.notes || "" }); setOpen(true); };

  const chartData = useMemo(() => {
    const map = new Map<string, { entrees: number; sorties: number; solde: number }>();
    let cumulativeSolde = 0;
    [...statsData].reverse().forEach((m: any) => {
      const mois = format(new Date(m.date_mouvement), "MMM", { locale: fr });
      const cur = map.get(mois) || { entrees: 0, sorties: 0, solde: 0 };
      if (m.type === "Entrée") { cur.entrees += Number(m.montant); cumulativeSolde += Number(m.montant); }
      else { cur.sorties += Number(m.montant); cumulativeSolde -= Number(m.montant); }
      cur.solde = cumulativeSolde;
      map.set(mois, cur);
    });
    return Array.from(map.entries()).map(([mois, v]) => ({ mois, ...v }));
  }, [statsData]);

  const filtered = listData?.mouvements || [];
  const totalItems = listData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <DashboardLayout title="Trésorerie" subtitle="Pilotage des flux de trésorerie et supervision des liquidités">
      <div className="space-y-10 pb-20">

        {/* Unified Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-[#0B1221] p-8 rounded-3xl border border-black/[0.03] dark:border-white/[0.05] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group transition-all">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#1A2E1C] dark:bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
                <Wallet size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em]">Finances</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2 font-sans">Registre de Trésorerie</h1>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 max-w-lg">Supervision institutionnelle des flux de liquidités et mouvements de caisse.</p>
          </div>
          <div className="flex flex-wrap gap-3 relative z-10">
            {isAdmin && (
              <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] dark:bg-emerald-600 text-white hover:bg-[#1A2E1C]/90 dark:hover:bg-emerald-700 h-10 px-6 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest group/btn">
                 <Plus className="mr-2 group-hover/btn:rotate-90 transition-transform" size={14} strokeWidth={2.5} /> Nouveau Mouvement
              </Button>
            )}
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard title="Solde Actuel" value={`${(kpis.solde / 1000000).toFixed(2)}M`} icon={Wallet} variant="blue" />
           <StatCard title="Entrées" value={`${(kpis.entrees / 1000000).toFixed(2)}M`} icon={ArrowUpRight} variant="green" />
           <StatCard title="Sorties" value={`${(kpis.sorties / 1000000).toFixed(2)}M`} icon={ArrowDownRight} variant="rose" />
           <StatCard title="Mouvements" value={kpis.count} icon={Activity} />
        </div>

        {/* Chart Section */}
        <div className="bg-white dark:bg-[#0B1221] border border-black/[0.03] dark:border-white/[0.05] p-10 rounded-[3rem] shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)]">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                 <Activity size={18} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight font-sans">Évolution de la Liquidité</h3>
           </div>
           <div className="h-[400px] w-full">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cn(
                       "rgba(0,0,0,0.03)",
                       "dark:rgba(255,255,255,0.03)"
                    )} />
                    <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 900 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 900 }} tickFormatter={v => `${(v/1000).toLocaleString()}k`} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '1.5rem', border: 'none', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', padding: '12px 16px' }}
                       itemStyle={{ color: '#10B981', fontWeight: 900, fontSize: '12px' }}
                       labelStyle={{ color: 'rgba(255,255,255,0.4)', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                       formatter={(v: number) => [`${v.toLocaleString()} FCFA`, "SOLDE"]}
                    />
                    <Area type="monotone" dataKey="solde" stroke="#10B981" strokeWidth={4} fill="url(#colorSolde)" />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-500 font-black uppercase tracking-widest text-[10px] opacity-50">Aucune donnée historique identifiée</div>
             )}
           </div>
        </div>

        {/* Unified Transaction List */}
        <div className="bg-white dark:bg-[#0B1221] rounded-[3rem] border border-black/[0.03] dark:border-white/[0.05] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
           {/* Unified Toolbar */}
           <div className="p-8 border-b border-black/[0.03] dark:border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-50/30 dark:bg-white/[0.02]">
              <div className="relative w-full max-w-xl group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A2E1C] dark:group-focus-within:text-emerald-400 transition-colors" size={20} />
                 <Input 
                   placeholder="Rechercher par libellé, référence ou catégorie institutionnelle..." 
                   value={search}
                   onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                   className="pl-14 h-16 bg-white dark:bg-[#131d2e] border-transparent focus:ring-4 focus:ring-emerald-500/10 rounded-[1.5rem] font-bold text-gray-900 dark:text-white shadow-sm group-hover:shadow-md transition-all"
                 />
              </div>
              <div className="flex items-center gap-3">
                 <div className="px-5 py-3 rounded-2xl bg-[#1A2E1C] dark:bg-emerald-600 text-white shadow-xl shadow-emerald-900/20">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{totalItems} Opérations</span>
                 </div>
              </div>
           </div>
           
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50/50 dark:bg-white/[0.02] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">
                     <tr>
                        <th className="px-8 py-5 border-b border-black/[0.03] dark:border-white/[0.05]">Date & Référence</th>
                        <th className="px-8 py-5 border-b border-black/[0.03] dark:border-white/[0.05]">Libellé de l'opération</th>
                        <th className="px-8 py-5 border-b border-black/[0.03] dark:border-white/[0.05]">Catégorie institutionnelle</th>
                        <th className="px-8 py-5 border-b border-black/[0.03] dark:border-white/[0.05] text-right">Flux Financier</th>
                        {isAdmin && <th className="px-8 py-5 border-b border-black/[0.03] dark:border-white/[0.05] text-right pr-12">Actions</th>}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.05]">
                     {isLoading ? (
                        <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600 dark:text-emerald-400 mb-6" size={40} strokeWidth={2} /> <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Synchronisation financière...</span></td></tr>
                     ) : filtered.length === 0 ? (
                        <tr><td colSpan={5} className="py-32 text-center"><div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-600"><Activity size={40} strokeWidth={1}/></div> <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Aucun mouvement répertorié</span></td></tr>
                     ) : (
                        filtered.map((m: any) => (
                          <tr key={m.id} className="group hover:bg-emerald-50/20 dark:hover:bg-white/5 transition-all cursor-pointer" onClick={() => handleEdit(m)}>
                             <td className="px-8 py-6">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{format(new Date(m.date_mouvement), "dd MMM yyyy", { locale: fr })}</p>
                                <p className="font-bold text-gray-400 text-xs">Réf: <span className="text-gray-900 dark:text-white font-black">{m.reference || "INST-N/A"}</span></p>
                             </td>
                             <td className="px-8 py-6">
                                <p className="font-black text-gray-900 dark:text-white text-base tracking-tight">{m.libelle}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{m.mode_paiement}</p>
                             </td>
                             <td className="px-8 py-6">
                                <span className="inline-flex items-center px-4 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent group-hover:border-gray-200 dark:group-hover:border-white/10 text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest transition-all">
                                   {m.categorie}
                                </span>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <div className={cn(
                                   "inline-flex flex-col items-end px-4 py-2 rounded-2xl border transition-all",
                                   m.type === "Entrée" 
                                      ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                                      : "bg-rose-50/50 dark:bg-rose-500/10 border-rose-100/50 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                                )}>
                                   <span className="text-xs font-black uppercase tracking-widest opacity-50 mb-0.5">{m.type}</span>
                                   <span className="font-black text-lg tracking-tighter">
                                      {m.type === "Entrée" ? "+" : "-"}{Number(m.montant).toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span>
                                   </span>
                                </div>
                             </td>
                             {isAdmin && (
                               <td className="px-8 py-6 text-right pr-12">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                     <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(m); }} className="h-10 w-10 rounded-xl text-gray-400 hover:text-[#1A2E1C] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-white/10 shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-white/10 transition-all"><Pencil size={16}/></Button>
                                     <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if(confirm("Supprimer ce mouvement ?")) deleteMutation.mutate(m.id); }} className="h-10 w-10 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 shadow-sm border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20 transition-all"><Trash2 size={16}/></Button>
                                  </div>
                               </td>
                             )}
                          </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>

            {/* Quantum Pagination */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-8 border-t border-black/[0.03] dark:border-white/[0.05] bg-gray-50/30 dark:bg-white/[0.01] gap-6">
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                   Affichage {page * PAGE_SIZE + 1} — {Math.min((page + 1) * PAGE_SIZE, totalItems)} <span className="mx-2 opacity-30">/</span> <span className="text-emerald-600 dark:text-emerald-400">{totalItems} flux identifiés</span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <Button 
                     variant="outline" 
                     size="icon"
                     onClick={() => setPage(Math.max(0, page - 1))} 
                     disabled={page === 0} 
                     className="h-10 w-10 rounded-2xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 text-gray-400 hover:text-[#1A2E1C] dark:hover:text-emerald-400 hover:border-gray-200 dark:hover:border-white/10 transition-all shadow-sm"
                   >
                     <ChevronLeft size={18} />
                   </Button>
 
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                     {totalPages <= 7 ? (
                       Array.from({ length: totalPages }, (_, i) => (
                         <Button
                           key={i}
                           variant={page === i ? "default" : "ghost"}
                           onClick={() => setPage(i)}
                           className={cn(
                             "h-8 w-8 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter",
                             page === i 
                               ? "bg-[#1A2E1C] dark:bg-emerald-600 text-white shadow-lg shadow-emerald-950/20" 
                               : "text-gray-400 hover:bg-white dark:hover:bg-white/10"
                           )}
                         >
                           {i + 1}
                         </Button>
                       ))
                     ) : (
                       <>
                         {[0, 1, 2].map(i => (
                           <Button
                             key={i}
                             variant={page === i ? "default" : "ghost"}
                             onClick={() => setPage(i)}
                             className={cn(
                               "h-8 w-8 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter",
                               page === i 
                                 ? "bg-[#1A2E1C] dark:bg-emerald-600 text-white shadow-lg shadow-emerald-950/20" 
                                 : "text-gray-400 hover:bg-white dark:hover:bg-white/10"
                             )}
                           >
                             {i + 1}
                           </Button>
                         ))}
                         <span className="px-1 text-gray-300 dark:text-gray-600">...</span>
                         <Button
                           variant={page === totalPages - 1 ? "default" : "ghost"}
                           onClick={() => setPage(totalPages - 1)}
                           className={cn(
                             "h-8 w-8 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter",
                             page === totalPages - 1 
                               ? "bg-[#1A2E1C] dark:bg-emerald-600 text-white shadow-lg shadow-emerald-950/20" 
                               : "text-gray-400 hover:bg-white dark:hover:bg-white/10"
                           )}
                         >
                           {totalPages}
                         </Button>
                       </>
                     )}
                   </div>
 
                   <Button 
                     variant="outline" 
                     size="icon"
                     onClick={() => setPage(Math.min(totalPages - 1, page + 1))} 
                     disabled={page >= totalPages - 1} 
                     className="h-10 w-10 rounded-2xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 text-gray-400 hover:text-[#1A2E1C] dark:hover:text-emerald-400 hover:border-gray-200 dark:hover:border-white/10 transition-all shadow-sm"
                   >
                     <ChevronRight size={18} />
                   </Button>
                 </div>
              </div>
             )}
           </div>

          {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={v => !v ? closeForm() : setOpen(true)}>
         <DialogContent className="max-w-xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                     <Activity size={18} strokeWidth={2.5} />
                   </div>
                   <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.4em]">Trésorerie</span>
                 </div>
                 <h2 className="text-3xl font-black text-white tracking-tighter font-sans">
                   {editingMouvement ? "Rectification de flux" : "Nouveau Mouvement"}
                 </h2>
               </div>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(editingMouvement ? { ...formData, id: editingMouvement.id } : formData); }} className="p-8 space-y-8">
                
                <div className="flex gap-3 p-1.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                   <button type="button" onClick={() => setFormData({...formData, type: "Entrée"})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2", formData.type === "Entrée" ? "bg-[#1A2E1C] text-white shadow-xl shadow-emerald-950/20" : "text-gray-400 hover:text-gray-600")}>
                      <ArrowUpRight size={16} strokeWidth={2.5} /> Entrée de fonds
                   </button>
                   <button type="button" onClick={() => setFormData({...formData, type: "Sortie"})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2", formData.type === "Sortie" ? "bg-rose-600 text-white shadow-xl shadow-rose-950/20" : "text-gray-400 hover:text-gray-600")}>
                      <ArrowDownRight size={16} strokeWidth={2.5} /> Sortie de fonds
                   </button>
                </div>
 
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date d'opération</Label>
                      <Input type="date" required value={formData.date_mouvement} onChange={e => setFormData({...formData, date_mouvement: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Catégorie institutionnelle</Label>
                      <Select value={formData.categorie} onValueChange={v => setFormData({...formData, categorie: v})}>
                        <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                           {["Vente", "Cotisation", "Subvention", "Achat", "Transport", "Salaire", "Autre"].map(c => <SelectItem key={c} value={c} className="rounded-xl font-bold">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Libellé descriptif</Label>
                      <Input required value={formData.libelle} onChange={e => setFormData({...formData, libelle: e.target.value})} placeholder="Détaillez la nature de l'opération..." className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant nominal (FCFA)</Label>
                      <Input type="number" required value={formData.montant} onChange={e => setFormData({...formData, montant: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 text-xl font-black text-[#1A2E1C]" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mode de règlement</Label>
                      <Select value={formData.mode_paiement} onValueChange={v => setFormData({...formData, mode_paiement: v})}>
                        <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                           {["Espèces", "Mobile Money", "Virement", "Chèque"].map(m => <SelectItem key={m} value={m} className="rounded-xl font-bold">{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                </div>
 
                <div className="pt-6 flex justify-end gap-4 border-t border-gray-50">
                  <Button type="button" variant="ghost" onClick={closeForm} className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50">Annuler</Button>
                  <Button type="submit" disabled={upsertMutation.isPending} className="h-14 px-10 rounded-2xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-2xl shadow-emerald-950/20 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95">
                     {upsertMutation.isPending ? <Loader2 className="animate-spin mr-3" size={18} /> : <CheckCircle2 className="mr-3" size={18} strokeWidth={2.5} />}
                     Finaliser l'enregistrement
                  </Button>
                </div>
             </form>
         </DialogContent>
       </Dialog>
     </div>
    </DashboardLayout>
  );
};

export default Tresorerie;
