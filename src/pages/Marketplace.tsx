import { useState, useEffect, useRef, useMemo } from "react";
import {
  Save, Loader2, Plus, Trash2, ExternalLink, ImagePlus, X,
  Eye, TrendingDown, BarChart3, Search, MapPin, Package,
  Settings, FileText, Globe, ArrowUpRight, AlertCircle, Edit2,
  CheckCircle2, Tag, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig, useUpdateSiteConfig } from "@/hooks/useSiteConfig";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Produit = {
  id: string;
  nom: string;
  variete?: string;
  zone_production?: string;
  saison?: string;
  quantite_estimee: number;
  norme_qualite?: string;
  usage_type?: string;
  description?: string;
  prix_coop: number;
  prix_marche: number;
  categorie?: string;
  in_ecommerce: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

type PrixMarche = {
  id: string;
  produit: string;
  marche: string;
  prix: number;
  unite_prix: string;
  date_releve: string;
  tendance: string;
  source?: string;
  created_at: string;
};

type NewProduit = {
  nom: string; categorie: string; prix_coop: string; prix_marche: string;
  saison: string; quantite_estimee: string; norme_qualite: string;
  description: string; usage_type: string; zone_production: string; in_ecommerce: boolean;
};

type NewReleve = {
  produit: string; marche: string; prix: string; unite_prix: string;
  date_releve: string; tendance: string; source: string;
};

const emptyProduit = (): NewProduit => ({
  nom: "", categorie: "", prix_coop: "", prix_marche: "",
  saison: "", quantite_estimee: "", norme_qualite: "",
  description: "", usage_type: "Local", zone_production: "", in_ecommerce: true,
});

const emptyReleve = (): NewReleve => ({
  produit: "", marche: "", prix: "", unite_prix: "CFA/kg",
  date_releve: new Date().toISOString().split("T")[0], tendance: "stable", source: "",
});

// ─── Sub-components ───────────────────────────────────────────────────────────
const TrendBadge = ({ t }: { t: string }) => {
  if (t === "hausse") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">▲ Hausse</span>;
  if (t === "baisse") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">▼ Baisse</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">— Stable</span>;
};

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</Label>
    {children}
  </div>
);

const TABS = [
  { id: "catalogue", label: "Catalogue",         icon: Package   },
  { id: "releves",   label: "Relevés de marché", icon: BarChart3 },
  { id: "page",      label: "Config. page",       icon: Settings  },
  { id: "documents", label: "Documents",          icon: FileText  },
] as const;
type TabId = typeof TABS[number]["id"];

const HERO_KEYS = ["prix_hero_title","prix_hero_subtitle","prix_stat_certifiees","prix_stat_economie","prix_stat_stock","prix_stat_zones"];

