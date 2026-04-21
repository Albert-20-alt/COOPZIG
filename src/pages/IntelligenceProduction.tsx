import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar, TrendingUp, AlertTriangle, Plus, Pencil, Trash2, Loader2, Brain, CheckCircle2
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
  const confirm = useConfirm();

  const [formData, setFormData] = useState<{ produit: string; niveaux: string[] }>({
    produit: "",
    niveaux: Array(12).fill("Faible"),
  });

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

  return (
    <DashboardLayout title="Intelligence Saisonnière" subtitle="Analyse des flux et planification de la récolte">
      <div className="space-y-6">

        {/* Global Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendrier d'Analyse Sectorielle</h1>
            <p className="text-sm text-gray-500 mt-1">Configurez le calendrier prévisionnel des différentes filières.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
            <Plus className="mr-2" size={16} /> Ajouter une Filière
          </Button>
        </div>

        {/* Analytics Top KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Fiabilité Prédictive" value="92%" icon={Brain} description="Algorithme prédictif ajusté à la saison locale" trend="+3%" />
          <StatCard title="Fenêtres Actives" value="3" icon={Calendar} description="Nombre de spéculations en pleine récolte" variant="amber" />
          <StatCard title="Déficits Anticipés" value="12%" icon={AlertTriangle} description="Chute estimée sur les agrumes au prochain quadrimestre" variant="rose" />
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
                <thead className="text-gray-500 text-xs uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium border-b border-gray-100">Filière</th>
                    {moisList.map((m) => <th key={m} className="px-2 py-3 text-center font-medium border-b border-gray-100 min-w-[32px]">{m}</th>)}
                    <th className="px-4 py-3 text-right font-medium border-b border-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr><td colSpan={14} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2 text-emerald-600" size={24} /> Chargement</td></tr>
                  ) : calendrierData.length === 0 ? (
                    <tr><td colSpan={14} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <p className="text-gray-500">Calendrier vide. Veuillez ajouter une filière ou importer le modèle public.</p>
                        <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                          {seedMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Calendar className="mr-2" size={16} />}
                          Importer le calendrier modèle
                        </Button>
                      </div>
                    </td></tr>
                  ) : calendrierData.map((row) => (
                    <tr key={row.produit} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-50">{row.produit}</td>
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
                      <td className="px-4 py-3 text-right border-l border-gray-50 whitespace-nowrap">
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
