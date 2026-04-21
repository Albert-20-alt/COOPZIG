import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Plus, Edit, Trash2, Loader2, Package, Award, 
  TrendingUp, Search, Calendar, Leaf, Droplets,
  MapPin, Gauge, Target
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const qualiteConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  Export:         { bg: "bg-emerald-50", text: "text-emerald-700", label: "Premium Export", icon: Award },
  Local:          { bg: "bg-amber-50",  text: "text-amber-700",   label: "Marché Local", icon: Leaf },
  Transformation: { bg: "bg-orange-50",    text: "text-orange-700",    label: "Transformation",    icon: Droplets },
};

interface RecolteItem {
  id: string; producteur_id: string; produit: string; qualite: string;
  quantite: number; unite: string; verger_id: string;
  date_disponibilite: string;
  producteurs: { nom: string } | null;
  vergers: { nom: string } | null;
  created_at: string;
}

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

const Recoltes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    producteur_id: "", verger_id: "", produit: "Mangue Kent",
    quantite: "", unite: "T", qualite: "Export",
    date_disponibilite: new Date().toISOString().split("T")[0]
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const [a, b] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" }),
      ]);
      return (a.data ?? false) || (b.data ?? false);
    },
    enabled: !!user,
  });

  const { data: recoltes, isLoading } = useQuery({
    queryKey: ["recoltes_declarations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recoltes").select(`*, producteurs(nom), vergers(nom)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as RecolteItem[];
    },
  });

  const { data: producteurs } = useQuery({
    queryKey: ["form_producteurs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("producteurs").select("id, nom").order("nom");
      if (error) throw error;
      return data;
    }
  });

  const { data: vergers } = useQuery({
    queryKey: ["form_vergers", formData.producteur_id],
    queryFn: async () => {
      let q = supabase.from("vergers").select("id, nom").order("nom");
      if (formData.producteur_id) q = q.eq("producteur_id", formData.producteur_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
  });

  const kpis = useMemo(() => {
    if (!recoltes) return { mois: 0, totalT: 0, pctExport: 0, nbProducteurs: 0 };
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let moisCnt = 0, totalT = 0, exportT = 0;
    const producteurIds = new Set<string>();
    recoltes.forEach(r => {
      if (r.date_disponibilite) {
        const d = new Date(r.date_disponibilite);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) moisCnt++;
      }
      const valT = r.unite === "kg" ? r.quantite / 1000 : r.quantite;
      totalT += valT;
      if (r.qualite === "Export") exportT += valT;
      producteurIds.add(r.producteur_id);
    });
    return { mois: moisCnt, totalT: Math.round(totalT * 100) / 100, pctExport: totalT > 0 ? Math.round((exportT / totalT) * 100) : 0, nbProducteurs: producteurIds.size };
  }, [recoltes]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = { producteur_id: formData.producteur_id, verger_id: formData.verger_id, produit: formData.produit, quantite: parseFloat(formData.quantite), unite: formData.unite, qualite: formData.qualite, date_disponibilite: formData.date_disponibilite };
      if (editingId) { const { error } = await supabase.from("recoltes").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await supabase.from("recoltes").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["recoltes_declarations"] }); 
      toast.success(editingId ? "Récolte modifiée" : "Récolte ajoutée"); 
      closeForm(); 
    },
    onError: (e: Error) => toast.error("Erreur: " + e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("recoltes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recoltes_declarations"] }); toast.success("Supprimé"); },
    onError: (e: Error) => toast.error("Erreur: " + e.message)
  });

  const handleEdit = (r: RecolteItem) => {
    setFormData({ producteur_id: r.producteur_id, verger_id: r.verger_id, produit: r.produit, quantite: r.quantite.toString(), unite: r.unite || "T", qualite: r.qualite || "Export", date_disponibilite: r.date_disponibilite || new Date().toISOString().split("T")[0] });
    setEditingId(r.id); setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false); setEditingId(null);
    setFormData({ producteur_id: "", verger_id: "", produit: "Mangue Kent", quantite: "", unite: "T", qualite: "Export", date_disponibilite: new Date().toISOString().split("T")[0] });
  };

  const filtered = (recoltes || []).filter(r =>
    !search || r.produit.toLowerCase().includes(search.toLowerCase()) ||
    (r.producteurs?.nom || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.vergers?.nom || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Récoltes" subtitle="Suivi des flux de production et volumes collectés">
      <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
             <h1 className="text-2xl font-bold text-gray-900">Registre des récoltes</h1>
             <p className="text-sm text-gray-500 mt-1">Gérez et déclarez les entrées de production agrégées.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpenForm(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
               <Plus className="mr-2" size={16} />
               Déclarer une récolte
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Entrées ce mois" value={kpis.mois} icon={Calendar} description="Registres validés" variant="default" />
          <StatCard title="Volume Cumulé" value={`${kpis.totalT} T`} icon={Package} description="Tonnage net" variant="gold" trend="+8.4%" />
          <StatCard title="Standard Export" value={`${kpis.pctExport}%`} icon={Award} description="Qualité Premium" variant="default" trend="Elite" />
          <StatCard title="Contributeurs" value={kpis.nbProducteurs} icon={TrendingUp} description="Actifs ce mois" variant="gold" />
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Rechercher produit, membre, verger..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-lg border-gray-200 w-full"
            />
          </div>
        </div>

        {/* Table List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
             <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Membre & Produit</th>
                    <th className="px-6 py-4">Site (Verger)</th>
                    <th className="px-6 py-4">Volume</th>
                    <th className="px-6 py-4">Qualité</th>
                    <th className="px-6 py-4">Date de dispo.</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => {
                    const qcfg = qualiteConfig[r.qualite] || { bg: "bg-gray-100", text: "text-gray-700", label: r.qualite, icon: Package };
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <span className="font-bold text-gray-900">{r.producteurs?.nom || "—"}</span>
                             <span className="text-gray-500 text-xs mt-0.5">{r.produit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin size={14} className="text-gray-400" />
                              {r.vergers?.nom || "Non lié"}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="font-bold text-gray-900 text-base">{r.quantite}</span>
                           <span className="text-gray-500 text-xs ml-1">{r.unite}</span>
                        </td>
                        <td className="px-6 py-4">
                           <Badge className={cn("px-2.5 py-1 rounded-md text-xs font-semibold border-none gap-1.5 whitespace-nowrap", qcfg.bg, qcfg.text)}>
                             {r.qualite}
                           </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                           {format(new Date(r.date_disponibilite), "dd MMM yyyy", { locale: fr })}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-end gap-2">
                               <Button size="icon" variant="ghost" onClick={() => handleEdit(r)} className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50">
                                 <Edit size={16} />
                               </Button>
                               <Button size="icon" variant="ghost" onClick={() => {
                                 confirm({
                                   title: "Supprimer le registre",
                                   description: `Voulez-vous supprimer cette déclaration de récolte (${r.produit}) ? Cette action est irréversible.`,
                                   confirmLabel: "Supprimer",
                                   variant: "danger",
                                   onConfirm: () => deleteMutation.mutate(r.id),
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
              {filtered.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <Package className="mx-auto text-gray-300 mb-3" size={48} />
                  <p>Aucune récolte enregistrée</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog - Premium Design */}
      <Dialog open={openForm} onOpenChange={v => !v ? closeForm() : setOpenForm(true)}>
        <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
           <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
             <div className="relative z-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                 <Leaf className="text-emerald-400" size={22} />
               </div>
               <div>
                 <DialogTitle className="text-xl font-bold text-white">
                    {editingId ? "Modifier la récolte" : "Déclarer une récolte"}
                 </DialogTitle>
                 <p className="text-sm text-white/50 mt-0.5">Enregistrement des flux de production agrégés</p>
               </div>
             </div>
           </div>
           
           <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(); }} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Producteur *</Label>
                  <Select required value={formData.producteur_id} onValueChange={val => setFormData(p => ({ ...p, producteur_id: val, verger_id: "" }))}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                       {producteurs?.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Verger / Site source *</Label>
                  <Select required value={formData.verger_id} onValueChange={val => setFormData(p => ({ ...p, verger_id: val }))}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                       {vergers?.map(v => <SelectItem key={v.id} value={v.id}>{v.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produit déclaré *</Label>
                  <Input required value={formData.produit} onChange={e => setFormData(p => ({ ...p, produit: e.target.value }))} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Qualité</Label>
                  <Select value={formData.qualite} onValueChange={val => setFormData(p => ({ ...p, qualite: val }))}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="Export">Premium Export</SelectItem>
                       <SelectItem value="Local">Marché Local</SelectItem>
                       <SelectItem value="Transformation">Transformation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volume collecté *</Label>
                  <div className="flex gap-2">
                    <Input required type="number" step="0.01" value={formData.quantite} onChange={e => setFormData(p => ({ ...p, quantite: e.target.value }))} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white flex-1" />
                    <Select value={formData.unite} onValueChange={val => setFormData(p => ({ ...p, unite: val }))}>
                      <SelectTrigger className="w-24 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="T">Tonne (T)</SelectItem>
                         <SelectItem value="kg">kilogramme (kg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date de disponibilité *</Label>
                  <Input required type="date" value={formData.date_disponibilite} onChange={e => setFormData(p => ({ ...p, date_disponibilite: e.target.value }))} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                </div>
              </div>
              
              <div className="pt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeForm} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                <Button type="submit" disabled={upsertMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                  {upsertMutation.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  {editingId ? "Mettre à jour le registre" : "Enregistrer la déclaration"}
                </Button>
              </div>
           </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Recoltes;