// ─── Main page ────────────────────────────────────────────────────────────────
const Marketplace = () => {
  const queryClient = useQueryClient();
  const { data: configs } = useSiteConfig();
  const updateConfig    = useUpdateSiteConfig();
  const confirm         = useConfirm();

  const [activeTab, setActiveTab]    = useState<TabId>("catalogue");
  const [searchQ, setSearch]         = useState("");
  const [expandedId, setExpanded]    = useState<string | null>(null);
  const [showAddP, setShowAddP]      = useState(false);
  const [newP, setNewP]              = useState<NewProduit>(emptyProduit());
  const [addingP, setAddingP]        = useState(false);
  const [edits, setEditsMap]         = useState<Record<string, Partial<Produit>>>({});
  const [savingP, setSavingP]        = useState<string[]>([]);
  const [togglingP, setTogglingP]    = useState<string[]>([]);
  const [uploadImg, setUploadImg]    = useState<string[]>([]);
  const [deletingP, setDeletingP]    = useState<string[]>([]);
  const [showAddR, setShowAddR]      = useState(false);
  const [newR, setNewR]              = useState<NewReleve>(emptyReleve());
  const [addingR, setAddingR]        = useState(false);
  const [deletingR, setDeletingR]    = useState<string[]>([]);
  const [editingRId, setEditingRId]  = useState<string | null>(null);
  const [editR, setEditR]            = useState<Partial<NewReleve>>({});
  const [savingR, setSavingR]        = useState(false);
  const [filterR, setFilterR]        = useState("all");
  const [formData, setFormData]      = useState<Record<string, string>>({});
  const [savingCfg, setSavingCfg]    = useState(false);
  const [docs, setDocs]              = useState<any[]>([]);
  const [savingDocs, setSavingDocs]  = useState(false);
  const [showAddDoc, setShowAddDoc]  = useState(false);
  const [newDoc, setNewDoc]          = useState({ name: "", url: "", size: "", date: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentRelevePage, setCurrentRelevePage] = useState(1);
  const imgRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!configs) return;
    const vals: Record<string, string> = {};
    HERO_KEYS.forEach(k => { vals[k] = configs.find(c => c.cle === k)?.valeur ?? ""; });
    setFormData(vals);
    const raw = configs.find(c => c.cle === "public_documents")?.valeur;
    if (raw) { try { const d = JSON.parse(raw); if (Array.isArray(d)) setDocs(d); } catch { /**/ } }
  }, [configs]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: produits = [], isLoading: loadingP } = useQuery({
    queryKey: ["produits-marketplace-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("*").order("nom");
      if (error) throw error;
      return (data || []) as Produit[];
    },
  });

  const { data: releves = [], isLoading: loadingR } = useQuery({
    queryKey: ["prix-marche-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prix_marche").select("*").order("date_releve", { ascending: false });
      if (error) throw error;
      return (data || []) as PrixMarche[];
    },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const visible  = produits.filter(p => p.in_ecommerce).length;
    const noPrix   = produits.filter(p => p.in_ecommerce && p.prix_coop === 0).length;
    const lastDate = releves[0]?.date_releve;
    const elig     = produits.filter(p => p.in_ecommerce && p.prix_marche > 0);
    const avgSav   = elig.length ? Math.round(elig.reduce((a, p) => a + ((p.prix_marche - p.prix_coop) / p.prix_marche) * 100, 0) / elig.length) : 0;
    return { visible, total: produits.length, noPrix, lastDate, avgSav };
  }, [produits, releves]);

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const editP = (id: string, field: string, val: any) =>
    setEditsMap(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));

  const getF = (p: Produit, field: keyof Produit): any => {
    const e = edits[p.id];
    if (e && e[field] !== undefined) return e[field];
    return (p as any)[field] ?? "";
  };

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ["produits-marketplace-admin"] });
    queryClient.invalidateQueries({ queryKey: ["produits-public-ecommerce"] });
  };

  const addProduit = async () => {
    if (!newP.nom.trim()) { toast.error("Le nom du produit est requis"); return; }
    setAddingP(true);
    try {
      const { error } = await supabase.from("produits").insert({
        nom: newP.nom, categorie: newP.categorie || null,
        prix_coop: Number(newP.prix_coop) || 0, prix_marche: Number(newP.prix_marche) || 0,
        saison: newP.saison || null, quantite_estimee: Number(newP.quantite_estimee) || 0,
        norme_qualite: newP.norme_qualite || null, description: newP.description || null,
        usage_type: newP.usage_type, zone_production: newP.zone_production || null,
        in_ecommerce: newP.in_ecommerce,
      });
      if (error) throw error;
      toast.success(`${newP.nom} ajouté avec succès`);
      setNewP(emptyProduit()); setShowAddP(false); inv();
    } catch { toast.error("Erreur lors de l'ajout"); }
    finally { setAddingP(false); }
  };

  const saveProduit = async (p: Produit) => {
    const e = edits[p.id] || {};
    setSavingP(prev => [...prev, p.id]);
    try {
      const { error } = await supabase.from("produits").update({
        nom: e.nom ?? p.nom, categorie: e.categorie ?? p.categorie,
        prix_coop: Number(e.prix_coop ?? p.prix_coop),
        prix_marche: Number(e.prix_marche ?? p.prix_marche),
        saison: e.saison ?? p.saison, norme_qualite: e.norme_qualite ?? p.norme_qualite,
        description: e.description ?? p.description,
        quantite_estimee: Number(e.quantite_estimee ?? p.quantite_estimee),
        zone_production: e.zone_production ?? p.zone_production,
        usage_type: e.usage_type ?? p.usage_type,
      }).eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.nom} mis à jour`);
      setEditsMap(prev => { const n = { ...prev }; delete n[p.id]; return n; });
      inv();
    } catch { toast.error("Erreur lors de la mise à jour"); }
    finally { setSavingP(prev => prev.filter(i => i !== p.id)); }
  };

  const deleteProduit = (p: Produit) => confirm({
    title: "Supprimer ce produit",
    description: `Voulez-vous définitivement supprimer "${p.nom}" du catalogue ?`,
    confirmLabel: "Supprimer", variant: "danger",
    onConfirm: async () => {
      setDeletingP(prev => [...prev, p.id]);
      try {
        const { error } = await supabase.from("produits").delete().eq("id", p.id);
        if (error) throw error;
        toast.success(`${p.nom} supprimé`); inv();
      } catch { toast.error("Erreur lors de la suppression"); }
      finally { setDeletingP(prev => prev.filter(i => i !== p.id)); }
    },
  });

  const toggleVis = async (p: Produit) => {
    setTogglingP(prev => [...prev, p.id]);
    try {
      const { error } = await supabase.from("produits").update({ in_ecommerce: !p.in_ecommerce }).eq("id", p.id);
      if (error) throw error; inv();
    } catch { toast.error("Erreur"); }
    finally { setTogglingP(prev => prev.filter(i => i !== p.id)); }
  };

  const uploadImage = async (p: Produit, file: File) => {
    setUploadImg(prev => [...prev, p.id]);
    try {
      const ext  = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `products/${fileName}`;
      const { error: upErr } = await supabase.storage.from("content-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("content-images").getPublicUrl(path);
      const { error } = await supabase.from("produits").update({ image_url: data.publicUrl, photo_url: data.publicUrl }).eq("id", p.id);
      if (error) throw error;
      toast.success("Photo mise à jour"); inv();
    } catch (err) { console.error(err); toast.error("Erreur lors de l'upload de la photo"); }
    finally { setUploadImg(prev => prev.filter(i => i !== p.id)); }
  };

  const removeImage = async (p: Produit) => {
    const { error } = await supabase.from("produits").update({ image_url: null, photo_url: null }).eq("id", p.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Photo supprimée"); inv();
  };

  // ── Relevés CRUD ──────────────────────────────────────────────────────────
  const invR = () => {
    queryClient.invalidateQueries({ queryKey: ["prix-marche-admin"] });
    queryClient.invalidateQueries({ queryKey: ["prix-marche-public"] });
  };

  const addReleve = async () => {
    if (!newR.produit || !newR.marche || !newR.prix) { toast.error("Produit, marché et prix sont obligatoires"); return; }
    setAddingR(true);
    try {
      const { error } = await supabase.from("prix_marche").insert({
        produit: newR.produit, marche: newR.marche, prix: Number(newR.prix),
        unite_prix: newR.unite_prix || "CFA/kg", date_releve: newR.date_releve,
        tendance: newR.tendance, source: newR.source || null,
      });
      if (error) throw error;
      toast.success("Relevé ajouté");
      setNewR(emptyReleve()); setShowAddR(false); invR();
    } catch { toast.error("Erreur lors de l'ajout"); }
    finally { setAddingR(false); }
  };

  const deleteReleve = (id: string, produit: string) => confirm({
    title: "Supprimer ce relevé",
    description: `Voulez-vous supprimer le relevé de prix pour "${produit}" ?`,
    confirmLabel: "Supprimer", variant: "danger",
    onConfirm: async () => {
      setDeletingR(prev => [...prev, id]);
      try {
        const { error } = await supabase.from("prix_marche").delete().eq("id", id);
        if (error) throw error;
        invR(); toast.success("Relevé supprimé");
      } catch { toast.error("Erreur"); }
      finally { setDeletingR(prev => prev.filter(i => i !== id)); }
    },
  });

  const startEditR = (r: PrixMarche) => {
    setEditingRId(r.id);
    setEditR({ produit: r.produit, marche: r.marche, prix: String(r.prix), unite_prix: r.unite_prix, date_releve: r.date_releve, tendance: r.tendance, source: r.source || "" });
  };

  const updateReleve = async (id: string) => {
    if (!editR.produit || !editR.marche || !editR.prix) { toast.error("Produit, marché et prix sont obligatoires"); return; }
    setSavingR(true);
    try {
      const { error } = await supabase.from("prix_marche").update({
        produit: editR.produit, marche: editR.marche, prix: Number(editR.prix),
        unite_prix: editR.unite_prix || "CFA/kg", date_releve: editR.date_releve,
        tendance: editR.tendance, source: editR.source || null,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Relevé mis à jour");
      setEditingRId(null); invR();
    } catch { toast.error("Erreur lors de la mise à jour"); }
    finally { setSavingR(false); }
  };

  // ── Config helpers ────────────────────────────────────────────────────────
  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await Promise.all(HERO_KEYS.map(k => updateConfig.mutateAsync({ cle: k, valeur: formData[k] ?? "" })));
      toast.success("Configuration enregistrée");
    } catch { toast.error("Erreur lors de l'enregistrement"); }
    finally { setSavingCfg(false); }
  };

  // ── Docs helpers ──────────────────────────────────────────────────────────
  const persistDocs = async (updated: any[]) => {
    setSavingDocs(true);
    try {
      await updateConfig.mutateAsync({ cle: "public_documents", valeur: JSON.stringify(updated) });
      toast.success("Documents sauvegardés");
    } catch { toast.error("Erreur"); }
    finally { setSavingDocs(false); }
  };

  const addDoc = async () => {
    if (!newDoc.name || !newDoc.url) { toast.error("Nom et URL sont requis"); return; }
    const updated = [...docs, { ...newDoc, id: crypto.randomUUID() }];
    setDocs(updated); await persistDocs(updated);
    setNewDoc({ name: "", url: "", size: "", date: "" }); setShowAddDoc(false);
  };

  const removeDoc = async (id: string) => {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated); await persistDocs(updated);
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const PAGE_SIZE       = 12;
  const filteredProduits  = useMemo(() => produits.filter(p => p.nom.toLowerCase().includes(searchQ.toLowerCase())), [produits, searchQ]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQ]);

  const totalPages      = Math.max(1, Math.ceil(filteredProduits.length / PAGE_SIZE));
  const pagedProduits   = useMemo(
    () => filteredProduits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredProduits, currentPage]
  );
  const filteredReleves   = useMemo(() => releves.filter(r => filterR === "all" || r.produit === filterR), [releves, filterR]);
  
  useEffect(() => {
    setCurrentRelevePage(1);
  }, [filterR]);

  const totalRelevePages = Math.max(1, Math.ceil(filteredReleves.length / PAGE_SIZE));
  const pagedReleves    = useMemo(
    () => filteredReleves.slice((currentRelevePage - 1) * PAGE_SIZE, currentRelevePage * PAGE_SIZE),
    [filteredReleves, currentRelevePage]
  );
  const produitNames      = useMemo(() => [...new Set(releves.map(r => r.produit))], [releves]);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout
      title="Prix & Catalogue Public"
      subtitle="Gérez les produits et tarifs affichés sur la page publique /prix"
      actions={
        <Link to="/prix" target="_blank" className="inline-flex items-center gap-2 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
          <Globe size={13} />Voir la page publique<ArrowUpRight size={12} />
        </Link>
      }
    >
      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Produits visibles",    value: stats.visible,         icon: Eye,         col: "emerald", alert: false },
          { label: "Total catalogue",      value: stats.total,           icon: Package,     col: "blue",    alert: false },
          { label: "Sans prix renseigné",  value: stats.noPrix,          icon: AlertCircle, col: stats.noPrix > 0 ? "red" : "gray", alert: stats.noPrix > 0 },
          { label: "Économie moyenne",     value: `${stats.avgSav}%`,    icon: TrendingDown, col: "emerald", alert: false },
        ].map(({ label, value, icon: Icon, col, alert }) => (
          <div key={label} className={`bg-white dark:bg-[#131d2e] rounded-2xl border p-5 ${alert ? "border-red-200 dark:border-red-800/40" : "border-gray-100 dark:border-[#1e2d45]"}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${col === "emerald" ? "bg-emerald-50 dark:bg-emerald-900/20" : col === "red" ? "bg-red-50 dark:bg-red-900/20" : col === "blue" ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-white/5"}`}>
                <Icon size={14} className={col === "emerald" ? "text-emerald-600 dark:text-emerald-400" : col === "red" ? "text-red-500" : col === "blue" ? "text-blue-500" : "text-gray-400"} />
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${alert ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{value}</p>
          </div>
        ))}
      </div>

      {stats.lastDate && (
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-400">
          <CheckCircle2 size={12} className="text-emerald-500" />
          Dernier relevé enregistré le{" "}
          <span className="font-semibold text-gray-600 dark:text-gray-300">{format(parseISO(stats.lastDate), "dd MMMM yyyy", { locale: fr })}</span>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      {/* ── Toolbar - Quantum Unified ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2 mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button 
              key={id} 
              onClick={() => setActiveTab(id)} 
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                activeTab === id 
                  ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20" 
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5"
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
              {id === "catalogue" && stats.noPrix > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 ml-1 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <Input 
            placeholder="Rechercher un produit, une variété, une zone..." 
            value={searchQ} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11 text-base" 
          />
        </div>

        <div className="flex items-center gap-2 px-1">
          <Button 
            onClick={() => setShowAddP(v => !v)} 
            className="h-10 px-6 rounded-xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-lg shadow-emerald-900/10 font-bold transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus size={16} className="mr-2" />
            Ajouter un produit
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CATALOGUE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "catalogue" && (
        <div className="space-y-4">
          {/* Action row removed as integrated into Unified Toolbar */}

          <AnimatePresence>
            {showAddP && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="bg-white dark:bg-[#131d2e] rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Nouveau produit</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Sera visible sur /prix si "Visible" est coché</p>
                  </div>
                  <button onClick={() => { setShowAddP(false); setNewP(emptyProduit()); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  <FieldRow label="Nom du produit *"><Input value={newP.nom} onChange={e => setNewP(p => ({ ...p, nom: e.target.value }))} placeholder="Mangue Kent" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Catégorie"><Input value={newP.categorie} onChange={e => setNewP(p => ({ ...p, categorie: e.target.value }))} placeholder="Fruits" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Prix Coopérative (CFA/kg)"><Input type="number" value={newP.prix_coop} onChange={e => setNewP(p => ({ ...p, prix_coop: e.target.value }))} placeholder="0" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Prix Marché (CFA/kg)"><Input type="number" value={newP.prix_marche} onChange={e => setNewP(p => ({ ...p, prix_marche: e.target.value }))} placeholder="0" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Saison"><Input value={newP.saison} onChange={e => setNewP(p => ({ ...p, saison: e.target.value }))} placeholder="Avr – Juil" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Stock (tonnes)"><Input type="number" value={newP.quantite_estimee} onChange={e => setNewP(p => ({ ...p, quantite_estimee: e.target.value }))} placeholder="0" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Certification"><Input value={newP.norme_qualite} onChange={e => setNewP(p => ({ ...p, norme_qualite: e.target.value }))} placeholder="Bio certifiée" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Zone de production"><Input value={newP.zone_production} onChange={e => setNewP(p => ({ ...p, zone_production: e.target.value }))} placeholder="Casamance" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Usage">
                    <select value={newP.usage_type} onChange={e => setNewP(p => ({ ...p, usage_type: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm dark:bg-[#0f1c2e]">
                      <option value="Local">Local</option><option value="Export">Export</option><option value="Local & Export">Local & Export</option>
                    </select>
                  </FieldRow>
                  <div className="sm:col-span-2 md:col-span-3"><FieldRow label="Description"><Textarea value={newP.description} onChange={e => setNewP(p => ({ ...p, description: e.target.value }))} placeholder="Brève description…" className="min-h-[70px] text-sm resize-none" /></FieldRow></div>
                </div>
                <div className="flex items-center gap-4">
                  <Button onClick={addProduit} disabled={addingP} className="h-9 bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-2 rounded-xl">
                    {addingP ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Ajouter au catalogue
                  </Button>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={newP.in_ecommerce} onChange={e => setNewP(p => ({ ...p, in_ecommerce: e.target.checked }))} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Visible sur /prix</span>
                  </label>
                  <button onClick={() => { setShowAddP(false); setNewP(emptyProduit()); }} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loadingP ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-400"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Chargement du catalogue…</span></div>
          ) : filteredProduits.length === 0 ? (
            <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-14 text-center">
              <Package size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun produit trouvé</p>
              <p className="text-xs text-gray-400 mt-1.5">Cliquez sur "Ajouter un produit" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pagedProduits.map(p => {
                const isExp    = expandedId === p.id;
                const isSave   = savingP.includes(p.id);
                const isTog    = togglingP.includes(p.id);
                const isDel    = deletingP.includes(p.id);
                const hasEdits = !!(edits[p.id] && Object.keys(edits[p.id]).length);
                const pxC      = Number(getF(p, "prix_coop"));
                const pxM      = Number(getF(p, "prix_marche"));
                const sav      = pxM > 0 ? Math.round(((pxM - pxC) / pxM) * 100) : 0;
                
                // Detection of missing pricing
                const isPriceMissing = pxC === 0 && p.in_ecommerce;
                return (
                  <div key={p.id} className={`bg-white dark:bg-[#131d2e] rounded-2xl border overflow-hidden transition-all duration-200 ${hasEdits ? "border-amber-300 dark:border-amber-600/40 ring-2 ring-amber-200/50 dark:ring-amber-600/20" : "border-gray-100 dark:border-[#1e2d45]"} ${!p.in_ecommerce ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-black/[0.03] dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center shrink-0 shadow-inner">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.nom}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                          />
                        ) : null}
                        <Package size={20} className={`text-gray-300 dark:text-gray-600 ${p.image_url ? "hidden" : ""}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-base text-gray-900 dark:text-gray-100 tracking-tight leading-none">{p.nom}</span>
                          {p.categorie && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-lg">{p.categorie}</span>}
                          
                          <div className="flex gap-1 ml-auto sm:ml-0">
                            {p.in_ecommerce ? (
                               <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-lg uppercase tracking-widest">Visible</span>
                            ) : (
                               <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg uppercase tracking-widest">Archive</span>
                            )}
                            {isPriceMissing && (
                               <span className="text-[9px] font-black text-white bg-red-500 px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-red-500/20">
                                 <AlertCircle size={10} /> Prix requis
                               </span>
                            )}
                            {hasEdits && (
                               <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg uppercase tracking-widest">Modifié</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-[#1A2E1C] dark:text-emerald-400 leading-none">{pxC.toLocaleString("fr-FR")}</span>
                            <span className="font-bold text-gray-400 text-[10px] uppercase tracking-widest">CFA/kg</span>
                          </div>
                          
                          {pxM > 0 && (
                            <div className="flex items-center gap-2">
                               <span className="text-xs text-gray-300 dark:text-gray-600 line-through font-medium">{pxM.toLocaleString("fr-FR")}</span>
                               {sav > 0 && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg">-{sav}%</span>}
                            </div>
                          )}
                          
                          {p.saison && (
                            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                               <Tag size={12} className="text-gray-300" />
                               <span className="text-xs font-medium italic">{p.saison}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {hasEdits && (
                          <Button size="sm" onClick={() => saveProduit(p)} disabled={isSave} className="h-8 text-xs bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-1.5 rounded-xl">
                            {isSave ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}<span className="hidden sm:inline">Sauvegarder</span>
                          </Button>
                        )}
                        <button onClick={() => toggleVis(p)} disabled={isTog} title={p.in_ecommerce ? "Masquer de /prix" : "Afficher sur /prix"} className={`relative rounded-full transition-colors shrink-0 ${p.in_ecommerce ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} style={{ width: 38, height: 22 }}>
                          {isTog ? <Loader2 size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" /> : <span className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${p.in_ecommerce ? "translate-x-[18px]" : "translate-x-[3px]"}`} />}
                        </button>
                        <button onClick={() => setExpanded(isExp ? null : p.id)} className={`p-1.5 rounded-lg transition-colors ${isExp ? "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5"}`}><Edit2 size={14} /></button>
                        <button onClick={() => deleteProduit(p)} disabled={isDel} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          {isDel ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-gray-100 dark:border-[#1e2d45]">
                          <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            <FieldRow label="Nom"><Input value={String(getF(p, "nom"))} onChange={e => editP(p.id, "nom", e.target.value)} className="h-8 text-sm" /></FieldRow>
                            <FieldRow label="Catégorie"><Input value={String(getF(p, "categorie") || "")} onChange={e => editP(p.id, "categorie", e.target.value)} className="h-8 text-sm" placeholder="Fruits" /></FieldRow>
                            <FieldRow label="Prix Coop (CFA/kg)"><Input type="number" value={String(getF(p, "prix_coop"))} onChange={e => editP(p.id, "prix_coop", e.target.value)} className="h-8 text-sm" /></FieldRow>
                            <FieldRow label="Prix Marché (CFA/kg)"><Input type="number" value={String(getF(p, "prix_marche"))} onChange={e => editP(p.id, "prix_marche", e.target.value)} className="h-8 text-sm" /></FieldRow>
                            <FieldRow label="Saison"><Input value={String(getF(p, "saison") || "")} onChange={e => editP(p.id, "saison", e.target.value)} className="h-8 text-sm" placeholder="Avr – Juil" /></FieldRow>
                            <FieldRow label="Stock (t)"><Input type="number" value={String(getF(p, "quantite_estimee"))} onChange={e => editP(p.id, "quantite_estimee", e.target.value)} className="h-8 text-sm" /></FieldRow>
                            <FieldRow label="Certification"><Input value={String(getF(p, "norme_qualite") || "")} onChange={e => editP(p.id, "norme_qualite", e.target.value)} className="h-8 text-sm" placeholder="Bio certifiée" /></FieldRow>
                            <FieldRow label="Zone production"><Input value={String(getF(p, "zone_production") || "")} onChange={e => editP(p.id, "zone_production", e.target.value)} className="h-8 text-sm" placeholder="Casamance" /></FieldRow>
                            <FieldRow label="Usage">
                              <select value={String(getF(p, "usage_type") || "Local")} onChange={e => editP(p.id, "usage_type", e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm dark:bg-[#0f1c2e]">
                                <option value="Local">Local</option><option value="Export">Export</option><option value="Local & Export">Local & Export</option>
                              </select>
                            </FieldRow>
                            <div className="col-span-2 md:col-span-3 lg:col-span-4"><FieldRow label="Description"><Textarea value={String(getF(p, "description") || "")} onChange={e => editP(p.id, "description", e.target.value)} className="min-h-[60px] text-sm resize-none" placeholder="Description courte…" /></FieldRow></div>
                            <div className="col-span-2 md:col-span-3 lg:col-span-4">
                              <FieldRow label="Photo du produit">
                                <div className="flex items-center gap-3 mt-1">
                                  {p.image_url ? (
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 group cursor-pointer">
                                      <img
                                        src={p.image_url}
                                        alt={p.nom}
                                        className="w-full h-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
                                      />
                                      <button onClick={() => removeImage(p)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X size={14} className="text-white" /></button>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 bg-gray-50 dark:bg-white/[0.02]">
                                      <ImagePlus size={16} className="text-gray-300 dark:text-gray-600" />
                                    </div>
                                  )}
                                  <div>
                                    <input ref={el => { imgRefs.current[p.id] = el; }} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(p, f); e.target.value = ""; }} />
                                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl" disabled={uploadImg.includes(p.id)} onClick={() => imgRefs.current[p.id]?.click()}>
                                      {uploadImg.includes(p.id) ? <><Loader2 size={11} className="animate-spin" />Chargement…</> : <><ImagePlus size={11} />{p.image_url ? "Changer la photo" : "Ajouter une photo"}</>}
                                    </Button>
                                    <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WebP · max 5 MB</p>
                                  </div>
                                </div>
                              </FieldRow>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Pagination ─────────────────────────────────────────────────── */}
          {/* ── Premium Quantum Pagination ─────────────────────────────────────────────────── */}
          {!loadingP && filteredProduits.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-gray-100 dark:border-white/5 mt-6 gap-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Index {(currentPage - 1) * PAGE_SIZE + 1} – {Math.min(currentPage * PAGE_SIZE, filteredProduits.length)} sur {filteredProduits.length} produits
              </div>
              
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </Button>

                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={currentPage === pg ? "default" : "outline"}
                      onClick={() => setCurrentPage(pg)}
                      className={cn(
                        "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                        currentPage === pg 
                          ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                          : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-gray-50"
                      )}
                    >
                      {pg}
                    </Button>
                  ))
                ) : (
                  <>
                    {[1, 2, 3].map(pg => (
                      <Button
                        key={pg}
                        variant={currentPage === pg ? "default" : "outline"}
                        onClick={() => setCurrentPage(pg)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                          currentPage === pg 
                            ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                            : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        {pg}
                      </Button>
                    ))}
                    <span className="px-1 text-gray-300">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      onClick={() => setCurrentPage(totalPages)}
                      className={cn(
                        "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                        currentPage === totalPages 
                          ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                          : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-gray-50"
                      )}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: RELEVÉS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "releves" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <select value={filterR} onChange={e => setFilterR(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#131d2e] px-3 text-sm text-gray-700 dark:text-gray-300">
              <option value="all">Tous les produits</option>
              {produitNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Button onClick={() => setShowAddR(v => !v)} className="h-10 rounded-xl bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-2">
              <Plus size={15} />Ajouter un relevé
            </Button>
          </div>

          <AnimatePresence>
            {showAddR && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="bg-white dark:bg-[#131d2e] rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Nouveau relevé de marché</h3>
                  <button onClick={() => setShowAddR(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><X size={15} /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <FieldRow label="Produit *"><Input value={newR.produit} onChange={e => setNewR(r => ({ ...r, produit: e.target.value }))} className="h-9 text-sm" placeholder="Mangue Kent" /></FieldRow>
                  <FieldRow label="Marché *"><Input value={newR.marche} onChange={e => setNewR(r => ({ ...r, marche: e.target.value }))} className="h-9 text-sm" placeholder="Ziguinchor (Escale)" /></FieldRow>
                  <FieldRow label="Prix *"><Input type="number" value={newR.prix} onChange={e => setNewR(r => ({ ...r, prix: e.target.value }))} className="h-9 text-sm" placeholder="750" /></FieldRow>
                  <FieldRow label="Unité"><Input value={newR.unite_prix} onChange={e => setNewR(r => ({ ...r, unite_prix: e.target.value }))} className="h-9 text-sm" placeholder="CFA/kg" /></FieldRow>
                  <FieldRow label="Date"><Input type="date" value={newR.date_releve} onChange={e => setNewR(r => ({ ...r, date_releve: e.target.value }))} className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Tendance">
                    <select value={newR.tendance} onChange={e => setNewR(r => ({ ...r, tendance: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm dark:bg-[#0f1c2e]">
                      <option value="hausse">Hausse</option><option value="baisse">Baisse</option><option value="stable">Stable</option>
                    </select>
                  </FieldRow>
                  <div className="col-span-2 md:col-span-3"><FieldRow label="Source"><Input value={newR.source} onChange={e => setNewR(r => ({ ...r, source: e.target.value }))} className="h-9 text-sm" placeholder="ARM / Observatoire des prix…" /></FieldRow></div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={addReleve} disabled={addingR} className="h-9 bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-2 rounded-xl">
                    {addingR ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Ajouter
                  </Button>
                  <button onClick={() => setShowAddR(false)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loadingR ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-400"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Chargement…</span></div>
          ) : filteredReleves.length === 0 ? (
            <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-14 text-center">
              <BarChart3 size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Aucun relevé enregistré</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-[#1e2d45]">
                      {["Date","Produit","Marché","Prix","Tendance","Source",""].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
                    {pagedReleves.map(r => {
                      const isEditing = editingRId === r.id;
                      return isEditing ? (
                        <tr key={r.id} className="bg-emerald-50/40 dark:bg-emerald-900/10">
                          <td className="px-5 py-2.5 pl-6">
                            <Input type="date" value={editR.date_releve} onChange={e => setEditR(v => ({ ...v, date_releve: e.target.value }))} className="h-8 text-xs w-36" />
                          </td>
                          <td className="px-5 py-2.5">
                            <Input value={editR.produit} onChange={e => setEditR(v => ({ ...v, produit: e.target.value }))} className="h-8 text-xs w-36" placeholder="Produit" />
                          </td>
                          <td className="px-5 py-2.5">
                            <Input value={editR.marche} onChange={e => setEditR(v => ({ ...v, marche: e.target.value }))} className="h-8 text-xs w-36" placeholder="Marché" />
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Input type="number" value={editR.prix} onChange={e => setEditR(v => ({ ...v, prix: e.target.value }))} className="h-8 text-xs w-24" placeholder="Prix" />
                              <Input value={editR.unite_prix} onChange={e => setEditR(v => ({ ...v, unite_prix: e.target.value }))} className="h-8 text-xs w-20" placeholder="CFA/kg" />
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <select value={editR.tendance} onChange={e => setEditR(v => ({ ...v, tendance: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-xs dark:bg-[#0f1c2e]">
                              <option value="hausse">Hausse</option>
                              <option value="baisse">Baisse</option>
                              <option value="stable">Stable</option>
                            </select>
                          </td>
                          <td className="px-5 py-2.5">
                            <Input value={editR.source} onChange={e => setEditR(v => ({ ...v, source: e.target.value }))} className="h-8 text-xs w-40" placeholder="Source" />
                          </td>
                          <td className="px-5 py-2.5 pr-6">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => updateReleve(r.id)} disabled={savingR} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                {savingR ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Enregistrer
                              </button>
                              <button onClick={() => setEditingRId(null)} className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                Annuler
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 pl-6 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{format(parseISO(r.date_releve), "dd MMM yyyy", { locale: fr })}</td>
                          <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-gray-100">{r.produit}</td>
                          <td className="px-5 py-3.5"><span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap"><MapPin size={11} className="text-gray-300 dark:text-gray-600 shrink-0" />{r.marche}</span></td>
                          <td className="px-5 py-3.5 whitespace-nowrap"><span className="font-bold text-gray-900 dark:text-gray-100">{Number(r.prix).toLocaleString("fr-FR")}</span><span className="text-xs text-gray-400 ml-1">{r.unite_prix}</span></td>
                          <td className="px-5 py-3.5"><TrendBadge t={r.tendance} /></td>
                          <td className="px-5 py-3.5 text-xs text-gray-400 max-w-[120px] truncate">{r.source || "—"}</td>
                          <td className="px-5 py-3.5 pr-6 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => startEditR(r)} className="text-blue-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => deleteReleve(r.id, r.produit)} disabled={deletingR.includes(r.id)} className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                {deletingR.includes(r.id) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* ── Premium Quantum Pagination (Relevés) ─────────────────────────────────── */}
              <div className="px-6 py-5 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Index {(currentRelevePage - 1) * PAGE_SIZE + 1} – {Math.min(currentRelevePage * PAGE_SIZE, filteredReleves.length)} sur {filteredReleves.length} relevés
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentRelevePage(p => Math.max(1, p - 1))} 
                    disabled={currentRelevePage === 1} 
                    className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  {totalRelevePages <= 7 ? (
                    Array.from({ length: totalRelevePages }, (_, i) => i + 1).map(pg => (
                      <Button
                        key={pg}
                        variant={currentRelevePage === pg ? "default" : "outline"}
                        onClick={() => setCurrentRelevePage(pg)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                          currentRelevePage === pg 
                            ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                            : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        {pg}
                      </Button>
                    ))
                  ) : (
                    <>
                      {[1, 2, 3].map(pg => (
                        <Button
                          key={pg}
                          variant={currentRelevePage === pg ? "default" : "outline"}
                          onClick={() => setCurrentRelevePage(pg)}
                          className={cn(
                            "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                            currentRelevePage === pg 
                              ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                              : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-gray-50"
                          )}
                        >
                          {pg}
                        </Button>
                      ))}
                      <span className="px-1 text-gray-300">...</span>
                      <Button
                        variant={currentRelevePage === totalRelevePages ? "default" : "outline"}
                        onClick={() => setCurrentRelevePage(totalRelevePages)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                          currentRelevePage === totalRelevePages 
                            ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                            : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        {totalRelevePages}
                      </Button>
                    </>
                  )}

                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentRelevePage(p => Math.min(totalRelevePages, p + 1))} 
                    disabled={currentRelevePage === totalRelevePages} 
                    className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PAGE CONFIG
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "page" && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-0.5">Section Hero</h3>
            <p className="text-xs text-gray-400 mb-5">Titre et sous-titre affichés en haut de la page /prix</p>
            <div className="space-y-4">
              <FieldRow label="Titre principal"><Input value={formData["prix_hero_title"] ?? ""} onChange={e => setFormData(p => ({ ...p, prix_hero_title: e.target.value }))} placeholder="Transparence des prix agricoles en temps réel" /></FieldRow>
              <FieldRow label="Sous-titre"><Textarea value={formData["prix_hero_subtitle"] ?? ""} onChange={e => setFormData(p => ({ ...p, prix_hero_subtitle: e.target.value }))} className="min-h-[80px] resize-none" placeholder="Prix de vente directs proposés par la coopérative…" /></FieldRow>
            </div>
          </div>
          <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-0.5">Statistiques hero</h3>
            <p className="text-xs text-gray-400 mb-5">Laisser vide = valeur calculée automatiquement depuis la base de données</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "prix_stat_certifiees", label: "Spéculations certifiées", ph: "auto" },
                { key: "prix_stat_economie",   label: "Économie moyenne",        ph: "~12%" },
                { key: "prix_stat_stock",      label: "Stock disponible",        ph: "auto" },
                { key: "prix_stat_zones",      label: "Zones de couverture",     ph: "auto" },
              ].map(({ key, label, ph }) => (
                <FieldRow key={key} label={label}><Input value={formData[key] ?? ""} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} className="h-9 text-sm" /></FieldRow>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveConfig} disabled={savingCfg} className="h-10 bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-2 rounded-xl">
              {savingCfg ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Enregistrer la configuration
            </Button>
            <Link to="/prix" target="_blank" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-semibold"><ExternalLink size={13} />Voir le résultat</Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DOCUMENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "documents" && (
        <div className="max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Documents publics</h3>
              <p className="text-xs text-gray-400 mt-0.5">Fichiers téléchargeables depuis le bouton "Catalogue" sur /prix</p>
            </div>
            <Button onClick={() => setShowAddDoc(v => !v)} className="h-10 rounded-xl bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-2"><Plus size={14} />Ajouter</Button>
          </div>

          <AnimatePresence>
            {showAddDoc && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-[#131d2e] rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 p-5">
                <div className="flex items-center justify-between mb-4"><h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Nouveau document</h4><button onClick={() => setShowAddDoc(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><X size={15} /></button></div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="col-span-2"><FieldRow label="Nom du document *"><Input value={newDoc.name} onChange={e => setNewDoc(d => ({ ...d, name: e.target.value }))} placeholder="Catalogue 2024 – CoopZig" className="h-9 text-sm" /></FieldRow></div>
                  <div className="col-span-2"><FieldRow label="URL du document *"><Input value={newDoc.url} onChange={e => setNewDoc(d => ({ ...d, url: e.target.value }))} placeholder="https://…/catalogue.pdf" className="h-9 text-sm" /></FieldRow></div>
                  <FieldRow label="Taille (ex: 2.4 MB)"><Input value={newDoc.size} onChange={e => setNewDoc(d => ({ ...d, size: e.target.value }))} placeholder="2.4 MB" className="h-9 text-sm" /></FieldRow>
                  <FieldRow label="Date (ex: Avr 2024)"><Input value={newDoc.date} onChange={e => setNewDoc(d => ({ ...d, date: e.target.value }))} placeholder="Avr 2024" className="h-9 text-sm" /></FieldRow>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={addDoc} disabled={savingDocs} className="h-9 bg-[#1A2E1C] dark:bg-emerald-800 text-white gap-2 rounded-xl">{savingDocs ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Ajouter</Button>
                  <button onClick={() => setShowAddDoc(false)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {docs.length === 0 ? (
            <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-12 text-center">
              <FileText size={32} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Aucun document public</p>
              <p className="text-xs text-gray-400 mt-1.5">Les documents s'affichent dans le bouton "Télécharger le catalogue" sur /prix</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {docs.map((doc, i) => (
                <div key={doc.id || i} className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] px-5 py-4 flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0"><FileText size={15} className="text-emerald-600 dark:text-emerald-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      {doc.size && <span className="bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md font-medium">{doc.size}</span>}
                      {doc.date && <span>{doc.date}</span>}
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center gap-0.5 font-medium"><ExternalLink size={10} />Ouvrir</a>
                    </div>
                  </div>
                  <button onClick={() => removeDoc(doc.id || i)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Tag size={11} />Pour héberger un PDF dans Supabase Storage, utilisez la page <Link to="/gestion-documents" className="text-emerald-600 hover:underline font-medium">Documents</Link>
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Marketplace;
