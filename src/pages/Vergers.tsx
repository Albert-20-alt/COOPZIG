import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  MapPin, Droplets, Sun, Sprout, Plus, Loader2,
  Pencil, Trash2, Leaf, TrendingUp, Building2,
  Search, Compass, LayoutGrid, Activity, Target, ChevronLeft, ChevronRight
} from "lucide-react";
import { DashboardMap } from "@/components/DashboardMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyPermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Verger = Tables<"vergers"> & { producteurs?: { nom: string; localisation?: string } | null };

const etatConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  "Récolte":    { color: "text-orange-700",    bg: "bg-orange-50 border-orange-200",     icon: <Sun size={12} /> },
  "Floraison":  { color: "text-pink-700",      bg: "bg-pink-50 border-pink-200",       icon: <Droplets size={12} /> },
  "Maturation": { color: "text-emerald-700",   bg: "bg-emerald-50 border-emerald-200",   icon: <Leaf size={12} /> },
  "Production": { color: "text-blue-700",      bg: "bg-blue-50 border-blue-200",       icon: <Sprout size={12} /> },
  "Repos":      { color: "text-gray-600",      bg: "bg-gray-100 border-gray-200",      icon: <Sprout size={12} /> },
};

const etats = ["Repos", "Floraison", "Maturation", "Production", "Récolte"];
const defaultForm = { nom: "", culture: "", localisation: "", zone: "", superficie: "", etat: "Repos", estimation_rendement: "", producteur_id: "" };

const StatCard = ({ title, value, icon: Icon, description, trend }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
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

const VergerDetailModal = ({ verger, open, onOpenChange }: { verger: Verger | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { data: recoltes = [] } = useQuery({
    queryKey: ["recoltes-verger", verger?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recoltes").select("*").eq("verger_id", verger!.id).order("date_disponibilite", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!verger?.id && open,
  });

  if (!verger) return null;

  const cfg = etatConfig[verger.etat] || etatConfig["Repos"];
  const prodEstimee = (verger.superficie || 0) * (verger.estimation_rendement || 0);
  const totalRecolte = recoltes.reduce((s, r) => s + (r.quantite || 0), 0);

  const chartData = recoltes.reduce((acc: any[], r) => {
    if (!r.date_disponibilite) return acc;
    const month = format(new Date(r.date_disponibilite), "MMM yyyy", { locale: fr });
    const existing = acc.find(a => a.mois === month);
    if (existing) existing.quantite += r.quantite || 0;
    else acc.push({ mois: month, quantite: r.quantite || 0 });
    return acc;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] bg-white overflow-hidden flex flex-col md:flex-row h-[80vh]">
          {/* Left Panel: Summary */}
          <div className="w-full md:w-80 bg-gray-50 p-6 md:border-r border-gray-200">
             <div className="mb-6 border-b border-gray-200 pb-6">
                <Badge className={cn("px-2.5 py-1 text-xs mb-4 border", cfg.bg, cfg.color)}>
                  {cfg.icon} <span className="ml-1">{verger.etat}</span>
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{verger.nom}</h2>
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                   <Target size={16} className="text-emerald-600" /> Culture : {verger.culture}
                </div>
             </div>

             <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600"><MapPin size={18} /></div>
                 <div>
                   <p className="text-xs font-medium text-gray-500">Zone / Secteur</p>
                   <p className="text-sm font-bold text-gray-900">{verger.zone || "Non défini"}</p>
                 </div>
               </div>
               <div className="flex items-center gap-4">
                 <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600"><Building2 size={18} /></div>
                 <div>
                   <p className="text-xs font-medium text-gray-500">Localisation</p>
                   <p className="text-sm font-bold text-gray-900">{verger.localisation || "Non localisé"}</p>
                 </div>
               </div>
             </div>

             <div className="mt-8 bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">Capacité Estimée</p>
                <div className="text-3xl font-bold text-gray-900 mb-1">{prodEstimee.toFixed(0)} <span className="text-sm font-medium text-emerald-600">T</span></div>
                <p className="text-xs text-gray-400">Pour la saison complète</p>
             </div>
          </div>

          {/* Right Panel: Analytics */}
          <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Superficie Active</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-gray-900">{verger.superficie || 0}</p>
                  <p className="text-sm font-semibold text-gray-500">Ha</p>
                </div>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                <p className="text-xs font-medium text-emerald-700/70 mb-1">Volume Collecté</p>
                <div className="flex items-baseline gap-1 text-emerald-700">
                  <p className="text-3xl font-bold">{totalRecolte.toFixed(1)}</p>
                  <p className="text-sm font-semibold">T</p>
                </div>
              </div>
            </div>

            <div>
               <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Rendement de récolte</h3>
               <div className="h-[250px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorQuantite" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }} />
                        <Area type="monotone" dataKey="quantite" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorQuantite)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium border border-dashed border-gray-200 rounded-xl">Aucune donnée de récolte</div>
                  )}
               </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Dernières Activités</h3>
              <div className="space-y-3">
                {recoltes.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900 text-sm mb-1">{r.date_disponibilite ? format(new Date(r.date_disponibilite), "dd MMMM yyyy", { locale: fr }) : "Date inconnue"}</p>
                      <p className="text-xs text-gray-500">Qualité : {r.qualite || "Standard"}</p>
                    </div>
                    <div className="font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                       {r.quantite} T
                    </div>
                  </div>
                ))}
                {recoltes.length === 0 && <div className="text-center text-gray-500 text-sm py-4">Historique vide</div>}
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
};

