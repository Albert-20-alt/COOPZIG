import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  MapPin, Phone, Mail, Calendar, Leaf, Award, Package, TrendingUp,
  Users, PiggyBank, Plus, Pencil, Trash2, Loader2, CheckCircle,
  Clock, XCircle, Building2, X, Sprout, Building
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CHART_COLORS = ["#2D7A4F", "#F4A636", "#A3C97E", "#7C4B2A", "#4A9B6F", "#E8C87A"];

const statutConfig: Record<string, { icon: React.ElementType; cls: string }> = {
  "Payé":      { icon: CheckCircle, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  "En attente":{ icon: Clock,       cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "En retard": { icon: XCircle,     cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

type Employe = {
  id: string; producteur_id: string; nom_complet: string; poste: string;
  telephone?: string | null; date_embauche?: string | null;
  type_contrat: string; statut_actif?: boolean | null; created_at: string;
};

const defaultEmpForm = {
  nom_complet: "", poste: "Ouvrier agricole", telephone: "",
  date_embauche: "", type_contrat: "Saisonnier", statut_actif: true,
};

interface Props {
  producteur: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdmin: boolean;
}

export const ProducteurDetailModal = ({ producteur, open, onOpenChange, isAdmin }: Props) => {
  const queryClient = useQueryClient();
  const [empFormOpen, setEmpFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employe | null>(null);
  const [empForm, setEmpForm] = useState(defaultEmpForm);

  // Live employees query
  const { data: employees = [] } = useQuery<Employe[]>({
    queryKey: ["employes", producteur?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employes_producteur").select("*")
        .eq("producteur_id", producteur.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Employe[];
    },
    enabled: !!producteur?.id && open,
  });

  // Live cotisations query (auto-sync with Cotisations page)
  const { data: cotisations = [] } = useQuery<any[]>({
    queryKey: ["cotisations_producteur", producteur?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotisations").select("*")
        .eq("producteur_id", producteur.id).order("date_paiement", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!producteur?.id && open,
  });

  // Employee mutations
  const addEmp = useMutation({
    mutationFn: async (f: typeof empForm) => {
      const { error } = await supabase.from("employes_producteur").insert({
        producteur_id: producteur.id, nom_complet: f.nom_complet, poste: f.poste,
        telephone: f.telephone || null, date_embauche: f.date_embauche || null,
        type_contrat: f.type_contrat, statut_actif: f.statut_actif,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employes", producteur.id] });
      toast.success("Employé ajouté");
      setEmpFormOpen(false); setEmpForm(defaultEmpForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editEmp = useMutation({
    mutationFn: async (f: typeof empForm & { id: string }) => {
      const { error } = await supabase.from("employes_producteur").update({
        nom_complet: f.nom_complet, poste: f.poste, telephone: f.telephone || null,
        date_embauche: f.date_embauche || null, type_contrat: f.type_contrat, statut_actif: f.statut_actif,
      }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employes", producteur.id] });
      toast.success("Employé mis à jour"); setEditingEmp(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEmp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employes_producteur").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employes", producteur.id] });
      toast.success("Employé supprimé");
    },
  });

  // Chart data
  const productionParAnnee = useMemo(() => {
    if (!producteur?.recoltes) return [];
    const startYear = producteur.date_adhesion
      ? new Date(producteur.date_adhesion).getFullYear()
      : new Date().getFullYear() - 2;
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - startYear + 1 }, (_, i) => {
      const y = startYear + i;
      return {
        annee: String(y),
        production: producteur.recoltes
          .filter((r: any) => new Date(r.date_disponibilite).getFullYear() === y)
          .reduce((s: number, r: any) => s + (r.quantite || 0), 0),
      };
    });
  }, [producteur]);

  const revenueParAnnee = useMemo(() => {
    if (!producteur?.stocks) return [];
    const grouped: Record<string, number> = {};
    producteur.stocks.forEach((s: any) => {
      const y = new Date(s.updated_at).getFullYear().toString();
      // Estimate revenue: Quantite Vendue * Average Price (500 CFA for demo)
      grouped[y] = (grouped[y] || 0) + (s.quantite_vendue || 0) * 500;
    });
    return Object.entries(grouped).sort(([a], [b]) => +a - +b)
      .map(([annee, revenue]) => ({ annee, revenue }));
  }, [producteur]);

  const cotisationsCumul = useMemo(() => {
    let cumul = 0;
    return [...cotisations]
      .filter((c: any) => c.statut === "Payé")
      .sort((a: any, b: any) => new Date(a.date_paiement).getTime() - new Date(b.date_paiement).getTime())
      .map((c: any) => {
        cumul += Number(c.montant);
        return { date: format(new Date(c.date_paiement), "MMM yy", { locale: fr }), montant: Number(c.montant), cumul };
      });
  }, [cotisations]);

  // Transform cultures for pie chart
  const cultureData = useMemo(() => {
    if (!producteur?.recoltes?.length) return (producteur?.cultures || []).map((c: string) => ({ name: c, value: 1 }));
    const grouped: Record<string, number> = {};
    producteur.recoltes.forEach((r: any) => { grouped[r.produit] = (grouped[r.produit] || 0) + (r.quantite || 0); });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [producteur]);

  // KPIs
  const totalProd = producteur?.recoltes?.reduce((s: number, r: any) => s + (r.quantite || 0), 0) || 0;
  const totalVentes = producteur?.stocks?.reduce((s: number, s2: any) => s + (s2.quantite_vendue || 0), 0) || 0;
  const totalRevenuEst = totalVentes * 500; // Estimated
  const totalCotis = cotisations.filter((c: any) => c.statut === "Payé").reduce((s: number, c: any) => s + Number(c.montant), 0);
  const nbActifs = employees.filter(e => e.statut_actif !== false).length;

  const openEditEmp = (emp: Employe) => {
    setEditingEmp(emp);
    setEmpForm({ nom_complet: emp.nom_complet, poste: emp.poste, telephone: emp.telephone || "",
      date_embauche: emp.date_embauche || "", type_contrat: emp.type_contrat, statut_actif: emp.statut_actif ?? true });
  };

  if (!producteur) return null;

  // -- Employee form dialog (shared for add/edit) ----------------------------
  const EmpFormDialog = () => (
    <Dialog open={empFormOpen || !!editingEmp} onOpenChange={(v) => { if (!v) { setEmpFormOpen(false); setEditingEmp(null); } }}>
      <DialogContent className="max-w-md">
        <h3 className="font-semibold text-lg mb-4">{editingEmp ? "Modifier l'employé" : "Ajouter un employé"}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label>Nom complet *</Label>
              <Input value={empForm.nom_complet} onChange={e => setEmpForm(f => ({ ...f, nom_complet: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Poste</Label>
              <Input value={empForm.poste} onChange={e => setEmpForm(f => ({ ...f, poste: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Type contrat</Label>
              <Select value={empForm.type_contrat} onValueChange={v => setEmpForm(f => ({ ...f, type_contrat: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CDI", "CDD", "Saisonnier", "Journalier", "Bénévole"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1"><Label>Téléphone</Label>
              <Input value={empForm.telephone} onChange={e => setEmpForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+221 77..." /></div>
            <div className="space-y-1"><Label>Date d'embauche</Label>
              <Input type="date" value={empForm.date_embauche} onChange={e => setEmpForm(f => ({ ...f, date_embauche: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={empForm.statut_actif} onCheckedChange={v => setEmpForm(f => ({ ...f, statut_actif: v }))} />
            <span className="text-sm text-muted-foreground">{empForm.statut_actif ? "En poste (Actif)" : "Inactif"}</span>
          </div>
          <Button className="w-full h-11 font-semibold" disabled={!empForm.nom_complet || addEmp.isPending || editEmp.isPending}
            onClick={() => { if (editingEmp) editEmp.mutate({ ...empForm, id: editingEmp.id }); else addEmp.mutate(empForm); }}>
            {(addEmp.isPending || editEmp.isPending) ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            {editingEmp ? "Mettre à jour" : "Ajouter l'employé"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <EmpFormDialog />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0 border border-black/5 bg-[#FDFCFB] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.4)] rounded-[2rem]">
          <div className="flex flex-col max-h-[92vh]">

            {/* ── Header Institutionnel ────────────────────────── */}
            <div className="bg-[#0B1910] relative overflow-hidden flex-shrink-0"
              style={{ minHeight: "160px" }}>
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-primary/[0.08] rounded-full blur-[80px]" />
              
              <div className="relative z-10 h-full flex flex-col justify-end p-6 lg:p-8 pt-10 gap-5">
                <button onClick={() => onOpenChange(false)}
                  className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 border border-white/5 backdrop-blur-md transition-all">
                  <X size={18} />
                </button>

                <div className="flex items-end gap-5">
                  <div className="h-20 w-20 rounded-[1.25rem] border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center text-3xl font-bold text-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0 relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {producteur.photo_url
                      ? <img src={producteur.photo_url} alt={producteur.nom} className="w-full h-full object-cover relative z-10" />
                      : <span className="relative z-10 tracking-widest">{producteur.nom.substring(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="text-white flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2.5">
                      <h2 className="text-3xl font-semibold tracking-tight">{producteur.nom}</h2>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] tracking-[0.2em] uppercase font-bold backdrop-blur-md shadow-sm
                        ${producteur.statut_actif === false ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${producteur.statut_actif === false ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
                        {producteur.statut_actif === false ? "Inactif" : "Actif"}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-white/60 text-xs flex-wrap font-medium">
                      <span className="flex items-center gap-2"><MapPin size={14} className="text-white/40"/> {producteur.localisation}</span>
                      {producteur.date_adhesion && (
                        <span className="flex items-center gap-2">
                          <Calendar size={14} className="text-white/40"/> Adhésion {format(new Date(producteur.date_adhesion), "MMMM yyyy", { locale: fr })}
                        </span>
                      )}
                      <span className="flex items-center gap-2"><Building size={14} className="text-white/40"/> Producteur {producteur.type || "Local"}</span>
                      {producteur.certification && <span className="flex items-center gap-2 text-amber-400/80"><Award size={14} /> {producteur.certification}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────── */}
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col bg-[#FDFCFB]">
              <TabsList className="rounded-none border-b border-black/[0.05] bg-white h-14 px-8 flex-shrink-0 justify-start gap-8 overflow-x-auto">
                {[
                  { v: "overview", icon: TrendingUp, label: "Vue d'ensemble" },
                  { v: "exploitation", icon: Sprout, label: "Exploitation" },
                  { v: "equipe", icon: Users, label: `Équipe (${employees.length})` },
                  { v: "cotisations", icon: PiggyBank, label: `Cotisations (${cotisations.length})` },
                  { v: "finances", icon: Package, label: "Finances" },
                ].map(t => (
                  <TabsTrigger key={t.v} value={t.v}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary h-full rounded-none gap-2.5 text-[11px] font-bold tracking-widest px-2 py-0 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent relative top-[1px]">
                    <t.icon size={15} /> {t.label.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-y-auto">

                {/* ── Onglet 1 : Vue d'ensemble ──────────────────── */}
                <TabsContent value="overview" className="p-6 md:p-8 m-0 space-y-6">
                  {/* KPIs Premium */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Production Totale", value: `${totalProd.toLocaleString()} T`, icon: Package, color: "text-emerald-700", bg: "bg-emerald-50", iconCol: "text-emerald-600" },
                      { label: "Revenu Est. (Total)", value: `${(totalRevenuEst / 1000).toLocaleString()}k F`, icon: TrendingUp, color: "text-amber-700", bg: "bg-amber-50", iconCol: "text-amber-600" },
                      { label: "Équipe Active",     value: `${nbActifs} pers.`,    icon: Users,    color: "text-blue-700",  bg: "bg-blue-50", iconCol: "text-blue-600" },
                      { label: "Cotisations Payées",     value: `${(totalCotis / 1000).toFixed(0)}k F`, icon: PiggyBank, color: "text-teal-700", bg: "bg-teal-50", iconCol: "text-teal-600" },
                    ].map(k => (
                      <div key={k.label} className="bg-white rounded-[1.25rem] p-5.5 px-6 border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-black/[0.06] transition-all min-h-[140px]">
                        <div className={`h-11 w-11 rounded-[0.85rem] ${k.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-105`}>
                          <k.icon size={20} className={k.iconCol} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">{k.label}</p>
                          <p className={`text-2xl font-black tracking-tight ${k.color}`}>{k.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Graphique Production */}
                  <div className="bg-white rounded-[1.25rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                    <div className="px-6 py-5 border-b border-black/[0.04] flex items-center justify-between">
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} className="text-gray-300"/> Production par Année
                      </h3>
                    </div>
                    <div className="p-6 h-72">
                      {productionParAnnee.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productionParAnnee} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted))" vertical={false} />
                            <XAxis dataKey="annee" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} dy={10} />
                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip formatter={(v) => [`${v} T`, "Production"]} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "12px" }} />
                            <Bar dataKey="production" fill="#0B1A12" radius={[6, 6, 0, 0]} maxBarSize={60} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground font-medium">Aucune récolte enregistrée</div>
                      )}
                    </div>
                  </div>

                  {/* Coordonnées & Cultures Row */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-[1.25rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 space-y-5">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={14} className="text-gray-300"/> Coordonnées
                      </p>
                      <div className="space-y-4">
                        {producteur.telephone && (
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center flex-shrink-0"><Phone size={16} /></div>
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Téléphone</p><p className="text-sm font-semibold">{producteur.telephone}</p></div>
                          </div>
                        )}
                        {producteur.email && (
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center flex-shrink-0"><Mail size={16} /></div>
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Email</p><p className="text-sm font-semibold break-all">{producteur.email}</p></div>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Leaf size={16} /></div>
                          <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Superficie Totale</p><p className="text-sm font-semibold">{producteur.superficie ?? 0} ha</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[1.25rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <Sprout size={14} className="text-gray-300"/> Cultures Pratiquées
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {(producteur.cultures || []).map((c: string) => (
                          <span key={c} className="px-4 py-2 rounded-xl bg-emerald-500/[0.06] text-emerald-700 text-xs font-bold tracking-wide border border-emerald-500/10 transition-colors hover:bg-emerald-500/10">
                            {c}
                          </span>
                        ))}
                        {!producteur.cultures?.length && <p className="text-sm text-gray-400 italic">Aucune culture enregistrée</p>}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Onglet 2 : Exploitation ────────────────────── */}
                <TabsContent value="exploitation" className="p-6 md:p-8 m-0 space-y-6 bg-[#FDFCFB]">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] mb-6">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Sprout size={14} className="text-gray-400" /> Vos Vergers & Parcelles
                    </h3>
                    <Badge variant="outline" className="text-gray-500 font-bold bg-white text-[10px] tracking-wider rounded-lg px-2">
                       {producteur.vergers?.length || 0} TOTAL
                    </Badge>
                  </div>

                  {!(producteur.vergers?.length) ? (
                    <div className="text-center py-20 bg-white rounded-[1.5rem] border border-dashed border-gray-200">
                      <Sprout size={40} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-sm text-gray-500 font-medium">Aucun verger enregistré – ajoutez-en depuis le module Vergers</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-5">
                      {producteur.vergers.map((v: any) => (
                        <div key={v.id} className="bg-white rounded-[1.5rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:border-black/[0.08] transition-all group">
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">{v.nom}</h4>
                              <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest
                                ${v.etat === "Excellent" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : v.etat === "Bon" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${v.etat === "Excellent" ? "bg-emerald-500" : v.etat === "Bon" ? "bg-blue-500" : "bg-amber-500"}`} />
                                {v.etat}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-black text-gray-900 leading-none">
                                {v.superficie || 0}
                              </p>
                              <span className="text-xs font-bold text-gray-400 tracking-wider">HA</span>
                            </div>
                          </div>
                          
                          <div className="pt-5 border-t border-black/[0.04] space-y-3">
                            {v.zone && <div className="flex items-center gap-3 text-sm text-gray-600"><MapPin size={15} className="text-gray-400" /><span className="font-medium">{v.zone}</span></div>}
                            {v.localisation && <div className="flex items-center gap-3 text-sm text-gray-600"><Building2 size={15} className="text-gray-400" /><span className="font-medium">{v.localisation}</span></div>}
                            <div className="flex items-center gap-3 text-sm text-gray-600"><Leaf size={15} className="text-gray-400" /><span className="font-medium">{v.culture}</span></div>
                            {v.estimation_rendement && <div className="flex items-center gap-3 text-sm text-primary font-semibold"><TrendingUp size={15} className="text-primary/70" /><span>Rendement: {v.estimation_rendement} T/ha</span></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Onglet 3 : Équipe ──────────────────────────── */}
                <TabsContent value="equipe" className="p-6 md:p-8 m-0 space-y-6 bg-[#FDFCFB]">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] mb-6">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} className="text-gray-400" /> Annuaire du Personnel
                    </h3>
                    {isAdmin && (
                      <Button className="rounded-xl font-bold tracking-wide h-10 px-5 bg-[#0B1A12] text-white hover:bg-primary shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all" onClick={() => { setEmpForm(defaultEmpForm); setEmpFormOpen(true); }}>
                        <Plus size={16} className="mr-2" /> Ajouter
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Total employés", value: employees.length, cls: "text-gray-900" },
                      { label: "Prisés (Actifs)", value: nbActifs, cls: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                      { label: "Contrats CDI", value: employees.filter(e => e.type_contrat === "CDI").length, cls: "text-blue-600" },
                    ].map((s, i) => (
                       <div key={i} className={`rounded-2xl p-5 border shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1 ${s.bg || 'bg-white border-black/[0.04]'}`}>
                         <p className={`text-3xl font-black mb-1.5 ${s.cls}`}>{s.value}</p>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.label}</p>
                       </div>
                    ))}
                  </div>

                  {employees.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[1.5rem] border border-dashed border-gray-200">
                      <Users size={40} className="mx-auto mb-4 text-gray-300" /><p className="text-sm font-medium text-gray-500">Créer le premier profil d'employé</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employees.map(emp => (
                        <div key={emp.id} className="bg-white rounded-2xl border border-black/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-4 flex items-center justify-between group hover:border-black/[0.08] transition-all">
                          <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                              {emp.nom_complet.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                 <p className="font-bold text-gray-900 text-base">{emp.nom_complet}</p>
                                 <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                                  ${emp.statut_actif !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                                   {emp.statut_actif !== false ? "Actif" : "Inactif"}
                                 </div>
                               </div>
                               <div className="flex items-center gap-4 text-[11px] font-medium text-gray-500">
                                 <span className="text-primary font-bold">{emp.poste}</span>
                                 <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gray-300"/>{emp.type_contrat}</span>
                                 {emp.telephone && <span className="flex items-center gap-1.5"><Phone size={10} />{emp.telephone}</span>}
                                 {emp.date_embauche && <span className="flex items-center gap-1.5"><Calendar size={10} />Depuis {format(new Date(emp.date_embauche), "MM/yyyy")}</span>}
                               </div>
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5" onClick={() => openEditEmp(emp)}><Pencil size={15} /></Button>
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                onClick={() => { if (confirm("Supprimer cet employé ?")) deleteEmp.mutate(emp.id); }}>
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Onglet 4 : Cotisations (sync auto) ─────────── */}
                <TabsContent value="cotisations" className="p-6 md:p-8 m-0 space-y-6 bg-[#FDFCFB]">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] mb-6">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <PiggyBank size={14} className="text-gray-400" /> État des Cotisations
                    </h3>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 uppercase tracking-widest shadow-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYNC LIVE
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     {[
                       { label: "Total Réglé", value: `${totalCotis.toLocaleString()} FCFA`, cls: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                       { label: "Transactions", value: cotisations.filter((c: any) => c.statut === "Payé").length, cls: "text-gray-900" },
                       { label: "Reste à payer", value: `${cotisations.filter((c: any) => c.statut !== "Payé").reduce((s: number, c: any) => s + Number(c.montant), 0).toLocaleString()} F`, cls: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
                     ].map((s, i) => (
                        <div key={i} className={`rounded-2xl p-5 border shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1 ${s.bg || 'bg-white border-black/[0.04]'}`}>
                          <p className={`text-2xl font-black mb-1.5 ${s.cls}`}>{s.value}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.label}</p>
                        </div>
                     ))}
                  </div>

                  {cotisationsCumul.length > 0 && (
                    <div className="bg-white rounded-[1.5rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                      <div className="px-6 py-5 border-b border-black/[0.04]">
                         <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">Courbe d'accumulation</h3>
                      </div>
                      <div className="p-6 h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cotisationsCumul} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted))" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} dy={10} />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`, "Cumul"]} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "12px" }} />
                            <Area type="monotone" dataKey="cumul" stroke="#0B1A12" fill="#0B1A1215" strokeWidth={3} name="Cumul" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {cotisations.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-[1.5rem] border border-dashed border-gray-200">
                      <PiggyBank size={40} className="mx-auto mb-4 text-gray-300" /><p className="text-sm font-medium text-gray-500">Aucune cotisation enregistrée</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cotisations.map((c: any) => {
                        const cfg = statutConfig[c.statut] || statutConfig["En attente"];
                        return (
                          <div key={c.id} className="bg-white rounded-2xl border border-black/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-4 flex items-center justify-between group hover:border-black/[0.08] transition-all">
                             <div className="flex items-center gap-4">
                                <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.cls}`}><cfg.icon size={18} /></div>
                                <div>
                                   <div className="flex items-center gap-3 mb-1">
                                      <p className="font-bold text-gray-900 text-base">{c.periode}</p>
                                      <Badge variant="outline" className={`text-[9px] tracking-widest font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{c.statut}</Badge>
                                   </div>
                                   <div className="flex gap-3 text-[11px] font-medium text-gray-500">
                                      <span className="flex items-center gap-1.5"><Calendar size={10}/> {format(new Date(c.date_paiement), "dd MMM yyyy", { locale: fr })}</span>
                                      {c.mode_paiement && <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gray-300"/>{c.mode_paiement}</span>}
                                   </div>
                                </div>
                             </div>
                             <p className="font-black text-xl text-gray-900">{Number(c.montant).toLocaleString()} <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase ml-1">FCFA</span></p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ── Onglet 5 : Finances ────────────────────────── */}
                <TabsContent value="finances" className="p-6 md:p-8 m-0 space-y-6 bg-[#FDFCFB]">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] mb-6">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Package size={14} className="text-gray-400" /> Analyse Financière
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Revenue bar chart */}
                    <div className="bg-white rounded-[1.5rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                      <div className="px-6 py-5 border-b border-black/[0.04]">
                         <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">Historique Revenus (CFA)</h3>
                      </div>
                      <div className="p-6 h-64">
                        {revenueParAnnee.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueParAnnee} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted))" vertical={false} />
                              <XAxis dataKey="annee" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} dy={10} />
                              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} dx={-10} />
                              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} CFA`, "Revenu"]} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "12px" }} />
                              <Bar dataKey="revenue" fill="#D58D39" radius={[6, 6, 0, 0]} maxBarSize={50} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">Aucun revenu enregistré</div>}
                      </div>
                    </div>

                    {/* Culture pie */}
                    <div className="bg-white rounded-[1.5rem] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                      <div className="px-6 py-5 border-b border-black/[0.04]">
                         <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">Répartition Culturale</h3>
                      </div>
                      <div className="p-6 h-64">
                        {cultureData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={cultureData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10} fontWeight={600} >
                                {cultureData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v) => [`${v} T`]} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "12px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">Aucune donnée de culture</div>}
                      </div>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Produit", value: `${totalProd} T`, cls: "text-gray-900" },
                      { label: "Revenue Est.", value: `${(totalRevenuEst / 1000).toLocaleString()}k F`, cls: "text-amber-600" },
                      { label: "Taux Écoulement", value: totalProd > 0 ? `${Math.round(totalVentes / totalProd * 100)}%` : "—", cls: "text-emerald-600" },
                      { label: "Nb Vergers", value: producteur.vergers?.length || 0, cls: "text-blue-600" },
                    ].map(s => (
                       <div key={s.label} className="bg-white border border-black/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-[1.25rem] p-5 text-center transition-transform hover:-translate-y-1">
                         <p className={`text-2xl font-black mb-1.5 tracking-tight ${s.cls}`}>{s.value}</p>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.label}</p>
                       </div>
                    ))}
                  </div>
                </TabsContent>

              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProducteurDetailModal;
