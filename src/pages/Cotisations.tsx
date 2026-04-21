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

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "green" ? "bg-emerald-50 text-emerald-600" :
        variant === "gold" ? "bg-amber-50 text-amber-600" :
        "bg-blue-50 text-blue-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
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

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registre des Cotisations</h1>
            <p className="text-sm text-gray-500 mt-1">Consultez l'état d'adhésion financière de vos membres.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setFormData(defaultForm()); setOpen(true); }} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
               <Plus className="mr-2" size={16} /> Percevoir Cotisation
            </Button>
          )}
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title="Capital Acquis" value={`${(kpis.totalPaye / 1000).toFixed(0)}k FCFA`} icon={Wallet} variant="gold" />
           <StatCard title="En attente" value={`${(kpis.totalAttente / 1000).toFixed(0)}k FCFA`} icon={Clock} variant="rose" />
           <StatCard title="Membres à jour" value={`${kpis.membresAJour} / ${producteurs.length || 1}`} icon={Users} variant="green" />
           <StatCard title="NB Versements" value={kpis.totalCount} icon={CreditCard} variant="blue" />
        </div>

        {/* Filters and List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
              <div className="relative w-full max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <Input 
                   placeholder="Rechercher période..." 
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
                       <th className="px-6 py-4">Membre & Période</th>
                       <th className="px-6 py-4">Date de perception</th>
                       <th className="px-6 py-4">Facturation</th>
                       <th className="px-6 py-4">Statut</th>
                       {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
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
                           <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="font-bold text-gray-900">{c.producteur?.nom || "Inconnu"}</p>
                                 <p className="text-xs text-gray-500 mt-0.5">Période: {c.periode}</p>
                              </td>
                              <td className="px-6 py-4 text-gray-900 font-medium">
                                 {format(new Date(c.date_paiement), "dd/MM/yyyy")}
                              </td>
                              <td className="px-6 py-4">
                                 <p className="font-bold text-gray-900">{Number(c.montant).toLocaleString()} FCFA</p>
                                 <p className="text-xs text-gray-500 mt-0.5">{c.mode_paiement}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset", cfg.bg, cfg.text, cfg.ring)}>
                                    <StatusIcon size={12} strokeWidth={2.5}/> {c.statut}
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
