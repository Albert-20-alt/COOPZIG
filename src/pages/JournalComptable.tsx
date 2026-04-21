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

const StatCard = ({ title, value, icon: Icon, variant = "default", trend }: any) => (
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

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registre des Écritures</h1>
            <p className="text-sm text-gray-500 mt-1">Gérez les entrées et sorties de votre comptabilité.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setOpen(true); }} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
               <Plus className="mr-2" size={16} /> Nouvelle Écriture
            </Button>
          )}
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCard title="Total Encaissements" value={`${(totalEntrees / 1000000).toFixed(2)}M FCFA`} icon={ArrowUpRight} variant="green" />
           <StatCard title="Total Décaissements" value={`${(totalSorties / 1000000).toFixed(2)}M FCFA`} icon={ArrowDownRight} variant="rose" />
           <StatCard title="Solde Comptable" value={`${(soldeNet / 1000000).toFixed(2)}M FCFA`} icon={BookOpen} variant="blue" />
        </div>

        {/* Filters and List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
              <div className="relative w-full sm:max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <Input 
                   placeholder="Rechercher une opération..." 
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                   className="pl-9 h-10 bg-white"
                 />
              </div>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
                  <SelectValue placeholder="Toutes les opérations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les écritures</SelectItem>
                  <SelectItem value="entrees">Encaissements uniquement</SelectItem>
                  <SelectItem value="sorties">Décaissements uniquement</SelectItem>
                </SelectContent>
              </Select>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                       <th className="px-6 py-4">Date</th>
                       <th className="px-6 py-4">Opération & Réf.</th>
                       <th className="px-6 py-4">Catégorie</th>
                       <th className="px-6 py-4 text-right">Montant</th>
                       {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement du livre...</td></tr>
                    ) : filtered.length === 0 ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500">Aucune écriture trouvée.</td></tr>
                    ) : (
                       filtered.map((e: any) => {
                         const entree = isEntree(e.categorie);
                         return (
                           <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="font-semibold text-gray-900">{format(new Date(e.date_ecriture), "dd/MM/yyyy")}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <p className="font-bold text-gray-900">{e.libelle}</p>
                                 <p className="text-xs text-gray-500 mt-0.5">Réf: {e.numero_piece || "N/A"}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <Badge variant="outline" className={cn(
                                    "font-medium",
                                    entree ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                 )}>
                                    {e.categorie}
                                 </Badge>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <span className={cn("font-bold", entree ? "text-emerald-600" : "text-rose-600")}>
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
