import DashboardLayout from "@/components/DashboardLayout";
import { 
  CalendarClock, Package, TrendingUp, Plus, Loader2, Pencil, 
  Trash2, Search, MapPin, Filter, Calendar,
  ShieldCheck, CheckCircle2, Clock, AlertCircle, XCircle, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ConfirmDialog";

const statusConfig: Record<string, { cls: string; icon: any }> = {
  "Confirmée":  { cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  "En cours":   { cls: "bg-blue-50 text-blue-700", icon: Clock },
  "En attente": { cls: "bg-amber-50 text-amber-700", icon: AlertCircle },
  "Livrée":     { cls: "bg-indigo-50 text-indigo-700", icon: ShieldCheck },
  "Annulée":    { cls: "bg-rose-50 text-rose-700", icon: XCircle },
};

const moisOptions = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
].map((m) => `${m} 2026`);

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

const Precommandes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();
  const [filterStatut, setFilterStatut] = useState("all");
  const [form, setForm] = useState<any>({ 
    acheteur_id: "", client_nom: "", client_telephone: "", lieu_livraison: "", mois_souhaite: "", 
    lignes: [{ id: Date.now(), produit_nom: "", quantite: "", unite: "kg" }] 
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

  const { data: precommandes = [], isLoading } = useQuery({
    queryKey: ["precommandes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commandes").select("*").eq("est_precommande", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalVolume  = precommandes.reduce((s: number, p: any) => s + Number(p.quantite || 0), 0);
  const totalLeads   = precommandes.length;
  const enAttente    = precommandes.filter((p: any) => p.statut === "En attente").length;

  const filtered = precommandes.filter((p: any) => {
    const matchSearch = !search || p.produit_nom.toLowerCase().includes(search.toLowerCase()) || (p.lieu_livraison || "").toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "all" || p.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ["buyers"],
    queryFn: async () => {
       const { data, error } = await supabase.from("profiles").select("id, full_name, entreprise, phone, address");
       if (error) throw error;
       return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const inserts = form.lignes.map((ligne: any) => ({
        acheteur_id: form.acheteur_id === "guest" ? null : (form.acheteur_id || user?.id),
        client_nom: form.acheteur_id === "guest" ? form.client_nom : null,
        client_telephone: form.acheteur_id === "guest" ? form.client_telephone : null,
        produit_nom: ligne.produit_nom, 
        quantite: parseFloat(ligne.quantite) || 0, unite: ligne.unite, 
        mois_souhaite: form.mois_souhaite, lieu_livraison: form.lieu_livraison, 
        est_precommande: true, statut: "En attente" 
      }));
      
      const { error } = await supabase.from("commandes").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["precommandes"] }); 
      toast.success("Réservation(s) enregistrée(s)"); 
      setOpen(false); 
      setForm({ 
        acheteur_id: "", client_nom: "", client_telephone: "", lieu_livraison: "", mois_souhaite: "", 
        lignes: [{ id: Date.now(), produit_nom: "", quantite: "", unite: "kg" }] 
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(`Erreur: ${error.message || "Impossible d'enregistrer la réservation"}`);
    }
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precommandes"] }); toast.success("Statut mis à jour"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("commandes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precommandes"] }); toast.success("Réservation supprimée"); },
  });

  return (
    <DashboardLayout title="Précommandes" subtitle="Anticipation des volumes et planification saisonnière">
       <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Réservations sur récolte</h1>
            <p className="text-sm text-gray-500 mt-1">Sécurisez vos approvisionnements en enregistrant des intentions d'achat.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
              <Plus className="mr-2" size={16} />
              Nouvelle Réservation
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard title="Volume Réservé" value={`${totalVolume.toLocaleString()} ${precommandes[0]?.unite || 'kg'}`} icon={Package} description="Capacité mobilisée" variant="default" trend="Saison 2026" />
           <StatCard title="Dossiers" value={totalLeads} icon={CalendarClock} description="Intentions fermes" />
           <StatCard title="En Attente" value={enAttente} icon={Clock} description="À confirmer" variant="gold" />
           <StatCard title="Valorisation" value="—" icon={TrendingUp} description="Estimation CA futur" />
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder="Chercher variété, lieu..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 w-full border-gray-200"
              />
           </div>
           
           <div className="flex gap-2 w-full sm:w-auto">
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                 <SelectTrigger className="h-10 w-full sm:w-48 bg-white border-gray-200">
                    <SelectValue placeholder="Tous les Statuts" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">Tous les Statuts</SelectItem>
                    {Object.keys(statusConfig).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="border-gray-200"><Filter size={16}/></Button>
           </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                         <th className="px-6 py-4">Produit / Réf</th>
                         <th className="px-6 py-4">Volume Demandé</th>
                         <th className="px-6 py-4">Mois Souhaité</th>
                         <th className="px-6 py-4">Livraison</th>
                         <th className="px-6 py-4">Statut</th>
                         {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filtered.length === 0 ? (
                         <tr><td colSpan={6} className="py-12 text-center text-gray-500">Aucune réservation trouvée</td></tr>
                      ) : (
                        filtered.map((p: any) => {
                          const scfg = statusConfig[p.statut] || { cls: "bg-gray-100 text-gray-700", icon: AlertCircle };
                          const SIcon = scfg.icon;
                          return (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                               <td className="px-6 py-4">
                                  <div className="font-bold text-gray-900">{p.produit_nom}</div>
                                  <div className="text-xs text-gray-500 mt-1 uppercase">RÉF: {p.id.slice(0,8)}</div>
                               </td>
                               <td className="px-6 py-4 font-semibold text-gray-900">
                                  {Number(p.quantite).toLocaleString()} <span className="text-xs font-normal text-gray-500">{p.unite}</span>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-gray-600">
                                     <Calendar size={14} className="text-gray-400" /> {p.mois_souhaite || "—"}
                                  </div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-gray-600">
                                     <MapPin size={14} className="text-gray-400" /> {p.lieu_livraison || "Non défini"}
                                  </div>
                               </td>
                               <td className="px-6 py-4">
                                  <Badge variant="outline" className={cn("border-none gap-1 font-medium", scfg.cls)}>
                                     <SIcon size={12} /> {p.statut}
                                  </Badge>
                               </td>
                               {isAdmin && (
                                 <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                       <Select value={p.statut} onValueChange={v => updateStatut.mutate({ id: p.id, statut: v })}>
                                          <SelectTrigger className="h-8 w-32 border-gray-200 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                             {Object.keys(statusConfig).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                          </SelectContent>
                                       </Select>
                                       <Button size="icon" variant="ghost" onClick={() => {
                                          confirm({
                                            title: "Supprimer la précommande",
                                            description: `Supprimer la réservation "${p.produit_nom}" ? Cette action est irréversible.`,
                                            confirmLabel: "Oui, supprimer",
                                            variant: "danger",
                                            onConfirm: () => deleteMutation.mutate(p.id),
                                          });
                                       }} className="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={14}/></Button>
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
          </div>
        )}
      </div>

      {/* New reservation Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="max-w-2xl rounded-xl bg-white border-gray-100 p-6 shadow-lg">
             <DialogHeader className="mb-4">
               <DialogTitle className="text-xl font-bold text-gray-900">Nouvelle Réservation</DialogTitle>
             </DialogHeader>
             
             <div className="space-y-6">
                <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client (Optionnel pour admin)</Label>
                      <Select value={form.acheteur_id} onValueChange={(v) => setForm({...form, acheteur_id: v})}>
                         <SelectTrigger className="h-10 border-gray-200 bg-white"><SelectValue placeholder="Client Partenaire..." /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="guest" className="font-bold text-blue-600">Nouveau Client / Invité</SelectItem>
                            {buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.entreprise || b.full_name}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                   
                   {form.acheteur_id === "guest" && (
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label className="text-xs text-gray-500">Nom complet</Label>
                           <Input value={form.client_nom} onChange={e => setForm({...form, client_nom: e.target.value})} className="h-10 bg-white" />
                         </div>
                         <div className="space-y-2">
                           <Label className="text-xs text-gray-500">Téléphone</Label>
                           <Input value={form.client_telephone} onChange={e => setForm({...form, client_telephone: e.target.value})} className="h-10 bg-white" />
                         </div>
                      </div>
                   )}
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Période de Livraison *</Label>
                        <Select onValueChange={v => setForm({...form, mois_souhaite: v})}>
                           <SelectTrigger className="h-10 bg-white border-gray-200"><SelectValue placeholder="Choisir" /></SelectTrigger>
                           <SelectContent>
                             {moisOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lieu Livraison</Label>
                        <Input value={form.lieu_livraison} onChange={e => setForm({...form, lieu_livraison: e.target.value})} className="h-10 bg-white border-gray-200" placeholder="Ex: Port Autonome..." />
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Produits ciblés</Label>
                     <Button 
                        variant="outline" size="sm" 
                        onClick={() => setForm({ ...form, lignes: [...form.lignes, { id: Date.now(), produit_nom: "", quantite: "", unite: "kg" }]})}
                        className="text-xs font-bold h-8 text-emerald-700 bg-emerald-50 border-none hover:bg-emerald-100"
                     >
                        <Plus size={14} className="mr-1" /> Ajouter variété
                     </Button>
                   </div>
                   
                   <div className="space-y-3">
                     {form.lignes.map((ligne: any, index: number) => (
                       <div key={ligne.id} className="flex gap-3">
                         <Button 
                            variant="ghost" size="icon" 
                            onClick={() => setForm({...form, lignes: form.lignes.filter((_: any, i: number) => i !== index)})}
                            disabled={form.lignes.length === 1}
                            className="h-10 w-10 shrink-0 mt-6 text-rose-500 hover:bg-rose-50 border border-gray-100"
                         ><X size={16}/></Button>
                         
                         <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-500">Variété *</Label>
                            <Input value={ligne.produit_nom} onChange={e => {
                               const updated = [...form.lignes];
                               updated[index].produit_nom = e.target.value;
                               setForm({...form, lignes: updated});
                            }} placeholder="Ex: Mangue Kent" className="h-10 border-gray-200" />
                         </div>
                         <div className="w-24 space-y-2">
                            <Label className="text-xs text-gray-500">Volume</Label>
                            <Input type="number" value={ligne.quantite} onChange={e => {
                               const updated = [...form.lignes];
                               updated[index].quantite = e.target.value;
                               setForm({...form, lignes: updated});
                            }} className="h-10 border-gray-200" />
                         </div>
                         <div className="w-24 space-y-2">
                            <Label className="text-xs text-gray-500">Unité</Label>
                            <Select value={ligne.unite} onValueChange={(v) => {
                               const updated = [...form.lignes];
                               updated[index].unite = v;
                               setForm({...form, lignes: updated});
                            }}>
                               <SelectTrigger className="h-10 border-gray-200"><SelectValue /></SelectTrigger>
                               <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="T">T</SelectItem></SelectContent>
                            </Select>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.mois_souhaite || form.lignes.some((l:any) => !l.produit_nom)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 h-10 px-6">
                     {addMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                     Enregistrer les précommandes
                  </Button>
                </div>
             </div>
         </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Precommandes;
