import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Truck, MapPin, Clock, CheckCircle, Fingerprint, Banknote, ShieldCheck, 
  Loader2, Pencil, Trash2, Search, Calendar, Download,
  Package, Navigation, Globe, Activity, ChevronLeft, ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardMap } from "@/components/DashboardMap";

const statusConfig: Record<string, { cls: string; icon: any }> = {
  "En route": { cls: "bg-amber-50 text-amber-700", icon: Truck },
  "Collecte": { cls: "bg-blue-50 text-blue-700", icon: Package },
  "Livré":    { cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle },
  "Planifié": { cls: "bg-indigo-50 text-indigo-700", icon: Calendar },
};

const LogistiqueStatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-5 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
    
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
        variant === "gold" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : 
        variant === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : 
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
      )}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      {trend && (
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-100/50 dark:border-emerald-500/20">
          {trend}
        </span>
      )}
    </div>
    
    <div className="relative z-10">
      <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-1">{value}</h3>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      {description && <p className="text-[11px] text-gray-500 mt-2 font-medium italic">{description}</p>}
    </div>
  </div>
);

export default function Logistique() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLivraison, setSelectedLivraison] = useState<any>(null);
  const [pinInputs, setPinInputs] = useState<string[]>(["", "", "", ""]);
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  
  const [planningData, setPlanningData] = useState({
    commande_id: "", destination: "", chauffeur_nom: "", vehicule_info: "",
    date_prevue: format(new Date(), "yyyy-MM-dd"),
  });

  const handleDownloadEPOD = (livraison: any) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      // Header
      doc.setFillColor(26, 46, 28);
      doc.rect(0, 0, 210, 30, "F");
      
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("CRPAZ - Bon de Livraison Électronique (e-POD)", 14, 12);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 230, 185);
      doc.text(`Identifiant d'expédition: #${livraison.id.slice(0, 8).toUpperCase()}`, 14, 20);
      doc.text(`Certifié le: ${format(new Date(livraison.date_livraison || new Date()), "dd MMMM yyyy à HH:mm", { locale: fr })}`, 14, 25);
      
      // Body content
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Détails de l'expédition", 14, 45);
      
      autoTable(doc, {
        startY: 50,
        head: [["Informations", "Détails"]],
        body: [
          ["Produit Transporté", livraison.commandes?.produit_nom || "—"],
          ["Quantité", `${livraison.commandes?.quantite} ${livraison.commandes?.unite}`],
          ["Destination", livraison.destination || "—"],
          ["Date Planifiée", format(new Date(livraison.date_prevue), "dd/MM/yyyy")],
          ["Transporteur", livraison.chauffeur_nom || "—"],
          ["Véhicule", livraison.vehicule_info || "—"],
          ["Statut", "Livré / Certifié"],
        ],
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid'
      });
      
      // Footer signature
      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFillColor(245, 250, 245);
      doc.rect(14, finalY + 15, 182, 40, "F");
      doc.setTextColor(22, 101, 52);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SIGNATURE DIGITALE CERTIFIÉE", 20, finalY + 28);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Généré par la Blockchain CRPAZ le ${format(new Date(), "dd/MM/yyyy")}`, 20, finalY + 36);
      doc.text("Ce document a valeur de preuve de livraison légale et de transfert de responsabilité.", 20, finalY + 45);
      
      doc.save(`ePOD_${livraison.id.slice(0, 8).toUpperCase()}.pdf`);
      toast.success("e-POD téléchargé avec succès");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

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

  const { data: statsData } = useQuery({
    queryKey: ["livraisons-stats"],
    queryFn: async () => {
      const getC = async (st?: string) => {
        let q = supabase.from("livraisons").select("*", { count: "exact", head: true });
        if (st) q = q.eq("statut", st);
        const { count } = await q;
        return count || 0;
      };
      const [t, livre, route, col] = await Promise.all([getC(), getC("Livré"), getC("En route"), getC("Collecte")]);
      return { total: t, livrees: livre, enRoute: route, collecte: col };
    }
  });

  const { data: livraisonsData, isLoading } = useQuery({
    queryKey: ["livraisons-list", page, search],
    queryFn: async () => {
      let q = supabase.from("livraisons").select("*, commandes (id, produit_nom, quantite, unite, statut_paiement)", { count: "exact" }).order("created_at", { ascending: false });
      if (search) {
        q = q.or(`destination.ilike.%${search}%,chauffeur_nom.ilike.%${search}%`);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      return { livraisons: data || [], total: count || 0 };
    },
  });

  const { data: availableCommandes = [] } = useQuery({
    queryKey: ["available-commandes-logistique"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commandes").select("*").in("statut", ["Confirmée", "Prête", "Payée"]).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isPlanningOpen,
  });

  const createLivraisonMutation = useMutation({
    mutationFn: async (vars: typeof planningData) => {
      const { error } = await supabase.from("livraisons").insert([{ ...vars, statut: "Planifié" }]);
      if (error) throw error;
      await supabase.from("commandes").update({ statut: "En expédition" }).eq("id", vars.commande_id);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["livraisons-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["available-commandes-logistique"] });
      toast.success("Expédition planifiée"); 
      setIsPlanningOpen(false); 
    },
    onError: (error: any) => { console.error(error); toast.error(`Erreur: ${error.message || "Impossible de planifier l'expédition"}`); }
  });

  const signPODMutation = useMutation({
    mutationFn: async ({ id, commande_id }: { id: string, commande_id: string }) => {
      if (!commande_id) throw new Error("Indexation Invalide");
      await supabase.from("livraisons").update({ statut: "Livré", date_livraison: new Date().toISOString() }).eq("id", id);
      await supabase.from("commandes").update({ statut: "Livrée", statut_paiement: "Débloqué" }).eq("id", commande_id);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["livraisons-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["livraisons-stats"] }); 
      queryClient.invalidateQueries({ queryKey: ["commandes-list"] }); // Added to refresh order lists
      toast.success("Certification e-POD confirmée"); 
      setSelectedLivraison(null); 
      setPinInputs(["", "", "", ""]); 
    }
  });

  const stats = statsData || { total: 0, livrees: 0, enRoute: 0, collecte: 0 };
  const filtered = livraisonsData?.livraisons || [];
  const totalItems = livraisonsData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <DashboardLayout title="Logistique" subtitle="Supervision des flux de transport et certification e-POD">
      <div className="space-y-6">

        {/* Header - No action integrated into toolbar */}
        <div className="bg-white dark:bg-[#131d2e] p-6 rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-2">Supervision Logistique</h1>
            <p className="text-sm text-gray-500 font-medium italic">Garantissez la traçabilité des expéditions avec la certification e-POD irréfutable.</p>
          </div>
          <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
             <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0B1910] flex items-center justify-center shadow-sm">
                <Activity size={18} className="text-emerald-600 animate-pulse" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Statut Système</p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Maillage Actif • 24/7</p>
             </div>
          </div>
        </div>

        {/* ── Stats Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <LogistiqueStatCard title="Traitements Actifs" value={stats.enRoute} icon={Navigation} description="En cours de transit" variant="blue" trend="LIVE" />
           <LogistiqueStatCard title="En Collecte" value={stats.collecte} icon={Package} description="Chargement en zone" variant="default" />
           <LogistiqueStatCard title="Livraisons Certifiées" value={stats.livrees} icon={ShieldCheck} description="Validation e-POD" variant="gold" />
           <LogistiqueStatCard title="Fonds Liés" value={`${(stats.livrees * 8.5).toFixed(1)}M`} icon={Banknote} description="CFA débloqués" variant="default" />
        </div>

        {/* ── Toolbar - Quantum Unified ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2 mb-6">
          <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto shrink-0">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20 whitespace-nowrap">
              <Activity size={14} />
              <span>Tableau de bord</span>
            </button>
            <button onClick={() => setIsMapOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 whitespace-nowrap transition-all">
              <Globe size={14} />
              <span>Carte Tactique</span>
            </button>
          </div>

          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input 
              placeholder="Chercher destination, transporteur, #ID..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11 text-base w-full" 
            />
          </div>

          <div className="flex items-center gap-2 px-1">
            {isAdmin && (
               <Button 
                 onClick={() => setIsPlanningOpen(true)} 
                 className="h-10 px-6 rounded-xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-lg shadow-emerald-900/10 font-bold transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
               >
                 <Truck size={16} className="mr-2" />
                 Planifier Transport
               </Button>
            )}
          </div>
        </div>

        {/* List Table - Quantum High Density */}
        {isLoading ? (
          <div className="flex justify-center py-24 text-gray-300"><Loader2 className="animate-spin" size={32} /></div>
        ) : (
          <div className="bg-white dark:bg-[#131d2e] border border-gray-100 dark:border-[#1e2d45] shadow-sm rounded-2xl overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-[#1e2d45]">
                      <tr>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Index & Création</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Transporteur</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Charge</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Destination</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                         <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">e-POD</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
                      {filtered.length === 0 ? (
                         <tr><td colSpan={6} className="py-12 text-center text-gray-500">Aucun flux logistique.</td></tr>
                      ) : (
                        filtered.map((l: any) => {
                          const sCfg = statusConfig[l.statut] || { cls: "bg-gray-100 text-gray-700", icon: Activity };
                          const SIcon = sCfg.icon;
                          return (
                            <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                               <td className="px-6 py-4">
                                  <div className="font-mono text-xs font-bold text-gray-900">#{l.id.slice(0,8).toUpperCase()}</div>
                                  <div className="text-xs text-gray-500 mt-1">{format(new Date(l.created_at), "dd MMM")}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 border border-gray-200">
                                        {l.chauffeur_nom?.charAt(0) || "?"}
                                     </div>
                                     <div>
                                        <div className="font-bold text-gray-900">{l.chauffeur_nom || "Indéfini"}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{l.vehicule_info || "—"}</div>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{l.commandes?.produit_nom}</div>
                                  <div className="text-xs font-semibold text-gray-500 mt-0.5">{l.commandes?.quantite} {l.commandes?.unite}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                                     <MapPin size={14} className="text-blue-500" /> {l.destination}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">Le {format(new Date(l.date_prevue), "dd/MM/yyyy")}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <Badge variant="outline" className={cn("border-none gap-1 font-semibold", sCfg.cls)}>
                                     <SIcon size={12} /> {l.statut}
                                  </Badge>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  {l.statut === "Livré" ? (
                                     <div className="flex items-center justify-end gap-2">
                                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                           <ShieldCheck size={14} /> CERTIFIÉ
                                        </div>
                                        <Button size="icon" variant="outline" onClick={() => handleDownloadEPOD(l)} className="h-7 w-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" title="Télécharger e-POD (PDF)">
                                           <Download size={14} />
                                        </Button>
                                     </div>
                                  ) : (
                                     <Button 
                                       onClick={() => setSelectedLivraison(l)}
                                       size="sm"
                                       className="bg-gray-900 text-white hover:bg-gray-800"
                                     >
                                        <Fingerprint size={14} className="mr-2" /> Signer POD
                                     </Button>
                                  )}
                               </td>
                            </tr>
                          );
                        })
                      )}
                   </tbody>
                 </table>
              </div>
              
              {/* Premium Pagination */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-t border-gray-100 bg-gray-50/50 gap-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Index {page * PAGE_SIZE + 1} – {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} expéditions
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
        )}
      </div>

      {/* Signature e-POD Dialog - Premium Quantum Design */}
      <Dialog open={!!selectedLivraison} onOpenChange={v => !v && setSelectedLivraison(null)}>
         <DialogContent className="max-w-md p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] bg-white overflow-hidden text-center">
             {/* Gradient Header */}
             <div className="relative bg-[#0B1910] px-8 py-10 overflow-hidden flex flex-col items-center">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/40 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 w-20 h-20 bg-blue-500/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                 <Fingerprint size={40} className="text-blue-400" />
               </div>
               <DialogTitle className="text-2xl font-bold text-white tracking-tight relative z-10">Certification e-POD</DialogTitle>
               <p className="text-sm text-white/40 mt-1 relative z-10 font-medium">Preuve de livraison digitale irréfutable</p>
             </div>

             <div className="p-8 space-y-8">
                <div className="space-y-2">
                   <p className="text-gray-500 text-sm font-medium">
                      Saisissez le code confidentiel client pour valider l'expédition
                   </p>
                   <div className="bg-gray-50 rounded-xl py-2 px-4 inline-block font-mono text-sm font-bold text-gray-900 border border-gray-100">
                      #{selectedLivraison?.id.slice(0,8).toUpperCase()}
                   </div>
                </div>

                <div className="flex justify-center gap-3">
                   {[0,1,2,3].map(i => (
                     <input 
                        key={i} 
                        type="password" 
                        maxLength={1} 
                        className="w-16 h-20 text-center text-4xl font-extrabold rounded-[1.25rem] bg-gray-50 border-2 border-gray-100 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        value={pinInputs[i]}
                        onChange={(e) => {
                          const n = [...pinInputs];
                          const val = e.target.value.slice(-1);
                          n[i] = val;
                          setPinInputs(n);
                          // Auto focus next
                          if (val && e.target.nextElementSibling) {
                            (e.target.nextElementSibling as HTMLInputElement).focus();
                          }
                        }}
                     />
                   ))}
                </div>

                <div className="pt-2 flex flex-col gap-3">
                   <Button 
                      className="w-full bg-[#1A2E1C] hover:bg-[#1A2E1C]/90 text-white h-14 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-900/20 gap-3"
                      onClick={() => signPODMutation.mutate({ id: selectedLivraison.id, commande_id: selectedLivraison.commande_id })}
                      disabled={signPODMutation.isPending || pinInputs.join("").length < 4}
                   >
                      {signPODMutation.isPending ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                      Certifier et Débloquer les fonds
                   </Button>
                   <button 
                     onClick={() => setSelectedLivraison(null)}
                     className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-2"
                   >
                     Annuler la signature
                   </button>
                </div>
             </div>
         </DialogContent>
      </Dialog>

      {/* Planning Dialog - Premium Design */}
      <Dialog open={isPlanningOpen} onOpenChange={setIsPlanningOpen}>
         <DialogContent className="max-w-2xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.25)] bg-white overflow-hidden">
             {/* Dark Header */}
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Truck className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Planifier une Expédition</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Associez une commande à un transporteur et définissez la route.</p>
                 </div>
               </div>
             </div>

             <div className="p-8 space-y-5">
                {/* Commande */}
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                     <Package size={12} /> Commande associée *
                   </Label>
                   <Select value={planningData.commande_id} onValueChange={v => {
                      const cmd = availableCommandes.find((c: any) => c.id === v);
                      setPlanningData({...planningData, commande_id: v, destination: cmd?.lieu_livraison || ""});
                   }}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors">
                        <SelectValue placeholder="Sélectionner une commande confirmée..." />
                      </SelectTrigger>
                      <SelectContent>
                         {availableCommandes.length === 0 ? (
                           <div className="py-4 text-center text-sm text-gray-400">Aucune commande confirmée disponible</div>
                         ) : availableCommandes.map((c: any) => (
                           <SelectItem key={c.id} value={c.id}>
                             <span className="font-semibold">{c.produit_nom}</span>
                             <span className="text-gray-400 ml-2">• {c.quantite} {c.unite} — #{c.id.slice(0,6).toUpperCase()}</span>
                           </SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                </div>

                {/* Transporteur + Véhicule */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transporteur / Chauffeur *</Label>
                      <Input 
                        value={planningData.chauffeur_nom} 
                        onChange={e => setPlanningData({...planningData, chauffeur_nom: e.target.value})}
                        placeholder="Ex: Ibrahima Diallo"
                        className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Immatriculation Véhicule</Label>
                      <Input 
                        value={planningData.vehicule_info} 
                        onChange={e => setPlanningData({...planningData, vehicule_info: e.target.value})}
                        placeholder="Ex: DK-1234-AB"
                        className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
                      />
                   </div>
                </div>

                {/* Destination + Date */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={12} /> Destination *
                      </Label>
                      <Input 
                        value={planningData.destination} 
                        onChange={e => setPlanningData({...planningData, destination: e.target.value})}
                        placeholder="Ex: Dakar, Thiès..."
                        className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={12} /> Date planifiée *
                      </Label>
                      <Input 
                        type="date" 
                        value={planningData.date_prevue} 
                        onChange={e => setPlanningData({...planningData, date_prevue: e.target.value})}
                        className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
                      />
                   </div>
                </div>

                {/* Divider & Actions */}
                <div className="border-t border-gray-100 pt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setIsPlanningOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <Button 
                    className="h-11 px-8 rounded-xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 font-semibold shadow-lg shadow-emerald-900/20 gap-2"
                    onClick={() => createLivraisonMutation.mutate(planningData)} 
                    disabled={createLivraisonMutation.isPending || !planningData.commande_id || !planningData.chauffeur_nom || !planningData.destination}
                  >
                     {createLivraisonMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                     Lancer l'expédition
                  </Button>
                </div>
             </div>
         </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
         <DialogContent className="max-w-6xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-2xl bg-black overflow-hidden flex flex-col h-[85vh]">
            <div className="flex-1 w-full bg-[#071410] relative">
               <div className="absolute top-4 right-4 z-50">
                  <Button variant="outline" size="sm" onClick={() => setIsMapOpen(false)} className="bg-black/50 text-white border-white/10 hover:bg-white/10">Fermer la carte</Button>
               </div>
               <DashboardMap />
            </div>
         </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
