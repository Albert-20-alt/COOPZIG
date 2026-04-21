import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Loader2,
  Search, Trash2, MapPin, CheckCircle2, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PRODUITS = ["Anacarde", "Mangue", "Citron", "Maïs", "Riz", "Arachide", "Soja"];
const MARCHES = ["Ziguinchor", "Bignona", "Oussouye", "Goudomp", "Sédhiou", "Kolda"];

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "green" ? "bg-emerald-50 text-emerald-600" :
        variant === "amber" ? "bg-amber-50 text-amber-600" :
        variant === "blue" ? "bg-blue-50 text-blue-600" :
        "bg-gray-50 text-gray-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
  </div>
);

const PrixMarche = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();
  
  const { data: prix = [], isLoading } = useQuery({
    queryKey: ["prix_marche"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prix_marche")
        .select("*")
        .order("date_releve", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const analytics = useMemo(() => {
    if (prix.length === 0) return { avg: 0, min: 0, max: 0, count: 0, trend: 0 };
    const avg = prix.reduce((s: number, p: any) => s + Number(p.prix), 0) / prix.length;
    const sorted = [...prix].map(p => Number(p.prix)).sort((a, b) => a - b);
    return { avg: Math.round(avg), min: sorted[0], max: sorted[sorted.length - 1] };
  }, [prix]);

  const trendsData = useMemo(() => {
    const dataByDate: Record<string, number> = {};
    [...prix].reverse().forEach((p: any) => {
      const date = format(new Date(p.date_releve), "dd MMM", { locale: fr });
      dataByDate[date] = Number(p.prix);
    });
    return Object.entries(dataByDate).map(([date, p]) => ({ date, prix: p }));
  }, [prix]);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("prix_marche").insert({
        produit: formData.get("produit"),
        marche: formData.get("marche"),
        prix: parseFloat(formData.get("prix") as string),
        unite_prix: formData.get("unite_prix") || "CFA/kg",
        source: formData.get("source"),
        date_releve: formData.get("date_releve"),
        tendance: formData.get("tendance") || "stable",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix_marche"] });
      toast.success("Cours enregistré");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prix_marche").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix_marche"] });
      toast.success("Supprimé");
    },
  });

  const filteredPrix = prix.filter((p: any) => 
    !search || 
    p.produit.toLowerCase().includes(search.toLowerCase()) || 
    p.marche.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Prix du Marché" subtitle="Suivi des cotations locales et internationales">
      <div className="space-y-6">

        {/* Header Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Observatoire des Prix</h1>
            <p className="text-sm text-gray-500 mt-1">Consultez et ajoutez de nouvelles cotations.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
             <Plus className="mr-2" size={16} /> Nouveau Relevé
          </Button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title="Moyenne Générale" value={`${analytics.avg} CFA`} icon={DollarSign} variant="amber" />
           <StatCard title="Point Bas" value={`${analytics.min} CFA`} icon={TrendingDown} />
           <StatCard title="Point Haut" value={`${analytics.max} CFA`} icon={TrendingUp} variant="green" />
           <StatCard title="Marchés Suivis" value={MARCHES.length} icon={Globe} variant="blue" />
        </div>

        {/* Chart */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 mb-6">Évolution Moyenne des Cours</h3>
           <div className="h-[300px] w-full">
             {trendsData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorPrix" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area type="monotone" dataKey="prix" stroke="#10B981" strokeWidth={3} fill="url(#colorPrix)" />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-500 font-medium">Aucune donnée</div>
             )}
           </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
              <div className="relative w-full max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <Input 
                   placeholder="Rechercher produit ou marché..." 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="pl-9 h-10 bg-white"
                 />
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                       <th className="px-6 py-4">Date</th>
                       <th className="px-6 py-4">Produit</th>
                       <th className="px-6 py-4">Marché</th>
                       <th className="px-6 py-4 text-right">Prix</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement...</td></tr>
                    ) : filteredPrix.length === 0 ? (
                       <tr><td colSpan={5} className="py-12 text-center text-gray-500">Aucun relevé trouvé.</td></tr>
                    ) : (
                       filteredPrix.map((p: any) => (
                         <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="font-medium text-gray-900">{format(new Date(p.date_releve), "dd/MM/yyyy")}</p>
                            </td>
                            <td className="px-6 py-4">
                               <p className="font-bold text-gray-900">{p.produit}</p>
                            </td>
                            <td className="px-6 py-4 flex items-center gap-1.5 text-gray-600">
                               <MapPin size={12} /> {p.marche}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className="font-bold text-gray-900">{Number(p.prix).toLocaleString()} FCFA</span>
                               <span className="text-xs text-gray-500 ml-1">/ {p.unite_prix || "CFA/kg"}</span>
                            </td>
                             <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  confirm({
                                    title: "Supprimer l'index",
                                    description: `Voulez-vous supprimer ce relevé de prix pour "${p.produit}" à "${p.marche}" ?`,
                                    confirmLabel: "Supprimer",
                                    variant: "danger",
                                    onConfirm: () => deleteMutation.mutate(p.id),
                                  });
                                }} className="h-8 w-8 text-rose-500 hover:bg-rose-50"><Trash2 size={14}/></Button>
                             </td>
                         </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      {/* Entry Dialog - Premium Design */}
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="max-w-md p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Plus className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Nouveau Relevé</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Mise à jour des cotations du marché</p>
                 </div>
               </div>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(new FormData(e.currentTarget)); }} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produit *</Label>
                     <Select name="produit" defaultValue="Anacarde" required>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {PRODUITS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Marché *</Label>
                     <Select name="marche" defaultValue="Ziguinchor" required>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {MARCHES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prix (CFA) *</Label>
                        <Input name="prix" type="number" required placeholder="0" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unité</Label>
                        <Input name="unite_prix" defaultValue="CFA/kg" required className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date du relevé</Label>
                     <Input name="date_releve" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tendance</Label>
                     <Select name="tendance" defaultValue="stable">
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="hausse">Hausse ↑</SelectItem>
                           <SelectItem value="stable">Stable →</SelectItem>
                           <SelectItem value="baisse">Baisse ↓</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button type="submit" disabled={addMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                     {addMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                     Enregistrer la cotation
                  </Button>
                </div>
             </form>
          </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PrixMarche;
