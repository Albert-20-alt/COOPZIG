import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Save, Loader2, Plus, Trash2, ExternalLink, ImagePlus, X, Search, ChevronUp, ChevronDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
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

const SectionHeader = ({ title, desc, icon: Icon }: { title: string; desc?: string; icon?: any }) => (
  <div className="flex items-start gap-4 mb-8">
    {Icon && (
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-800/20">
        <Icon size={24} className="text-emerald-600 dark:text-emerald-400" />
      </div>
    )}
    <div>
      <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-none">{title}</h4>
      {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed max-w-2xl">{desc}</p>}
    </div>
  </div>
);

type PrixMarcheRow = {
  id: string;
  produit: string;
  marche: string;
  prix: number;
  unite_prix: string;
  date_releve: string;
  tendance: string;
  source: string;
};

type NewReleve = Omit<PrixMarcheRow, "id">;

const emptyReleve = (): NewReleve => ({
  produit: "",
  marche: "",
  prix: 0,
  unite_prix: "CFA/kg",
  date_releve: new Date().toISOString().split("T")[0],
  tendance: "stable",
  source: "",
});

const GestionPrix = () => {
  const queryClient = useQueryClient();
  const { data: configs } = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();
  const confirm = useConfirm();

  // ── site_config form state ──────────────────────────────────────────────────
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<string[]>([]);

  const heroKeys = [
    "prix_hero_title", "prix_hero_subtitle",
    "prix_stat_certifiees", "prix_stat_economie", "prix_stat_stock", "prix_stat_zones",
  ];

  useEffect(() => {
    if (!configs) return;
    const vals: Record<string, string> = {};
    heroKeys.forEach((k) => {
      const found = configs.find((c) => c.cle === k);
      vals[k] = found?.valeur ?? "";
    });
    setFormData(vals);
  }, [configs]);

  const handleChange = (key: string, val: string) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSaveKeys = async (keys: string[]) => {
    setSavingKeys((prev) => [...prev, ...keys]);
    try {
      await Promise.all(keys.map((k) => updateConfig.mutateAsync({ cle: k, valeur: formData[k] ?? "" })));
      toast.success("Enregistré");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingKeys((prev) => prev.filter((k) => !keys.includes(k)));
    }
  };

  const SaveBtn = ({ keys }: { keys: string[] }) => {
    const saving = keys.some((k) => savingKeys.includes(k));
    return (
      <Button
        onClick={() => handleSaveKeys(keys)}
        disabled={saving}
        className="bg-[#1A2E1C] dark:bg-emerald-800 text-white hover:bg-[#1A2E1C]/90 rounded-xl h-11 px-6 shadow-lg shadow-emerald-900/20 gap-2"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Enregistrer les modifications
      </Button>
    );
  };

  // ── Produits in_ecommerce ───────────────────────────────────────────────────
  const { data: produits = [], isLoading: loadingProduits } = useQuery({
    queryKey: ["produits-ecommerce-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produits")
        .select("id, nom, categorie, prix_coop, prix_marche, saison, norme_qualite, description, quantite_estimee, in_ecommerce")
        .order("nom");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [produitEdits, setProduitEdits] = useState<Record<string, any>>({});
  const [savingProduits, setSavingProduits] = useState<string[]>([]);
  const [togglingProduits, setTogglingProduits] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<string[]>([]);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadProductImage = async (p: any, file: File) => {
    setUploadingImage(prev => [...prev, p.id]);
    try {
      const ext = file.name.split(".").pop();
      const path = `produits/${p.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("content-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("content-images").getPublicUrl(path);
      const url = data.publicUrl;
      const { error } = await (supabase as any).from("produits").update({ image_url: url }).eq("id", p.id);
      if (error) throw error;
      toast.success("Photo mise à jour");
      queryClient.invalidateQueries({ queryKey: ["produits-ecommerce-admin"] });
      queryClient.invalidateQueries({ queryKey: ["produits-public-ecommerce"] });
    } catch {
      toast.error("Erreur lors du chargement de l'image");
    } finally {
      setUploadingImage(prev => prev.filter(id => id !== p.id));
    }
  };

  const removeProductImage = async (p: any) => {
    const { error } = await (supabase as any).from("produits").update({ image_url: null }).eq("id", p.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Photo supprimée");
    queryClient.invalidateQueries({ queryKey: ["produits-ecommerce-admin"] });
    queryClient.invalidateQueries({ queryKey: ["produits-public-ecommerce"] });
  };

  const editProduit = (id: string, field: string, val: any) =>
    setProduitEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: val },
    }));

  const getProduitField = (p: any, field: string) => {
    if (produitEdits[p.id]?.[field] !== undefined) return produitEdits[p.id][field];
    return p[field] ?? "";
  };

  const saveProduit = async (p: any) => {
    setSavingProduits((prev) => [...prev, p.id]);
    const edits = produitEdits[p.id] || {};
    try {
      const { error } = await (supabase as any)
        .from("produits")
        .update({
          categorie:        edits.categorie        ?? p.categorie,
          prix_coop:        Number(edits.prix_coop        ?? p.prix_coop),
          prix_marche:      Number(edits.prix_marche      ?? p.prix_marche),
          saison:           edits.saison           ?? p.saison,
          norme_qualite:    edits.norme_qualite    ?? p.norme_qualite,
          description:      edits.description      ?? p.description,
          quantite_estimee: Number(edits.quantite_estimee ?? p.quantite_estimee),
          image_url:        edits.image_url        ?? p.image_url ?? null,
        })
        .eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.nom} mis à jour`);
      setProduitEdits((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
      queryClient.invalidateQueries({ queryKey: ["produits-ecommerce-admin"] });
      queryClient.invalidateQueries({ queryKey: ["produits-public-ecommerce"] });
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingProduits((prev) => prev.filter((id) => id !== p.id));
    }
  };

  const toggleEcommerce = async (p: any) => {
    setTogglingProduits((prev) => [...prev, p.id]);
    try {
      const { error } = await supabase
        .from("produits")
        .update({ in_ecommerce: !p.in_ecommerce })
        .eq("id", p.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["produits-ecommerce-admin"] });
      queryClient.invalidateQueries({ queryKey: ["produits-public-ecommerce"] });
    } catch {
      toast.error("Erreur");
    } finally {
      setTogglingProduits((prev) => prev.filter((id) => id !== p.id));
    }
  };

  // ── Prix marché CRUD ────────────────────────────────────────────────────────
  const { data: relevés = [], isLoading: loadingReleves } = useQuery({
    queryKey: ["prix-marche-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prix_marche")
        .select("*")
        .order("date_releve", { ascending: false });
      if (error) throw error;
      return (data || []) as PrixMarcheRow[];
    },
  });

  const [showAddReleve, setShowAddReleve] = useState(false);
  const [newReleve, setNewReleve] = useState<NewReleve>(emptyReleve());
  const [addingReleve, setAddingReleve] = useState(false);
  const [deletingReleves, setDeletingReleves] = useState<string[]>([]);

  const addReleve = async () => {
    if (!newReleve.produit || !newReleve.marche || !newReleve.prix) {
      toast.error("Produit, marché et prix sont obligatoires");
      return;
    }
    setAddingReleve(true);
    try {
      const { error } = await supabase.from("prix_marche").insert({
        produit: newReleve.produit,
        marche: newReleve.marche,
        prix: Number(newReleve.prix),
        unite_prix: newReleve.unite_prix || "CFA/kg",
        date_releve: newReleve.date_releve,
        tendance: newReleve.tendance,
        source: newReleve.source || null,
      });
      if (error) throw error;
      toast.success("Relevé ajouté");
      setNewReleve(emptyReleve());
      setShowAddReleve(false);
      queryClient.invalidateQueries({ queryKey: ["prix-marche-admin"] });
      queryClient.invalidateQueries({ queryKey: ["prix-marche-public"] });
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAddingReleve(false);
    }
  };

  const deleteReleve = async (id: string, produit: string) => {
    confirm({
      title: "Supprimer ce relevé",
      description: `Voulez-vous supprimer le relevé de prix pour "${produit}" ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
      onConfirm: async () => {
        setDeletingReleves((prev) => [...prev, id]);
        try {
          const { error } = await supabase.from("prix_marche").delete().eq("id", id);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["prix-marche-admin"] });
          queryClient.invalidateQueries({ queryKey: ["prix-marche-public"] });
          toast.success("Relevé supprimé");
        } catch {
          toast.error("Erreur lors de la suppression");
        } finally {
          setDeletingReleves((prev) => prev.filter((i) => i !== id));
        }
      },
    });
  };

  return (
    <DashboardLayout
      title="Gestion de la page Prix"
      subtitle="Configurez le contenu public, les tarifs de la coopérative et les relevés de prix du marché"
      actions={
        <Button asChild variant="outline" className="h-9 rounded-xl border-gray-200 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all gap-2">
          <Link to="/prix" target="_blank">
            <ExternalLink size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Aperçu public</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-6 max-w-5xl">

        {/* ── Section 1 : Hero ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0d1525] rounded-3xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-8 transition-all hover:shadow-md">
          <SectionHeader
            title="Configuration de l'en-tête"
            desc="Ces informations définissent le premier contact visuel des clients sur la page publique des prix. Laissez les statistiques vides pour utiliser les calculs automatiques."
            icon={Activity}
          />

          <div className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Titre de la page</Label>
                <Input
                  value={formData["prix_hero_title"] ?? ""}
                  onChange={(e) => handleChange("prix_hero_title", e.target.value)}
                  placeholder="Transparence des prix agricoles en temps réel"
                  className="h-12 bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 rounded-xl focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Description (Sous-titre)</Label>
                <Textarea
                  value={formData["prix_hero_subtitle"] ?? ""}
                  onChange={(e) => handleChange("prix_hero_subtitle", e.target.value)}
                  className="min-h-[100px] bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 rounded-xl focus:ring-emerald-500/20 resize-none"
                  placeholder="Prix de vente directs proposés par la coopérative…"
                />
              </div>

              {[
                { key: "prix_stat_certifiees", label: "Spéculations certifiées", placeholder: "6" },
                { key: "prix_stat_economie",   label: "Économie moyenne",         placeholder: "~12%" },
                { key: "prix_stat_stock",      label: "Stock disponible",         placeholder: "157 t" },
                { key: "prix_stat_zones",      label: "Zones de couverture",      placeholder: "8+" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</Label>
                  <Input
                    value={formData[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="h-10 bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 rounded-xl focus:ring-emerald-500/20"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/5 mt-6">
              <p className="text-[11px] text-gray-400 font-medium italic">
                Les modifications sont appliquées instantanément sur le site public.
              </p>
              <SaveBtn keys={["prix_hero_title", "prix_hero_subtitle", "prix_stat_certifiees", "prix_stat_economie", "prix_stat_stock", "prix_stat_zones"]} />
            </div>
          </div>
        </div>

        {/* ── Section 2 : Produits catalogue public ────────────────────────── */}
        <div className="bg-white dark:bg-[#0d1525] rounded-3xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-8">
          <SectionHeader
            title="Catalogue des prix publics"
            desc="Sélectionnez les produits qui apparaîtront dans la section 'Tarifs Coopérative'. Ajustez les prix pour refléter la valeur ajoutée de la coopérative."
            icon={ExternalLink}
          />

          {loadingProduits ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : produits.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">
              Aucun produit trouvé. Ajoutez des produits dans la page{" "}
              <Link to="/catalogue" className="underline text-emerald-600">Catalogue</Link>.
            </p>
          ) : (
            <div className="space-y-4">
              {produits.map((p: any) => {
                const isSaving = savingProduits.includes(p.id);
                const isToggling = togglingProduits.includes(p.id);
                const hasEdits = !!produitEdits[p.id];
                return (
                  <div
                    key={p.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      p.in_ecommerce
                        ? "border-emerald-200/60 dark:border-emerald-800/40"
                        : "border-gray-200 dark:border-[#1e2d45] opacity-60"
                    }`}
                  >
                    {/* Header row */}
                    <div className={cn(
                      "px-5 py-4 flex items-center justify-between border-b transition-colors",
                      p.in_ecommerce 
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-800/20" 
                        : "bg-gray-50/50 dark:bg-white/[0.01] border-gray-100 dark:border-white/5"
                    )}>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleEcommerce(p)}
                          disabled={isToggling}
                          className={cn(
                            "relative w-11 h-6 rounded-full transition-all duration-300 shadow-inner",
                            p.in_ecommerce ? "bg-emerald-500 shadow-emerald-500/20" : "bg-gray-200 dark:bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center",
                            p.in_ecommerce ? "left-6" : "left-1"
                          )}>
                            {isToggling && <Loader2 size={8} className="animate-spin text-emerald-600" />}
                          </div>
                        </button>
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white">{p.nom}</span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            {p.in_ecommerce ? "Activé sur le site" : "Désactivé"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {hasEdits && (
                          <Button
                            size="sm"
                            onClick={() => saveProduit(p)}
                            disabled={isSaving}
                            className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 gap-1.5"
                          >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Sauvegarder
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Fields grid */}
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-5">
                      {[
                        { label: "Catégorie", field: "categorie", placeholder: "Fruits" },
                        { label: "Prix Coop (CFA/kg)", field: "prix_coop", type: "number" },
                        { label: "Prix Marché (CFA/kg)", field: "prix_marche", type: "number" },
                        { label: "Stock dispo (t)", field: "quantite_estimee", type: "number" },
                        { label: "Saisonnalité", field: "saison", placeholder: "Juin - Oct" },
                        { label: "Norme / Certification", field: "norme_qualite", placeholder: "Bio" },
                      ].map((f) => (
                        <div key={f.field} className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.label}</Label>
                          <Input
                            type={f.type || "text"}
                            value={getProduitField(p, f.field)}
                            onChange={(e) => editProduit(p.id, f.field, e.target.value)}
                            className="h-10 bg-white dark:bg-[#131d2e] border-gray-100 dark:border-white/5 rounded-xl focus:ring-emerald-500/20 text-sm font-medium"
                            placeholder={f.placeholder}
                          />
                        </div>
                      ))}
                      
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description courte</Label>
                        <Input
                          value={getProduitField(p, "description")}
                          onChange={(e) => editProduit(p.id, "description", e.target.value)}
                          className="h-10 bg-white dark:bg-[#131d2e] border-gray-100 dark:border-white/5 rounded-xl focus:ring-emerald-500/20 text-sm font-medium"
                          placeholder="Bref résumé pour le site public…"
                        />
                      </div>

                      {/* Image upload section */}
                      <div className="col-span-2 md:col-span-4 mt-2 pt-4 border-t border-gray-50 dark:border-white/5">
                        <div className="flex items-center gap-6">
                          <div className="relative group/img shrink-0">
                            {p.image_url ? (
                              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm transition-transform group-hover/img:scale-105">
                                <img src={p.image_url} alt={p.nom} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => removeProductImage(p)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all duration-300"
                                >
                                  <X size={18} className="text-white" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center transition-colors group-hover/img:border-emerald-300 dark:group-hover/img:border-emerald-700">
                                <ImagePlus size={24} className="text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Illustration visuelle</h5>
                            <p className="text-[11px] text-gray-400 mb-3">Une belle image augmente la confiance des clients.</p>
                            <input
                              ref={el => { imageInputRefs.current[p.id] = el; }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) uploadProductImage(p, file);
                                e.target.value = "";
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-xl border-gray-200 dark:border-white/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all gap-2 font-bold text-[11px] uppercase tracking-wider"
                              disabled={uploadingImage.includes(p.id)}
                              onClick={() => imageInputRefs.current[p.id]?.click()}
                            >
                              {uploadingImage.includes(p.id) ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                              {p.image_url ? "Mettre à jour" : "Télécharger"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Section 3 : Relevés de marché ────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0d1525] rounded-3xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <SectionHeader
              title="Observatoire des prix du marché"
              desc="Historique des relevés effectués sur les marchés régionaux. Ces données alimentent les graphiques comparatifs publics."
              icon={Plus}
            />
            <Button
              size="sm"
              variant={showAddReleve ? "secondary" : "outline"}
              onClick={() => setShowAddReleve((v) => !v)}
              className="rounded-xl h-10 px-4 font-bold text-xs uppercase tracking-wider gap-2 shadow-sm transition-all"
            >
              {showAddReleve ? <X size={14} /> : <Plus size={14} />}
              {showAddReleve ? "Annuler" : "Nouveau relevé"}
            </Button>
          </div>

          {/* Add form */}
          {showAddReleve && (
            <div className="mb-10 p-6 border border-emerald-200/50 dark:border-emerald-800/20 rounded-2xl bg-emerald-50/20 dark:bg-emerald-900/10 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Saisie d'un nouveau relevé</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {[
                  { label: "Produit", field: "produit", placeholder: "Mangue Kent" },
                  { label: "Marché", field: "marche", placeholder: "Ziguinchor (Escale)" },
                  { label: "Prix", field: "prix", type: "number", placeholder: "750" },
                  { label: "Unité", field: "unite_prix", placeholder: "CFA/kg" },
                  { label: "Date du relevé", field: "date_releve", type: "date" },
                ].map(f => (
                  <div key={f.field} className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.label}</Label>
                    <Input 
                      type={f.type || "text"}
                      value={(newReleve as any)[f.field]} 
                      onChange={(e) => setNewReleve((r) => ({ ...r, [f.field]: e.target.value }))} 
                      className="h-10 bg-white dark:bg-[#0d1525] border-gray-100 dark:border-white/5 rounded-xl text-sm font-medium" 
                      placeholder={f.placeholder} 
                    />
                  </div>
                ))}
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tendance</Label>
                  <div className="flex gap-1 p-1 bg-white dark:bg-[#0d1525] border border-gray-100 dark:border-white/5 rounded-xl h-10">
                    {["hausse", "stable", "baisse"].map(t => (
                      <button
                        key={t}
                        onClick={() => setNewReleve(r => ({ ...r, tendance: t }))}
                        className={cn(
                          "flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          newReleve.tendance === t 
                            ? (t === "hausse" ? "bg-rose-500 text-white" : t === "baisse" ? "bg-emerald-500 text-white" : "bg-gray-400 text-white")
                            : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Source des données</Label>
                  <Input value={newReleve.source} onChange={(e) => setNewReleve((r) => ({ ...r, source: e.target.value }))} className="h-10 bg-white dark:bg-[#0d1525] border-gray-100 dark:border-white/5 rounded-xl text-sm font-medium" placeholder="Ex: ARM (Agence de Régulation des Marchés)" />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={addReleve}
                  disabled={addingReleve}
                  className="bg-[#1A2E1C] dark:bg-emerald-800 text-white hover:bg-[#1A2E1C]/90 h-11 px-8 rounded-xl font-bold shadow-lg shadow-emerald-900/20 gap-2"
                >
                  {addingReleve ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Enregistrer le relevé
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {loadingReleves ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-gray-300" />
            </div>
          ) : relevés.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-50 dark:border-white/5 rounded-2xl">
               <Activity className="mx-auto text-gray-200 mb-4" size={48} />
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aucun relevé dans l'historique</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                    {["Période", "Produit Agricole", "Marché", "Tarif Relevé", "Tendance", ""].map((h) => (
                      <th key={h} className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                  {relevés.map((r) => (
                    <tr key={r.id} className="group hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Plus size={10} className="text-emerald-500" />
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{format(new Date(r.date_releve), "dd MMM yyyy", { locale: fr })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">{r.produit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{r.marche}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-black text-gray-900 dark:text-white">{Number(r.prix).toLocaleString("fr-FR")}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{r.unite_prix}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          r.tendance === "hausse" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600" :
                          r.tendance === "baisse" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : 
                          "bg-gray-100 dark:bg-white/5 text-gray-500"
                        )}>
                          {r.tendance === "hausse" && <ChevronUp size={10} />}
                          {r.tendance === "baisse" && <ChevronDown size={10} />}
                          {r.tendance}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteReleve(r.id, r.produit)}
                          disabled={deletingReleves.includes(r.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                          {deletingReleves.includes(r.id) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default GestionPrix;
