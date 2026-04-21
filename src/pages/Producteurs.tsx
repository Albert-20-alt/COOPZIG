import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  MapPin, Award, Plus, Loader2, Trash2, Pencil, Search, 
  ChevronLeft, ChevronRight, Leaf, Users, ShieldCheck, Star,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Tables } from "@/integrations/supabase/types";
import { ProducteurDetailModal } from "@/components/crm/ProducteurDetailModal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Producteur = Tables<"producteurs">;
type ProducteurWithStats = Producteur & {
  recoltes: { quantite: number; date_disponibilite: string; produit: string; qualite?: string; unite?: string }[];
  stocks: { quantite_vendue: number; produit_nom: string; updated_at: string }[];
  vergers: { id: string; nom: string; localisation?: string | null; zone?: string | null; culture: string; superficie?: number | null; etat: string; estimation_rendement?: number | null }[];
  cotisations: { id: string; montant: number; statut: string; date_paiement: string; periode: string; mode_paiement?: string | null; notes?: string | null }[];
  employes_producteur: { id: string; nom_complet: string; poste: string; type_contrat: string; statut_actif?: boolean | null; telephone?: string | null; date_embauche?: string | null; created_at: string; producteur_id: string }[];
};

const cultureColors: Record<string, string> = {
  "Mangue": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Anacarde": "bg-amber-50 text-amber-700 border-amber-200",
  "Agrumes": "bg-orange-50 text-orange-700 border-orange-200",
  "Banane": "bg-blue-50 text-blue-700 border-blue-200",
};

const PAGE_SIZE = 12;

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

