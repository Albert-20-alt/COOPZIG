import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Loader2,
  Search, Trash2, MapPin, CheckCircle2, Globe,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PRODUITS = ["Anacarde", "Mangue", "Citron", "Maïs", "Riz", "Arachide", "Soja"];
const MARCHES = ["Ziguinchor", "Bignona", "Oussouye", "Goudomp", "Sédhiou", "Kolda"];

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "green" ? "bg-emerald-50 text-emerald-600" :
        variant === "amber" ? "bg-amber-50 text-amber-600" :
        variant === "blue" ? "bg-blue-50 text-blue-600" :
        "bg-gray-50 text-gray-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
  </div>
);

const PrixMarche = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterProduit, setFilterProduit] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;
  
  const { data: prix = [], isLoading } = useQuery({
    queryKey: ["prix_marche"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prix_marche")
        .select("*")
        .order("date_releve", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const analytics = useMemo(() => {
    if (prix.length === 0) return { avg: 0, min: 0, max: 0, count: 0, trend: 0 };
    const avg = prix.reduce((s: number, p: any) => s + Number(p.prix), 0) / prix.length;
    const sorted = [...prix].map(p => Number(p.prix)).sort((a, b) => a - b);
    return { avg: Math.round(avg), min: sorted[0], max: sorted[sorted.length - 1] };
  }, [prix]);

  const trendsData = useMemo(() => {
    const dataByDate: Record<string, number> = {};
    [...prix].reverse().forEach((p: any) => {
      const date = format(new Date(p.date_releve), "dd MMM", { locale: fr });
      dataByDate[date] = Number(p.prix);
    });
    return Object.entries(dataByDate).map(([date, p]) => ({ date, prix: p }));
  }, [prix]);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("prix_marche").insert({
        produit: formData.get("produit"),
        marche: formData.get("marche"),
        prix: parseFloat(formData.get("prix") as string),
        unite_prix: formData.get("unite_prix") || "CFA/kg",
        source: formData.get("source"),
        date_releve: formData.get("date_releve"),
        tendance: formData.get("tendance") || "stable",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix_marche"] });
      toast.success("Cours enregistré");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prix_marche").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix_marche"] });
      toast.success("Supprimé");
    },
  });

    let filtered = prix.filter((p: any) => 
      (!search || 
        p.produit.toLowerCase().includes(search.toLowerCase()) || 
        p.marche.toLowerCase().includes(search.toLowerCase())) &&
      (filterProduit === "all" || p.produit === filterProduit)
    );
    return filtered;
  }, [prix, search, filterProduit]);

  const totalItems = filteredPrix.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedPrix = filteredPrix.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <DashboardLayout title="Prix du Marché" subtitle="Suivi des cotations locales et internationales">
      <div className="space-y-6">

        {/* Header Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131d2e] p-6 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Observatoire des Prix</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Consultez et ajoutez de nouvelles cotations.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-lg shadow-emerald-900/10">
             <Plus className="mr-2" size={16} /> Nouveau Relevé
          </Button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title="Moyenne Générale" value={`${analytics.avg} CFA`} icon={DollarSign} variant="amber" />
           <StatCard title="Point Bas" value={`${analytics.min} CFA`} icon={TrendingDown} />
           <StatCard title="Point Haut" value={`${analytics.max} CFA`} icon={TrendingUp} variant="green" />
           <StatCard title="Marchés Suivis" value={MARCHES.length} icon={Globe} variant="blue" />
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-[#131d2e] border border-gray-100 dark:border-[#1e2d45] p-6 rounded-xl shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Évolution Moyenne des Cours</h3>
           <div className="h-[300px] w-full">
             {trendsData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorPrix" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-white/5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'white' }}
                    />
                    <Area type="monotone" dataKey="prix" stroke="#10B981" strokeWidth={3} fill="url(#colorPrix)" />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-500 font-medium border border-dashed border-gray-200 dark:border-[#1e2d45] rounded-xl">Aucune donnée disponible</div>
             )}
           </div>
        </div>

        {/* Search & Filters - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher produit ou marché..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 p-1">
            <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto max-w-[600px]">
              {[
                { id: "all", label: "Tous" },
                ...PRODUITS.map(p => ({ id: p, label: p }))
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setFilterProduit(s.id); setPage(0); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    filterProduit === s.id
                      ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

            </div>

            {/* Premium Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/30 dark:bg-white/5 gap-4">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                  Affichage de {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} cotations
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPage(Math.max(0, page - 1))} 
                    disabled={page === 0} 
                    className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronLeft size={14} />
                  </Button>

                  <div className="flex items-center gap-1.5 mx-2">
                    {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                          page === p
                            ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10" 
                            : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        )}
                      >
                        {p + 1}
                      </button>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))} 
                    disabled={page >= totalPages - 1} 
                    className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
         </div>
      {/* Entry Dialog - Premium Design */}
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="max-w-md p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Plus className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Nouveau Relevé</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Mise à jour des cotations du marché</p>
                 </div>
               </div>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(new FormData(e.currentTarget)); }} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produit *</Label>
                     <Select name="produit" defaultValue="Anacarde" required>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {PRODUITS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Marché *</Label>
                     <Select name="marche" defaultValue="Ziguinchor" required>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {MARCHES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prix (CFA) *</Label>
                        <Input name="prix" type="number" required placeholder="0" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unité</Label>
                        <Input name="unite_prix" defaultValue="CFA/kg" required className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date du relevé</Label>
                     <Input name="date_releve" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tendance</Label>
                     <Select name="tendance" defaultValue="stable">
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="hausse">Hausse ↑</SelectItem>
                           <SelectItem value="stable">Stable →</SelectItem>
                           <SelectItem value="baisse">Baisse ↓</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button type="submit" disabled={addMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                     {addMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                     Enregistrer la cotation
                  </Button>
                </div>
             </form>
          </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PrixMarche;
