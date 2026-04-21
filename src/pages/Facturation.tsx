import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  FileText, Plus, Eye, Trash2, Search, Loader2, 
  CheckCircle2, Clock, X, Printer, Send, ChevronLeft, ChevronRight,
  Download, CheckCheck
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { generateInvoicePDF } from "@/lib/pdf-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statutConfig: Record<string, { label: string; bg: string; text: string; icon: any; border: string }> = {
  "Brouillon": { label: "Brouillon", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100", icon: FileText },
  "Envoyée":   { label: "Envoyée",  bg: "bg-blue-50/50",  text: "text-blue-700", border: "border-blue-100/50", icon: Send },
  "Payée":     { label: "Payée",    bg: "bg-emerald-50/50", text: "text-emerald-700", border: "border-emerald-100/50", icon: CheckCircle2 },
  "En retard": { label: "En retard",  bg: "bg-rose-50/50",   text: "text-rose-700", border: "border-rose-100/50", icon: Clock },
  "Annulée":   { label: "Annulée", bg: "bg-gray-100/80",  text: "text-gray-500", border: "border-gray-200", icon: X },
};

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => {
  const isEmerald = variant === "green";
  const isRose = variant === "rose";
  const isBlue = variant === "blue";
  
  return (
    <div className="group bg-white rounded-3xl border border-gray-100 shadow-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className={cn(
        "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-10",
        isEmerald ? "bg-emerald-500" : isRose ? "bg-rose-500" : isBlue ? "bg-blue-500" : "bg-gray-500"
      )} />
      
      <div className="flex justify-between items-start mb-5">
        <div className={cn(
          "p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
          isEmerald ? "bg-emerald-50 text-emerald-600" :
          isRose ? "bg-rose-50 text-rose-600" :
          isBlue ? "bg-blue-50 text-blue-600" :
          "bg-gray-50 text-gray-600"
        )}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div className="h-1.5 w-12 bg-gray-50 rounded-full overflow-hidden self-center ml-auto mr-0">
          <div className={cn(
            "h-full rounded-full transition-all duration-1000 w-2/3 group-hover:w-full",
            isEmerald ? "bg-emerald-500" : isRose ? "bg-rose-500" : "bg-blue-500"
          )} />
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</p>
      </div>
    </div>
  );
};

