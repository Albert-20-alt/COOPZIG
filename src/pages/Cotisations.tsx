import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  PiggyBank, Plus, CheckCircle, Clock, XCircle, Search, Edit, Trash2, 
  Loader2, Calendar, Users, Wallet, CreditCard, ChevronLeft, ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statutConfig: Record<string, { bg: string; text: string; ring: string; icon: any }> = {
  "Payé": { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20", icon: CheckCircle },
  "En attente": { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/20", icon: Clock },
  "En retard": { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-600/20", icon: XCircle },
};

const CotisationStatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-5 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
        variant === "green" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : 
        variant === "gold" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : 
        "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
      )}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
    </div>
    <div className="relative z-10">
      <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-1">{value}</h3>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
    </div>
  </div>
);

const Cotisations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;
  const [editingCotisation, setEditingCotisation] = useState<any>(null);

  const defaultForm = () => ({
    producteur_id: "", montant: "", periode: format(new Date(), "yyyy") + "-T" + (Math.floor(new Date().getMonth() / 3) + 1),
    date_paiement: new Date().toISOString().split("T")[0], mode_paiement: "Espèces", statut: "Payé", notes: ""
  });
  const [formData, setFormData] = useState(defaultForm());

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
    queryKey: ["cotisations-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cotisations").select("montant, statut, producteur_id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["cotisations-list", page, search],
    queryFn: async () => {
      let q = supabase.from("cotisations").select("*, producteur:producteurs(nom)", { count: "exact" }).order("date_paiement", { ascending: false });
      
      // Postgrest filtering with joined tables requires setting foreign table filters
      if (search) {
        q = q.or(`periode.ilike.%${search}%, notes.ilike.%${search}%`);
        // Note: we can't easily ILIKE filter locally on joined `producteur.nom` in PostgREST unless via RPC. 
        // For simplicity and matching current UI feel natively, we just filter text fields of cotisations.
      }
      
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { cotisations: data || [], total: count || 0 };
    },
  });

  const { data: producteurs = [] } = useQuery({ queryKey: ["form_producteurs_cotisation"], queryFn: async () => { const { data } = await supabase.from("producteurs").select("id, nom").order("nom"); return data || []; } });

  const kpis = useMemo(() => {
    const totalPaye = statsData.filter((c: any) => c.statut === "Payé").reduce((s: number, c: any) => s + Number(c.montant), 0);
    const totalAttente = statsData.filter((c: any) => c.statut !== "Payé").reduce((s: number, c: any) => s + Number(c.montant), 0);
    const membresAJour = new Set(statsData.filter((c: any) => c.statut === "Payé").map((c: any) => c.producteur_id)).size;
    return { totalPaye, totalAttente, membresAJour, totalCount: statsData.length };
  }, [statsData]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const dataToSave = { ...payload, montant: Number(payload.montant), notes: payload.notes || null };
      if (payload.id) { const { error } = await supabase.from("cotisations").update(dataToSave).eq("id", payload.id); if (error) throw error; }
      else { const { error } = await supabase.from("cotisations").insert(dataToSave); if (error) throw error; }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["cotisations-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["cotisations-stats"] }); 
      toast.success("Enregistrement sauvegardé"); closeForm(); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("cotisations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["cotisations-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["cotisations-stats"] }); 
      toast.success("Cotisation supprimée"); 
    },
  });

  const closeForm = () => { setOpen(false); setEditingCotisation(null); setFormData(defaultForm()); };
  const handleEdit = (c: any) => { setEditingCotisation(c); setFormData({ ...c, montant: c.montant.toString(), notes: c.notes || "" }); setOpen(true); };

  const filtered = listData?.cotisations || [];
  const totalItems = listData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <DashboardLayout title="Cotisations" subtitle="Suivi des versements saisonniers et capitaux des membres producteurs">
      <div className="space-y-6">

        {/* Global Stats - Quantum Editorial Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <CotisationStatCard title="Capital Acquis" value={new Intl.NumberFormat('fr-FR').format(kpis.totalPaye) + " FCFA"} icon={Wallet} variant="gold" />
           <CotisationStatCard title="En attente" value={new Intl.NumberFormat('fr-FR').format(kpis.totalAttente) + " FCFA"} icon={Clock} variant="rose" />
           <CotisationStatCard title="Membres à jour" value={`${kpis.membresAJour} / ${producteurs.length || 1}`} icon={Users} variant="green" />
           <CotisationStatCard title="NB Versements" value={kpis.totalCount} icon={CreditCard} variant="blue" />
        </div>

        {/* ── Toolbar - Quantum Unified ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
           <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto shrink-0">
             <button className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20 whitespace-nowrap">
               Registre Global
             </button>
             <button className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 whitespace-nowrap transition-all">
               Par Trimestre
             </button>
           </div>
           
           <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <Input 
                placeholder="Chercher un membre, une période ou un versement..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11 text-base w-full"
              />
           </div>

           <div className="flex items-center gap-1 px-1">
              <Button onClick={() => { setFormData(defaultForm()); setOpen(true); }} className="h-10 rounded-xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-900/20 px-6 transition-all active:scale-95">
                 <Plus size={14} strokeWidth={3} />
                 Percevoir Cotisation
              </Button>
           </div>
        </div>

           
        {/* Table & Pagination Container */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 dark:bg-white/5 text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100 dark:border-[#1e2d45]">
                     <tr>
                        <th className="px-6 py-5">Membre & Période</th>
                        <th className="px-6 py-5 text-center">Date de perception</th>
                        <th className="px-6 py-5">Détails Financiers</th>
                        <th className="px-6 py-5">Statut de la Cotisation</th>
                        {isAdmin && <th className="px-6 py-5 text-right">Actions</th>}
                     </tr>
                  </thead>
                 <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement du registre...</td></tr>
                    ) : filtered.length === 0 ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500">Aucune cotisation enregistrée.</td></tr>
                    ) : (
                       filtered.map((c: any) => {
                         const cfg = statutConfig[c.statut] || statutConfig["En attente"];
                         const StatusIcon = cfg.icon;
                         return (
                            <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                               <td className="px-6 py-4">
                                  <p className="font-black text-gray-900 dark:text-gray-100">{c.producteur?.nom || "Membre Inconnu"}</p>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Saison: {c.periode}</p>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                     <Calendar size={12} />
                                     {format(new Date(c.date_paiement), "dd/MM/yyyy")}
                                  </span>
                               </td>
                               <td className="px-6 py-4">
                                  <p className="font-black text-gray-900 dark:text-gray-100">{Number(c.montant).toLocaleString()} FCFA</p>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                                     <CreditCard size={10} />
                                     {c.mode_paiement}
                                  </p>
                               </td>
                               <td className="px-6 py-4">
                                  <span className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                                    c.statut === "Payé" ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                                    c.statut === "En attente" ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                                    "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                  )}>
                                     <StatusIcon size={12} strokeWidth={3}/> {c.statut}
                                  </span>
                               </td>
                              {isAdmin && (
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                       <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="h-8 w-8 text-gray-500 hover:text-gray-900 group-hover:bg-white"><Edit size={14}/></Button>
                                       <Button variant="ghost" size="icon" onClick={() => {
                                         confirm({
                                           title: "Supprimer la cotisation",
                                           description: `Voulez-vous supprimer ce versement de "${c.producteur?.nom}" pour la période "${c.periode}" ?`,
                                           confirmLabel: "Supprimer",
                                           variant: "danger",
                                           onConfirm: () => deleteMutation.mutate(c.id),
                                         });
                                       }} className="h-8 w-8 text-rose-500 hover:bg-rose-50"><Trash2 size={14}/></Button>
                                    </div>
                                </td>
                              )}
                           </tr>
                         );
                       })
                    )}
                 </tbody>
              </table>
           </div>

             {/* Premium Pagination - Quantum Standard */}
             {totalItems > 0 && (
               <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/30 dark:bg-white/5 gap-4">
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                   Affichage de {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} cotisations
                 </div>
                 
                 <div className="flex items-center gap-1.5">
                   <Button 
                     variant="outline" 
                     size="icon"
                     onClick={() => setPage(Math.max(0, page - 1))} 
                     disabled={page === 0} 
                     className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-[#1A2E1C] hover:border-[#1A2E1C]/20 transition-all shadow-sm"
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
                     className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-[#1A2E1C] hover:border-[#1A2E1C]/20 transition-all shadow-sm"
                   >
                     <ChevronRight size={14} />
                   </Button>
                 </div>
               </div>
             )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={v => !v ? closeForm() : setOpen(true)}>
         <DialogContent className="max-w-xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <PiggyBank className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">
                     {editingCotisation ? "Réviser la cotisation" : "Percevoir une cotisation"}
                   </DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Gestion du capital social et des adhésions</p>
                 </div>
               </div>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(editingCotisation ? { ...formData, id: editingCotisation.id } : formData); }} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                   <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Producteur Membre *</Label>
                      <Select required value={formData.producteur_id} onValueChange={(v) => setFormData({...formData, producteur_id: v})}>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent className="max-h-56">
                           {producteurs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                   
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trimestre/Période *</Label>
                      <Input required value={formData.periode} onChange={(e) => setFormData({...formData, periode: e.target.value})} placeholder="2026-T1" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Montant (FCFA) *</Label>
                      <Input type="number" required value={formData.montant} onChange={(e) => setFormData({...formData, montant: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-black text-emerald-900" />
                   </div>

                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date réception *</Label>
                      <Input type="date" required value={formData.date_paiement} onChange={(e) => setFormData({...formData, date_paiement: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode de paiement *</Label>
                      <Select value={formData.mode_paiement} onValueChange={(v) => setFormData({...formData, mode_paiement: v})}>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {["Espèces", "Mobile Money", "Virement", "Chèque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="col-span-2 space-y-3 pt-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statut du prélèvement</Label>
                      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
                         {["Payé", "En attente", "En retard"].map((s) => (
                           <button
                             key={s} type="button" onClick={() => setFormData({...formData, statut: s})}
                             className={cn("flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", 
                                        formData.statut === s ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}
                           >
                             {s}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={closeForm} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button type="submit" disabled={upsertMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                    {upsertMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16}/>}
                    {editingCotisation ? "Valider la révision" : "Enregistrer le versement"}
                  </Button>
                </div>
             </form>
          </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Cotisations;
