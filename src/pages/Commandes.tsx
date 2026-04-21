import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ShoppingCart, ExternalLink, ShieldCheck, Banknote, Loader2,
  Plus, Pencil, Trash2, TrendingUp, Search, Calendar,
  Landmark, Truck, CheckCircle2, AlertCircle, Clock, Receipt, CreditCard,
  XCircle, Layers, Zap, Shield, Activity, Users, ArrowRight, ChevronLeft, ChevronRight, MapPin, Phone, Image as ImageIcon,
  Globe, Mail, Building2, MessageSquare, ArrowRightCircle, Inbox,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLog } from "@/hooks/useActivityLog";
import EntityNotes from "@/components/EntityNotes";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ConfirmDialog";

const statusColors: Record<string, { cls: string; icon: any }> = {
  "En attente": { cls: "bg-amber-50 text-amber-700", icon: Clock },
  "Confirmée":  { cls: "bg-blue-50 text-blue-700",   icon: CheckCircle2 },
  "En cours":   { cls: "bg-indigo-50 text-indigo-700", icon: Truck },
  "Livrée":     { cls: "bg-emerald-50 text-emerald-700", icon: ShieldCheck },
  "Annulée":    { cls: "bg-rose-50 text-rose-700",   icon: XCircle },
};

const financeColors: Record<string, { cls: string; label: string; icon: any }> = {
  "Attente Paiement": { cls: "bg-amber-50 text-amber-700", label: "Attente Flux", icon: Activity },
  "Séquestre":        { cls: "bg-emerald-50 text-emerald-700", label: "Escrow Sécurisé", icon: Shield },
  "Payé":             { cls: "bg-emerald-100 text-emerald-800", label: "Finalisé", icon: CheckCircle2 },
  "Débloqué":         { cls: "bg-gray-100 text-gray-800", label: "Fonds Libérés", icon: Zap },
};

const StatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "gold" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
        variant === "blue" ? "bg-blue-50 text-blue-600" : ""
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

