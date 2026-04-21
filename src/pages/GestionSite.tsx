import { useState, useEffect } from "react";
import {
  Save, Palette, Upload, Loader2, ShieldAlert,
  Plus, Trash2,
} from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig, useUpdateSiteConfig, useUploadSiteAsset } from "@/hooks/useSiteConfig";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Settings } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TimelineItem = { year: string; title: string; desc: string };
type ZoneItem = { name: string; members: string; specialty: string };
type SpecItem = {
  id: string; nom: string; categorie: string; prixCoop: string; prixMarche: string;
  unite: string; saison: string; tendance: string; changePercent: string;
  volumeDisponible: string; certification: string; description: string;
};
type StatItem = { cle: string; valeur: string; description: string; ordre: number };

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_TIMELINE: TimelineItem[] = [
  { year: "2009", title: "Fondation", desc: "Création de la coopérative par 30 producteurs pionniers à Ziguinchor." },
  { year: "2013", title: "Première Export", desc: "Première livraison de mangues Kent à l'international, certifiée qualité export." },
  { year: "2017", title: "Certification Bio", desc: "Obtention de la certification biologique pour 60% de la production." },
  { year: "2020", title: "Digitalisation", desc: "Lancement de la plateforme numérique de gestion et de vente en ligne." },
  { year: "2024", title: "248 Membres", desc: "La coopérative atteint 248 producteurs répartis sur 4 zones de Casamance." },
];

const DEFAULT_ZONES: ZoneItem[] = [
  { name: "Ziguinchor", members: "82", specialty: "Anacarde & Mangue" },
  { name: "Bignona", members: "65", specialty: "Mangue Kent" },
  { name: "Oussouye", members: "48", specialty: "Agrumes" },
  { name: "Sédhiou", members: "53", specialty: "Banane & Ditakh" },
];

const DEFAULT_SPECS: SpecItem[] = [
  { id: "mangue", nom: "Mangue Kent", categorie: "Fruits", prixCoop: "750", prixMarche: "880", unite: "CFA / kg", saison: "Avr – Juil", tendance: "hausse", changePercent: "2.4", volumeDisponible: "12 t", certification: "Bio certifiée", description: "Mangue Kent de calibre A+, récoltée à maturité optimale dans les vergers coopératifs de Casamance." },
  { id: "anacarde", nom: "Anacarde", categorie: "Noix", prixCoop: "490", prixMarche: "530", unite: "CFA / kg", saison: "Mar – Mai", tendance: "hausse", changePercent: "1.8", volumeDisponible: "28 t", certification: "Traçabilité certifiée", description: "Noix de cajou brute de première qualité, séchée naturellement et conditionnée par nos producteurs membres." },
  { id: "riz", nom: "Riz Local", categorie: "Céréales", prixCoop: "420", prixMarche: "465", unite: "CFA / kg", saison: "Oct – Jan", tendance: "stable", changePercent: "0", volumeDisponible: "45 t", certification: "Origine contrôlée", description: "Riz paddy de Casamance, variétés locales à haute valeur nutritive, cultivé sans intrants chimiques." },
  { id: "banane", nom: "Banane Plantain", categorie: "Fruits", prixCoop: "280", prixMarche: "320", unite: "CFA / kg", saison: "Toute l'année", tendance: "baisse", changePercent: "-1.2", volumeDisponible: "18 t", certification: "Production durable", description: "Banane plantain mûre, cultivée en agroforesterie sur les rives de la Casamance." },
  { id: "mais", nom: "Maïs Séché", categorie: "Céréales", prixCoop: "195", prixMarche: "225", unite: "CFA / kg", saison: "Sep – Nov", tendance: "stable", changePercent: "0", volumeDisponible: "32 t", certification: "Séché naturellement", description: "Maïs blanc séché au soleil, idéal pour la transformation locale et la consommation directe." },
  { id: "arachide", nom: "Arachide", categorie: "Oléagineux", prixCoop: "310", prixMarche: "350", unite: "CFA / kg", saison: "Nov – Fév", tendance: "hausse", changePercent: "3.1", volumeDisponible: "22 t", certification: "Tri manuel", description: "Arachide coques de qualité supérieure, triée manuellement et conditionnée en sacs certifiés." },
];

// ─── Helper: section sub-header ───────────────────────────────────────────────
const SectionHeader = ({ title }: { title: string }) => (
  <h4 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">{title}</h4>
);

