import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Package, Plus, Loader2, Edit, Trash2, 
  Search, ShoppingBag, ShieldCheck, Zap, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Stock = Tables<"stocks">;

const StatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "gold" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

const Stocks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openFullEdit, setOpenFullEdit] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [availabilityFilter, setAvailabilityFilter] = useState("tous");
  const confirm = useConfirm();
  const PAGE_SIZE = 15;
  const [formData, setFormData] = useState({ produit_nom: "", quantite_disponible: "", quantite_reservee: "", quantite_vendue: "", unite: "kg" });
  const [variation, setVariation] = useState({ type: "disponible", action: "add", amount: "" });

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const [adminRes, superadminRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" }),
      ]);
      return (adminRes.data ?? false) || (superadminRes.data ?? false);
    },
    enabled: !!user,
  });

  const { data: statsData = [] } = useQuery({
    queryKey: ["stocks-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stocks").select("quantite_disponible, quantite_reservee, quantite_vendue");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["stocks-list", page, search, availabilityFilter],
    queryFn: async () => {
      let q = supabase.from("stocks").select("*", { count: "exact" }).order("produit_nom");
      
      if (search) q = q.ilike("produit_nom", `%${search}%`);
      if (availabilityFilter === "disponible") q = q.gt("quantite_disponible", 0);
      if (availabilityFilter === "critique") q = q.lt("quantite_disponible", 5);
      
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { stocks: data as Stock[], total: count || 0 };
    },
  });

  const addStock = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stocks").insert({ produit_nom: formData.produit_nom, quantite_disponible: parseFloat(formData.quantite_disponible) || 0, quantite_reservee: parseFloat(formData.quantite_reservee) || 0, quantite_vendue: parseFloat(formData.quantite_vendue) || 0, unite: formData.unite });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stocks"] }); toast.success("Produit ajouté au stock"); setOpenAdd(false); setFormData({ produit_nom: "", quantite_disponible: "", quantite_reservee: "", quantite_vendue: "", unite: "kg" }); },
  });

  const updateStock = useMutation({
    mutationFn: async () => {
      if (!selectedStock) return;
      const amount = parseFloat(variation.amount) || 0;
      const field = variation.type === "disponible" ? "quantite_disponible" : variation.type === "reservee" ? "quantite_reservee" : "quantite_vendue";
      const currentValue = selectedStock[field] as number;
      const newValue = variation.action === "add" ? currentValue + amount : Math.max(0, currentValue - amount);
      const { error } = await supabase.from("stocks").update({ [field]: newValue }).eq("id", selectedStock.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stocks"] }); toast.success("Ajustement de stock enregistré"); setOpenEdit(false); setVariation({ type: "disponible", action: "add", amount: "" }); },
  });
  
  const fullUpdateStock = useMutation({
    mutationFn: async () => {
      if (!selectedStock) return;
      const { error } = await supabase.from("stocks").update({
        produit_nom: formData.produit_nom,
        quantite_disponible: parseFloat(formData.quantite_disponible) || 0, 
        quantite_reservee: parseFloat(formData.quantite_reservee) || 0, 
        quantite_vendue: parseFloat(formData.quantite_vendue) || 0, 
        unite: formData.unite
      }).eq("id", selectedStock.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stocks"] }); toast.success("Informations du produit mises à jour"); setOpenFullEdit(false); },
  });

  const deleteStock = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("stocks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["stocks-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["stocks-stats"] }); 
      toast.success("Produit retiré du stock"); 
    },
  });

  const totalAvailable = statsData.reduce((a: number, b: any) => a + (b.quantite_disponible || 0), 0);
  const totalReserved  = statsData.reduce((a: number, b: any) => a + (b.quantite_reservee || 0), 0);
  const totalSold      = statsData.reduce((a: number, b: any) => a + (b.quantite_vendue || 0), 0);
  
  const filtered = listData?.stocks || [];
  const totalItems = listData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <DashboardLayout title="Stocks" subtitle="Gestion logistique des réserves et disponibilités commerciales">
      <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131d2e] p-6 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventaire et réserves</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Supervisez l'offre et les commandes en temps réel.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpenAdd(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
              <Plus className="mr-2" size={16} />
              Nouveau produit en stock
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Variétés Indexées" value={statsData.length} icon={ShoppingBag} description="Produits en base" />
          <StatCard title="Total Disponible" value={`${totalAvailable.toFixed(0)}`} icon={Package} description="Capacité immédiate" trend="Sain" />
          <StatCard title="Total Réservé" value={`${totalReserved.toFixed(0)}`} icon={ShieldCheck} description="Volume engagé" variant="gold" />
          <StatCard title="Flux Sortants/Vendus" value={`${totalSold.toFixed(0)}`} icon={Zap} description="Volumes expédiés" />
        </div>

        {/* Search & Filters - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
            {[
              { id: "tous", label: "Tous" },
              { id: "disponible", label: "Disponible" },
              { id: "critique", label: "Critique" }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => { setAvailabilityFilter(s.id); setPage(0); }}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  availabilityFilter === s.id
                    ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
             <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-medium border-b border-gray-100 dark:border-white/5 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-4 text-center">Désignation</th>
                    <th className="px-6 py-4 text-center">Disponible</th>
                    <th className="px-6 py-4 text-center">Réservé (Engagé)</th>
                    <th className="px-6 py-4 text-center">Expédié / Ventes</th>
                    <th className="px-6 py-4 w-64 text-center">Répartition volume</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.map((s) => {
                    const total = (s.quantite_disponible || 0) + (s.quantite_reservee || 0) + (s.quantite_vendue || 0);
                    const availPct = total > 0 ? ((s.quantite_disponible || 0) / total) * 100 : 0;
                    const resPct   = total > 0 ? ((s.quantite_reservee  || 0) / total) * 100 : 0;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100 text-center">{s.produit_nom}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{s.quantite_disponible}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">{s.unite}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-amber-600 dark:text-amber-400 text-lg">{s.quantite_reservee}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">{s.unite}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-gray-600 dark:text-gray-400 text-lg">{s.quantite_vendue}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">{s.unite}</span>
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                           <div className="w-full bg-gray-100 rounded-full h-2 mb-1 flex overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${availPct}%` }} />
                              <div className="bg-amber-400 h-full" style={{ width: `${resPct}%` }} />
                           </div>
                           <div className="flex justify-between text-[10px] text-gray-500 uppercase font-medium">
                              <span className="text-emerald-600">Dispo {availPct.toFixed(0)}%</span>
                              <span className="text-amber-500">Résa {resPct.toFixed(0)}%</span>
                           </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-end gap-2">
                               <Button size="icon" variant="ghost" onClick={() => { setSelectedStock(s); setVariation({ type: "disponible", action: "add", amount: "" }); setOpenEdit(true); }} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                                 <Plus size={16} />
                               </Button>
                               <Button size="icon" variant="ghost" onClick={() => { setSelectedStock(s); setFormData({ produit_nom: s.produit_nom, quantite_disponible: String(s.quantite_disponible), quantite_reservee: String(s.quantite_reservee), quantite_vendue: String(s.quantite_vendue), unite: s.unite }); setOpenFullEdit(true); }} className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-gray-100">
                                 <Edit size={16} />
                               </Button>
                               <Button size="icon" variant="ghost" onClick={() => {
                                 confirm({
                                   title: "Supprimer du stock",
                                   description: `Voulez-vous retirer "${s.produit_nom}" de l'inventaire ? Cette action est irréversible.`,
                                   confirmLabel: "Supprimer",
                                   variant: "danger",
                                   onConfirm: () => deleteStock.mutate(s.id),
                                 });
                               }} className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50">
                                 <Trash2 size={16} />
                               </Button>
                             </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && !isLoading && (
                <div className="py-12 text-center text-gray-500">
                   <ShoppingBag className="mx-auto text-gray-300 mb-3" size={48} />
                   <p>Le stock est vide</p>
                </div>
              )}
              
              {/* Premium Pagination Controls */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/30 dark:bg-white/5 gap-4 mt-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                    Index {page * PAGE_SIZE + 1} – {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} produits
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
          </div>
        )}
      </div>

      {/* Adjust Stock Dialog - Premium Design */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
           <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
             <div className="relative z-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                 <Zap className="text-emerald-400" size={22} />
               </div>
               <div>
                 <DialogTitle className="text-xl font-bold text-white">Ajustement de stock</DialogTitle>
                 <p className="text-sm text-white/50 mt-0.5">{selectedStock?.produit_nom}</p>
               </div>
             </div>
           </div>
           
           <form onSubmit={e => { e.preventDefault(); updateStock.mutate(); }} className="p-8 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type de volume</Label>
                <Select value={variation.type} onValueChange={v => setVariation({ ...variation, type: v })}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="disponible">Volume disponible</SelectItem>
                     <SelectItem value="reservee">Volume réservé (engagé)</SelectItem>
                     <SelectItem value="vendue">Sorties / Ventes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Action</Label>
                   <Select value={variation.action} onValueChange={v => setVariation({ ...variation, action: v })}>
                     <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="add">Ajouter (+)</SelectItem>
                        <SelectItem value="remove">Réduire (-)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantité ({selectedStock?.unite})</Label>
                    <Input required type="number" step="0.1" value={variation.amount} onChange={e => setVariation({ ...variation, amount: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                 </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpenEdit(false)} className="rounded-xl px-5 h-11 text-gray-500">Annuler</Button>
                <Button type="submit" disabled={updateStock.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                   {updateStock.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                   Appliquer l'ajustement
                </Button>
              </div>
           </form>
        </DialogContent>
      </Dialog>

      {/* Edit Full Stock Info Dialog - Premium Design */}
      <Dialog open={openFullEdit} onOpenChange={setOpenFullEdit}>
        <DialogContent className="max-w-xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
           <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
             <div className="relative z-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                 <Edit className="text-emerald-400" size={22} />
               </div>
               <div>
                 <DialogTitle className="text-xl font-bold text-white">Modifier le produit</DialogTitle>
                 <p className="text-sm text-white/50 mt-0.5">Édition complète des métadonnées de stock</p>
               </div>
             </div>
           </div>
           
           <form onSubmit={e => { e.preventDefault(); fullUpdateStock.mutate(); }} className="p-8 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Désignation du produit</Label>
                <Input required value={formData.produit_nom} onChange={e => setFormData({ ...formData, produit_nom: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unité de mesure</Label>
                   <Select value={formData.unite} onValueChange={v => setFormData({ ...formData, unite: v })}>
                     <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        {["kg", "T", "L", "Cartons", "Palettes"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantité Disponible</Label>
                    <Input type="number" step="0.1" value={formData.quantite_disponible} onChange={e => setFormData({ ...formData, quantite_disponible: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantité Réservée</Label>
                    <Input type="number" step="0.1" value={formData.quantite_reservee} onChange={e => setFormData({ ...formData, quantite_reservee: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sorties / Ventes</Label>
                    <Input type="number" step="0.1" value={formData.quantite_vendue} onChange={e => setFormData({ ...formData, quantite_vendue: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                 </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpenFullEdit(false)} className="rounded-xl px-5 h-11 text-gray-500">Annuler</Button>
                <Button type="submit" disabled={fullUpdateStock.isPending} className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-8 h-11 font-bold shadow-lg shadow-black/10">
                   {fullUpdateStock.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                   Sauvegarder
                </Button>
              </div>
           </form>
        </DialogContent>
      </Dialog>

      {/* Initialize Stock Dialog - Premium Design */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
           <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
             <div className="relative z-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                 <Package className="text-emerald-400" size={22} />
               </div>
               <div>
                 <DialogTitle className="text-xl font-bold text-white">Nouveau produit en stock</DialogTitle>
                 <p className="text-sm text-white/50 mt-0.5">Initialisation de l'inventaire logistique</p>
               </div>
             </div>
           </div>
           <form onSubmit={e => { e.preventDefault(); addStock.mutate(); }} className="p-8 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Désignation *</Label>
                <Input required value={formData.produit_nom} onChange={e => setFormData({ ...formData, produit_nom: e.target.value })} placeholder="Ex: Mangue séchée Bio" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unité</Label>
                   <Select value={formData.unite} onValueChange={v => setFormData({ ...formData, unite: v })}>
                     <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        {["kg", "T", "L", "Cartons", "Palettes"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volume initial dispo.</Label>
                    <Input type="number" step="0.1" value={formData.quantite_disponible} onChange={e => setFormData({ ...formData, quantite_disponible: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                 </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpenAdd(false)} className="rounded-xl px-5 h-11 text-gray-500">Annuler</Button>
                <Button type="submit" disabled={addStock.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                   {addStock.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                   Créer l'inventaire
                </Button>
              </div>
           </form>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default Stocks;
