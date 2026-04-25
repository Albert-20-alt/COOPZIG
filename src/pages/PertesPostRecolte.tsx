import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  AlertTriangle, TrendingDown, Target, Microscope, Plus, Loader2, 
  Trash2, MapPin, CheckCircle2, Search, Filter,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const causeColors: Record<string, string> = {
  "Transport": "#F59E0B", // Amber
  "Stockage": "#10B981",  // Emerald
  "Maturité": "#8B5CF6",  // Violet
  "Ravageurs": "#EF4444", // Red
  "Autre": "#94A3B8",     // Slate
};

const CAUSES = ["Transport", "Stockage", "Maturité", "Ravageurs", "Autre"];
const SEUIL_ALERTE = 20;

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "rose" ? "bg-rose-50 text-rose-600" :
        variant === "amber" ? "bg-amber-50 text-amber-600" :
        "bg-emerald-50 text-emerald-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
  </div>
);

const PertesPostRecolte = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();
  const [form, setForm] = useState({
    produit: "", quantite_perdue: "", quantite_initiale: "", unite: "kg", cause: "Autre", zone: "", notes: "", date_constat: new Date().toISOString().split("T")[0],
  });
  const [search, setSearch] = useState("");
  const [causeFilter, setCauseFilter] = useState<string>("tous");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

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

  const { data: producteurId } = useQuery({
    queryKey: ["myProducteurId", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("producteurs").select("id").eq("user_id", user.id).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  const { data: pertes = [], isLoading } = useQuery({
    queryKey: ["pertes_postrecolte"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pertes_postrecolte").select("*, producteurs(nom)").order("date_constat", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { totalPertes, tauxGlobal, causePrincipale, pertesParCause, pertesParMois, alertes } = useMemo(() => {
    let tPertes = 0, tProd = 0;
    const causeMap: Record<string, number> = {};
    const moisMap: Record<string, { pertes: number; production: number }> = {};
    const zoneMap: Record<string, { produit: string; zone: string; perdu: number; initial: number }> = {};

    pertes.forEach((p: any) => {
      const valPerdu = Number(p.quantite_perdue);
      const valInit = Number(p.quantite_initiale);
      tPertes += valPerdu;
      tProd += valInit;

      if (p.cause) causeMap[p.cause] = (causeMap[p.cause] || 0) + valPerdu;
      
      const mois = format(new Date(p.date_constat), "MMM", { locale: fr });
      if (!moisMap[mois]) moisMap[mois] = { pertes: 0, production: 0 };
      moisMap[mois].pertes += valPerdu;
      moisMap[mois].production += valInit;

      const zk = `${p.produit}-${p.zone || "N/A"}`;
      if (!zoneMap[zk]) zoneMap[zk] = { produit: p.produit, zone: p.zone || "N/A", perdu: 0, initial: 0 };
      zoneMap[zk].perdu += valPerdu;
      zoneMap[zk].initial += valInit;
    });

    const sortedCauses = Object.entries(causeMap).map(([cause, quantite]) => ({ cause, quantite })).sort((a, b) => b.quantite - a.quantite);
    
    return {
      totalPertes: tPertes,
      tauxGlobal: tProd > 0 ? ((tPertes / tProd) * 100).toFixed(1) : "0.0",
      causePrincipale: sortedCauses[0]?.cause ?? "Aucune",
      pertesParCause: sortedCauses,
      pertesParMois: Object.entries(moisMap).map(([mois, v]) => ({ mois, ...v })),
      alertes: Object.values(zoneMap).map(a => ({ ...a, taux: a.initial > 0 ? Math.round((a.perdu / a.initial) * 100) : 0 }))
                 .filter(a => a.taux > SEUIL_ALERTE).sort((a, b) => b.taux - a.taux)
    };
  }, [pertes]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, quantite_perdue: parseFloat(form.quantite_perdue), quantite_initiale: parseFloat(form.quantite_initiale), producteur_id: producteurId };
      const { error } = await supabase.from("pertes_postrecolte").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pertes_postrecolte"] }); toast.success("Incident enregistré"); setOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pertes_postrecolte").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pertes_postrecolte"] }); toast.success("Incident supprimé"); },
  });

  const filteredPertes = useMemo(() => {
    return pertes.filter((p: any) => {
      const matchSearch = !search || 
        p.produit.toLowerCase().includes(search.toLowerCase()) || 
        (p.zone || "").toLowerCase().includes(search.toLowerCase());
      const matchCause = causeFilter === "tous" || p.cause === causeFilter;
      return matchSearch && matchCause;
    });
  }, [pertes, search, causeFilter]);

  const totalPages = Math.ceil(filteredPertes.length / ITEMS_PER_PAGE);
  const currentItems = filteredPertes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCauseFilterChange = (val: string) => {
    setCauseFilter(val);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Contrôle Qualité & Pertes" subtitle="Suivi des dépréciations et incidents post-récolte">
      <div className="space-y-6">

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registre des Incidents</h1>
            <p className="text-sm text-gray-500 mt-1">Déclarez et analysez les pertes sur vos récoltes.</p>
          </div>
          {(isAdmin || producteurId) && (
            <Button onClick={() => setOpen(true)} className="bg-rose-600 text-white hover:bg-rose-700">
               <AlertTriangle className="mr-2" size={16} /> Nouvel Incident
            </Button>
          )}
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCard title="Volume Perdu Cumulé" value={`${(totalPertes / 1000).toFixed(1)}T`} icon={TrendingDown} variant="rose" />
           <StatCard title="Taux de Perte Global" value={`${tauxGlobal}%`} icon={Microscope} variant="amber" />
           <StatCard title="Cause Principale" value={causePrincipale} icon={Target} variant="rose" />
        </div>

        {/* Alertes Actives */}
        {alertes.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
             <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-rose-600" />
             </div>
             <div>
                <h3 className="text-sm font-bold text-rose-900">Zones en Alerte ({">"} {SEUIL_ALERTE}% pertes)</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                   {alertes.slice(0, 4).map((a, i) => (
                      <Badge key={i} variant="outline" className="bg-white border-rose-200 text-rose-700 font-medium cursor-help" title={`Produit: ${a.produit}`}>
                         {a.zone} : {a.taux}%
                      </Badge>
                   ))}
                </div>
             </div>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6 items-start">
           
           {/* Chart */}
           <div className="lg:col-span-8 bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-900">Évolution des Dépréciations</h3>
                    <p className="text-sm font-medium text-gray-500">Volume initial vs Pertes (Sur la période)</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"/> <span className="text-xs font-semibold text-gray-600">Production</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500"/> <span className="text-xs font-semibold text-gray-600">Pertes</span></div>
                 </div>
              </div>

              {pertesParMois.length > 0 ? (
                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pertesParMois} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                       <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                       <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                       />
                       <Bar dataKey="production" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                       <Bar dataKey="pertes" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                 <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">Aucune donnée disponible</div>
              )}
           </div>

           {/* Pie Chart - Causes */}
           <div className="lg:col-span-4 bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Répartition par Cause</h3>
              
              {pertesParCause.length > 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="h-[200px] w-full mb-6">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pertesParCause} dataKey="quantite" innerRadius={60} outerRadius={80} paddingAngle={5}>
                              {pertesParCause.map((c, i) => <Cell key={i} fill={causeColors[c.cause] || "#94A3B8"} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                          </PieChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-3">
                       {pertesParCause.map(c => (
                         <div key={c.cause} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                           <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: causeColors[c.cause] || "#94A3B8" }} />
                             <span className="font-medium text-gray-700">{c.cause}</span>
                           </div>
                           <span className="font-bold text-gray-900">{c.quantite.toLocaleString()} kg</span>
                         </div>
                       ))}
                    </div>
                 </div>
              ) : (
                 <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">Aucune donnée disponible</div>
              )}
           </div>
        </div>

        {/* Filters - Quantum Refinement */}
        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher par produit ou zone…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl overflow-x-auto">
            {["tous", ...CAUSES].map((c) => (
              <button
                key={c}
                onClick={() => handleCauseFilterChange(c)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  causeFilter === c
                    ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                       <th className="px-6 py-4">Date</th>
                       <th className="px-6 py-4">Produit & Zone</th>
                       <th className="px-6 py-4">Perte / Initial</th>
                       <th className="px-6 py-4">Impact</th>
                       <th className="px-6 py-4">Cause</th>
                       {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                       <tr><td colSpan={6} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement...</td></tr>
                    ) : filteredPertes.length === 0 ? (
                       <tr><td colSpan={6} className="py-12 text-center text-gray-500">Aucun incident trouvé.</td></tr>
                    ) : (
                       currentItems.map((p: any) => {
                          const taux = p.quantite_initiale > 0 ? ((p.quantite_perdue / p.quantite_initiale) * 100).toFixed(1) : "0.0";
                          const isCritical = Number(taux) > SEUIL_ALERTE;
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-6 py-4 font-medium text-gray-900">
                                  {format(new Date(p.date_constat), "dd/MM/yyyy")}
                               </td>
                               <td className="px-6 py-4">
                                  <p className="font-bold text-gray-900">{p.produit}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={10}/> {p.zone || "N/A"}</p>
                               </td>
                               <td className="px-6 py-4">
                                  <p className="font-bold text-rose-600">-{Number(p.quantite_perdue).toLocaleString()} {p.unite}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">sur {Number(p.quantite_initiale).toLocaleString()} {p.unite}</p>
                               </td>
                               <td className="px-6 py-4">
                                  <Badge variant="outline" className={cn("font-medium", isCritical ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200")}>
                                     {taux}%
                                  </Badge>
                               </td>
                               <td className="px-6 py-4 text-gray-600 font-medium">
                                  {p.cause}
                               </td>
                               {isAdmin && (
                                  <td className="px-6 py-4 text-right">
                                   <Button variant="ghost" size="icon" onClick={() => {
                                     confirm({
                                       title: "Supprimer l'incident",
                                       description: `Voulez-vous supprimer cet enregistrement de perte pour "${p.produit}" ? Cette action est irréversible.`,
                                       confirmLabel: "Supprimer",
                                       variant: "danger",
                                       onConfirm: () => deleteMutation.mutate(p.id),
                                     });
                                   }} className="h-8 w-8 text-rose-500 hover:bg-rose-50"><Trash2 size={14}/></Button>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
              Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredPertes.length)} sur {filteredPertes.length} incidents
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border-gray-100 hover:bg-gray-50 h-9 w-9"
              >
                <ChevronLeft size={14} />
              </Button>
              
              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                      currentPage === p
                        ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10"
                        : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border-gray-100 hover:bg-gray-50 h-9 w-9"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

      {/* Entry Dialog - Premium Design */}
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="max-w-xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-rose-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                   <AlertTriangle className="text-rose-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Déclarer un Incident</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Enregistrement des dépréciations et sinistres</p>
                 </div>
               </div>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                   <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produit concerné *</Label>
                      <Input required value={form.produit} onChange={(e) => setForm({ ...form, produit: e.target.value })} placeholder="Ex: Mangue Tommy Atkins" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors" />
                   </div>
                   
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date du constat *</Label>
                      <Input type="date" required value={form.date_constat} onChange={(e) => setForm({ ...form, date_constat: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zone / Site source</Label>
                      <Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="Entrepôt, Verger..." className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors" />
                   </div>

                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantité Initiale (kg) *</Label>
                      <Input type="number" required value={form.quantite_initiale} onChange={(e) => setForm({ ...form, quantite_initiale: e.target.value })} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-rose-400">Quantité Perdue (kg) *</Label>
                      <Input type="number" required value={form.quantite_perdue} onChange={(e) => setForm({ ...form, quantite_perdue: e.target.value })} className="h-11 rounded-xl border-rose-100 bg-rose-50/30 text-rose-700 focus:bg-white focus:border-rose-400 font-bold transition-all" />
                   </div>
                   
                   <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cause de la dépréciation *</Label>
                      <Select required value={form.cause} onValueChange={(v) => setForm({ ...form, cause: v })}>
                         <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                         <SelectContent>
                            {CAUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button type="submit" disabled={addMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                     {addMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                     Indexer l'Incident
                  </Button>
                </div>
             </form>
          </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PertesPostRecolte;
