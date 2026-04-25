import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus, Edit, Trash2, Loader2, Package, Award,
  TrendingUp, Search, Calendar, Leaf, Droplets,
  MapPin, Gauge, Target, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp
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
  const [qualiteFilter, setQualiteFilter] = useState("tous");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
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

  // ── Calendrier production state ──────────────────────────────────────────
  const [calOpen, setCalOpen] = useState(false);
  const [calFormOpen, setCalFormOpen] = useState(false);
  const [calEditId, setCalEditId] = useState<string | null>(null);
  const [calForm, setCalForm] = useState({ produit: "", mois: "Janvier", niveau: "Faible", zone: "", annee: new Date().getFullYear().toString() });

  const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const NIVEAUX = ["Faible","Moyen","Élevé","Très élevé"];

  const { data: calendrier = [] } = useQuery({
    queryKey: ["calendrier_production"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendrier_production").select("*").order("produit").order("annee", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const calUpsert = useMutation({
    mutationFn: async () => {
      const payload = { produit: calForm.produit, mois: calForm.mois, niveau: calForm.niveau, zone: calForm.zone || null, annee: Number(calForm.annee) || null };
      if (calEditId) {
        const { error } = await supabase.from("calendrier_production").update(payload).eq("id", calEditId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("calendrier_production").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendrier_production"] });
      toast.success(calEditId ? "Entrée mise à jour" : "Entrée ajoutée");
      setCalFormOpen(false); setCalEditId(null);
      setCalForm({ produit: "", mois: "Janvier", niveau: "Faible", zone: "", annee: new Date().getFullYear().toString() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const calDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendrier_production").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calendrier_production"] }); toast.success("Supprimé"); },
  });

  const openCalEdit = (c: any) => {
    setCalForm({ produit: c.produit, mois: c.mois, niveau: c.niveau, zone: c.zone || "", annee: String(c.annee || new Date().getFullYear()) });
    setCalEditId(c.id); setCalFormOpen(true);
  };

  const niveauColor = (n: string) => {
    if (n === "Très élevé") return "bg-emerald-100 text-emerald-700";
    if (n === "Élevé") return "bg-blue-100 text-blue-700";
    if (n === "Moyen") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  };

  const handleEdit = (r: RecolteItem) => {
    setFormData({ producteur_id: r.producteur_id, verger_id: r.verger_id, produit: r.produit, quantite: r.quantite.toString(), unite: r.unite || "T", qualite: r.qualite || "Export", date_disponibilite: r.date_disponibilite || new Date().toISOString().split("T")[0] });
    setEditingId(r.id); setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false); setEditingId(null);
    setFormData({ producteur_id: "", verger_id: "", produit: "Mangue Kent", quantite: "", unite: "T", qualite: "Export", date_disponibilite: new Date().toISOString().split("T")[0] });
  };

  const filtered = (recoltes || []).filter(r => {
    const matchesSearch = !search || 
      r.produit.toLowerCase().includes(search.toLowerCase()) ||
      (r.producteurs?.nom || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.vergers?.nom || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesQualite = qualiteFilter === "tous" || r.qualite === qualiteFilter;
    
    return matchesSearch && matchesQualite;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <DashboardLayout title="Récoltes" subtitle="Suivi des flux de production et volumes collectés">
      <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131d2e] p-6 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm">
          <div>
             <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Registre des récoltes</h1>
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez et déclarez les entrées de production agrégées.</p>
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

        {/* Search & Filters - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher produit, membre, verger..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
            {[
              { id: "tous", label: "Tous" },
              { id: "Export", label: "Export" },
              { id: "Local", label: "Local" },
              { id: "Transformation", label: "Transform." }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => { setQualiteFilter(s.id); setCurrentPage(1); }}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  qualiteFilter === s.id
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
                    <th className="px-6 py-4">Membre & Produit</th>
                    <th className="px-6 py-4">Site (Verger)</th>
                    <th className="px-6 py-4">Volume</th>
                    <th className="px-6 py-4 text-center">Qualité</th>
                    <th className="px-6 py-4">Date de dispo.</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {paginatedData.map((r) => {
                    const qcfg = qualiteConfig[r.qualite] || { bg: "bg-gray-100", text: "text-gray-700", label: r.qualite, icon: Package };
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <span className="font-bold text-gray-900 dark:text-gray-100">{r.producteurs?.nom || "—"}</span>
                             <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{r.produit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin size={14} className="text-gray-400" />
                              {r.vergers?.nom || "Non lié"}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="font-bold text-gray-900 dark:text-gray-100 text-base">{r.quantite}</span>
                           <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">{r.unite}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <Badge className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border-none gap-1.5 whitespace-nowrap", qcfg.bg, qcfg.text)}>
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

            {/* Premium Quantum Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/30 dark:bg-white/5 gap-4">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                  Affichage de {(currentPage - 1) * PAGE_SIZE + 1} à {Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length} déclarations
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronLeft size={14} />
                  </Button>

                  <div className="flex items-center gap-1.5 mx-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button
                        key={pg}
                        onClick={() => setCurrentPage(pg)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                          currentPage === pg 
                            ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10" 
                            : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        )}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages} 
                    className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Calendrier de Production ───────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          {/* Header — collapsible */}
          <button
            type="button"
            onClick={() => setCalOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-emerald-600" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Calendrier de Production</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{calendrier.length} entrée(s) — Saisons et niveaux par produit</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={e => { e.stopPropagation(); setCalEditId(null); setCalForm({ produit: "", mois: "Janvier", niveau: "Faible", zone: "", annee: new Date().getFullYear().toString() }); setCalFormOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-3 text-xs font-bold"
              >
                <Plus size={13} className="mr-1" /> Ajouter
              </Button>
              {calOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>

          {/* Table */}
          {calOpen && (
            <div className="border-t border-gray-100 dark:border-[#1e2d45] overflow-x-auto">
              {calendrier.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Calendar size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucune entrée de calendrier</p>
                  <p className="text-xs text-gray-400 mt-1">Ajoutez les périodes de production pour la page publique</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase tracking-wider text-[10px] font-medium border-b border-gray-100 dark:border-white/5">
                    <tr>
                      <th className="px-6 py-3">Produit</th>
                      <th className="px-6 py-3">Mois</th>
                      <th className="px-6 py-3">Niveau</th>
                      <th className="px-6 py-3">Zone</th>
                      <th className="px-6 py-3">Année</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {calendrier.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">{c.produit}</td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{c.mois}</td>
                        <td className="px-6 py-3">
                          <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", niveauColor(c.niveau))}>
                            {c.niveau}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{c.zone || "—"}</td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{c.annee || "—"}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="icon" variant="ghost" onClick={() => openCalEdit(c)} className="h-8 w-8 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50">
                              <Edit size={14} />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => confirm({ title: "Supprimer cette entrée ?", description: `"${c.produit}" en ${c.mois}`, confirmLabel: "Supprimer", variant: "danger", onConfirm: () => calDelete.mutate(c.id) })} className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Calendrier Form Dialog */}
      <Dialog open={calFormOpen} onOpenChange={v => { if (!v) { setCalFormOpen(false); setCalEditId(null); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{calEditId ? "Modifier l'entrée" : "Ajouter au calendrier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); calUpsert.mutate(); }} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produit *</Label>
              <Input required value={calForm.produit} onChange={e => setCalForm(f => ({ ...f, produit: e.target.value }))} placeholder="ex: Mangue Kent" className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mois *</Label>
                <Select value={calForm.mois} onValueChange={v => setCalForm(f => ({ ...f, mois: v }))}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Niveau *</Label>
                <Select value={calForm.niveau} onValueChange={v => setCalForm(f => ({ ...f, niveau: v }))}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{NIVEAUX.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zone</Label>
                <Input value={calForm.zone} onChange={e => setCalForm(f => ({ ...f, zone: e.target.value }))} placeholder="ex: Bignona" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Année</Label>
                <Input type="number" value={calForm.annee} onChange={e => setCalForm(f => ({ ...f, annee: e.target.value }))} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setCalFormOpen(false); setCalEditId(null); }}>Annuler</Button>
              <Button type="submit" disabled={calUpsert.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl">
                {calUpsert.isPending && <Loader2 className="animate-spin mr-2" size={15} />}
                {calEditId ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
