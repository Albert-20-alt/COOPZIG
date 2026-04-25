import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar, TrendingUp, AlertTriangle, Plus, Pencil, Trash2, Loader2, Brain, CheckCircle2,
  ChevronLeft, ChevronRight, Search
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

const moisList = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const niveauConfig: Record<string, { bg: string; dot: string; label: string }> = {
  Fort:   { bg: "bg-[#1A2E1C]/15 border-[#1A2E1C]/25", dot: "bg-[#1A2E1C] shadow-sm", label: "Pleine Saison" },
  Moyen:  { bg: "bg-[#E68A00]/12 border-[#E68A00]/20", dot: "bg-[#E68A00]", label: "Disponibilité" },
  Faible: { bg: "bg-gray-100 border-gray-200", dot: "bg-gray-300", label: "Hors Saison" },
};

const previsions = [
  { produit: "Mangue", tendance: "Abondance prévue Avr-Jun", icon: Brain, color: "text-emerald-600 bg-emerald-50" },
  { produit: "Anacarde", tendance: "Pic de production Mar-Mai", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
  { produit: "Agrumes", tendance: "Baisse anticipée Avr-Aoû", icon: AlertTriangle, color: "text-rose-600 bg-rose-50" },
];

const StatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "amber" ? "bg-amber-50 text-amber-600" :
        variant === "rose" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          variant === "rose" ? "bg-rose-50 text-rose-600" : "text-emerald-600 bg-emerald-50"
        )}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