// ─── Component ────────────────────────────────────────────────────────────────
const GestionSite = () => {
  const { user } = useAuth();
  const { data: configs, isLoading: configsLoading } = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();
  const uploadAsset = useUploadSiteAsset();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [savingKeys, setSavingKeys] = useState<string[]>([]);
  const confirm = useConfirm();

  // Array state for JSON-backed data
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(DEFAULT_TIMELINE);
  const [zoneItems, setZoneItems] = useState<ZoneItem[]>(DEFAULT_ZONES);
  const [specItems, setSpecItems] = useState<SpecItem[]>(DEFAULT_SPECS);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [savingZones, setSavingZones] = useState(false);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [statsItems, setStatsItems] = useState<StatItem[]>([]);
  const [savingStats, setSavingStats] = useState(false);

  const queryClient = useQueryClient();

  const { data: isSuperAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["isSuperAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" });
      return data ?? false;
    },
    enabled: !!user,
  });

  const { data: statsFromDb } = useQuery({
    queryKey: ["stats-publiques-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("stats_publiques").select("*").order("ordre");
      return (data || []) as StatItem[];
    },
  });

  useEffect(() => {
    if (statsFromDb && statsFromDb.length > 0) {
      setStatsItems(statsFromDb);
    } else if (statsFromDb && statsFromDb.length === 0) {
      // Pre-populate with defaults if table is empty
      setStatsItems([
        { cle: "producteurs", valeur: "248",   description: "Producteurs membres",         ordre: 1 },
        { cle: "hectares",    valeur: "1 250",  description: "Hectares cultivés",           ordre: 2 },
        { cle: "production",  valeur: "3 400",  description: "Tonnes/an",                   ordre: 3 },
        { cle: "taux_vente",  valeur: "85%",    description: "Taux de commercialisation",   ordre: 4 },
        { cle: "zones",       valeur: "4",      description: "Zones de production",         ordre: 5 },
        { cle: "varietes",    valeur: "12",     description: "Variétés certifiées",         ordre: 6 },
      ]);
    }
  }, [statsFromDb]);

  const saveStatsMutation = useMutation({
    mutationFn: async (items: StatItem[]) => {
      // Delete all then re-insert (simplest approach for reordering)
      await supabase.from("stats_publiques").delete().neq("cle", "__never__");
      const { error } = await supabase.from("stats_publiques").insert(
        items.map((s, i) => ({ cle: s.cle, valeur: s.valeur, description: s.description, ordre: i + 1 }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats-publiques-admin"] });
      queryClient.invalidateQueries({ queryKey: ["stats-publiques"] });
      toast.success("Statistiques enregistrées");
    },
    onError: () => toast.error("Échec de l'enregistrement"),
  });

  useEffect(() => {
    if (configs) {
      const data: Record<string, string> = {};
      configs.forEach((c) => { data[c.cle] = c.valeur || ""; });
      
      // Pre-fill footer defaults if they don't exist in DB to prevent empty inputs
      if (!data.footer_description) data.footer_description = "Coopérative Régionale des Planteurs & Agriculteurs de Ziguinchor. Rejoignez notre mouvement pour une excellence agricole en Casamance.";
      if (!data.footer_cta_title) data.footer_cta_title = "Prêt à transformer l'agriculture avec nous ?";
      if (!data.contact_address) data.contact_address = "Ziguinchor, Casamance, Sénégal";
      if (!data.contact_phone) data.contact_phone = "+221 33 991 XX XX";
      if (!data.contact_email) data.contact_email = "contact@crpaz-casamance.sn";
      if (!data.footer_cta_badge) data.footer_cta_badge = "L'Excellence Agricole de Ziguinchor";
      if (!data.footer_cta_btn1) data.footer_cta_btn1 = "Passer une commande";
      if (!data.footer_cta_btn2) data.footer_cta_btn2 = "Devenir membre";

      setFormData(data);
      if (data.logo_url) setLogoPreview(data.logo_url);
      if (data.favicon_url) setFaviconPreview(data.favicon_url);

      // Parse JSON arrays
      if (data.about_timeline) {
        try { setTimelineItems(JSON.parse(data.about_timeline)); } catch { /* use default */ }
      }
      if (data.about_zones) {
        try { setZoneItems(JSON.parse(data.about_zones)); } catch { /* use default */ }
      }
      if (data.prix_speculations) {
        try { setSpecItems(JSON.parse(data.prix_speculations)); } catch { /* use default */ }
      }
    }
  }, [configs]);

  if (roleLoading || configsLoading) {
    return (
      <DashboardLayout title="Configuration du Site">
        <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Configuration du Site">
        <div className="bg-white p-8 text-center rounded-xl border border-gray-100 shadow-sm max-w-lg mx-auto mt-12">
          <ShieldAlert className="text-amber-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès Non Autorisé</h2>
          <p className="text-gray-500">Cette page est réservée aux administrateurs de niveau superadmin.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleChange = (key: string, value: string) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSaveAll = async (keys: string[]) => {
    setSavingKeys(keys);
    try {
      for (const key of keys) {
        if (formData[key] !== undefined) await updateConfig.mutateAsync({ cle: key, valeur: formData[key] });
      }
      toast.success("Enregistrement réussi");
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setSavingKeys([]);
    }
  };

  const handleSaveJson = async (key: string, value: object, setSaving: (v: boolean) => void) => {
    setSaving(true);
    try {
      await updateConfig.mutateAsync({ cle: key, valeur: JSON.stringify(value) });
      toast.success("Enregistrement réussi");
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, configKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (configKey === "logo_url") setIsUploadingLogo(true);
    if (configKey === "favicon_url") setIsUploadingFavicon(true);
    const fileName = `${configKey}-${Date.now()}.${file.name.split(".").pop()}`;
    try {
      const url = await uploadAsset.mutateAsync({ file, fileName, configKey });
      setFormData((prev) => ({ ...prev, [configKey]: url }));
      if (configKey === "logo_url") setLogoPreview(url);
      if (configKey === "favicon_url") setFaviconPreview(url);
      toast.success("Image uploadée avec succès");
    } catch {
      toast.error("Erreur de transfert");
    } finally {
      if (configKey === "logo_url") setIsUploadingLogo(false);
      if (configKey === "favicon_url") setIsUploadingFavicon(false);
    }
  };

  const SaveBtn = ({ keys, label = "Enregistrer la section" }: { keys: string[]; label?: string }) => (
    <Button
      onClick={() => handleSaveAll(keys)}
      disabled={savingKeys.some(k => keys.includes(k))}
      className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90"
    >
      {savingKeys.some(k => keys.includes(k))
        ? <Loader2 className="mr-2 animate-spin" size={16} />
        : <Save className="mr-2" size={16} />}
      {label}
    </Button>
  );

  // ── Timeline helpers ──────────────────────────────────────────────────────
  const updateTimelineItem = (i: number, field: keyof TimelineItem, val: string) =>
    setTimelineItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addTimelineItem = () =>
    setTimelineItems(prev => [...prev, { year: "", title: "", desc: "" }]);
  const removeTimelineItem = (i: number) =>
    setTimelineItems(prev => prev.filter((_, idx) => idx !== i));

  // ── Zone helpers ──────────────────────────────────────────────────────────
  const updateZoneItem = (i: number, field: keyof ZoneItem, val: string) =>
    setZoneItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addZoneItem = () =>
    setZoneItems(prev => [...prev, { name: "", members: "", specialty: "" }]);
  const removeZoneItem = (i: number) =>
    setZoneItems(prev => prev.filter((_, idx) => idx !== i));

  // ── Spec helpers ──────────────────────────────────────────────────────────
  const updateSpecItem = (i: number, field: keyof SpecItem, val: string) =>
    setSpecItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addSpecItem = () =>
    setSpecItems(prev => [...prev, { id: `prod_${Date.now()}`, nom: "", categorie: "", prixCoop: "0", prixMarche: "0", unite: "CFA / kg", saison: "", tendance: "stable", changePercent: "0", volumeDisponible: "", certification: "", description: "" }]);
  const removeSpecItem = (i: number) =>
    setSpecItems(prev => prev.filter((_, idx) => idx !== i));

  return (
    <DashboardLayout title="Configuration du Site" subtitle="Apparence et contenu public du site vitrine">
      <div className="space-y-6">

        {/* ── Card 1 : Identité Visuelle ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Palette size={20} className="text-gray-400" /> Identité Visuelle
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-gray-700">Logo du site</Label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-4">
                    <Logo size={80} variant="premium" imageUrl={logoPreview || undefined} />
                  </div>
                  <div className="space-y-2">
                    <Input type="file" id="logo-upload" accept="image/*" onChange={(e) => handleFileUpload(e, "logo_url")} className="hidden" />
                    <Label htmlFor="logo-upload" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
                      {isUploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Changer le Logo
                    </Label>
                    <p className="text-xs text-gray-500">SVG ou PNG avec un fond transparent recommandé.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-gray-700">Favicon</Label>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-2">
                    <Logo size={48} variant="premium" imageUrl={faviconPreview || undefined} showText={false} />
                  </div>
                  <div className="space-y-2">
                    <Input type="file" id="favicon-upload" accept="image/*,.ico" onChange={(e) => handleFileUpload(e, "favicon_url")} className="hidden" />
                    <Label htmlFor="favicon-upload" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
                      {isUploadingFavicon ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Changer Favicon
                    </Label>
                    <p className="text-xs text-gray-500">Format ICO ou PNG (32x32px).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Paramètres Généraux</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nom du site</Label>
                <Input value={formData["site_name"] || ""} onChange={(e) => handleChange("site_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Slogan</Label>
                <Input value={formData["site_subtitle"] || ""} onChange={(e) => handleChange("site_subtitle", e.target.value)} />
              </div>
              <div className="md:col-span-2 pt-4">
                <SaveBtn keys={["site_name", "site_subtitle"]} label="Enregistrer les modifications" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 2 : Page d'Accueil ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Globe size={18} className="text-emerald-600" /> Page d'Accueil
            </h3>
          </div>
          <Tabs defaultValue="hero">
            <div className="px-6 py-3 border-b border-gray-100">
              <TabsList className="bg-transparent space-x-1 p-0 h-auto">
                <TabsTrigger value="hero" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Hero</TabsTrigger>
                <TabsTrigger value="sections" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Sections</TabsTrigger>
                <TabsTrigger value="footer" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Pied de page</TabsTrigger>
                <TabsTrigger value="stats" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Stats & Calendrier</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="hero" className="p-6 m-0">
              <div className="space-y-5 max-w-2xl">
                <div className="space-y-2">
                  <Label>Badge / Texte d'accroche</Label>
                  <Input value={formData["hero_badge"] || ""} onChange={(e) => handleChange("hero_badge", e.target.value)} placeholder="Ex: NOUVELLE CAMPAGNE 2025" />
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Titres Animés (Page d'accueil)</Label>
                    <p className="text-xs text-gray-500 mt-1">Ces 3 textes s'afficheront et s'animeront à tour de rôle sur la page d'accueil.</p>
                  </div>
                  <div className="grid gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    {[0, 1, 2].map((index) => {
                      const currentParts = (formData["hero_title"] || "").split("|").map(s => s.trim());
                      const defaultTexts = [
                        "Les Fruits Agricoles de la Casamance", 
                        "L'Excellence de nos Terroirs", 
                        "La Qualité Export du Sénégal"
                      ];
                      
                      // Auto-fill existing missing parts visually with defaults
                      const val = currentParts[index] === undefined ? defaultTexts[index] : currentParts[index];
                      
                      return (
                        <div key={index} className="flex gap-3 items-center">
                          <span className="text-xs font-bold text-gray-400 w-4">{index + 1}.</span>
                          <Input 
                            value={val || ""} 
                            onChange={(e) => {
                              const newParts = [...currentParts];
                              // Fill missing ones with their default or empty string before setting the current index
                              for(let i=0; i<=2; i++) {
                                 if(!newParts[i]) newParts[i] = currentParts[i] || defaultTexts[i] || "";
                              }
                              newParts[index] = e.target.value;
                              handleChange("hero_title", newParts.join(" | "));
                            }} 
                            placeholder={`Texte ${index + 1} ${index > 0 ? '(Optionnel)' : ''}`}
                            className="bg-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre / Description</Label>
                  <Textarea value={formData["hero_subtitle"] || ""} onChange={(e) => handleChange("hero_subtitle", e.target.value)} className="min-h-[100px]" />
                </div>
                <SaveBtn keys={["hero_badge", "hero_title", "hero_subtitle"]} />
              </div>
            </TabsContent>

            <TabsContent value="sections" className="p-6 m-0">
              <div className="space-y-8 max-w-2xl">
                <div className="space-y-4">
                  <SectionHeader title="Section Nos Produits" />
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input value={formData["products_title"] || ""} onChange={(e) => handleChange("products_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formData["products_subtitle"] || ""} onChange={(e) => handleChange("products_subtitle", e.target.value)} />
                  </div>
                  <SaveBtn keys={["products_title", "products_subtitle"]} label="Enregistrer Produits" />
                </div>
                <div className="space-y-4">
                  <SectionHeader title="Section Notre Coopérative" />
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input value={formData["cooperative_title"] || ""} onChange={(e) => handleChange("cooperative_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description Détaillée</Label>
                    <Textarea value={formData["cooperative_subtitle"] || ""} onChange={(e) => handleChange("cooperative_subtitle", e.target.value)} className="min-h-[120px]" />
                  </div>
                  <SaveBtn keys={["cooperative_title", "cooperative_subtitle"]} label="Enregistrer Coopérative" />
                </div>

                <div className="space-y-4">
                  <SectionHeader title="Formulaire de Commande (Infos latérales)" />
                  <div className="space-y-2">
                    <Label>Quantité minimum annoncée</Label>
                    <Input value={formData["order_min_quantity"] || ""} onChange={(e) => handleChange("order_min_quantity", e.target.value)} placeholder="À partir de 1 tonne" />
                    <p className="text-[10px] text-gray-500">Ex: "À partir de 1 tonne"</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Délai de réponse garanti</Label>
                    <Input value={formData["order_response_time"] || ""} onChange={(e) => handleChange("order_response_time", e.target.value)} placeholder="Sous 48 heures ouvrées" />
                    <p className="text-[10px] text-gray-500">Ex: "Sous 48 heures ouvrées"</p>
                  </div>
                  <SaveBtn keys={["order_min_quantity", "order_response_time"]} label="Enregistrer Commande" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="footer" className="p-6 m-0">
              <div className="grid md:grid-cols-2 gap-5 max-w-3xl">
                <div className="space-y-2 md:col-span-2">
                  <Label>Description du bas de page</Label>
                  <Textarea value={formData["footer_description"] || ""} onChange={(e) => handleChange("footer_description", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Titre / Appel à l'action</Label>
                  <Input value={formData["footer_cta_title"] || ""} onChange={(e) => handleChange("footer_cta_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={formData["contact_address"] || ""} onChange={(e) => handleChange("contact_address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={formData["contact_phone"] || ""} onChange={(e) => handleChange("contact_phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData["contact_email"] || ""} onChange={(e) => handleChange("contact_email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Badge CTA</Label>
                  <Input value={formData["footer_cta_badge"] || ""} onChange={(e) => handleChange("footer_cta_badge", e.target.value)} placeholder="L'Excellence Agricole de Ziguinchor" />
                </div>
                <div className="space-y-2">
                  <Label>Bouton CTA 1</Label>
                  <Input value={formData["footer_cta_btn1"] || ""} onChange={(e) => handleChange("footer_cta_btn1", e.target.value)} placeholder="Passer une commande" />
                </div>
                <div className="space-y-2">
                  <Label>Bouton CTA 2</Label>
                  <Input value={formData["footer_cta_btn2"] || ""} onChange={(e) => handleChange("footer_cta_btn2", e.target.value)} placeholder="Devenir membre" />
                </div>
                <div className="space-y-2">
                  <Label>Lien Facebook</Label>
                  <Input value={formData["social_facebook"] || ""} onChange={(e) => handleChange("social_facebook", e.target.value)} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Lien Instagram</Label>
                  <Input value={formData["social_instagram"] || ""} onChange={(e) => handleChange("social_instagram", e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Lien LinkedIn</Label>
                  <Input value={formData["social_linkedin"] || ""} onChange={(e) => handleChange("social_linkedin", e.target.value)} placeholder="https://linkedin.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Lien Twitter / X</Label>
                  <Input value={formData["social_twitter"] || ""} onChange={(e) => handleChange("social_twitter", e.target.value)} placeholder="https://twitter.com/..." />
                </div>
                <div className="md:col-span-2 pt-2">
                  <SaveBtn keys={["footer_description", "footer_cta_title", "footer_cta_badge", "footer_cta_btn1", "footer_cta_btn2", "contact_address", "contact_phone", "contact_email", "social_facebook", "social_instagram", "social_linkedin", "social_twitter"]} label="Enregistrer Pied de Page" />
                </div>
              </div>
            </TabsContent>

            {/* ─── Stats & Calendrier ───────────────────────────────────────── */}
            <TabsContent value="stats" className="p-6 m-0 space-y-10">

              {/* Stats publiques */}
              <div className="space-y-4">
                <SectionHeader title="Statistiques Clés (Section chiffres)" />
                <p className="text-xs text-gray-500 -mt-2">Ces chiffres apparaissent dans la bande sombre de la page d'accueil.</p>
                <div className="space-y-3">
                  {statsItems.map((stat, i) => (
                    <div key={i} className="grid grid-cols-[120px_120px_1fr_auto] gap-2 items-end p-3 border border-gray-100 rounded-xl bg-gray-50/40">
                      <div className="space-y-1">
                        <Label className="text-xs">Clé (id unique)</Label>
                        <Input
                          value={stat.cle}
                          onChange={(e) => setStatsItems(prev => prev.map((s, idx) => idx === i ? { ...s, cle: e.target.value } : s))}
                          className="h-8 text-sm font-mono"
                          placeholder="producteurs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valeur affichée</Label>
                        <Input
                          value={stat.valeur}
                          onChange={(e) => setStatsItems(prev => prev.map((s, idx) => idx === i ? { ...s, valeur: e.target.value } : s))}
                          className="h-8 text-sm font-bold"
                          placeholder="248"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description / Libellé</Label>
                        <Input
                          value={stat.description}
                          onChange={(e) => setStatsItems(prev => prev.map((s, idx) => idx === i ? { ...s, description: e.target.value } : s))}
                          className="h-8 text-sm"
                          placeholder="Producteurs membres"
                        />
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                        onClick={() => {
                          confirm({
                            title: "Supprimer la statistique",
                            description: `Voulez-vous supprimer la statistique "${stat.description || stat.cle}" ?`,
                            confirmLabel: "Supprimer",
                            variant: "danger",
                            onConfirm: () => setStatsItems(prev => prev.filter((_, idx) => idx !== i)),
                          });
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() =>
                    setStatsItems(prev => [...prev, { cle: "", valeur: "", description: "", ordre: prev.length + 1 }])
                  }>
                    <Plus size={12} className="mr-1" /> Ajouter une stat
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 text-xs"
                    onClick={() => { setSavingStats(true); saveStatsMutation.mutate(statsItems, { onSettled: () => setSavingStats(false) }); }}
                    disabled={savingStats || saveStatsMutation.isPending}
                  >
                    {savingStats ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Save size={12} className="mr-1" />}
                    Enregistrer les statistiques
                  </Button>
                </div>
              </div>

              {/* Calendrier */}
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Calendrier de Disponibilité (Titres)" />
                <div className="space-y-2">
                  <Label>Titre de la section</Label>
                  <Input value={formData["calendar_title"] || ""} onChange={(e) => handleChange("calendar_title", e.target.value)} placeholder="Calendrier de Disponibilité" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre</Label>
                  <Textarea value={formData["calendar_subtitle"] || ""} onChange={(e) => handleChange("calendar_subtitle", e.target.value)} placeholder="Planifiez vos achats en fonction des périodes de récolte..." />
                </div>
                <p className="text-xs text-gray-400">Les données du calendrier (produits × mois) sont gérées dans <strong>Production → Récoltes</strong>.</p>
                <SaveBtn keys={["calendar_title", "calendar_subtitle"]} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Card 3 : Pages Publiques ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Settings size={18} className="text-emerald-600" /> Pages Publiques
            </h3>
            <p className="text-xs text-gray-500 mt-1">Gérez le contenu de chaque page publique du site.</p>
          </div>
          <Tabs defaultValue="about">
            <div className="px-6 py-3 border-b border-gray-100 overflow-x-auto">
              <TabsList className="bg-transparent space-x-1 p-0 h-auto flex-nowrap whitespace-nowrap">
                <TabsTrigger value="about"   className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Qui Sommes-Nous</TabsTrigger>
                <TabsTrigger value="prix"    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Page Prix</TabsTrigger>
                <TabsTrigger value="projets" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Projets</TabsTrigger>
                <TabsTrigger value="blog"    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Blog</TabsTrigger>
                <TabsTrigger value="contact" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-sm data-[state=active]:font-semibold">Contact</TabsTrigger>
              </TabsList>
            </div>

            {/* ─── Qui Sommes-Nous ─────────────────────────────────────────── */}
            <TabsContent value="about" className="p-6 m-0 space-y-10">

              {/* Hero */}
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Section Hero" />
                <div className="space-y-2">
                  <Label>Texte Badge (petite étiquette au-dessus)</Label>
                  <Input value={formData["about_hero_badge"] || ""} onChange={(e) => handleChange("about_hero_badge", e.target.value)} placeholder="Notre Histoire" />
                </div>
                <div className="space-y-2">
                  <Label>Titre Principal</Label>
                  <Input value={formData["about_hero_title"] || ""} onChange={(e) => handleChange("about_hero_title", e.target.value)} placeholder="L'excellence agricole au cœur de la Casamance." />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre</Label>
                  <Textarea value={formData["about_hero_subtitle"] || ""} onChange={(e) => handleChange("about_hero_subtitle", e.target.value)} className="min-h-[80px]" placeholder="Depuis 2009, nous unissons les forces..." />
                </div>
                <SaveBtn keys={["about_hero_badge", "about_hero_title", "about_hero_subtitle"]} />
              </div>

              {/* Mission */}
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Section Mission" />
                <div className="space-y-2">
                  <Label>Titre de la section</Label>
                  <Input value={formData["about_mission_title"] || ""} onChange={(e) => handleChange("about_mission_title", e.target.value)} placeholder="Structurer et développer la filière fruitière." />
                </div>
                <div className="space-y-2">
                  <Label>Paragraphe 1</Label>
                  <Textarea value={formData["about_mission_p1"] || ""} onChange={(e) => handleChange("about_mission_p1", e.target.value)} className="min-h-[90px]" placeholder="Notre mission est d'offrir à nos producteurs..." />
                </div>
                <div className="space-y-2">
                  <Label>Paragraphe 2</Label>
                  <Textarea value={formData["about_mission_p2"] || ""} onChange={(e) => handleChange("about_mission_p2", e.target.value)} className="min-h-[90px]" placeholder="Nous croyons qu'une agriculture organisée..." />
                </div>
                <p className="text-xs text-gray-500">Ces 4 chiffres apparaissent dans le hero de la page "Qui sommes-nous". Laisser vide = valeur calculée automatiquement depuis la base de données.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { n: 1, valPH: "1,250",    lblPH: "Hectares" },
                    { n: 2, valPH: "3.4k",     lblPH: "Tonnes Export" },
                    { n: 3, valPH: "85%",      lblPH: "Taux Vente" },
                    { n: 4, valPH: "248",      lblPH: "Membres actifs" },
                  ].map(({ n, valPH, lblPH }) => (
                    <div key={n} className="space-y-2 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stat {n}</p>
                      <div className="space-y-1">
                        <Label className="text-xs">Valeur</Label>
                        <Input value={formData[`about_stat_${n}_value`] || ""} onChange={(e) => handleChange(`about_stat_${n}_value`, e.target.value)} placeholder={valPH} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Libellé</Label>
                        <Input value={formData[`about_stat_${n}_label`] || ""} onChange={(e) => handleChange(`about_stat_${n}_label`, e.target.value)} placeholder={lblPH} className="h-8 text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
                <SaveBtn keys={["about_mission_title", "about_mission_p1", "about_mission_p2", "about_stat_1_value", "about_stat_1_label", "about_stat_2_value", "about_stat_2_label", "about_stat_3_value", "about_stat_3_label", "about_stat_4_value", "about_stat_4_label"]} />
              </div>

              {/* Valeurs */}
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Section Nos Valeurs" />
                <div className="space-y-2">
                  <Label>Titre de la section</Label>
                  <Input value={formData["about_values_title"] || ""} onChange={(e) => handleChange("about_values_title", e.target.value)} placeholder="Ce qui nous guide" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { n: 1, defaultTitle: "Solidarité" },
                    { n: 2, defaultTitle: "Durabilité" },
                    { n: 3, defaultTitle: "Qualité" },
                    { n: 4, defaultTitle: "Innovation" },
                  ].map(({ n, defaultTitle }) => (
                    <div key={n} className="p-4 border border-gray-100 rounded-xl space-y-2 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Valeur {n}</p>
                      <div className="space-y-1">
                        <Label className="text-xs">Titre</Label>
                        <Input value={formData[`about_value_${n}_title`] || ""} onChange={(e) => handleChange(`about_value_${n}_title`, e.target.value)} placeholder={defaultTitle} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={formData[`about_value_${n}_desc`] || ""} onChange={(e) => handleChange(`about_value_${n}_desc`, e.target.value)} className="min-h-[60px] text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
                <SaveBtn keys={["about_values_title", "about_value_1_title", "about_value_1_desc", "about_value_2_title", "about_value_2_desc", "about_value_3_title", "about_value_3_desc", "about_value_4_title", "about_value_4_desc"]} />
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <SectionHeader title="Chronologie (Timeline)" />
                <div className="space-y-2 max-w-2xl mb-4">
                  <Label>Titre de la section</Label>
                  <div className="flex gap-2">
                    <Input value={formData["about_timeline_title"] || ""} onChange={(e) => handleChange("about_timeline_title", e.target.value)} placeholder="15 ans d'engagement" />
                    <Button variant="outline" onClick={() => handleSaveAll(["about_timeline_title"])}>
                      {savingKeys.includes("about_timeline_title") ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {timelineItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-start p-3 border border-gray-100 rounded-xl bg-gray-50/40">
                      <div className="space-y-1">
                        <Label className="text-xs">Année</Label>
                        <Input value={item.year} onChange={(e) => updateTimelineItem(i, "year", e.target.value)} className="h-8 text-sm" placeholder="2024" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Titre</Label>
                        <Input value={item.title} onChange={(e) => updateTimelineItem(i, "title", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input value={item.desc} onChange={(e) => updateTimelineItem(i, "desc", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                        confirm({
                          title: "Supprimer l'étape",
                          description: `Voulez-vous retirer cette étape (${item.year}) de la chronologie ?`,
                          confirmLabel: "Supprimer",
                          variant: "danger",
                          onConfirm: () => removeTimelineItem(i),
                        });
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addTimelineItem} className="text-xs">
                    <Plus size={12} className="mr-1" /> Ajouter une étape
                  </Button>
                  <Button size="sm" className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 text-xs" onClick={() => handleSaveJson("about_timeline", timelineItems, setSavingTimeline)} disabled={savingTimeline}>
                    {savingTimeline ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Save size={12} className="mr-1" />}
                    Enregistrer la chronologie
                  </Button>
                </div>
              </div>

              {/* Zones */}
              <div className="space-y-4">
                <SectionHeader title="Zones de Production" />
                <div className="space-y-2 max-w-2xl mb-4">
                  <Label>Titre de la section</Label>
                  <div className="flex gap-2">
                    <Input value={formData["about_zones_title"] || ""} onChange={(e) => handleChange("about_zones_title", e.target.value)} placeholder="Nos Zones de Production" />
                    <Button variant="outline" onClick={() => handleSaveAll(["about_zones_title"])}>
                      {savingKeys.includes("about_zones_title") ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {zoneItems.map((zone, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_1fr_auto] gap-2 items-start p-3 border border-gray-100 rounded-xl bg-gray-50/40">
                      <div className="space-y-1">
                        <Label className="text-xs">Zone / Ville</Label>
                        <Input value={zone.name} onChange={(e) => updateZoneItem(i, "name", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Membres</Label>
                        <Input value={zone.members} onChange={(e) => updateZoneItem(i, "members", e.target.value)} className="h-8 text-sm" type="number" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Spécialité</Label>
                        <Input value={zone.specialty} onChange={(e) => updateZoneItem(i, "specialty", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                        confirm({
                          title: "Supprimer la zone",
                          description: `Voulez-vous supprimer la zone "${zone.name}" ?`,
                          confirmLabel: "Supprimer",
                          variant: "danger",
                          onConfirm: () => removeZoneItem(i),
                        });
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addZoneItem} className="text-xs">
                    <Plus size={12} className="mr-1" /> Ajouter une zone
                  </Button>
                  <Button size="sm" className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 text-xs" onClick={() => handleSaveJson("about_zones", zoneItems, setSavingZones)} disabled={savingZones}>
                    {savingZones ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Save size={12} className="mr-1" />}
                    Enregistrer les zones
                  </Button>
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Section CTA (Bas de page)" />
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={formData["about_cta_title"] || ""} onChange={(e) => handleChange("about_cta_title", e.target.value)} placeholder="Rejoignez le mouvement" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre</Label>
                  <Textarea value={formData["about_cta_subtitle"] || ""} onChange={(e) => handleChange("about_cta_subtitle", e.target.value)} placeholder="Que vous soyez producteur, acheteur ou partenaire..." />
                </div>
                <SaveBtn keys={["about_cta_title", "about_cta_subtitle"]} />
              </div>
            </TabsContent>

            {/* ─── Page Prix ────────────────────────────────────────────────── */}
            <TabsContent value="prix" className="p-6 m-0 space-y-10">

              {/* Hero */}
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Section Hero (bandeau vert)" />
                <div className="space-y-2">
                  <Label>Titre principal</Label>
                  <Input value={formData["prix_hero_title"] || ""} onChange={(e) => handleChange("prix_hero_title", e.target.value)} placeholder="Transparence des prix agricoles en temps réel" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre</Label>
                  <Textarea value={formData["prix_hero_subtitle"] || ""} onChange={(e) => handleChange("prix_hero_subtitle", e.target.value)} className="min-h-[80px]" placeholder="Consultez les prix de vente justes et directs..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stat — Spéculations certifiées</Label>
                    <Input value={formData["prix_stat_certifiees"] || ""} onChange={(e) => handleChange("prix_stat_certifiees", e.target.value)} placeholder="6" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stat — Économie moyenne</Label>
                    <Input value={formData["prix_stat_economie"] || ""} onChange={(e) => handleChange("prix_stat_economie", e.target.value)} placeholder="~12%" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stat — Stock disponible</Label>
                    <Input value={formData["prix_stat_stock"] || ""} onChange={(e) => handleChange("prix_stat_stock", e.target.value)} placeholder="157 t" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stat — Zones de couverture</Label>
                    <Input value={formData["prix_stat_zones"] || ""} onChange={(e) => handleChange("prix_stat_zones", e.target.value)} placeholder="8+" />
                  </div>
                </div>
                <SaveBtn keys={["prix_hero_title", "prix_hero_subtitle", "prix_stat_certifiees", "prix_stat_economie", "prix_stat_stock", "prix_stat_zones"]} />
              </div>

              {/* Spéculations */}
              <div className="space-y-4">
                <SectionHeader title="Catalogue des Spéculations" />
                <p className="text-xs text-gray-500 -mt-2">Modifiez les prix, stocks et informations de chaque produit affiché sur la page publique.</p>
                <div className="space-y-4">
                  {specItems.map((spec, i) => (
                    <div key={spec.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <span className="font-semibold text-sm text-gray-900">{spec.nom || `Produit ${i + 1}`}</span>
                           <span className="text-xs text-gray-400 font-mono px-2 py-0.5 bg-gray-200 rounded">{spec.id}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                          confirm({
                            title: "Supprimer le produit",
                            description: `Voulez-vous retirer "${spec.nom}" du catalogue public ?`,
                            confirmLabel: "Supprimer",
                            variant: "danger",
                            onConfirm: () => removeSpecItem(i),
                          });
                        }}>
                           <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom</Label>
                          <Input value={spec.nom} onChange={(e) => updateSpecItem(i, "nom", e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Catégorie</Label>
                          <Input value={spec.categorie} onChange={(e) => updateSpecItem(i, "categorie", e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prix Coopérative (CFA/kg)</Label>
                          <Input value={spec.prixCoop} onChange={(e) => updateSpecItem(i, "prixCoop", e.target.value)} type="number" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prix Marché (CFA/kg)</Label>
                          <Input value={spec.prixMarche} onChange={(e) => updateSpecItem(i, "prixMarche", e.target.value)} type="number" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Volume Disponible</Label>
                          <Input value={spec.volumeDisponible} onChange={(e) => updateSpecItem(i, "volumeDisponible", e.target.value)} className="h-8 text-sm" placeholder="12 t" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Saison</Label>
                          <Input value={spec.saison} onChange={(e) => updateSpecItem(i, "saison", e.target.value)} className="h-8 text-sm" placeholder="Avr – Juil" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tendance</Label>
                          <select
                            value={spec.tendance}
                            onChange={(e) => updateSpecItem(i, "tendance", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="hausse">Hausse</option>
                            <option value="baisse">Baisse</option>
                            <option value="stable">Stable</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Variation (%)</Label>
                          <Input value={spec.changePercent} onChange={(e) => updateSpecItem(i, "changePercent", e.target.value)} className="h-8 text-sm" placeholder="2.4" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Certification</Label>
                          <Input value={spec.certification} onChange={(e) => updateSpecItem(i, "certification", e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-3">
                          <Label className="text-xs">Description</Label>
                          <Input value={spec.description} onChange={(e) => updateSpecItem(i, "description", e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" onClick={addSpecItem} className="text-xs">
                     <Plus size={12} className="mr-1" /> Ajouter un produit
                   </Button>
                   <Button className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 text-sm" onClick={() => handleSaveJson("prix_speculations", specItems, setSavingSpecs)} disabled={savingSpecs}>
                     {savingSpecs ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                     Enregistrer les spéculations
                   </Button>
                </div>
              </div>
            </TabsContent>

            {/* ─── Page Projets ─────────────────────────────────────────────── */}
            <TabsContent value="projets" className="p-6 m-0 space-y-8">
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Hero de la Page Projets" />
                <div className="space-y-2">
                  <Label>Titre principal</Label>
                  <Input value={formData["projets_hero_title"] || ""} onChange={(e) => handleChange("projets_hero_title", e.target.value)} placeholder="Projets & programmes" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre / Description</Label>
                  <Textarea value={formData["projets_hero_subtitle"] || ""} onChange={(e) => handleChange("projets_hero_subtitle", e.target.value)} className="min-h-[80px]" placeholder="Des investissements concrets pour renforcer les capacités..." />
                </div>
                <div className="space-y-2">
                  <Label>Titre du CTA (bas de page)</Label>
                  <Input value={formData["projets_cta_title"] || ""} onChange={(e) => handleChange("projets_cta_title", e.target.value)} placeholder="Vous souhaitez soutenir nos projets ?" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre du CTA</Label>
                  <Textarea value={formData["projets_cta_subtitle"] || ""} onChange={(e) => handleChange("projets_cta_subtitle", e.target.value)} className="min-h-[70px]" placeholder="Partenaires, bailleurs ou investisseurs..." />
                </div>
                <SaveBtn keys={["projets_hero_title", "projets_hero_subtitle", "projets_cta_title", "projets_cta_subtitle"]} />
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-2xl">
                <p className="text-sm text-blue-800">
                  <strong>Contenu des projets :</strong> Créez, modifiez et publiez vos projets depuis <strong>Admin → Projets</strong> accessible via le menu latéral.
                </p>
              </div>
            </TabsContent>

            {/* ─── Page Blog ────────────────────────────────────────────────── */}
            <TabsContent value="blog" className="p-6 m-0 space-y-8">
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Hero de la Page Blog / Actualités" />
                <div className="space-y-2">
                  <Label>Titre principal</Label>
                  <Input value={formData["blog_hero_title"] || ""} onChange={(e) => handleChange("blog_hero_title", e.target.value)} placeholder="Actualités" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre / Description</Label>
                  <Textarea value={formData["blog_hero_subtitle"] || ""} onChange={(e) => handleChange("blog_hero_subtitle", e.target.value)} className="min-h-[80px]" placeholder="Nouvelles de la coopérative, de nos producteurs..." />
                </div>
                <div className="space-y-2">
                  <Label>Titre du CTA (bas de page)</Label>
                  <Input value={formData["blog_cta_title"] || ""} onChange={(e) => handleChange("blog_cta_title", e.target.value)} placeholder="Restez informé" />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre du CTA</Label>
                  <Textarea value={formData["blog_cta_subtitle"] || ""} onChange={(e) => handleChange("blog_cta_subtitle", e.target.value)} className="min-h-[70px]" placeholder="Suivez les actualités de la coopérative..." />
                </div>
                <SaveBtn keys={["blog_hero_title", "blog_hero_subtitle", "blog_cta_title", "blog_cta_subtitle"]} />
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-2xl">
                <p className="text-sm text-blue-800">
                  <strong>Contenu des articles :</strong> Créez, modifiez et publiez vos articles depuis <strong>Admin → Blog</strong> accessible via le menu latéral.
                </p>
              </div>
            </TabsContent>

            {/* ─── Page Contact ─────────────────────────────────────────────── */}
            <TabsContent value="contact" className="p-6 m-0 space-y-8">
              <div className="space-y-4 max-w-2xl">
                <SectionHeader title="Texte de la Page Contact" />
                <div className="space-y-2">
                  <Label>Titre principal de la page</Label>
                  <Input value={formData["contact_hero_title"] || ""} onChange={(e) => handleChange("contact_hero_title", e.target.value)} placeholder="Contactez-nous" />
                </div>
                <div className="space-y-2">
                  <Label>Description / Sous-titre</Label>
                  <Textarea value={formData["contact_hero_subtitle"] || ""} onChange={(e) => handleChange("contact_hero_subtitle", e.target.value)} className="min-h-[90px]" placeholder="Vous avez des questions sur nos produits, un partenariat ou la coopérative ?" />
                </div>
                <SaveBtn keys={["contact_hero_title", "contact_hero_subtitle"]} />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-2xl">
                <p className="text-sm text-amber-800">
                  <strong>Conseil :</strong> Les informations de contact (adresse, téléphone, email) sont gérées dans l'onglet <strong>Page d'Accueil → Pied de page</strong>.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default GestionSite;
