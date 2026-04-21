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

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "green" ? "bg-emerald-50 text-emerald-600" :
        variant === "rose" ? "bg-rose-50 text-rose-600" :
        "bg-blue-50 text-blue-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
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
      <div className="space-y-6">

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registre de Trésorerie</h1>
            <p className="text-sm text-gray-500 mt-1">Consultez et gérez vos mouvements de caisse.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
               <Plus className="mr-2" size={16} /> Nouveau Mouvement
            </Button>
          )}
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard title="Solde Actuel" value={`${(kpis.solde / 1000000).toFixed(2)}M`} icon={Wallet} variant="blue" />
           <StatCard title="Entrées" value={`${(kpis.entrees / 1000000).toFixed(2)}M`} icon={ArrowUpRight} variant="green" />
           <StatCard title="Sorties" value={`${(kpis.sorties / 1000000).toFixed(2)}M`} icon={ArrowDownRight} variant="rose" />
           <StatCard title="Mouvements" value={kpis.count} icon={Activity} />
        </div>

        {/* Chart */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 mb-6">Évolution de la Liquidité</h3>
           <div className="h-[300px] w-full">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                       formatter={(v: number) => [`${v.toLocaleString()} FCFA`, "Solde"]}
                    />
                    <Area type="monotone" dataKey="solde" stroke="#10B981" strokeWidth={3} fill="url(#colorSolde)" />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-500 font-medium">Aucune donnée</div>
             )}
           </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
              <div className="relative w-full max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <Input 
                   placeholder="Rechercher libellé, référence, catégorie..." 
                   value={search}
                   onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                   className="pl-9 h-10 bg-white"
                 />
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                       <th className="px-6 py-4">Date</th>
                       <th className="px-6 py-4">Libellé</th>
                       <th className="px-6 py-4">Catégorie</th>
                       <th className="px-6 py-4 text-right">Montant</th>
                       {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement...</td></tr>
                    ) : filtered.length === 0 ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500">Aucun mouvement trouvé.</td></tr>
                    ) : (
                       filtered.map((m: any) => (
                         <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="font-semibold text-gray-900">{format(new Date(m.date_mouvement), "dd MMM yyyy", { locale: fr })}</p>
                            </td>
                            <td className="px-6 py-4">
                               <p className="font-bold text-gray-900">{m.libelle}</p>
                               <p className="text-xs text-gray-500 mt-0.5">Réf: {m.reference || "N/A"}</p>
                            </td>
                            <td className="px-6 py-4">
                               <Badge variant="outline" className="font-medium bg-gray-50 text-gray-700 border-gray-200">
                                  {m.categorie}
                               </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className={cn("font-bold", m.type === "Entrée" ? "text-emerald-600" : "text-rose-600")}>
                                  {m.type === "Entrée" ? "+" : "-"}{Number(m.montant).toLocaleString()} FCFA
                               </span>
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(m)} className="h-8 w-8 text-gray-500 hover:text-gray-900"><Pencil size={14}/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => { if(confirm("Supprimer ce mouvement ?")) deleteMutation.mutate(m.id); }} className="h-8 w-8 text-rose-500 hover:bg-rose-50"><Trash2 size={14}/></Button>
                                 </div>
                              </td>
                            )}
                         </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>

           {/* Pagination Controls */}
           {totalPages > 1 && (
             <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
               <span className="text-sm text-gray-600">
                  Affichage de {filtered.length} résultat(s) sur {totalItems}
               </span>
               <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="bg-white border-gray-200">
                   <ChevronLeft size={16} className="mr-1" /> Précédent
                 </Button>
                 <span className="text-sm font-medium text-gray-600 px-2">
                    Page {page + 1} sur {Math.max(1, totalPages)}
                 </span>
                 <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="bg-white border-gray-200">
                   Suivant <ChevronRight size={16} className="ml-1" />
                 </Button>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={v => !v ? closeForm() : setOpen(true)}>
         <DialogContent className="max-w-xl rounded-xl bg-white p-6 shadow-lg border-gray-100">
             <DialogHeader className="mb-4">
               <DialogTitle className="text-xl font-bold text-gray-900">
                 {editingMouvement ? "Modifier le mouvement" : "Nouveau Mouvement"}
               </DialogTitle>
             </DialogHeader>
             
             <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(editingMouvement ? { ...formData, id: editingMouvement.id } : formData); }} className="space-y-6">
                
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg border border-gray-200">
                   <button type="button" onClick={() => setFormData({...formData, type: "Entrée"})} className={cn("flex-1 py-2 rounded-md text-sm font-semibold transition-all flex justify-center items-center gap-2", formData.type === "Entrée" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                      <ArrowUpRight size={16} /> Entrée
                   </button>
                   <button type="button" onClick={() => setFormData({...formData, type: "Sortie"})} className={cn("flex-1 py-2 rounded-md text-sm font-semibold transition-all flex justify-center items-center gap-2", formData.type === "Sortie" ? "bg-white text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                      <ArrowDownRight size={16} /> Sortie
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Date *</Label>
                      <Input type="date" required value={formData.date_mouvement} onChange={e => setFormData({...formData, date_mouvement: e.target.value})} className="h-10" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Catégorie *</Label>
                      <Select value={formData.categorie} onValueChange={v => setFormData({...formData, categorie: v})}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {["Vente", "Cotisation", "Subvention", "Achat", "Transport", "Salaire", "Autre"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Libellé *</Label>
                      <Input required value={formData.libelle} onChange={e => setFormData({...formData, libelle: e.target.value})} placeholder="Description de l'opération..." className="h-10" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Montant (FCFA) *</Label>
                      <Input type="number" required value={formData.montant} onChange={e => setFormData({...formData, montant: e.target.value})} className="h-10 text-lg font-bold" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Mode de paiement</Label>
                      <Select value={formData.mode_paiement} onValueChange={v => setFormData({...formData, mode_paiement: v})}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {["Espèces", "Mobile Money", "Virement", "Chèque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                  <Button type="submit" disabled={upsertMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
                     {upsertMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                     Enregistrer
                  </Button>
                </div>
             </form>
         </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Tresorerie;
