import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Plus, Trash2, ExternalLink, ImagePlus, X } from "lucide-react";
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

const SectionHeader = ({ title, desc }: { title: string; desc?: string }) => (
  <div className="border-b border-gray-100 pb-3 mb-5">
    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h4>
    {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
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
        className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90"
        size="sm"
      >
        {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
        Enregistrer
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
      subtitle="Modifiez le contenu, les tarifs et les relevés du marché affichés sur la page publique"
      actions={
        <Link
          to="/prix"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-semibold border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-50 transition-colors"
        >
          <ExternalLink size={12} />
          Voir la page publique
        </Link>
      }
    >
      <div className="space-y-6 max-w-5xl">

        {/* ── Section 1 : Hero ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6">
          <SectionHeader
            title="Section Hero (bandeau vert)"
            desc="Titre, sous-titre et statistiques affichés en haut de la page /prix"
          />

          <div className="space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Titre principal</Label>
              <Input
                value={formData["prix_hero_title"] ?? ""}
                onChange={(e) => handleChange("prix_hero_title", e.target.value)}
                placeholder="Transparence des prix agricoles en temps réel"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sous-titre</Label>
              <Textarea
                value={formData["prix_hero_subtitle"] ?? ""}
                onChange={(e) => handleChange("prix_hero_subtitle", e.target.value)}
                className="min-h-[80px]"
                placeholder="Prix de vente directs proposés par la coopérative…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                { key: "prix_stat_certifiees", label: "Spéculations certifiées", placeholder: "6" },
                { key: "prix_stat_economie",   label: "Économie moyenne",         placeholder: "~12%" },
                { key: "prix_stat_stock",      label: "Stock disponible",         placeholder: "157 t" },
                { key: "prix_stat_zones",      label: "Zones de couverture",      placeholder: "8+" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={formData[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400">
              Laisser vide = valeur calculée automatiquement depuis la base de données.
            </p>

            <SaveBtn keys={["prix_hero_title", "prix_hero_subtitle", "prix_stat_certifiees", "prix_stat_economie", "prix_stat_stock", "prix_stat_zones"]} />
          </div>
        </div>

        {/* ── Section 2 : Produits catalogue public ────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6">
          <SectionHeader
            title="Catalogue des produits publics"
            desc="Ces produits s'affichent sur la page /prix. Cochez « visible » pour les inclure, puis modifiez les tarifs."
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
                    <div className={`px-4 py-3 flex items-center justify-between ${
                      p.in_ecommerce ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "bg-gray-50 dark:bg-white/[0.02]"
                    }`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleEcommerce(p)}
                          disabled={isToggling}
                          title={p.in_ecommerce ? "Retirer de la page publique" : "Afficher sur la page publique"}
                          className={`relative w-9 h-5 rounded-full transition-colors ${
                            p.in_ecommerce ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        >
                          {isToggling
                            ? <Loader2 size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                            : <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.in_ecommerce ? "translate-x-4" : "translate-x-0.5"}`} />
                          }
                        </button>
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.nom}</span>
                        {p.in_ecommerce
                          ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Visible</span>
                          : <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">Masqué</span>
                        }
                      </div>
                      {hasEdits && (
                        <Button
                          size="sm"
                          onClick={() => saveProduit(p)}
                          disabled={isSaving}
                          className="h-7 text-xs bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90"
                        >
                          {isSaving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
                          Enregistrer
                        </Button>
                      )}
                    </div>

                    {/* Fields grid */}
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Catégorie</Label>
                        <Input
                          value={getProduitField(p, "categorie")}
                          onChange={(e) => editProduit(p.id, "categorie", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Fruits"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix Coopérative (CFA/kg)</Label>
                        <Input
                          type="number"
                          value={getProduitField(p, "prix_coop")}
                          onChange={(e) => editProduit(p.id, "prix_coop", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix Marché (CFA/kg)</Label>
                        <Input
                          type="number"
                          value={getProduitField(p, "prix_marche")}
                          onChange={(e) => editProduit(p.id, "prix_marche", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stock dispo (tonnes)</Label>
                        <Input
                          type="number"
                          value={getProduitField(p, "quantite_estimee")}
                          onChange={(e) => editProduit(p.id, "quantite_estimee", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Saison</Label>
                        <Input
                          value={getProduitField(p, "saison")}
                          onChange={(e) => editProduit(p.id, "saison", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Avr – Juil"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Certification / Norme</Label>
                        <Input
                          value={getProduitField(p, "norme_qualite")}
                          onChange={(e) => editProduit(p.id, "norme_qualite", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Bio certifiée"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Description courte</Label>
                        <Input
                          value={getProduitField(p, "description")}
                          onChange={(e) => editProduit(p.id, "description", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Brève description du produit…"
                        />
                      </div>

                      {/* Image upload */}
                      <div className="space-y-1 col-span-2 md:col-span-4">
                        <Label className="text-xs">Photo du produit</Label>
                        <div className="flex items-center gap-3">
                          {/* Preview */}
                          {p.image_url ? (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 group">
                              <img src={p.image_url} alt={p.nom} className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeProductImage(p)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                title="Supprimer la photo"
                              >
                                <X size={14} className="text-white" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 bg-gray-50 dark:bg-white/[0.03]">
                              <ImagePlus size={18} className="text-gray-300" />
                            </div>
                          )}
                          {/* Upload button */}
                          <div>
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
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              disabled={uploadingImage.includes(p.id)}
                              onClick={() => imageInputRefs.current[p.id]?.click()}
                            >
                              {uploadingImage.includes(p.id)
                                ? <><Loader2 size={12} className="animate-spin" /> Chargement…</>
                                : <><ImagePlus size={12} /> {p.image_url ? "Changer la photo" : "Ajouter une photo"}</>
                              }
                            </Button>
                            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG ou WebP · max 5 MB</p>
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
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <SectionHeader
              title="Relevés de prix du marché"
              desc="Données affichées dans le graphique d'évolution et l'historique de la page /prix"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddReleve((v) => !v)}
              className="shrink-0 -mt-5"
            >
              <Plus size={14} className="mr-1" />
              {showAddReleve ? "Annuler" : "Ajouter un relevé"}
            </Button>
          </div>

          {/* Add form */}
          {showAddReleve && (
            <div className="mb-6 p-4 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl bg-emerald-50/30 dark:bg-emerald-900/10">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-3 uppercase tracking-wider">Nouveau relevé</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs">Produit *</Label>
                  <Input value={newReleve.produit} onChange={(e) => setNewReleve((r) => ({ ...r, produit: e.target.value }))} className="h-8 text-sm" placeholder="Mangue Kent" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Marché *</Label>
                  <Input value={newReleve.marche} onChange={(e) => setNewReleve((r) => ({ ...r, marche: e.target.value }))} className="h-8 text-sm" placeholder="Ziguinchor (Escale)" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prix *</Label>
                  <Input type="number" value={newReleve.prix || ""} onChange={(e) => setNewReleve((r) => ({ ...r, prix: Number(e.target.value) }))} className="h-8 text-sm" placeholder="750" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unité</Label>
                  <Input value={newReleve.unite_prix} onChange={(e) => setNewReleve((r) => ({ ...r, unite_prix: e.target.value }))} className="h-8 text-sm" placeholder="CFA/kg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={newReleve.date_releve} onChange={(e) => setNewReleve((r) => ({ ...r, date_releve: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tendance</Label>
                  <select
                    value={newReleve.tendance}
                    onChange={(e) => setNewReleve((r) => ({ ...r, tendance: e.target.value }))}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="hausse">Hausse</option>
                    <option value="baisse">Baisse</option>
                    <option value="stable">Stable</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-3">
                  <Label className="text-xs">Source (optionnel)</Label>
                  <Input value={newReleve.source} onChange={(e) => setNewReleve((r) => ({ ...r, source: e.target.value }))} className="h-8 text-sm" placeholder="ARM / Observatoire…" />
                </div>
              </div>
              <Button
                size="sm"
                onClick={addReleve}
                disabled={addingReleve}
                className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90"
              >
                {addingReleve ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
                Ajouter
              </Button>
            </div>
          )}

          {/* Table */}
          {loadingReleves ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : relevés.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">Aucun relevé enregistré.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#1e2d45]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-[#1e2d45]">
                    {["Date", "Produit", "Marché", "Prix", "Unité", "Tendance", ""].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
                  {relevés.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 pl-5 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{r.date_releve}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{r.produit}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.marche}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{Number(r.prix).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3 text-gray-400">{r.unite_prix}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.tendance === "hausse" ? "bg-red-50 text-red-600" :
                          r.tendance === "baisse" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {r.tendance}
                        </span>
                      </td>
                      <td className="px-4 py-3 pr-5 text-right">
                        <button
                          onClick={() => deleteReleve(r.id, r.produit)}
                          disabled={deletingReleves.includes(r.id)}
                          className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Supprimer"
                        >
                          {deletingReleves.includes(r.id)
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                          }
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