const Producteurs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProducteur, setSelectedProducteur] = useState<ProducteurWithStats | null>(null);
  const [editTarget, setEditTarget] = useState<Producteur | null>(null);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    nom: "", localisation: "", superficie: "", certification: "Local",
    cultures: [] as string[], telephone: "", email: "", date_adhesion: "", statut_actif: true
  });

  const [editForm, setEditForm] = useState({
    nom: "", localisation: "", superficie: "", certification: "Local",
    telephone: "", email: "", date_adhesion: "", statut_actif: true
  });

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

  const { data, isLoading } = useQuery({
    queryKey: ["producteurs", page, searchQuery],
    queryFn: async () => {
      let q = supabase
        .from("producteurs")
        .select("*, recoltes(quantite,date_disponibilite,produit,qualite,unite), stocks(quantite_vendue,produit_nom,updated_at), vergers(id,nom,localisation,zone,culture,superficie,etat,estimation_rendement), cotisations(id,montant,statut,date_paiement,periode,mode_paiement,notes), employes_producteur(id,nom_complet,poste,type_contrat,statut_actif,telephone,date_embauche,created_at,producteur_id)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchQuery) q = q.ilike("nom", `%${searchQuery}%`);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: result, error, count } = await q.range(from, to);
      
      if (error) throw error;
      return { producteurs: (result as unknown) as ProducteurWithStats[], total: count || 0 };
    },
  });

  const addProducteur = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("producteurs").insert({
        nom: formData.nom, localisation: formData.localisation,
        superficie: formData.superficie ? parseFloat(formData.superficie) : null,
        certification: formData.certification || null,
        cultures: formData.cultures.length > 0 ? formData.cultures : null,
        telephone: formData.telephone || null, email: formData.email || null,
        date_adhesion: formData.date_adhesion || null, statut_actif: formData.statut_actif,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producteurs"] });
      toast.success("Producteur ajouté avec succès");
      setOpen(false);
      setFormData({ nom: "", localisation: "", superficie: "", certification: "Local", cultures: [], telephone: "", email: "", date_adhesion: "", statut_actif: true });
    }
  });

  const editProducteur = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const { error } = await supabase.from("producteurs").update({
        nom: editForm.nom, localisation: editForm.localisation,
        superficie: editForm.superficie ? parseFloat(editForm.superficie) : null,
        certification: editForm.certification, telephone: editForm.telephone || null,
        email: editForm.email || null, date_adhesion: editForm.date_adhesion || null,
        statut_actif: editForm.statut_actif,
      }).eq("id", editTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producteurs"] });
      toast.success("Profil mis à jour");
      setEditOpen(false);
    }
  });

  const deleteProducteur = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("producteurs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producteurs"] });
      toast.success("Producteur supprimé");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) return toast.error("Le nom est requis");
    addProducteur.mutate();
  };

  const openEdit = (e: React.MouseEvent, p: Producteur) => {
    e.stopPropagation();
    setEditTarget(p);
    setEditForm({
      nom: p.nom,
      localisation: p.localisation || "",
      superficie: p.superficie?.toString() || "",
      certification: p.certification || "Local",
      telephone: p.telephone || "",
      email: p.email || "",
      date_adhesion: p.date_adhesion || "",
      statut_actif: p.statut_actif ?? true,
    });
    setEditOpen(true);
  };

  const openDetails = (p: ProducteurWithStats) => {
    setSelectedProducteur(p);
    setDetailsOpen(true);
  };

  const producteursData = data?.producteurs || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const totalSuperficie = producteursData.reduce((s, p) => s + (p.superficie || 0), 0);
  const activeMembers = producteursData.filter(p => p.statut_actif !== false).length;

  return (
    <DashboardLayout title="Producteurs" subtitle="Gestion du réseau de producteurs de la coopérative">
      <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Réseau de producteurs</h1>
            <p className="text-sm text-gray-500 mt-1">Gérez l'ensemble des membres et leurs exploitations.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
              <Plus className="mr-2" size={16} />
              Nouveau producteur
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Effectif total" value={totalItems} icon={Users} description="Membres inscrits" variant="gold" />
          <StatCard title="Producteurs Actifs" value={activeMembers} icon={ShieldCheck} description="Membres engagés" trend="+1.2%" variant="default" />
          <StatCard title="Territoire global" value={`${totalSuperficie.toFixed(0)} ha`} icon={Leaf} description="Superficie totale" variant="gold" />
          <StatCard title="Certifications" value="84%" icon={Award} description="Biologique ou GlobalGAP" variant="default" />
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <Input 
            placeholder="Rechercher un producteur par nom..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="border-none shadow-none focus-visible:ring-0 text-base"
          />
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
             <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {producteursData.map((p) => (
              <div
                key={p.id}
                onClick={() => openDetails(p)}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold text-xl">
                    {p.nom.substring(0, 2).toUpperCase()}
                  </div>
                  <Badge className={cn(
                    "border-none rounded-full px-2 py-0.5 text-xs font-semibold",
                    p.statut_actif !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {p.statut_actif !== false ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{p.nom}</h3>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                     <MapPin size={14} /> {p.localisation || "Non renseigné"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Superficie</p>
                    <p className="text-lg font-bold text-gray-900">{p.superficie || 0} <span className="text-xs font-normal text-gray-500">Ha</span></p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-right">
                    <p className="text-xs font-medium text-emerald-600/70 mb-1">Vergers</p>
                    <p className="text-lg font-bold text-emerald-700">{p.vergers?.length || 0}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {p.cultures?.slice(0, 3).map(c => (
                      <Badge key={c} variant="outline" className={cn("rounded-md px-2 py-0.5 font-medium text-xs", cultureColors[c] || "bg-gray-50 text-gray-700 border-gray-200")}>
                        {c}
                      </Badge>
                    ))}
                    {p.certification && (
                      <Badge variant="outline" className="rounded-md bg-amber-50 text-amber-700 border-amber-200 font-medium px-2 py-0.5 text-xs">
                        <Star size={10} className="mr-1 fill-amber-500 text-amber-500" /> {p.certification}
                      </Badge>
                    )}
                </div>

                {isAdmin && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                    <Button size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(e, p); }} className="h-8 w-8 bg-white border-gray-200 text-gray-600 hover:text-emerald-600"><Pencil size={14} /></Button>
                    <Button size="icon" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      confirm({
                        title: "Supprimer le producteur",
                        description: `Voulez-vous supprimer "${p.nom}" ? Cette action est irréversible et supprimera toutes ses données associées.`,
                        confirmLabel: "Supprimer",
                        variant: "danger",
                        onConfirm: () => deleteProducteur.mutate(p.id),
                      });
                    }} className="h-8 w-8 bg-white border-gray-200 text-gray-600 hover:text-red-600"><Trash2 size={14} /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 pt-6">
          <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg bg-white border-gray-200">
            <ChevronLeft size={20} />
          </Button>
          <span className="text-sm font-medium text-gray-600">
             Page {page + 1} sur {Math.max(1, totalPages)}
          </span>
          <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-lg bg-white border-gray-200">
            <ChevronRight size={20} />
          </Button>
        </div>

      </div>

      <ProducteurDetailModal producteur={selectedProducteur} open={detailsOpen} onOpenChange={setDetailsOpen} isAdmin={!!isAdmin} />

      {/* Add Dialog - Premium Design */}
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Plus className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Nouveau producteur</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Enregistrement d'un nouveau membre de la coopérative</p>
                 </div>
               </div>
             </div>
             <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom / Désignation *</Label>
                      <Input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Nom complet" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localisation</Label>
                      <Input value={formData.localisation} onChange={e => setFormData({...formData, localisation: e.target.value})} placeholder="Zone ou village" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Superficie (Ha)</Label>
                      <Input type="number" step="0.1" value={formData.superficie} onChange={e => setFormData({...formData, superficie: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Certification</Label>
                      <Select value={formData.certification} onValueChange={v => setFormData({...formData, certification: v})}>
                         <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                         <SelectContent>
                            {["Local", "Bio", "GlobalGAP", "Équitable"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button type="submit" disabled={addProducteur.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                    {addProducteur.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    Enregistrer le producteur
                  </Button>
                </div>
             </form>
          </DialogContent>
      </Dialog>

      {/* Edit Dialog - Premium Design */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
         <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Pencil className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Modifier le profil</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Mise à jour des informations du producteur</p>
                 </div>
               </div>
             </div>
             <div className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom</Label>
                      <Input value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localisation</Label>
                      <Input value={editForm.localisation} onChange={e => setEditForm({...editForm, localisation: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Téléphone</Label>
                      <Input value={editForm.telephone} onChange={e => setEditForm({...editForm, telephone: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Superficie</Label>
                      <Input type="number" step="0.1" value={editForm.superficie} onChange={e => setEditForm({...editForm, superficie: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                </div>
                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                   <div>
                     <p className="font-bold text-gray-900">Statut du producteur</p>
                     <p className="text-xs text-gray-500">Activer ou désactiver ce compte</p>
                   </div>
                   <Switch checked={editForm.statut_actif} onCheckedChange={c => setEditForm({...editForm, statut_actif: c})} />
                </div>
                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button onClick={() => editProducteur.mutate()} disabled={editProducteur.isPending} className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-8 h-11 font-bold shadow-lg shadow-black/10">
                     {editProducteur.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                     Sauvegarder
                  </Button>
                </div>
             </div>
          </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Producteurs;