const IntelligenceProduction = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduit, setEditingProduit] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const confirm = useConfirm();

  const [formData, setFormData] = useState<{ produit: string; niveaux: string[] }>({
    produit: "",
    niveaux: Array(12).fill("Faible"),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: calendrierData = [], isLoading } = useQuery({
    queryKey: ["calendrier-production"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendrier_production").select("*").order("produit");
      if (error) throw error;
      const grouped = data.reduce<Record<string, string[]>>((acc, row) => {
        if (!row.produit) return acc;
        if (!acc[row.produit]) acc[row.produit] = Array(12).fill("Faible");
        if (!row.mois) return acc;
        const moisIndex = moisList.findIndex(m => m && row.mois.toLowerCase().startsWith(m.toLowerCase().replace("é", "e").replace("û", "u")));
        if (moisIndex >= 0) acc[row.produit][moisIndex] = row.niveau || "Faible";
        return acc;
      }, {});
      return Object.entries(grouped).map(([produit, niveaux]) => ({ produit, niveaux }));
    }
  });

  const handleOpenDialog = (row?: { produit: string; niveaux: string[] }) => {
    if (row) {
      setEditingProduit(row.produit);
      setFormData({ produit: row.produit, niveaux: [...row.niveaux] });
    } else {
      setEditingProduit(null);
      setFormData({ produit: "", niveaux: Array(12).fill("Faible") });
    }
    setIsDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.produit.trim()) throw new Error("Nom requis");
      if (editingProduit) await supabase.from("calendrier_production").delete().eq("produit", editingProduit);
      const rows = data.niveaux.map((niveau, index) => ({ produit: data.produit.trim(), mois: moisList[index], niveau }));
      const { error } = await supabase.from("calendrier_production").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendrier-production"] });
      queryClient.invalidateQueries({ queryKey: ["calendrier-public"] });
      toast.success("Calendrier mis à jour");
      setIsDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (produit: string) => {
      const { error } = await supabase.from("calendrier_production").delete().eq("produit", produit);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendrier-production"] });
      queryClient.invalidateQueries({ queryKey: ["calendrier-public"] });
      toast.success("Produit retiré du calendrier");
    }
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const fallbackCalendar = [
        { produit: "Mangue Kent", niveaux: ["Faible", "Faible", "Moyen", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible"] },
        { produit: "Mangue Keitt", niveaux: ["Faible", "Faible", "Faible", "Faible", "Faible", "Moyen", "Fort", "Fort", "Fort", "Fort", "Faible", "Faible"] },
        { produit: "Mangue Amélie", niveaux: ["Faible", "Faible", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
        { produit: "Mangue Diorou", niveaux: ["Faible", "Faible", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
        { produit: "Mangue Bouko.", niveaux: ["Faible", "Faible", "Faible", "Moyen", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible"] },
        { produit: "Anacarde", niveaux: ["Faible", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
        { produit: "Miel", niveaux: ["Faible", "Faible", "Faible", "Moyen", "Fort", "Fort", "Faible", "Faible", "Faible", "Moyen", "Fort", "Faible"] },
        { produit: "Agrumes", niveaux: ["Fort", "Fort", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Fort", "Fort", "Fort"] },
        { produit: "Huile de Palme", niveaux: ["Faible", "Moyen", "Fort", "Fort", "Fort", "Moyen", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible"] },
        { produit: "Papaye", niveaux: ["Moyen", "Moyen", "Moyen", "Fort", "Fort", "Fort", "Moyen", "Moyen", "Moyen", "Moyen", "Moyen", "Moyen"] },
        { produit: "Ditakh", niveaux: ["Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Fort", "Fort", "Moyen", "Faible", "Faible"] },
        { produit: "Riz (Récolte)", niveaux: ["Fort", "Fort", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Faible", "Fort"] },
      ];
      await supabase.from("calendrier_production").delete().neq("id", "placeholder");
      const rows: any[] = [];
      for (const item of fallbackCalendar) {
        for (let i = 0; i < 12; i++) {
          rows.push({ produit: item.produit, mois: moisList[i], niveau: item.niveaux[i] });
        }
      }
      const { error } = await supabase.from("calendrier_production").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendrier-production"] });
      queryClient.invalidateQueries({ queryKey: ["calendrier-public"] });
      toast.success("Calendrier officiel importé et publié !");
    },
    onError: (e: any) => {
      console.error("Seed error:", e);
      toast.error(`Erreur d'importation : ${e.message}`);
    }
  });

  const filteredData = calendrierData.filter(row => {
    const matchesSearch = row.produit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || row.niveaux.some(n => n === activeFilter);
    return matchesSearch && matchesFilter;
  });

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedData = filteredData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <DashboardLayout title="Intelligence Saisonnière" subtitle="Analyse des flux et planification de la récolte">
      <div className="space-y-6">

        {/* ── Header - Quantum Standard ────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-white dark:bg-[#131d2e] p-8 rounded-[2.5rem] border border-black/[0.03] dark:border-[#1e2d45] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-[#1A2E1C] flex items-center justify-center shadow-2xl shadow-emerald-900/20">
              <Calendar className="text-emerald-400" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none">Intelligence Saisonnière</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-1.5 flex items-center gap-2">
                <Brain size={14} className="text-emerald-500" />
                Analyse des flux et planification stratégique de la récolte
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Button 
              onClick={() => handleOpenDialog()} 
              className="h-12 px-8 rounded-2xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-xl shadow-emerald-900/10 font-bold transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="mr-2" size={18} />
              Ajouter une Filière
            </Button>
          </div>
        </div>

        {/* Analytics Top KPI - Quantum Standard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Fiabilité Prédictive" value="92%" icon={Brain} description="Algorithme prédictif ajusté à la saison locale" trend="+3%" />
          <StatCard title="Fenêtres Actives" value="3" icon={Calendar} description="Nombre de spéculations en pleine récolte" variant="amber" />
          <StatCard title="Déficits Anticipés" value="12%" icon={AlertTriangle} description="Chute estimée sur les agrumes au prochain quadrimestre" variant="rose" />
        </div>

        {/* ── Toolbar - Quantum Unified ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
           <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <Input 
                placeholder="Rechercher une filière ou un produit..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-12 text-base"
              />
           </div>
           
           <div className="flex flex-wrap items-center gap-2 p-1">
              <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto max-w-[800px]">
                {[
                  { id: "all", label: "Toutes" },
                  { id: "Fort", label: "Pleine Saison" },
                  { id: "Moyen", label: "Disponibilité" },
                  { id: "Faible", label: "Hors Saison" }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveFilter(s.id); setPage(0); }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      activeFilter === s.id
                        ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline / Calendar Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                Planification Annuelle
              </h2>
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#1A2E1C]"></span> Fort</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#E68A00]"></span> Moyen</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Faible</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-black/[0.03] dark:border-white/5">
                  <tr>
                    <th className="px-8 py-5">Filière</th>
                    {moisList.map((m) => <th key={m} className="px-2 py-5 text-center min-w-[32px]">{m}</th>)}
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr><td colSpan={14} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2 text-emerald-600" size={24} /> Chargement</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={14} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-2">
                           <Search className="text-gray-300" size={32} />
                        </div>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Aucun résultat trouvé</p>
                        <Button onClick={() => { setSearchQuery(""); setActiveFilter("all"); }} variant="ghost" className="text-emerald-600 font-bold text-xs uppercase tracking-widest">
                           Réinitialiser les filtres
                        </Button>
                      </div>
                    </td></tr>
                  ) : paginatedData.map((row) => (
                    <tr key={row.produit} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/[0.02] transition-all duration-300 group">
                      <td className="px-8 py-6 font-black text-gray-900 dark:text-gray-100 text-base tracking-tight">{row.produit}</td>
                      {row.niveaux.map((niveau, idx) => {
                        const config = niveauConfig[niveau] || niveauConfig["Faible"];
                        return (
                          <td key={idx} className="p-2 text-center">
                            <div className="flex justify-center" title={config.label}>
                              <span className={`inline-flex w-9 h-9 rounded-xl items-center justify-center border ${config.bg} transition-all duration-300`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${config.dot} transition-all`} />
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-8 py-6 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-900" onClick={() => handleOpenDialog(row)}><Pencil size={14} /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => {
                          confirm({
                            title: "Supprimer la filière",
                            description: `Voulez-vous retirer "${row.produit}" du calendrier de production ?`,
                            confirmLabel: "Retirer",
                            variant: "danger",
                            onConfirm: () => deleteMutation.mutate(row.produit),
                          });
                        }}><Trash2 size={14} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Premium Pagination */}
            {totalItems > PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white border-t border-gray-100 gap-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Index {page * PAGE_SIZE + 1} – {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} filières
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPage(Math.max(0, page - 1))} 
                    disabled={page === 0} 
                    className="h-9 w-9 rounded-xl border-gray-100 bg-white text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => (
                      <Button
                        key={i}
                        variant={page === i ? "default" : "outline"}
                        onClick={() => setPage(i)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                          page === i 
                            ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20" 
                            : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        {i + 1}
                      </Button>
                    ))
                  ) : (
                    <>
                      {[0, 1, 2].map(i => (
                        <Button
                          key={i}
                          variant={page === i ? "default" : "outline"}
                          onClick={() => setPage(i)}
                          className={cn(
                            "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                            page === i 
                              ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20" 
                              : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <span className="px-1 text-gray-300">...</span>
                      <Button
                        variant={page === totalPages - 1 ? "default" : "outline"}
                        onClick={() => setPage(totalPages - 1)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                          page === totalPages - 1 
                            ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20" 
                            : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))} 
                    disabled={page >= totalPages - 1} 
                    className="h-9 w-9 rounded-xl border-gray-100 bg-white text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Insights Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Brain size={18} className="text-gray-400" />
                AI Insights
              </h2>
            </div>
            <div className="p-6 flex-1 space-y-6">
              {previsions.map((prev, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className={cn("p-2.5 rounded-lg shrink-0", prev.color)}>
                    <prev.icon size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-none mb-1">{prev.produit}</p>
                    <p className="text-sm text-gray-500">{prev.tendance}</p>
                  </div>
                </div>
              ))}
              <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="font-bold text-emerald-900 text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Recommandation
                </p>
                <p className="text-sm text-emerald-800/80 leading-relaxed">
                  Anticipez les flux logistiques sur la Mangue dès Mars pour éviter un goulot d'étranglement à Ziguinchor. Les indicateurs sont à la hausse.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
          <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Brain className="text-emerald-400" size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {editingProduit ? "Configurer la filière" : "Ajouter une filière"}
                </DialogTitle>
                <p className="text-sm text-white/50 mt-0.5">Paramétrage des cycles de production sectoriels</p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom de la Spéculation *</Label>
              <Input
                value={formData.produit}
                onChange={(e) => setFormData(old => ({ ...old, produit: e.target.value }))}
                placeholder="Spéculation agricole..."
                className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cycles de disponibilité mensuelle</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {moisList.map((mois, index) => (
                  <div key={mois} className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{mois}</Label>
                    <Select
                      value={formData.niveaux[index]}
                      onValueChange={(val) => {
                        const newNiveaux = [...formData.niveaux];
                        newNiveaux[index] = val;
                        setFormData(old => ({ ...old, niveaux: newNiveaux }));
                      }}
                    >
                      <SelectTrigger className="h-9 px-2 text-[10px] font-bold rounded-lg bg-gray-50 border-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Faible">Faible</SelectItem>
                        <SelectItem value="Moyen">Moyen</SelectItem>
                        <SelectItem value="Fort">Fort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
              <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(formData)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                {updateMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Enregistrer les cycles
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default IntelligenceProduction;
