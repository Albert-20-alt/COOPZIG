import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  BookOpen, Plus, Search, Loader2, ArrowUpRight, ArrowDownRight, 
  Pencil, Trash2, CheckCircle2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CATEGORIES_ENTREES = ["Ventes / Commandes", "Cotisation Membre", "Subvention", "Apport Trésorerie", "Autre Encaissement"];
const CATEGORIES_SORTIES = ["Achat Intrants", "Frais Logistiques", "Salaires & Main d'Œuvre", "Frais Fixes (Loyer, Eau...)", "Maintenance / Réparation", "Autre Décaissement"];

const isEntree = (categorie: string) => CATEGORIES_ENTREES.includes(categorie);

const JournalStatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-5 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
        variant === "green" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : 
        variant === "rose" ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : 
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

const JournalComptable = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingEcriture, setEditingEcriture] = useState<any>(null);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;
  
  const [formType, setFormType] = useState<"Entrée" | "Sortie">("Entrée");
  const [formCategorie, setFormCategorie] = useState("");

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

  const { data: statsData } = useQuery({
    queryKey: ["ecritures-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ecritures_comptables").select("montant, categorie");
      if (error) throw error;
      let tEntrees = 0, tSorties = 0;
      (data || []).forEach((e: any) => {
        if (isEntree(e.categorie)) tEntrees += Number(e.montant); else tSorties += Number(e.montant);
      });
      return { totalEntrees: tEntrees, totalSorties: tSorties, soldeNet: tEntrees - tSorties };
    },
  });

  const { data: ecrituresData, isLoading } = useQuery({
    queryKey: ["ecritures-list", page, filterType, searchTerm],
    queryFn: async () => {
      let q = supabase.from("ecritures_comptables").select("*", { count: "exact" }).order("date_ecriture", { ascending: false });
      
      if (filterType === "entrees") {
         q = q.in("categorie", CATEGORIES_ENTREES);
      } else if (filterType === "sorties") {
         q = q.in("categorie", CATEGORIES_SORTIES);
      }
      
      if (searchTerm) {
         q = q.or(`libelle.ilike.%${searchTerm}%,categorie.ilike.%${searchTerm}%,numero_piece.ilike.%${searchTerm}%`);
      }
      
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("ecritures_comptables").insert({
        ...payload, montant: Number(payload.montant), created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["ecritures-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["ecritures-stats"] }); 
      toast.success("Écriture indexée"); setOpen(false); resetForm(); 
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { error } = await supabase.from("ecritures_comptables").update({ ...vars, montant: Number(vars.montant) }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["ecritures-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["ecritures-stats"] }); 
      toast.success("Écriture rectifiée"); setOpen(false); resetForm(); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("ecritures_comptables").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
       queryClient.invalidateQueries({ queryKey: ["ecritures-list"] }); 
       queryClient.invalidateQueries({ queryKey: ["ecritures-stats"] }); 
       toast.success("Écriture supprimée"); 
    },
  });

  const resetForm = () => {
     setEditingEcriture(null);
     setFormType("Entrée");
     setFormCategorie("");
  };

  const handleEdit = (ecriture: any) => {
     setEditingEcriture(ecriture);
     const type = isEntree(ecriture.categorie) ? "Entrée" : "Sortie";
     setFormType(type);
     setFormCategorie(ecriture.categorie);
     setOpen(true);
  };

  const { totalEntrees, totalSorties, soldeNet } = statsData || { totalEntrees: 0, totalSorties: 0, soldeNet: 0 };
  const filtered = ecrituresData?.data || [];
  const totalItems = ecrituresData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <DashboardLayout title="Grand Livre Comptable" subtitle="Historique des écritures et suivi des mouvements financiers">
      <div className="space-y-6">


        {/* Global Stats - Quantum Editorial Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <JournalStatCard title="Total Encaissements" value={`${(totalEntrees / 1000000).toFixed(2)}M FCFA`} icon={ArrowUpRight} variant="green" />
           <JournalStatCard title="Total Décaissements" value={`${(totalSorties / 1000000).toFixed(2)}M FCFA`} icon={ArrowDownRight} variant="rose" />
           <JournalStatCard title="Solde Comptable" value={`${(soldeNet / 1000000).toFixed(2)}M FCFA`} icon={BookOpen} variant="blue" />
        </div>

        {/* ── Toolbar - Quantum Unified ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
           <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto shrink-0">
             {[
               { id: "all", label: "Toutes les écritures" },
               { id: "entrees", label: "Encaissements" },
               { id: "sorties", label: "Décaissements" }
             ].map((s) => (
               <button
                 key={s.id}
                 onClick={() => { setFilterType(s.id); setPage(0); }}
                 className={cn(
                   "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                   filterType === s.id
                     ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20"
                     : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5"
                 )}
               >
                 {s.label}
               </button>
             ))}
           </div>
           
           <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <Input 
                placeholder="Chercher une écriture, une référence, un montant..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11 text-base w-full"
              />
           </div>

           <div className="flex items-center gap-1 px-1">
              <Button onClick={() => { resetForm(); setOpen(true); }} className="h-10 rounded-xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-900/20 px-6 transition-all active:scale-95">
                 <Plus size={14} strokeWidth={3} />
                 Nouvelle Écriture
              </Button>
           </div>
        </div>
           
           <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden flex flex-col">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50/50 dark:bg-white/5 text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100 dark:border-[#1e2d45]">
                      <tr>
                         <th className="px-6 py-5">Date fiscale</th>
                         <th className="px-6 py-5">Opération & Réf.</th>
                         <th className="px-6 py-5">Catégorie Analytique</th>
                         <th className="px-6 py-5 text-right">Montant</th>
                         {isAdmin && <th className="px-6 py-5 text-right">Actions</th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {isLoading ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement du livre...</td></tr>
                    ) : filtered.length === 0 ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500">Aucune écriture trouvée.</td></tr>
                    ) : (
                       filtered.map((e: any) => {
                         const entree = isEntree(e.categorie);
                         return (
                            <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                               <td className="px-6 py-4">
                                  <p className="font-bold text-gray-900 dark:text-gray-100">{format(new Date(e.date_ecriture), "dd/MM/yyyy")}</p>
                               </td>
                               <td className="px-6 py-4">
                                  <p className="font-bold text-gray-900 dark:text-gray-100">{e.libelle}</p>
                                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Réf: {e.numero_piece || "N/A"}</p>
                               </td>
                               <td className="px-6 py-4">
                                  <Badge variant="outline" className={cn(
                                     "font-bold text-[10px] uppercase tracking-wider py-1 px-3 border-none",
                                     entree ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  )}>
                                     {e.categorie}
                                  </Badge>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <span className={cn("font-black text-sm", entree ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                     {entree ? "+" : "-"}{Number(e.montant).toLocaleString()} FCFA
                                  </span>
                               </td>
                              {isAdmin && (
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                       <Button variant="ghost" size="icon" onClick={() => handleEdit(e)} className="h-8 w-8 text-gray-500 hover:text-gray-900 group-hover:bg-white"><Pencil size={14}/></Button>
                                       <Button variant="ghost" size="icon" onClick={() => {
                                         confirm({
                                           title: "Supprimer l'écriture",
                                           description: `Voulez-vous supprimer l'écriture "${e.libelle}" ? Cette action est irréversible.`,
                                           confirmLabel: "Supprimer",
                                           variant: "danger",
                                           onConfirm: () => deleteMutation.mutate(e.id),
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
                   Affichage de {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} écritures
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

      {/* Write Dialog - Premium Design */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if(!v) resetForm(); }}>
         <DialogContent className="max-w-xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <BookOpen className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">
                      {editingEcriture ? "Rectifier l'écriture" : "Nouvelle opération"}
                   </DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Saisie au grand livre comptable institutionnel</p>
                 </div>
               </div>
             </div>
             
             <form onSubmit={(e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const payload = {
                   date_ecriture: formData.get("date"), numero_piece: formData.get("numero_piece"),
                   libelle: formData.get("libelle"), montant: formData.get("montant"), categorie: formCategorie, notes: formData.get("notes") || "",
                };
                if (editingEcriture) updateMutation.mutate({ ...payload, id: editingEcriture.id });
                else addMutation.mutate(payload);
             }} className="p-8 space-y-6">

                <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
                   <button type="button" onClick={() => { setFormType("Entrée"); setFormCategorie(""); }} className={cn("flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2", formType === "Entrée" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                     <ArrowUpRight size={14} strokeWidth={3} /> Encaissement
                   </button>
                   <button type="button" onClick={() => { setFormType("Sortie"); setFormCategorie(""); }} className={cn("flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2", formType === "Sortie" ? "bg-white text-rose-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                     <ArrowDownRight size={14} strokeWidth={3} /> Décaissement
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date fiscale *</Label>
                      <Input name="date" type="date" required defaultValue={editingEcriture ? editingEcriture.date_ecriture.split('T')[0] : new Date().toISOString().split("T")[0]} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Référence pièce</Label>
                      <Input name="numero_piece" defaultValue={editingEcriture?.numero_piece} placeholder="N° de facture/reçu" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Désignation de l'opération *</Label>
                      <Input name="libelle" defaultValue={editingEcriture?.libelle} required placeholder="Ex: Livraison d'engrais organique" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catégorie *</Label>
                      <Select required value={formCategorie} onValueChange={setFormCategorie}>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Choisir la nature" /></SelectTrigger>
                        <SelectContent>
                           {(formType === "Entrée" ? CATEGORIES_ENTREES : CATEGORIES_SORTIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Montant (FCFA) *</Label>
                      <Input name="montant" type="number" defaultValue={editingEcriture?.montant} required placeholder="0" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-black text-emerald-900" />
                   </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending || !formCategorie} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                     {addMutation.isPending || updateMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                     {editingEcriture ? "Valider les modifications" : "Indexer l'opération"}
                  </Button>
                </div>
             </form>
          </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default JournalComptable;