const Facturation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const siteName = useConfigValue("site_name", "CRPAZ");
  const siteSubtitle = useConfigValue("site_subtitle", "Coopérative de Ziguinchor");
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;
  const [viewFacture, setViewFacture] = useState<any>(null);
  const [lignes, setLignes] = useState([{ description: "", quantite: 1, prix_unitaire: 0 }]);

  useEffect(() => {
    const checkConnection = async () => {
      const { data, error } = await supabase.from("factures").select("id", { count: "exact", head: true }).limit(1);
      if (error) {
        console.error("Supabase connection error:", error);
        toast.error("Erreur de connexion à la base de données: " + error.message);
      }
    };
    checkConnection();
  }, []);

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

  const { data: statsData = [] } = useQuery({
    queryKey: ["factures-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("factures").select("montant_ttc, statut");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["factures-list", page, search],
    queryFn: async () => {
      let q = supabase.from("factures").select("*", { count: "exact" }).order("date_facture", { ascending: false });
      if (search) {
        q = q.or(`numero_facture.ilike.%${search}%,client_nom.ilike.%${search}%`);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { factures: data || [], total: count || 0 };
    },
  });

  const kpis = useMemo(() => {
    const totalTTC = statsData.reduce((s: number, f: any) => s + Number(f.montant_ttc), 0);
    const totalPaye = statsData.filter((f: any) => f.statut === "Payée").reduce((s: number, f: any) => s + Number(f.montant_ttc), 0);
    const totalImpaye = statsData.filter((f: any) => f.statut === "Envoyée" || f.statut === "En retard").reduce((s: number, f: any) => s + Number(f.montant_ttc), 0);
    const brouillons = statsData.filter((f: any) => f.statut === "Brouillon").length;
    return { totalTTC, totalPaye, totalImpaye, brouillons, count: statsData.length };
  }, [statsData]);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const montantHT = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
      const tva = montantHT * 0.18;
      const { error } = await supabase.from("factures").insert({
        numero_facture: formData.get("numero_facture") as string,
        date_facture: formData.get("date_facture") as string,
        date_echeance: formData.get("date_echeance") as string || null,
        client_nom: formData.get("client_nom") as string,
        client_contact: formData.get("client_contact") as string || null,
        type: formData.get("type") as string,
        lignes, // Insert as JS object, Supabase handles JSON conversion
        montant_ht: Number(montantHT), 
        tva: Number(tva), 
        montant_ttc: Number(montantHT + tva),
        statut: "Brouillon", 
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["factures-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["factures-stats"] }); 
      toast.success("Facture créée avec succès"); 
      setOpen(false); 
      setLignes([{ description: "", quantite: 1, prix_unitaire: 0 }]); 
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast.error("Erreur de création: " + (error.message || "Vérifiez vos permissions"));
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("factures").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["factures-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["factures-stats"] }); 
      toast.success("Statut mis à jour"); 
    },
    onError: (error: any) => {
      toast.error("Erreur de mise à jour: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("factures").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["factures-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["factures-stats"] }); 
      toast.success("Facture supprimée"); 
    },
  });

  const handleDownloadPDF = async (f: any) => {
    try {
      await generateInvoicePDF(f, {
        name: siteName,
        subtitle: siteSubtitle,
      });
      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleSendInvoice = async (f: any) => {
    try {
      await updateStatutMutation.mutateAsync({ id: f.id, statut: "Envoyée" });
      toast.success(`Facture ${f.numero_facture} envoyée au client`);
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const filtered = listData?.factures || [];
  const totalItems = listData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const addLigne = () => setLignes([...lignes, { description: "", quantite: 1, prix_unitaire: 0 }]);
  const updateLigne = (i: number, field: string, value: any) => {
    const updated = [...lignes];
    (updated[i] as any)[field] = value;
    setLignes(updated);
  };

  return (
    <DashboardLayout 
      title="Gestion Financière" 
      subtitle="Factures et Encaissements"
      actions={
        isAdmin && (
          <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 px-6 h-10 rounded-xl shadow-lg shadow-emerald-950/20 transition-all font-bold text-xs uppercase tracking-widest">
            <Plus className="mr-2" size={16} strokeWidth={3}/> Nouvelle Facture
          </Button>
        )
      }
    >
      <div className="space-y-8 animate-in fade-in duration-700">

        <div className="pb-2">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">Facturation</h1>
          <p className="text-gray-400 font-medium max-w-lg">Gérez vos transactions financières avec une précision institutionnelle.</p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard title="Total Encaissé" value={`${(kpis.totalPaye / 1000000).toFixed(2)}M`} icon={CheckCircle2} variant="green" />
           <StatCard title="Encours Clients" value={`${(kpis.totalImpaye / 1000000).toFixed(2)}M`} icon={Clock} variant="rose" />
           <StatCard title="Total Emis" value={kpis.count} icon={FileText} variant="blue" />
           <StatCard title="Brouillons" value={kpis.brouillons} icon={FileText} />
        </div>

        {/* List Card */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col">
           <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
              <div className="relative w-full sm:max-w-md group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1A2E1C] transition-colors" size={18} />
                 <Input 
                   placeholder="Rechercher par numéro ou client..." 
                   value={search}
                   onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                   className="pl-12 h-12 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 focus:border-[#1A2E1C]/20 rounded-2xl transition-all"
                 />
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100" />
                    ))}
                 </div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Activité récente</p>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                 <thead>
                    <tr className="bg-gray-50/30 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                       <th className="px-8 py-5">Identifiant</th>
                       <th className="px-8 py-5">Échéancier</th>
                       <th className="px-8 py-5">Entité Client</th>
                       <th className="px-8 py-5 text-right">Montant Final</th>
                       <th className="px-8 py-5 text-center">État</th>
                       <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                       <tr><td colSpan={6} className="py-24 text-center text-gray-500"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-4" size={32} /> <span className="text-xs font-black uppercase tracking-widest italic opacity-50">Chargement des données...</span></td></tr>
                    ) : filtered.length === 0 ? (
                       <tr><td colSpan={6} className="py-24 text-center text-gray-500"><div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300"><FileText size={32}/></div> <span className="text-sm font-semibold text-gray-400">Aucun enregistrement trouvé</span></td></tr>
                    ) : (
                       filtered.map((f: any) => {
                         const sCfg = statutConfig[f.statut] || statutConfig["Brouillon"];
                         const SIcon = sCfg.icon;
                         return (
                           <tr key={f.id} className="group hover:bg-emerald-50/20 transition-all cursor-pointer border-b border-gray-50 last:border-0" onClick={() => setViewFacture(f)}>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-emerald-600 transition-all shadow-sm">
                                       <FileText size={18} />
                                    </div>
                                    <p className="font-extrabold text-gray-900 group-hover:text-emerald-800 transition-colors uppercase tracking-tight">{f.numero_facture}</p>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="space-y-1">
                                    <p className="font-semibold text-gray-900">{format(new Date(f.date_facture), "dd MMM yyyy", { locale: fr })}</p>
                                    {f.date_echeance && (
                                       <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-500/80 bg-rose-50 px-2 py-0.5 rounded-full w-fit">
                                          <Clock size={10} strokeWidth={3}/> {format(new Date(f.date_echeance), "dd/MM/yyyy")}
                                       </div>
                                    )}
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <p className="font-bold text-gray-900 group-hover:text-emerald-900 transition-colors">{f.client_nom}</p>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{f.type} • Secteur Agri</p>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="space-y-1 text-right">
                                    <span className="text-lg font-black text-gray-900 tracking-tighter block">{Number(f.montant_ttc).toLocaleString()} <span className="text-xs font-bold text-gray-400">FCFA</span></span>
                                    <p className="text-[10px] font-bold text-gray-400 italic">Net à payer</p>
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <Badge variant="outline" className={cn("rounded-xl px-3 py-1.5 font-bold border-transparent text-[10px] uppercase tracking-widest shadow-sm mx-auto", sCfg.bg, sCfg.text, sCfg.border)}>
                                    <SIcon size={12} className="mr-2" strokeWidth={2.5}/> {sCfg.label}
                                 </Badge>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="flex items-center justify-end gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewFacture(f); }} className="h-10 w-10 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-white shadow-sm transition-all"><Eye size={18}/></Button>
                                    {isAdmin && (
                                       <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="h-10 w-10 rounded-xl text-gray-400 hover:bg-white shadow-sm"><span className="text-xl">⋮</span></Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-gray-100 p-2">
                                             <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Actions rapides</div>
                                             {["Envoyée", "Payée", "En retard", "Annulée"].map(s => (
                                                <DropdownMenuItem key={s} className="rounded-xl font-bold text-sm h-10 px-4 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer" onClick={() => updateStatutMutation.mutate({ id: f.id, statut: s })}>
                                                   <CheckCheck size={16} className="mr-3 opacity-50"/> Marquer comme {s}
                                                </DropdownMenuItem>
                                             ))}
                                             <div className="h-px bg-gray-50 my-2 mx-2"/>
                                             <DropdownMenuItem className="rounded-xl font-bold text-sm h-10 px-4 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" onClick={() => handleDownloadPDF(f)}>
                                                <Download size={16} className="mr-3 opacity-50" /> Télécharger PDF
                                             </DropdownMenuItem>
                                             <DropdownMenuItem className="rounded-xl font-bold text-sm h-10 px-4 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer" onClick={() => handleSendInvoice(f)}>
                                                <Send size={16} className="mr-3 opacity-50" /> Envoyer au client
                                             </DropdownMenuItem>
                                             <div className="h-px bg-gray-50 my-2 mx-2"/>
                                             <DropdownMenuItem className="rounded-xl font-bold text-sm h-10 px-4 text-rose-500 focus:bg-rose-50 focus:text-rose-600 cursor-pointer" onClick={() => {
                                                confirm({
                                                  title: "Supprimer la facture",
                                                  description: `Voulez-vous supprimer la facture "${f.numero_facture}" ? Cette action est irréversible.`,
                                                  confirmLabel: "Supprimer",
                                                  variant: "danger",
                                                  onConfirm: () => deleteMutation.mutate(f.id),
                                                });
                                             }}>
                                                <Trash2 size={16} className="mr-3 opacity-50" /> Archiver / Supprimer
                                             </DropdownMenuItem>
                                          </DropdownMenuContent>
                                       </DropdownMenu>
                                    )}
                                 </div>
                              </td>
                           </tr>
                         );
                       })
                    )}
                 </tbody>
              </table>
           </div>

           {/* Pagination */}
           {totalPages > 1 && (
             <div className="flex items-center justify-between p-6 border-t border-gray-50 bg-white">
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Documents {page * PAGE_SIZE + 1} — {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems}
               </span>
               <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50">
                   <ChevronLeft size={16} className="mr-2" strokeWidth={3}/> Précédent
                 </Button>
                 <div className="flex gap-1 items-center px-4">
                    {[...Array(totalPages)].map((_, i) => (
                       <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === page ? "w-6 bg-[#1A2E1C]" : "bg-gray-200")} />
                    ))}
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50">
                   Suivant <ChevronRight size={16} className="ml-2" strokeWidth={3}/>
                 </Button>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Write Facture Dialog */}
      <Dialog open={open} onOpenChange={v => !v ? setOpen(false) : setOpen(true)}>
         <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Plus className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Nouvelle Facture</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Espace de création financière institutionalisée</p>
                 </div>
               </div>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(new FormData(e.currentTarget)); }} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Référence *</Label>
                      <Input name="numero_facture" required placeholder="F-2026-001" className="h-12 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 rounded-xl font-bold" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Type d'opération</Label>
                      <Select name="type" defaultValue="Vente">
                        <SelectTrigger className="h-12 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                           <SelectItem value="Vente" className="font-bold">Vente de stock</SelectItem>
                           <SelectItem value="Achat" className="font-bold">Achat intrants</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Date d'émission *</Label>
                      <Input name="date_facture" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="h-12 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 rounded-xl font-bold" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Échéance</Label>
                      <Input name="date_echeance" type="date" className="h-12 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 rounded-xl font-bold" />
                   </div>
                   <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Entité / Client *</Label>
                      <div className="relative group">
                         <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A2E1C] transition-colors" size={16} />
                         <Input name="client_nom" required placeholder="Saisir le nom complet" className="h-12 pl-10 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 rounded-xl font-bold" />
                      </div>
                   </div>
                   <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Coordonnées / Email</Label>
                      <Input name="client_contact" placeholder="contact@domaine.com" className="h-12 bg-gray-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1A2E1C]/10 rounded-xl font-bold" />
                   </div>
                </div>

                <div className="space-y-6 pt-2">
                   <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl">
                      <div>
                         <Label className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 block">Postes de coût</Label>
                         <p className="text-[10px] font-medium text-gray-400 mt-1 italic">Détaillez les produits ou services facturés</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addLigne} className="bg-white border-gray-100 rounded-xl font-bold text-xs h-9 px-4 shadow-sm hover:shadow-md transition-all active:scale-95"><Plus size={14} className="mr-2"/> Ajouter une ligne</Button>
                   </div>
                   
                   <div className="space-y-3">
                      {lignes.map((l, i) => (
                        <div key={i} className="flex gap-4 items-center group animate-in fade-in slide-in-from-top-2 duration-300">
                           <div className="flex-1 space-y-1.5">
                              <Input placeholder="Libellé de la prestation" value={l.description} onChange={e => updateLigne(i, "description", e.target.value)} required className="h-12 bg-white border-gray-100 focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/30 rounded-xl font-bold transition-all" />
                           </div>
                           <Input type="number" placeholder="Qté" value={l.quantite} onChange={e => updateLigne(i, "quantite", Number(e.target.value))} required className="w-24 h-12 bg-white border-gray-100 focus:ring-1 rounded-xl font-bold text-center" />
                           <Input type="number" placeholder="P.U (FCFA)" value={l.prix_unitaire} onChange={e => updateLigne(i, "prix_unitaire", Number(e.target.value))} required className="w-40 h-12 bg-white border-gray-100 focus:ring-1 rounded-xl font-bold text-right pr-4" />
                           <Button type="button" variant="ghost" size="icon" onClick={() => i > 0 && setLignes(lignes.filter((_, idx) => idx !== i))} className="h-12 w-12 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></Button>
                        </div>
                      ))}
                   </div>

                   <div className="bg-[#0B1910] rounded-[2rem] p-8 flex justify-between items-center mt-6 shadow-2xl shadow-black/20 overflow-hidden relative border border-emerald-500/10">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                      <div className="relative z-10">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1 block">Estimation brute</span>
                         <p className="text-white text-sm font-medium opacity-60">Total partiel hors taxes</p>
                      </div>
                      <div className="relative z-10 text-right">
                         <span className="text-3xl font-black text-white tracking-tighter">{lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0).toLocaleString()} <span className="text-sm font-bold opacity-40">FCFA</span></span>
                      </div>
                   </div>
                </div>

                <div className="pt-6 flex justify-end gap-4">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold text-gray-400 hover:text-gray-900 transition-all">Annuler l'édition</Button>
                  <Button type="submit" disabled={addMutation.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 h-14 px-10 rounded-2xl shadow-xl shadow-emerald-950/20 active:scale-95 transition-all text-sm font-black uppercase tracking-widest">
                     {addMutation.isPending ? <Loader2 className="animate-spin mr-3" size={18} /> : <CheckCircle2 className="mr-3" size={18} strokeWidth={2.5} />}
                     Finaliser et créer
                  </Button>
                </div>
             </form>
         </DialogContent>
      </Dialog>

      <Dialog open={!!viewFacture} onOpenChange={o => !o && setViewFacture(null)}>
         <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white shadow-3xl overflow-hidden">
            {viewFacture && (
               <div className="flex flex-col h-full max-h-[90vh]">
                  {/* High-End Invoice Header */}
                  <div className="p-10 pb-4 flex justify-between items-start shrink-0 relative bg-white">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-[#1A2E1C]/5 rounded-bl-[5rem]" />
                     <div className="space-y-1 relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-12 h-12 rounded-2xl bg-[#1A2E1C] flex items-center justify-center text-white shadow-xl shadow-emerald-950/20">
                              <CheckCheck size={24} strokeWidth={2.5}/>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#1A2E1C]">Officiel</p>
                              <p className="text-sm font-bold text-gray-400 italic">Document financier</p>
                           </div>
                        </div>
                        <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">FACTURE</h2>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{viewFacture.numero_facture}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Émise le {format(new Date(viewFacture.date_facture), "dd MMMM yyyy", { locale: fr })}</p>
                     </div>
                     <div className="text-right space-y-3 relative z-10">
                        <Badge variant="outline" className={cn("px-4 py-2 font-black border-transparent text-xs uppercase tracking-[0.2em] rounded-2xl shadow-sm", statutConfig[viewFacture.statut]?.bg, statutConfig[viewFacture.statut]?.text, statutConfig[viewFacture.statut]?.border)}>
                           {viewFacture.statut}
                        </Badge>
                     </div>
                  </div>
                  
                  <div className="p-10 pt-6 overflow-y-auto space-y-10">
                     <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.3em] pl-1">Destinataire</h4>
                           <div className="p-6 rounded-3xl bg-gray-50/50 border border-gray-100 flex flex-col gap-1">
                              <p className="text-2xl font-black text-gray-900 tracking-tight">{viewFacture.client_nom}</p>
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 transition-colors uppercase tracking-widest">{viewFacture.type}</p>
                              {viewFacture.client_contact && (
                                 <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400"><Send size={10}/></div>
                                       {viewFacture.client_contact}
                                    </p>
                                 </div>
                              )}
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.3em] pr-1 text-right">Conditions</h4>
                           <div className="flex flex-col gap-3 items-end">
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date d'échéance</p>
                                 <p className="text-lg font-bold text-rose-500 mt-1">
                                    {viewFacture.date_echeance ? format(new Date(viewFacture.date_echeance), "dd MMM yyyy", { locale: fr }) : "Immédiat"}
                                 </p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Émetteur</p>
                                 <p className="text-sm font-bold text-gray-900 mt-1 uppercase tracking-tight">{siteName}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm bg-white">
                        <table className="w-full text-sm text-left border-collapse">
                           <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-[0.2em] text-[9px]">
                              <tr>
                                 <th className="px-8 py-4">Description de la prestation</th>
                                 <th className="px-8 py-4 text-center">Quantité</th>
                                 <th className="px-8 py-4 text-right">Prix Unitaire</th>
                                 <th className="px-8 py-4 text-right">Sous-total</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {(() => {
                                 try {
                                    const rawLignes = viewFacture.lignes;
                                    const linesArray = typeof rawLignes === "string" ? JSON.parse(rawLignes) : rawLignes;
                                    
                                    if (!Array.isArray(linesArray)) return null;

                                    return linesArray.map((l: any, i: number) => (
                                       <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                          <td className="px-8 py-5">
                                             <p className="font-bold text-gray-900">{l.description}</p>
                                          </td>
                                          <td className="px-8 py-5 text-center">
                                             <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-black text-gray-900 italic">×{l.quantite}</span>
                                          </td>
                                          <td className="px-8 py-5 text-right font-medium text-gray-500 italic">
                                             {Number(l.prix_unitaire).toLocaleString()}
                                          </td>
                                          <td className="px-8 py-5 text-right">
                                             <span className="font-black text-gray-900 tracking-tight">{(l.quantite * l.prix_unitaire).toLocaleString()} <span className="text-[10px] opacity-30">FCFA</span></span>
                                          </td>
                                       </tr>
                                    ));
                                 } catch (err) { 
                                    console.error("Render lines error:", err);
                                    return null; 
                                 }
                              })()}
                           </tbody>
                        </table>
                     </div>

                     <div className="flex justify-end pr-4">
                        <div className="w-full md:w-1/2 space-y-4 p-8 rounded-[2.5rem] bg-[#0B1910] shadow-2xl shadow-black/20 relative overflow-hidden group border border-emerald-500/10">
                           <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                           
                           <div className="flex justify-between items-center relative z-10">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60">Total HT brut</span>
                              <span className="font-bold text-white text-sm">{Number(viewFacture.montant_ht).toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span></span>
                           </div>
                           <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60">Taxe TVA (18%)</span>
                              <span className="font-bold text-white text-sm">{Number(viewFacture.tva).toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span></span>
                           </div>
                           <div className="flex justify-between items-center relative z-10 pt-2">
                              <div>
                                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white block mb-1">Montant Net à Payer</span>
                                 <p className="text-[9px] text-emerald-500/60 italic font-medium">Toutes taxes comprises</p>
                              </div>
                              <span className="text-4xl font-black text-white tracking-tighter shadow-text">
                                 {Number(viewFacture.montant_ttc).toLocaleString()} <span className="text-sm font-bold opacity-30 italic">CFA</span>
                              </span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="text-center pt-8 border-t border-gray-50 opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic">Merci pour votre confiance institutionnelle</p>
                     </div>
                  </div>

                  <div className="p-8 border-t border-gray-100 bg-white flex justify-end gap-4 shrink-0 shadow-inner">
                     <Button variant="ghost" onClick={() => setViewFacture(null)} className="rounded-2xl font-bold text-gray-400 hover:text-gray-900">Terminer la consultation</Button>
                     <Button variant="outline" onClick={() => handleDownloadPDF(viewFacture)} className="border-gray-200 h-14 px-8 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold">
                        <Download size={18} className="mr-3 text-blue-600"/> Exporter PDF
                     </Button>
                     <Button onClick={() => handleSendInvoice(viewFacture)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/95 h-14 px-10 rounded-2xl shadow-xl shadow-emerald-950/20 transition-all font-black uppercase tracking-widest text-xs">
                        <Send size={18} className="mr-3" strokeWidth={2.5}/> Envoyer par canal sécurisé
                     </Button>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Facturation;