const Vergers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVerger, setSelectedVerger] = useState<Verger | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Verger | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const [filterEtat, setFilterEtat] = useState("all");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 12; // cards per page (grid of 3)

  const { canWrite } = useMyPermissions();
  const canEdit = canWrite("vergers");

  const { data: vergersStats = [] } = useQuery({
    queryKey: ["vergers-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vergers").select("superficie, etat");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vergersData, isLoading } = useQuery({
    queryKey: ["vergers-list", page, search, filterEtat],
    queryFn: async () => {
      let q = supabase.from("vergers").select("*, producteurs(nom, localisation)", { count: "exact" }).order("created_at", { ascending: false });
      if (search) {
        q = q.or(`nom.ilike.%${search}%,culture.ilike.%${search}%`);
      }
      if (filterEtat !== "all") {
        q = q.eq("etat", filterEtat);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { vergers: data as Verger[], total: count || 0 };
    },
  });

  const { data: producteurs = [] } = useQuery({
    queryKey: ["producteurs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("producteurs").select("id, nom").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const addVerger = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vergers").insert({
        nom: formData.nom, culture: formData.culture, localisation: formData.localisation || null,
        zone: formData.zone || null, superficie: formData.superficie ? parseFloat(formData.superficie) : null,
        etat: formData.etat, estimation_rendement: formData.estimation_rendement ? parseFloat(formData.estimation_rendement) : null,
        producteur_id: formData.producteur_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vergers-list"] });
      queryClient.invalidateQueries({ queryKey: ["vergers-stats"] });
      toast.success("Verger enregistré avec succès");
      setOpen(false);
      setFormData(defaultForm);
    }
  });

  const updateVerger = useMutation({
    mutationFn: async (vars: any) => {
      const { error } = await supabase.from("vergers").update({
        nom: vars.nom, culture: vars.culture, localisation: vars.localisation || null,
        zone: vars.zone || null, superficie: vars.superficie ? Number(vars.superficie) : null,
        etat: vars.etat, estimation_rendement: vars.estimation_rendement ? Number(vars.estimation_rendement) : null,
        producteur_id: vars.producteur_id,
      }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vergers-list"] });
      queryClient.invalidateQueries({ queryKey: ["vergers-stats"] });
      toast.success("Verger mis à jour");
      setOpenEdit(false);
    }
  });

  const deleteVerger = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("vergers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vergers-list"] }); queryClient.invalidateQueries({ queryKey: ["vergers-stats"] }); toast.success("Actif retiré du registre"); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.culture || !formData.producteur_id) return toast.error("Informations incomplètes");
    addVerger.mutate();
  };

  const filtered = vergersData?.vergers || [];
  const totalItems = vergersData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const stats = {
    total: vergersStats.length,
    superficie: vergersStats.reduce((s: number, v: any) => s + (v.superficie || 0), 0),
    enProd: vergersStats.filter((v: any) => v.etat === "Production" || v.etat === "Récolte").length
  };

  return (
    <DashboardLayout title="Vergers" subtitle="Gestion des actifs agricoles et du cycle de production">
      <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131d2e] p-6 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patrimoine végétal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Le réseau totalise {stats.superficie.toFixed(1)} ha sous supervision active.</p>
          </div>
          {canEdit && (
            <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
              <Plus className="mr-2" size={16} />
              Nouveau verger
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Unités Actives" value={stats.total} icon={Sprout} description="Maillage opérationnel" />
          <StatCard title="Surface Totale" value={`${stats.superficie.toFixed(1)} Ha`} icon={Leaf} trend="+2.4%" />
          <StatCard title="Cycles Actifs" value={stats.enProd} icon={Activity} description="Production ou récolte" />
          <StatCard title="Flux Estimé" value={`${(stats.superficie * 10).toFixed(0)} T`} icon={Target} description="Projection massique" />
        </div>

        {/* Search & Filters - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher par nom, culture..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 p-1">
            <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto max-w-[500px]">
              {[
                { id: "all", label: "Tous" },
                ...etats.map(e => ({ id: e, label: e }))
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setFilterEtat(s.id); setPage(0); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    filterEtat === s.id
                      ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-gray-100 dark:bg-white/10 mx-1 hidden sm:block" />

            <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl">
               <Button 
                 size="icon" 
                 variant="ghost" 
                 onClick={() => setView("grid")} 
                 className={cn("h-9 w-9 rounded-lg transition-all", view === "grid" ? "bg-white dark:bg-white/10 text-emerald-600 shadow-sm" : "text-gray-400")}
               >
                 <LayoutGrid size={16} />
               </Button>
               <Button 
                 size="icon" 
                 variant="ghost" 
                 onClick={() => setView("map")} 
                 className={cn("h-9 w-9 rounded-lg transition-all", view === "map" ? "bg-white dark:bg-white/10 text-emerald-600 shadow-sm" : "text-gray-400")}
               >
                 <Compass size={16} />
               </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
             <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : view === "map" ? (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm h-[600px] relative bg-white p-2">
             <DashboardMap vergers={filtered} />
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((v) => {
              const cfg = etatConfig[v.etat] || etatConfig["Repos"];
              const prod = (v.superficie || 0) * (v.estimation_rendement || 0);
              return (
                <div
                  key={v.id}
                  onClick={() => { setSelectedDetail(v); setDetailOpen(true); }}
                  className="bg-white dark:bg-[#131d2e] border border-gray-100 dark:border-[#1e2d45] rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-100">
                      <Sprout size={20} />
                    </div>
                    <Badge className={cn("rounded-md px-2 py-0.5 text-xs font-semibold border flex gap-1 items-center", cfg.bg, cfg.color)}>
                      {cfg.icon} {v.etat}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{v.nom}</h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{v.producteurs?.nom || "Indépendant"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                       <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Superficie</p>
                       <p className="text-base font-bold text-gray-900 dark:text-gray-100">{v.superficie || 0} <span className="text-xs font-normal">Ha</span></p>
                     </div>
                     <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                       <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rendement</p>
                       <p className="text-base font-bold text-gray-900 dark:text-gray-100">{v.estimation_rendement || 0} <span className="text-xs font-normal">T/Ha</span></p>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                     <Badge variant="outline" className="rounded-md bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium px-2 py-0.5 text-xs">🌿 {v.culture}</Badge>
                     {v.zone && <Badge variant="outline" className="rounded-md bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium px-2 py-0.5 text-xs">📍 {v.zone}</Badge>}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                     <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Flux de récolte estimé</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{prod.toFixed(0)} <span className="text-sm font-medium">T</span></p>
                     </div>
                     {canEdit && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedVerger(v); setFormData({ ...defaultForm, nom: v.nom, culture: v.culture, producteur_id: v.producteur_id || "", localisation: v.localisation || "", zone: v.zone || "", superficie: v.superficie?.toString() || "", etat: v.etat, estimation_rendement: v.estimation_rendement?.toString() || "" }); setOpenEdit(true); }} className="h-8 w-8 bg-white border-gray-200 text-gray-600 hover:text-emerald-600"><Pencil size={14} /></Button>
                      <Button size="icon" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        confirm({
                          title: "Supprimer le verger",
                          description: `Voulez-vous supprimer "${v.nom}" ? Toutes les données associées seront perdues.`,
                          confirmLabel: "Supprimer",
                          variant: "danger",
                          onConfirm: () => deleteVerger.mutate(v.id),
                        });
                      }} className="h-8 w-8 bg-white border-gray-200 text-gray-600 hover:text-red-600"><Trash2 size={14} /></Button>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && !isLoading && (
              <div className="col-span-3 py-20 text-center text-gray-500">
                <Sprout className="mx-auto text-gray-300 mb-3" size={48} />
                <p>Aucun verger trouvé</p>
              </div>
            )}
          </div>

          {/* Premium Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/30 dark:bg-white/5 gap-4 mt-8 rounded-2xl border">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                Affichage de {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} vergers
              </div>
              
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setPage(Math.max(0, page - 1))} 
                  disabled={page === 0} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
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
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
          </>
        )}

      </div>

      <VergerDetailModal verger={selectedDetail} open={detailOpen} onOpenChange={setDetailOpen} />

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
                 <DialogTitle className="text-xl font-bold text-white">Nouveau verger</DialogTitle>
                 <p className="text-sm text-white/50 mt-0.5">Enregistrement d'un nouvel actif agricole</p>
               </div>
             </div>
           </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
             <div className="grid grid-cols-2 gap-x-6 gap-y-4">
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Producteur *</Label>
                 <Select value={formData.producteur_id} onValueChange={(v) => setFormData({ ...formData, producteur_id: v })}>
                   <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                   <SelectContent>
                      {producteurs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom du verger *</Label>
                 <Input value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Matrice Est" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spéculation (Culture) *</Label>
                 <Input value={formData.culture} onChange={e => setFormData({...formData, culture: e.target.value})} placeholder="Ex: Mangue Kent" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cycle Actuel</Label>
                 <Select value={formData.etat} onValueChange={v => setFormData({...formData, etat: v})}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {etats.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Superficie (Ha)</Label>
                 <Input type="number" step="0.1" value={formData.superficie} onChange={e => setFormData({...formData, superficie: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rendement estimé (T/Ha)</Label>
                 <Input type="number" step="0.1" value={formData.estimation_rendement} onChange={e => setFormData({...formData, estimation_rendement: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zone</Label>
                 <Input value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localisation</Label>
                 <Input value={formData.localisation} onChange={e => setFormData({...formData, localisation: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
             </div>
             <div className="pt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                <Button type="submit" disabled={addVerger.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                   {addVerger.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null }
                   Enregistrer le verger
                </Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog - Premium Design */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
           <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
             <div className="relative z-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                 <Pencil className="text-emerald-400" size={22} />
               </div>
               <div>
                 <DialogTitle className="text-xl font-bold text-white">Modifier le verger</DialogTitle>
                 <p className="text-sm text-white/50 mt-0.5">Mise à jour des informations d'actif</p>
               </div>
             </div>
           </div>
          <form onSubmit={(e) => { e.preventDefault(); updateVerger.mutate({...formData, id: selectedVerger?.id}); }} className="p-8 space-y-5">
             <div className="grid grid-cols-2 gap-x-6 gap-y-4">
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Producteur *</Label>
                 <Select value={formData.producteur_id} onValueChange={(v) => setFormData({ ...formData, producteur_id: v })}>
                   <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                   <SelectContent>
                      {producteurs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom du verger *</Label>
                 <Input value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spéculation (Culture) *</Label>
                 <Input value={formData.culture} onChange={e => setFormData({...formData, culture: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cycle Actuel</Label>
                 <Select value={formData.etat} onValueChange={v => setFormData({...formData, etat: v})}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {etats.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Superficie (Ha)</Label>
                 <Input type="number" step="0.1" value={formData.superficie} onChange={e => setFormData({...formData, superficie: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rendement estimé (T/Ha)</Label>
                 <Input type="number" step="0.1" value={formData.estimation_rendement} onChange={e => setFormData({...formData, estimation_rendement: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zone</Label>
                 <Input value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localisation</Label>
                 <Input value={formData.localisation} onChange={e => setFormData({...formData, localisation: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
               </div>
             </div>
             <div className="pt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpenEdit(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                <Button type="submit" disabled={updateVerger.isPending} className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-8 h-11 font-bold shadow-lg shadow-black/10">
                   {updateVerger.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null }
                   Sauvegarder
                </Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Vergers;
