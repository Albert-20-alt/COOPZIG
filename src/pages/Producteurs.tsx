import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  MapPin, Award, Plus, Loader2, Trash2, Pencil, Search,
  ChevronLeft, ChevronRight, Leaf, Users, ShieldCheck, Star,
  Phone, Mail, CalendarDays, Hash, Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyPermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Tables } from "@/integrations/supabase/types";
import { ProducteurDetailModal } from "@/components/crm/ProducteurDetailModal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Producteur = Tables<"producteurs">;
type ProducteurWithStats = Producteur & {
  recoltes: { quantite: number; date_disponibilite: string; produit: string; qualite?: string; unite?: string }[];
  stocks: { quantite_vendue: number; produit_nom: string; updated_at: string }[];
  vergers: { id: string; nom: string; localisation?: string | null; zone?: string | null; culture: string; superficie?: number | null; etat: string; estimation_rendement?: number | null }[];
  cotisations: { id: string; montant: number; statut: string; date_paiement: string; periode: string; mode_paiement?: string | null; notes?: string | null }[];
  employes_producteur: { id: string; nom_complet: string; poste: string; type_contrat: string; statut_actif?: boolean | null; telephone?: string | null; date_embauche?: string | null; created_at: string; producteur_id: string }[];
};

const CULTURES_LIST = ["Mangue", "Anacarde", "Riz", "Banane", "Maïs", "Arachide", "Agrumes", "Papaye", "Citron", "Manioc"];
const CERTIFICATIONS = ["Local", "Bio", "GlobalGAP", "Équitable", "Premium Loc", "Export", "Standard"];
const GENRES = ["Homme", "Femme", "Autre"];

const cultureColors: Record<string, string> = {
  "Mangue": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Anacarde": "bg-amber-50 text-amber-700 border-amber-200",
  "Agrumes": "bg-orange-50 text-orange-700 border-orange-200",
  "Banane": "bg-blue-50 text-blue-700 border-blue-200",
};

const PAGE_SIZE = 12;