const Commandes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logActivity = useActivityLog();
  const [selectedCmd, setSelectedCmd] = useState<any>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;
  const [activeTab, setActiveTab] = useState<"commandes" | "demandes">("commandes");
  const [selectedDemande, setSelectedDemande] = useState<any>(null);
  const [demandesPage, setDemandesPage] = useState(0);
  const [demandesSearch, setDemandesSearch] = useState("");
  const [newOrder, setNewOrder] = useState<any>({
    acheteur_id: "", client_nom: "", client_telephone: "",
    statut_paiement: "Attente Paiement", lieu_livraison: "",
    lignes: [{ id: Date.now(), produit_id: "", produit_nom: "", quantite: "", unite: "kg", montant: "" }]
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

  const { data: commandesStats = [] } = useQuery({
    queryKey: ["commandes-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commandes").select("montant, statut, statut_paiement").eq("est_precommande", false);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["commandes-list", page, search],
    queryFn: async () => {
      let q = supabase
        .from("commandes")
        .select(`*, produits(photo_url, zone_production)`, { count: "exact" })
        .eq("est_precommande", false)
        .order("created_at", { ascending: false });
      if (search) {
        q = q.or(`produit_nom.ilike.%${search}%,id.ilike.%${search}%`);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) {
        toast.error(`Erreur listData: ${error.message}`);
        console.error("List data error:", error);
        throw error;
      }
      return { commandes: data || [], total: count || 0 };
    },
  });

  const { data: produitsCatalogue = [] } = useQuery({
    queryKey: ["produits-catalogue-commandes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("id, nom, photo_url, zone_production").order("nom");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ["buyers"],
    queryFn: async () => {
       const { data, error } = await supabase.from("profiles").select("id, full_name, entreprise, phone, address");
       if (error) throw error;
       return data;
    },
  });

  const { data: demandesData, isLoading: demandesLoading } = useQuery({
    queryKey: ["demandes-commandes-tab", demandesPage, demandesSearch],
    queryFn: async () => {
      let q = supabase
        .from("demandes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (demandesSearch) {
        q = q.or(`nom_complet.ilike.%${demandesSearch}%,email.ilike.%${demandesSearch}%,produit.ilike.%${demandesSearch}%`);
      }
      const from = demandesPage * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { demandes: data || [], total: count || 0 };
    },
  });

  const { data: demandesNewCount = 0 } = useQuery({
    queryKey: ["demandes-new-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("demandes")
        .select("*", { count: "exact", head: true })
        .eq("statut", "Nouvelle");
      return count || 0;
    },
  });

  const updateDemandeStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("demandes").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes-commandes-tab"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-new-count"] });
      toast.success("Statut mis à jour");
    },
  });

  const convertDemandeToCommande = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("commandes").insert({
        acheteur_id: null,
        client_nom: d.nom_complet,
        client_telephone: d.telephone,
        produit_nom: d.produit,
        quantite: d.quantite,
        unite: d.unite || "tonnes",
        lieu_livraison: d.localisation || null,
        montant: 0,
        statut: "En attente",
        statut_paiement: "Attente Paiement",
        est_precommande: false,
      });
      if (error) throw error;
      await supabase.from("demandes").update({ statut: "Traitée" }).eq("id", d.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commandes-list"] });
      queryClient.invalidateQueries({ queryKey: ["commandes-stats"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-commandes-tab"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-new-count"] });
      toast.success("Demande convertie en commande !");
      setSelectedDemande(null);
      setActiveTab("commandes");
    },
    onError: (e: any) => toast.error(`Erreur: ${e.message}`),
  });

  const createOrder = useMutation({
    mutationFn: async (order: any) => {
      const inserts = order.lignes.map((ligne: any) => {
        const selectedProd = produitsCatalogue.find((p: any) => p.id === ligne.produit_id);
        const nameOfProduct = selectedProd ? selectedProd.nom : ligne.produit_nom;
        return {
          acheteur_id: order.acheteur_id === "guest" ? null : order.acheteur_id,
          client_nom: order.acheteur_id === "guest" ? order.client_nom : null,
          client_telephone: order.acheteur_id === "guest" ? order.client_telephone : null,
          produit_id: ligne.produit_id || null, 
          produit_nom: nameOfProduct,
          quantite: Number(ligne.quantite), unite: ligne.unite,
          montant: Number(ligne.montant), statut: "En attente",
          statut_paiement: order.statut_paiement, est_precommande: false,
          lieu_livraison: order.lieu_livraison,
        };
      });
      
      const { error } = await supabase.from("commandes").insert(inserts);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commandes-list"] });
      queryClient.invalidateQueries({ queryKey: ["commandes-stats"] });
      toast.success("Commande(s) initialisée(s) !");
      setIsNewOrderOpen(false);
      logActivity.mutate({ action: "create", module: "commandes", label: `Nouvelle commande enregistrée pour ${variables.client_nom || "Client Partenaire"}` });
      setNewOrder({
        acheteur_id: "", client_nom: "", client_telephone: "",
        statut_paiement: "Attente Paiement", lieu_livraison: "",
        lignes: [{ id: Date.now(), produit_id: "", produit_nom: "", quantite: "", unite: "kg", montant: "" }]
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(`Erreur: ${error.message || "Impossible de créer la commande"}`);
    }
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("commandes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["commandes-list"] }); queryClient.invalidateQueries({ queryKey: ["commandes-stats"] }); toast.success("Ordre d'achat révoqué"); },
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commandes-list"] });
      toast.success("Logistique synchronisée");
      logActivity.mutate({ action: "status_change", module: "commandes", entity_type: "commande", entity_id: variables.id, label: `Statut commande → ${variables.statut}` });
    },
  });

  const commandes = listData?.commandes || [];
  const totalItems = listData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const totalSequestre = commandesStats.filter((c: any) => c.statut_paiement === "Séquestre").reduce((sum: number, c: any) => sum + Number(c.montant || 0), 0);
  const totalMontant   = commandesStats.reduce((sum: number, c: any) => sum + Number(c.montant || 0), 0);
  const livrees        = commandesStats.filter((c: any) => c.statut === "Livrée").length;

  const filtered = commandes;

  return (
    <DashboardLayout title="Commandes" subtitle="Supervision des flux transactionnels et sécurité financière">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ordres d'achat</h1>
            <p className="text-sm text-gray-500 mt-1">Gérez le volume d'affaires de {(totalMontant/1000000).toFixed(1)}M CFA avec traçabilité Escrow.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="bg-white">
                <Receipt className="mr-2" size={16}/> Exporter Ledger
             </Button>
            {isAdmin && (
              <Button onClick={() => setIsNewOrderOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
                <Plus className="mr-2" size={16} />
                Nouvelle Commande
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard title="Flux Consolidé" value={`${(totalMontant/1000).toFixed(0)}K`} icon={TrendingUp} description="CFA cumulés" trend="+" variant="default" />
           <StatCard title="En Séquestre" value={`${(totalSequestre/1000).toFixed(0)}K`} icon={ShieldCheck} description="Actifs immobilisés" variant="blue" />
           <StatCard title="Livraisons" value={livrees} icon={Truck} description="Transferts terminés" variant="gold" />
           <StatCard title="Demandes Site Web" value={demandesNewCount} icon={Globe} description="Nouvelles demandes publiques" variant="default" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("commandes")}
            className={cn("flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all", activeTab === "commandes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <ShoppingCart size={15} /> Commandes internes
          </button>
          <button
            onClick={() => setActiveTab("demandes")}
            className={cn("flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all", activeTab === "demandes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <Globe size={15} /> Demandes site web
            {(demandesNewCount as number) > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {(demandesNewCount as number) > 9 ? "9+" : demandesNewCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "demandes" ? (
          <>
            {/* Demandes search */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Chercher nom, email, produit..."
                  value={demandesSearch}
                  onChange={(e) => { setDemandesSearch(e.target.value); setDemandesPage(0); }}
                  className="pl-10 h-10 rounded-lg border-gray-200 w-full"
                />
              </div>
            </div>

            {/* Demandes table */}
            {demandesLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Produit / Quantité</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(demandesData?.demandes || []).length === 0 ? (
                        <tr><td colSpan={6} className="py-16 text-center">
                          <Inbox className="mx-auto mb-3 text-gray-300" size={32} />
                          <p className="text-gray-500 font-medium">Aucune demande publique pour le moment.</p>
                          <p className="text-xs text-gray-400 mt-1">Les demandes soumises via le site web apparaîtront ici.</p>
                        </td></tr>
                      ) : (demandesData?.demandes || []).map((d: any) => {
                        const isNew = d.statut === "Nouvelle";
                        return (
                          <tr key={d.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedDemande(d)}>
                            <td className="px-6 py-4">
                              <div className="text-xs text-gray-500">{d.created_at ? format(new Date(d.created_at), "dd MMM yyyy", { locale: fr }) : "—"}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{d.id.slice(0,8).toUpperCase()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{d.nom_complet}</div>
                              {d.entreprise && <div className="text-xs text-gray-500 mt-0.5">{d.entreprise}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{d.produit}</div>
                              <div className="text-xs font-semibold text-emerald-600 mt-0.5">{d.quantite} {d.unite}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-gray-600">{d.email}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{d.telephone}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={cn("border-none font-semibold text-xs", isNew ? "bg-blue-50 text-blue-700" : d.statut === "Traitée" ? "bg-emerald-50 text-emerald-700" : d.statut === "Annulée" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>
                                {isNew ? "Nouveau" : d.statut}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => convertDemandeToCommande.mutate(d)}
                                  disabled={convertDemandeToCommande.isPending || d.statut === "Traitée"}
                                >
                                  <ArrowRightCircle size={13} className="mr-1" /> Convertir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(demandesData?.total || 0) > PAGE_SIZE && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
                    <span className="text-sm text-gray-600">{demandesData?.demandes.length} / {demandesData?.total} résultats</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDemandesPage(p => Math.max(0, p - 1))} disabled={demandesPage === 0} className="bg-white border-gray-200"><ChevronLeft size={16} className="mr-1" />Précédent</Button>
                      <span className="text-sm font-medium text-gray-600 px-2">Page {demandesPage + 1}</span>
                      <Button variant="outline" size="sm" onClick={() => setDemandesPage(p => p + 1)} disabled={(demandesPage + 1) * PAGE_SIZE >= (demandesData?.total || 0)} className="bg-white border-gray-200">Suivant<ChevronRight size={16} className="ml-1" /></Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Chercher client, référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-lg border-gray-200 w-full"
            />
          </div>
        </div>

        {/* Orders Table */}
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
                         <th className="px-6 py-4">Réf & Date</th>
                         <th className="px-6 py-4">Client</th>
                         <th className="px-6 py-4">Produits</th>
                         <th className="px-6 py-4">Montant</th>
                         <th className="px-6 py-4">Statut Logistique</th>
                         <th className="px-6 py-4">Statut Financier</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filtered.length === 0 ? (
                         <tr><td colSpan={7} className="py-12 text-center text-gray-500">Aucune commande.</td></tr>
                      ) : (
                        filtered.map((c: any) => {
                          const scfg = statusColors[c.statut] || { cls: "bg-gray-100 text-gray-700", icon: AlertCircle };
                          const fcfg = financeColors[c.statut_paiement || "Attente Paiement"] || financeColors["Attente Paiement"];
                          const SIcon = scfg.icon;
                          const FIcon = fcfg.icon;
                          return (
                            <tr 
                              key={c.id} 
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                              onClick={() => setSelectedCmd(c)}
                            >
                               <td className="px-6 py-4">
                                  <div className="font-mono text-xs font-bold text-gray-900">#{c.id.slice(0,8).toUpperCase()}</div>
                                  <div className="text-xs text-gray-500 mt-1">{c.created_at ? format(new Date(c.created_at), "dd MMM yyyy", { locale: fr }) : "—"}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="font-bold text-gray-900">{buyers.find((b:any)=>b.id === c.acheteur_id)?.entreprise || buyers.find((b:any)=>b.id === c.acheteur_id)?.full_name || c.client_nom || "Client Invité"}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{c.acheteur_id ? c.acheteur_id.substring(0,6).toUpperCase() : (c.client_telephone || "Sans contact")}</div>
                                </td>
                               <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{c.produit_nom}</div>
                                  <div className="text-xs font-semibold text-gray-500 mt-0.5">{c.quantite} {c.unite}</div>
                               </td>
                               <td className="px-6 py-4 font-bold text-emerald-700">
                                  {(c.montant || 0).toLocaleString()} CFA
                               </td>
                               <td className="px-6 py-4">
                                  <Badge variant="outline" className={cn("border-none gap-1 font-semibold", scfg.cls)}>
                                     <SIcon size={12} /> {c.statut}
                                  </Badge>
                               </td>
                               <td className="px-6 py-4">
                                  <Badge variant="outline" className={cn("border-none gap-1 font-semibold", fcfg.cls)}>
                                     <FIcon size={12} /> {fcfg.label}
                                  </Badge>
                               </td>
                               <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                      onClick={() => {
                                        confirm({
                                          title: "Supprimer la commande",
                                          description: "Cette action est irréversible. La commande sera définitivement supprimée de la base de données.",
                                          confirmLabel: "Oui, supprimer",
                                          variant: "danger",
                                          onConfirm: () => deleteOrder.mutate(c.id),
                                        });
                                      }}
                                    >
                                      <Trash2 size={14} />
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

            {/* Pagination Controls */}
            {totalPages >= 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
                <span className="text-sm text-gray-600">
                   Affichage de {commandes.length} résultat(s) sur {totalItems}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="bg-white border-gray-200">
                    <ChevronLeft size={16} className="mr-1" /> Précédent
                  </Button>
                  <span className="text-sm font-medium text-gray-600 px-2">
                     Page {page + 1} sur {Math.max(1, totalPages)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="bg-white border-gray-200">
                    Suivant <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Demande detail dialog */}
      <Dialog open={!!selectedDemande} onOpenChange={v => !v && setSelectedDemande(null)}>
        <DialogContent className="max-w-lg rounded-2xl bg-white p-0 border border-black/[0.06] shadow-2xl overflow-hidden">
          <div className="bg-[#0B1910] px-6 py-5">
            <DialogTitle className="text-white text-lg font-bold">Détail de la demande</DialogTitle>
            <p className="text-white/50 text-xs mt-0.5">Reçue le {selectedDemande ? format(new Date(selectedDemande.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : ""}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Client", value: selectedDemande?.nom_complet, icon: Users },
                { label: "Entreprise", value: selectedDemande?.entreprise || "—", icon: Building2 },
                { label: "Email", value: selectedDemande?.email, icon: Mail },
                { label: "Téléphone", value: selectedDemande?.telephone, icon: Phone },
                { label: "Produit", value: selectedDemande?.produit, icon: ShoppingCart },
                { label: "Quantité", value: `${selectedDemande?.quantite} ${selectedDemande?.unite}`, icon: Layers },
                { label: "Localisation", value: selectedDemande?.localisation || "—", icon: MapPin },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                    <item.icon size={11} /> {item.label}
                  </div>
                  <p className="text-sm font-bold text-gray-800 truncate">{item.value}</p>
                </div>
              ))}
            </div>
            {selectedDemande?.message && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                  <MessageSquare size={11} /> Message
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedDemande.message}</p>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-gray-500">Changer le statut</label>
                <Select value={selectedDemande?.statut} onValueChange={(v) => { updateDemandeStatut.mutate({ id: selectedDemande.id, statut: v }); setSelectedDemande((d: any) => ({ ...d, statut: v })); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Nouvelle", "En cours", "Traitée", "Annulée"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => convertDemandeToCommande.mutate(selectedDemande)}
                disabled={convertDemandeToCommande.isPending || selectedDemande?.statut === "Traitée"}
                className="mt-5 bg-emerald-700 hover:bg-emerald-800 text-white gap-2 h-9"
              >
                {convertDemandeToCommande.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />}
                Convertir en commande
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog */}
      <Dialog open={!!selectedCmd} onOpenChange={v => !v && setSelectedCmd(null)}>
         <DialogContent className="max-w-4xl rounded-[2rem] bg-[#FDFCFB] p-0 border border-black/[0.04] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.3)] overflow-hidden">
           <div className="relative overflow-hidden bg-[#0B1910] px-8 py-8">
             <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-900/40 rounded-full blur-[80px] pointer-events-none" />
             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
             <div className="relative flex items-start justify-between z-10">
               <div className="flex gap-5 items-center">
                 {selectedCmd?.produits?.photo_url ? (
                   <img src={selectedCmd.produits.photo_url} alt={selectedCmd.produit_nom} className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg" />
                 ) : (
                   <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                     <ImageIcon className="text-white/40" size={32} />
                   </div>
                 )}
                 <div>
                   <DialogTitle className="text-3xl font-bold text-white tracking-tight">Commande {selectedCmd?.produit_nom}</DialogTitle>
                   <div className="flex items-center gap-3 mt-2">
                     <p className="text-xs font-semibold text-white/50 tracking-widest uppercase">RÉF: ORD-{selectedCmd?.id.slice(0,8).toUpperCase()}</p>
                     <Badge className={cn("text-[10px] font-bold uppercase tracking-wider py-0.5 border-none", statusColors[selectedCmd?.statut]?.cls)}>
                        {selectedCmd?.statut}
                     </Badge>
                   </div>
                 </div>
               </div>
             </div>
           </div>

           <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
              {/* Timeline */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <OrderTimeline 
                    currentStep={selectedCmd?.statut === "Livrée" ? 4 : selectedCmd?.statut === "En cours" ? 3 : selectedCmd?.statut === "Confirmée" ? 2 : 1} 
                    isEscrow={selectedCmd?.statut_paiement === "Séquestre"} 
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: "Client Partenaire", value: buyers.find((b:any)=>b.id === selectedCmd?.acheteur_id)?.entreprise || buyers.find((b:any)=>b.id === selectedCmd?.acheteur_id)?.full_name || selectedCmd?.client_nom || "Invité", icon: Users },
                   { label: "Téléphone Client", value: buyers.find((b:any)=>b.id === selectedCmd?.acheteur_id)?.phone || selectedCmd?.client_telephone || "Non renseigné", icon: Phone },
                   { label: "Volume Commandé", value: `${selectedCmd?.quantite} ${selectedCmd?.unite}`, icon: Layers },
                   { label: "Montant Net", value: `${(selectedCmd?.montant || 0).toLocaleString("fr-FR")} CFA`, icon: Banknote },
                 ].map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col gap-2">
                       <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          <item.icon size={14} /> {item.label}
                       </div>
                       <p className="text-[15px] font-bold text-gray-900 truncate">{item.value}</p>
                    </div>
                 ))}
                 
                 <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                     <MapPin className="text-emerald-600" size={18} />
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lieu de Livraison / Adresse</p>
                     <p className="text-sm font-bold text-gray-900 mt-0.5">
                       {selectedCmd?.lieu_livraison || buyers.find((b:any)=>b.id === selectedCmd?.acheteur_id)?.address || "Aucune adresse spécifique renseignée"}
                     </p>
                   </div>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                 {/* Financial Security */}
                 <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
                       <ShieldCheck className="text-emerald-600" size={20} /> Paiement & Séquestre
                    </h4>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                       <span className="text-sm font-medium text-gray-600">Statut Financier</span>
                       <Badge variant="outline" className={cn("font-bold border-none", financeColors[selectedCmd?.statut_paiement || "Attente Paiement"]?.cls)}>
                         {selectedCmd?.statut_paiement}
                       </Badge>
                    </div>
                    {isAdmin && selectedCmd?.statut_paiement === "Séquestre" && (
                       <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                          <Zap size={16} /> Libérer les fonds (Ledger)
                       </Button>
                    )}
                 </div>

                 {/* Admin Actions */}
                 {isAdmin && (
                   <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
                         <Activity className="text-blue-600" size={20} /> Gestion Logistique
                      </h4>
                      <div className="space-y-4">
                         <div>
                            <Label className="text-sm font-medium text-gray-700">Mettre à jour le statut</Label>
                            <Select defaultValue={selectedCmd?.statut} onValueChange={(v) => updateStatut.mutate({ id: selectedCmd?.id, statut: v })}>
                               <SelectTrigger className="mt-1 h-10 w-full"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                  {["En attente", "Confirmée", "En cours", "Livrée", "Annulée"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 gap-2 text-gray-600"><Truck size={16}/> Envoi</Button>
                            <Button variant="outline" className="flex-1 gap-2 text-gray-600"><Receipt size={16}/> Facture</Button>
                            <Button 
                              variant="destructive" 
                              className="w-10 px-0 flex-shrink-0"
                              onClick={() => {
                                confirm({
                                  title: "Supprimer la commande",
                                  description: "Cette action est irréversible. La commande sera définitivement supprimée de la base de données.",
                                  confirmLabel: "Oui, supprimer",
                                  variant: "danger",
                                  onConfirm: () => {
                                    deleteOrder.mutate(selectedCmd.id);
                                    setSelectedCmd(null);
                                  },
                                });
                              }}
                            >
                               <Trash2 size={16}/>
                            </Button>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              {/* Notes internes */}
              {selectedCmd && (
                <EntityNotes entityType="commande" entityId={selectedCmd.id} />
              )}
           </div>
        </DialogContent>
      </Dialog>

      {/* New Order Dialog */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
         <DialogContent className="max-w-3xl rounded-[2rem] bg-[#FDFCFB] p-0 border border-black/[0.04] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.3)]">
             <div className="relative overflow-hidden bg-white border-b border-black/5 px-8 py-6">
                 <DialogTitle className="text-xl font-bold text-gray-900">Nouvelle Commande</DialogTitle>
                 <p className="text-sm font-medium text-gray-500 mt-1">Créez un nouvel ordre d'achat pour un client partenaire.</p>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                   <div className="space-y-4">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client Partenaire ou Invité *</Label>
                      <Select value={newOrder.acheteur_id} onValueChange={(v) => setNewOrder({...newOrder, acheteur_id: v})}>
                         <SelectTrigger className="h-11 rounded-xl bg-white border-black/10"><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="guest" className="font-bold text-blue-600">Nouveau Client / Invité</SelectItem>
                            <div className="h-px bg-gray-100 my-1"></div>
                            {buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.entreprise || b.full_name}</SelectItem>)}
                         </SelectContent>
                      </Select>
                      
                      {newOrder.acheteur_id === "guest" && (
                         <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="space-y-2">
                               <Label className="text-xs text-gray-600">Nom du Client</Label>
                               <Input value={newOrder.client_nom} onChange={e => setNewOrder({...newOrder, client_nom: e.target.value})} placeholder="Ex: Jean Dupont" className="h-10 bg-white" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-xs text-gray-600">N° Téléphone</Label>
                               <Input value={newOrder.client_telephone} onChange={e => setNewOrder({...newOrder, client_telephone: e.target.value})} placeholder="Ex: +221..." className="h-10 bg-white" />
                            </div>
                         </div>
                      )}
                   </div>
                   
                   <div className="space-y-4">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations Globales</Label>
                      <div className="space-y-4">
                         <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Lieu de livraison (Optionnel)</Label>
                            <Input 
                              value={newOrder.lieu_livraison} 
                              onChange={e => setNewOrder({...newOrder, lieu_livraison: e.target.value})} 
                              placeholder="Ex: Dakar, Point E" 
                              className="h-10 rounded-xl bg-white border-black/10"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Statut Paiement Initial</Label>
                            <Select onValueChange={(v) => setNewOrder({...newOrder, statut_paiement: v})} defaultValue={newOrder.statut_paiement}>
                               <SelectTrigger className="h-10 rounded-xl bg-white border-black/10"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                  <SelectItem value="Attente Paiement">Attente Paiement</SelectItem>
                                  <SelectItem value="Séquestre">Séquestre (Escrow)</SelectItem>
                                  <SelectItem value="Payé">Payé (Direct)</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Séparation */}
                <div className="h-px w-full bg-gray-100 my-4" />

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Panier de la commande</Label>
                     <Button 
                        variant="outline" size="sm" 
                        onClick={() => setNewOrder({ ...newOrder, lignes: [...newOrder.lignes, { id: Date.now(), produit_id: "", produit_nom: "", quantite: "", unite: "kg", montant: "" }]})}
                        className="text-xs font-bold h-8 text-emerald-700 bg-emerald-50 border-none hover:bg-emerald-100"
                     >
                        <Plus size={14} className="mr-1" /> Ajouter un produit
                     </Button>
                   </div>
                   
                   <div className="space-y-3">
                      {newOrder.lignes.map((ligne: any, index: number) => (
                         <div key={ligne.id} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 relative">
                            <Button 
                               variant="ghost" size="icon" 
                               onClick={() => setNewOrder({...newOrder, lignes: newOrder.lignes.filter((_: any, i: number) => i !== index)})}
                               disabled={newOrder.lignes.length === 1}
                               className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-sm border border-gray-100 text-rose-500 hover:bg-rose-50"
                            >
                               <XCircle size={14} />
                            </Button>
                            
                            <div className="flex-1 space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-gray-400">Catalogue *</Label>
                              <Select value={ligne.produit_id} onValueChange={(v) => {
                                 const updated = [...newOrder.lignes];
                                 updated[index].produit_id = v;
                                 updated[index].produit_nom = produitsCatalogue.find((p:any) => p.id === v)?.nom || "";
                                 setNewOrder({...newOrder, lignes: updated});
                              }}>
                                 <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                                 <SelectContent>
                                    {produitsCatalogue.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nom} {p.zone_production ? `(${p.zone_production})` : ""}</SelectItem>)}
                                 </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="w-24 space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-gray-400">Volume</Label>
                              <Input type="number" value={ligne.quantite} onChange={e => {
                                  const updated = [...newOrder.lignes];
                                  updated[index].quantite = e.target.value;
                                  setNewOrder({...newOrder, lignes: updated});
                               }} className="h-10 bg-white" placeholder="Qté" />
                            </div>
                            
                            <div className="w-20 space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-gray-400">Unité</Label>
                              <Select value={ligne.unite} onValueChange={(v) => {
                                 const updated = [...newOrder.lignes];
                                 updated[index].unite = v;
                                 setNewOrder({...newOrder, lignes: updated});
                              }}>
                                 <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="T">T</SelectItem>
                                 </SelectContent>
                              </Select>
                            </div>

                            <div className="w-32 space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-gray-400">Montant (CFA) *</Label>
                              <Input type="number" value={ligne.montant} onChange={e => {
                                  const updated = [...newOrder.lignes];
                                  updated[index].montant = e.target.value;
                                  setNewOrder({...newOrder, lignes: updated});
                               }} className="h-10 bg-white font-bold text-emerald-800" placeholder="Prix Net" />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="pt-6 border-t border-black/5 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsNewOrderOpen(false)} className="rounded-xl px-6 h-11 text-gray-500">Annuler</Button>
                  <Button 
                    onClick={() => createOrder.mutate(newOrder)} 
                    disabled={createOrder.isPending || !newOrder.acheteur_id || (newOrder.lignes.some((l:any) => !l.produit_id && !l.produit_nom))} 
                    className="bg-[#1A2E1C] text-white hover:bg-[#112013] rounded-xl px-8 h-11"
                  >
                     {createOrder.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                     Valider l'ensemble
                  </Button>
                </div>
             </div>
         </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default Commandes;