const emptyForm = () => ({
  nom: "", localisation: "", superficie: "", certification: "Local",
  cultures: [] as string[], telephone: "", email: "",
  date_adhesion: "", statut_actif: true,
  genre: "", numero_membre: "", latitude: "", longitude: "",
});

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 mb-3 flex items-center gap-2">
    <span className="flex-1 h-px bg-gray-100" />{children}<span className="flex-1 h-px bg-gray-100" />
  </p>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</Label>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, description, trend, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2.5 rounded-lg", variant === "gold" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
        <Icon size={20} strokeWidth={2} />
      </div>
      {trend && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

// ── Cultures multi-select chip ────────────────────────────────────────────────
const CulturesChips = ({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) => {
  const [custom, setCustom] = useState("");

  const allOptions = [...new Set([...CULTURES_LIST, ...value.filter(c => !CULTURES_LIST.includes(c))])];

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed || value.includes(trimmed)) { setCustom(""); return; }
    onChange([...value, trimmed]);
    setCustom("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {allOptions.map(c => {
          const selected = value.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(selected ? value.filter(x => x !== c) : [...value, c])}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                selected
                  ? "bg-[#1A2E1C] text-white border-[#1A2E1C] shadow-sm"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
      {/* Custom culture input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Ajouter une autre culture…"
          className="flex-1 h-8 px-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-600 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="h-8 px-3 rounded-xl bg-[#1A2E1C] text-white text-xs font-bold disabled:opacity-30 transition-opacity"
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
};

// ── Form body (shared Add / Edit) ─────────────────────────────────────────────
const ProducteurForm = ({
  form, setForm,
}: {
  form: ReturnType<typeof emptyForm>;
  setForm: (f: ReturnType<typeof emptyForm>) => void;
}) => {
  const upd = (k: keyof ReturnType<typeof emptyForm>, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">

      {/* ── Identité ── */}
      <SectionLabel>Identité</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom complet *">
          <Input required value={form.nom} onChange={e => upd("nom", e.target.value)} placeholder="Amadou Diallo" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
        </Field>
        <Field label="N° Membre">
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input value={form.numero_membre} onChange={e => upd("numero_membre", e.target.value)} placeholder="MBR-001" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
        <Field label="Genre">
          <Select value={form.genre} onValueChange={v => upd("genre", v)}>
            <SelectTrigger className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white">
              <SelectValue placeholder="Sélectionner…" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date d'adhésion">
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input type="date" value={form.date_adhesion} onChange={e => upd("date_adhesion", e.target.value)} className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
      </div>

      {/* ── Contact ── */}
      <SectionLabel>Contact</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Téléphone / WhatsApp">
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input value={form.telephone} onChange={e => upd("telephone", e.target.value)} placeholder="+221 77 000 00 00" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="contact@domaine.sn" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
      </div>

      {/* ── Exploitation ── */}
      <SectionLabel>Exploitation</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Localisation / Zone">
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input value={form.localisation} onChange={e => upd("localisation", e.target.value)} placeholder="Ziguinchor, Bignona…" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
        <Field label="Superficie (Ha)">
          <Input type="number" step="0.1" min="0" value={form.superficie} onChange={e => upd("superficie", e.target.value)} className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
        </Field>
        <Field label="Certification">
          <Select value={form.certification} onValueChange={v => upd("certification", v)}>
            <SelectTrigger className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CERTIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Types de cultures">
        <CulturesChips value={form.cultures} onChange={v => upd("cultures", v)} />
      </Field>

      {/* ── Géolocalisation ── */}
      <SectionLabel>Géo-référencement (optionnel)</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitude GPS">
          <div className="relative">
            <Navigation size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input type="number" step="0.000001" value={form.latitude} onChange={e => upd("latitude", e.target.value)} placeholder="12.5665" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
        <Field label="Longitude GPS">
          <div className="relative">
            <Navigation size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 rotate-90" />
            <Input type="number" step="0.000001" value={form.longitude} onChange={e => upd("longitude", e.target.value)} placeholder="-16.2735" className="h-10 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-8" />
          </div>
        </Field>
      </div>

      {/* ── Statut ── */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
        <div>
          <p className="font-bold text-gray-900 text-sm">Membre actif</p>
          <p className="text-xs text-gray-400 mt-0.5">Le producteur participe aux activités de la coopérative</p>
        </div>
        <Switch checked={form.statut_actif} onCheckedChange={v => upd("statut_actif", v)} />
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const Producteurs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canWrite } = useMyPermissions();
  const canEdit = canWrite("producteurs");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProducteur, setSelectedProducteur] = useState<ProducteurWithStats | null>(null);
  const [editTarget, setEditTarget] = useState<Producteur | null>(null);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [cultureFilter, setCultureFilter] = useState("toutes");
  const [certifFilter, setCertifFilter] = useState("toutes");
  const confirm = useConfirm();

  const [formData, setFormData] = useState(emptyForm());
  const [editForm, setEditForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ["producteurs", page, searchQuery, statusFilter, cultureFilter, certifFilter],
    queryFn: async () => {
      let q = supabase
        .from("producteurs")
        .select("*, recoltes(quantite,date_disponibilite,produit,qualite,unite), stocks(quantite_vendue,produit_nom,updated_at), vergers(id,nom,localisation,zone,culture,superficie,etat,estimation_rendement), cotisations(id,montant,statut,date_paiement,periode,mode_paiement,notes), employes_producteur(id,nom_complet,poste,type_contrat,statut_actif,telephone,date_embauche,created_at,producteur_id)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchQuery) q = q.ilike("nom", `%${searchQuery}%`);
      if (statusFilter === "actifs") q = q.eq("statut_actif", true);
      if (statusFilter === "inactifs") q = q.eq("statut_actif", false);
      if (cultureFilter !== "toutes") q = q.contains("cultures", [cultureFilter]);
      if (certifFilter !== "toutes") q = q.eq("certification", certifFilter);
      
      const { data: result, error, count } = await q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { producteurs: (result as unknown) as ProducteurWithStats[], total: count || 0 };
    },
  });

  const formToInsert = (f: ReturnType<typeof emptyForm>, userId: string) => ({
    nom: f.nom, localisation: f.localisation,
    superficie: f.superficie ? parseFloat(f.superficie) : null,
    certification: f.certification || null,
    cultures: f.cultures.length > 0 ? f.cultures : null,
    telephone: f.telephone || null, email: f.email || null,
    date_adhesion: f.date_adhesion || null, statut_actif: f.statut_actif,
    genre: f.genre || null, numero_membre: f.numero_membre || null,
    latitude: f.latitude ? parseFloat(f.latitude) : null,
    longitude: f.longitude ? parseFloat(f.longitude) : null,
    user_id: userId,
  });

  const addProducteur = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("producteurs").insert(formToInsert(formData, user.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producteurs"] });
      toast.success("Producteur ajouté avec succès");
      setOpen(false);
      setFormData(emptyForm());
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de l'ajout"),
  });

  const editProducteur = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const { error } = await supabase.from("producteurs").update({
        nom: editForm.nom, localisation: editForm.localisation,
        superficie: editForm.superficie ? parseFloat(editForm.superficie) : null,
        certification: editForm.certification || null,
        cultures: editForm.cultures.length > 0 ? editForm.cultures : null,
        telephone: editForm.telephone || null, email: editForm.email || null,
        date_adhesion: editForm.date_adhesion || null, statut_actif: editForm.statut_actif,
        genre: editForm.genre || null, numero_membre: editForm.numero_membre || null,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
      }).eq("id", editTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producteurs"] });
      toast.success("Profil mis à jour");
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la mise à jour"),
  });

  const deleteProducteur = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("producteurs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producteurs"] });
      toast.success("Producteur supprimé");
    },
  });

  const openEdit = (e: React.MouseEvent, p: Producteur) => {
    e.stopPropagation();
    setEditTarget(p);
    setEditForm({
      nom: p.nom,
      localisation: p.localisation || "",
      superficie: p.superficie?.toString() || "",
      certification: p.certification || "Local",
      cultures: p.cultures || [],
      telephone: p.telephone || "",
      email: p.email || "",
      date_adhesion: p.date_adhesion || "",
      statut_actif: p.statut_actif ?? true,
      genre: p.genre || "",
      numero_membre: p.numero_membre || "",
      latitude: p.latitude?.toString() || "",
      longitude: p.longitude?.toString() || "",
    });
    setEditOpen(true);
  };

  const producteursData = data?.producteurs || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const totalSuperficie = producteursData.reduce((s, p) => s + (p.superficie || 0), 0);
  const activeMembers = producteursData.filter(p => p.statut_actif !== false).length;

  const DialogHeader_ = ({ icon: Icon, title, subtitle }: any) => (
    <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Icon className="text-emerald-400" size={22} />
        </div>
        <div>
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Producteurs" subtitle="Gestion du réseau de producteurs de la coopérative">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131d2e] p-6 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Réseau de producteurs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez l'ensemble des membres et leurs exploitations.</p>
          </div>
          {canEdit && (
            <Button onClick={() => setOpen(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
              <Plus className="mr-2" size={16} />Nouveau producteur
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Effectif total" value={totalItems} icon={Users} description="Membres inscrits" variant="gold" />
          <StatCard title="Membres Actifs" value={activeMembers} icon={ShieldCheck} description="Membres engagés" trend="+1.2%" />
          <StatCard title="Territoire global" value={`${totalSuperficie.toFixed(0)} ha`} icon={Leaf} description="Superficie totale" variant="gold" />
          <StatCard title="Certifications" value="84%" icon={Award} description="Biologique ou GlobalGAP" />
        </div>

        {/* Search & Filters - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un producteur par nom..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-12 border-none bg-gray-50 dark:bg-white/5 focus-visible:ring-1 focus-visible:ring-[#1A2E1C]/20 font-bold h-11 rounded-xl transition-all"
              />
            </div>
            <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
              {[
                { id: "tous", label: "Tous" },
                { id: "actifs", label: "Actifs" },
                { id: "inactifs", label: "Inactifs" }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setStatusFilter(s.id); setPage(0); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    statusFilter === s.id
                      ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-gray-50 dark:border-white/5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Culture :</span>
              <Select value={cultureFilter} onValueChange={(v) => { setCultureFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[160px] h-10 text-xs font-bold bg-white dark:bg-[#131d2e] border-gray-100 dark:border-white/10 rounded-xl focus:ring-[#1A2E1C]/20">
                  <SelectValue placeholder="Toutes les cultures" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes" className="font-bold text-xs">Toutes les cultures</SelectItem>
                  {CULTURES_LIST.map(c => <SelectItem key={c} value={c} className="font-bold text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Certification :</span>
              <Select value={certifFilter} onValueChange={(v) => { setCertifFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[160px] h-10 text-xs font-bold bg-white dark:bg-[#131d2e] border-gray-100 dark:border-white/10 rounded-xl focus:ring-[#1A2E1C]/20">
                  <SelectValue placeholder="Toutes les certifs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes" className="font-bold text-xs">Toutes les certifs</SelectItem>
                  {CERTIFICATIONS.map(c => <SelectItem key={c} value={c} className="font-bold text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {(cultureFilter !== "toutes" || certifFilter !== "toutes" || searchQuery !== "" || statusFilter !== "tous") && (
              <button 
                onClick={() => {
                  setCultureFilter("toutes");
                  setCertifFilter("toutes");
                  setSearchQuery("");
                  setStatusFilter("tous");
                  setPage(0);
                }}
                className="ml-auto text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-[0.2em] px-4 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors whitespace-nowrap w-full sm:w-auto mt-2 sm:mt-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {producteursData.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelectedProducteur(p); setDetailsOpen(true); }}
                className="bg-white dark:bg-[#131d2e] border border-gray-100 dark:border-[#1e2d45] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold text-lg">
                    {p.nom.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.numero_membre && (
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-1 py-0.5 rounded-md">{p.numero_membre}</span>
                    )}
                    <Badge className={cn("border-none rounded-full px-1.5 py-0 text-[10px] font-bold", p.statut_actif !== false ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                      {p.statut_actif !== false ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-0.5">{p.nom}</h3>
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] font-medium">
                    <MapPin size={10} />{p.localisation || "Non renseigné"}
                  </div>
                </div>

                {/* Contact quick info */}
                {(p.telephone || p.email) && (
                  <div className="flex flex-col gap-0.5 mb-3">
                    {p.telephone && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                        <Phone size={10} />{p.telephone}
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium truncate">
                        <Mail size={10} />{p.email}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Surface</p>
                    <p className="text-xs font-black text-gray-900">{p.superficie || 0} <span className="text-[9px] font-medium text-gray-400">Ha</span></p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-right">
                    <p className="text-[9px] font-bold text-emerald-600/70 mb-0.5">Vergers</p>
                    <p className="text-xs font-black text-emerald-700">{p.vergers?.length || 0}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-auto">
                  {p.cultures?.slice(0, 2).map(c => (
                    <Badge key={c} variant="outline" className={cn("rounded-md px-1.5 py-0 font-bold text-[9px] uppercase tracking-tighter", cultureColors[c] || "bg-gray-50 text-gray-600 border-gray-200")}>
                      {c}
                    </Badge>
                  ))}
                  {p.cultures && p.cultures.length > 2 && (
                    <Badge variant="outline" className="rounded-md bg-gray-50 text-gray-400 border-gray-200 text-[9px] px-1 py-0 font-bold">
                      +{p.cultures.length - 2}
                    </Badge>
                  )}
                  {p.certification && (
                    <Badge variant="outline" className="rounded-md bg-amber-50 text-amber-700 border-amber-200 font-bold px-1.5 py-0 text-[9px] uppercase tracking-tighter">
                      <Star size={8} className="mr-1 fill-amber-500 text-amber-500" />{p.certification}
                    </Badge>
                  )}
                </div>

                {canEdit && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-1.5 transition-opacity">
                    <Button size="icon" variant="outline" onClick={(e) => openEdit(e, p)} className="h-7 w-7 bg-white border-gray-200 text-gray-600 hover:text-emerald-600"><Pencil size={12} /></Button>
                    <Button size="icon" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      confirm({
                        title: "Supprimer le producteur",
                        description: `Voulez-vous supprimer "${p.nom}" ? Cette action est irréversible.`,
                        confirmLabel: "Supprimer", variant: "danger",
                        onConfirm: () => deleteProducteur.mutate(p.id),
                      });
                    }} className="h-7 w-7 bg-white border-gray-200 text-gray-600 hover:text-red-600"><Trash2 size={12} /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#131d2e] p-4 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm mt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
              Affichage de {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} membres
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-xl border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 h-9 w-9"
              >
                <ChevronLeft size={14} />
              </Button>
              
              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                      page === p
                        ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10"
                        : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                  >
                    {p + 1}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-xl border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 h-9 w-9"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProducteurDetailModal producteur={selectedProducteur} open={detailsOpen} onOpenChange={setDetailsOpen} canEdit={!!canEdit} />

      {/* ── Add Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
          <DialogHeader_
            icon={Plus}
            title="Nouveau producteur"
            subtitle="Enregistrement d'un nouveau membre de la coopérative"
          />
          <form onSubmit={(e) => { e.preventDefault(); if (!formData.nom) return toast.error("Le nom est requis"); addProducteur.mutate(); }} className="p-6 space-y-2">
            <ProducteurForm form={formData} setForm={setFormData} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-5 h-10 text-gray-500 font-bold">Annuler</Button>
              <Button type="submit" disabled={addProducteur.isPending} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-7 h-10 font-bold shadow-lg shadow-emerald-900/10">
                {addProducteur.isPending && <Loader2 className="animate-spin mr-2" size={16} />}
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
          <DialogHeader_
            icon={Pencil}
            title="Modifier le profil"
            subtitle={`Mise à jour des informations de ${editTarget?.nom || "ce producteur"}`}
          />
          <div className="p-6 space-y-2">
            <ProducteurForm form={editForm} setForm={setEditForm} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl px-5 h-10 text-gray-500 font-bold">Annuler</Button>
              <Button onClick={() => editProducteur.mutate()} disabled={editProducteur.isPending} className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-7 h-10 font-bold">
                {editProducteur.isPending && <Loader2 className="animate-spin mr-2" size={16} />}
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Producteurs;
