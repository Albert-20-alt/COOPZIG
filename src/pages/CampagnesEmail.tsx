import { useState } from "react";
import {
  Mail, Plus, Send, Archive, Pencil, Trash2, Loader2,
  Eye, Users, MousePointerClick, BarChart2, Clock,
  CheckCircle2, Search, X, ChevronDown, Activity, Save
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
type Campagne = {
  id: string;
  titre: string;
  sujet: string;
  contenu: string;
  type: string;
  statut: string;
  destinataires: string;
  nb_destinataires: number | null;
  nb_ouverts: number;
  nb_clics: number;
  date_envoi_prevu: string | null;
  date_envoi_reel: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const TYPES = [
  { value: "newsletter",   label: "Newsletter",   color: "bg-blue-100 text-blue-700" },
  { value: "promotion",    label: "Promotion",    color: "bg-orange-100 text-orange-700" },
  { value: "information",  label: "Information",  color: "bg-purple-100 text-purple-700" },
  { value: "evenement",    label: "Événement",    color: "bg-pink-100 text-pink-700" },
];

const STATUTS = [
  { value: "brouillon", label: "Brouillon",  color: "bg-gray-100 text-gray-600" },
  { value: "planifie",  label: "Planifiée",  color: "bg-amber-100 text-amber-700" },
  { value: "envoye",    label: "Envoyée",    color: "bg-emerald-100 text-emerald-700" },
  { value: "archive",   label: "Archivée",   color: "bg-gray-100 text-gray-400" },
];

const DESTINATAIRES = [
  { value: "tous",        label: "Tous les abonnés" },
  { value: "abonnes",     label: "Newsletter uniquement" },
  { value: "clients",     label: "Clients actifs" },
  { value: "producteurs", label: "Producteurs" },
];

const typeInfo  = (v: string) => TYPES.find(t => t.value === v)   ?? TYPES[0];
const statutInfo = (v: string) => STATUTS.find(s => s.value === v) ?? STATUTS[0];

const N = (v: number) => v.toLocaleString("fr-FR");

const emptyForm = (): Omit<Campagne, "id"|"nb_ouverts"|"nb_clics"|"created_at"|"updated_at"> => ({
  titre: "",
  sujet: "",
  contenu: "",
  type: "newsletter",
  statut: "brouillon",
  destinataires: "tous",
  nb_destinataires: null,
  date_envoi_prevu: null,
  date_envoi_reel: null,
  tags: [],
  notes: null,
});

// ─── Preview modal ────────────────────────────────────────────────────────────
const PreviewModal = ({ campagne, onClose }: { campagne: Campagne | null; onClose: () => void }) => {
  if (!campagne) return null;
  const ti = typeInfo(campagne.type);
  const si = statutInfo(campagne.statut);
  return (
    <Dialog open={!!campagne} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
        <div className="bg-[#0B1910] text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("font-black text-[9px] uppercase tracking-widest py-0.5 px-3 rounded-full border-none shadow-sm bg-white/10 text-white/80", ti.color)}>
                  {ti.label}
                </Badge>
                <Badge variant="outline" className={cn("font-black text-[9px] uppercase tracking-widest py-0.5 px-3 rounded-full border-none shadow-sm bg-white/10 text-white/80", si.color)}>
                  {si.label}
                </Badge>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight leading-tight mb-1">{campagne.titre}</h2>
                <p className="text-emerald-400/60 font-bold text-sm">Objet : {campagne.sujet}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all hover:rotate-90">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats */}
        {campagne.statut === "envoye" && (
          <div className="grid grid-cols-3 bg-gray-50/50 border-b border-black/[0.03]">
            {[
              { icon: Users,             label: "Destinataires", value: N(campagne.nb_destinataires ?? 0) },
              { icon: Eye,               label: "Ouvertures",    value: `${N(campagne.nb_ouverts)} (${campagne.nb_destinataires ? Math.round(campagne.nb_ouverts / campagne.nb_destinataires * 100) : 0}%)` },
              { icon: MousePointerClick, label: "Clics",         value: `${N(campagne.nb_clics)} (${campagne.nb_ouverts ? Math.round(campagne.nb_clics / campagne.nb_ouverts * 100) : 0}%)` },
            ].map((s, i) => (
              <div key={s.label} className={cn("p-6 flex flex-col items-center gap-2", i > 0 && "border-l border-black/[0.03]")}>
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-black/[0.02] mb-1">
                  <s.icon size={18} className="text-emerald-600" />
                </div>
                <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content preview */}
        <div className="p-8 space-y-8">
          <div className="relative group">
            <div className="absolute -inset-4 bg-emerald-50/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Mail size={12} className="text-emerald-500" />
                Contenu de l'email
              </p>
              <div className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium bg-gray-50/50 p-6 rounded-2xl border border-black/[0.02]">
                {campagne.contenu || <span className="text-gray-400 italic">Aucun contenu rédigé.</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ["Public cible", DESTINATAIRES.find(d => d.value === campagne.destinataires)?.label ?? campagne.destinataires, Users],
              ["Date de création", format(new Date(campagne.created_at), "dd MMMM yyyy", { locale: fr }), Clock],
              ...(campagne.date_envoi_prevu ? [["Envoi programmé", format(new Date(campagne.date_envoi_prevu), "dd MMM yyyy HH:mm", { locale: fr }), Send]] : []),
              ...(campagne.date_envoi_reel  ? [["Expédition réelle",  format(new Date(campagne.date_envoi_reel),  "dd MMM yyyy HH:mm", { locale: fr }), CheckCircle2]] : []),
            ].map(([k, v, Icon]: any) => (
              <div key={k} className="bg-white rounded-2xl p-4 border border-black/[0.03] shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{k}</p>
                  <p className="font-bold text-gray-900 text-sm tracking-tight">{v}</p>
                </div>
              </div>
            ))}
          </div>

          {campagne.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-black/[0.03]">
              {campagne.tags.map(t => (
                <Badge key={t} variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-blue-50/50 text-blue-600 border-blue-100">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function CampagnesEmail() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [view, setView]         = useState<"list" | "editor">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [filterType, setFilterType] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [preview, setPreview]   = useState<Campagne | null>(null);
  const [tagInput, setTagInput] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: campagnes = [], isLoading } = useQuery({
    queryKey: ["campagnes-email"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campagnes_email").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Campagne[];
    },
  });

  const { data: nbAbonnes = 0 } = useQuery({
    queryKey: ["newsletter-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("newsletter_subscriptions").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:    campagnes.length,
    envoyees: campagnes.filter(c => c.statut === "envoye").length,
    planifiees: campagnes.filter(c => c.statut === "planifie").length,
    tauxOuv:  (() => {
      const sent = campagnes.filter(c => c.statut === "envoye" && (c.nb_destinataires ?? 0) > 0);
      if (!sent.length) return 0;
      const avg = sent.reduce((s, c) => s + c.nb_ouverts / (c.nb_destinataires!), 0) / sent.length;
      return Math.round(avg * 100);
    })(),
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) sf("tags", [...form.tags, t]);
    setTagInput("");
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setView("editor");
  };

  const openEdit = (c: Campagne) => {
    setEditingId(c.id);
    setForm({
      titre: c.titre, sujet: c.sujet, contenu: c.contenu, type: c.type,
      statut: c.statut, destinataires: c.destinataires,
      nb_destinataires: c.nb_destinataires, date_envoi_prevu: c.date_envoi_prevu,
      date_envoi_reel: c.date_envoi_reel, tags: c.tags, notes: c.notes,
    });
    setView("editor");
  };

  const handleSave = async (overrides?: Partial<typeof form>) => {
    if (!form.titre || !form.sujet) { toast.error("Titre et objet sont obligatoires"); return; }
    setSaving(true);
    try {
      const payload = { ...form, ...overrides, created_by: user?.id };
      if (editingId) {
        const { error } = await (supabase as any).from("campagnes_email").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("campagnes_email").insert(payload);
        if (error) throw error;
      }
      toast.success(editingId ? "Campagne mise à jour" : "Campagne créée");
      qc.invalidateQueries({ queryKey: ["campagnes-email"] });
      if (overrides?.statut) sf("statut", overrides.statut);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const markSent = async (c: Campagne) => {
    const now = new Date().toISOString();
    await (supabase as any).from("campagnes_email").update({
      statut: "envoye",
      date_envoi_reel: now,
      nb_destinataires: c.nb_destinataires ?? nbAbonnes,
    }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["campagnes-email"] });
    toast.success("Campagne marquée comme envoyée");
  };

  const handleDelete = (c: Campagne) =>
    confirm({
      title: "Supprimer la campagne",
      description: `Supprimer "${c.titre}" ? Cette action est irréversible.`,
      confirmLabel: "Supprimer", variant: "danger",
      onConfirm: async () => {
        await (supabase as any).from("campagnes_email").delete().eq("id", c.id);
        qc.invalidateQueries({ queryKey: ["campagnes-email"] });
        toast.success("Campagne supprimée");
        if (editingId === c.id) setView("list");
      },
    });

  const filtered = campagnes.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.titre.toLowerCase().includes(q) || c.sujet.toLowerCase().includes(q);
    const matchType   = filterType   === "tous" || c.type   === filterType;
    const matchStatut = filterStatut === "tous" || c.statut === filterStatut;
    return matchQ && matchType && matchStatut;
  });

  // ─── Sub-components ────────────────────────────────────────────────────────
  const StatCard = ({ label, value, icon: Icon, color, bg, variant = "default" }: any) => {
    const variants: any = {
      emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-100/50",
      amber:   "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-100/50",
      blue:    "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-100/50",
      default: "from-gray-500/10 to-gray-500/5 text-gray-600 border-gray-100/50",
    };

    return (
      <div className={cn(
        "relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/5 group bg-white dark:bg-[#131d2e]",
        variants[variant] || variants.default
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.04] -mr-12 -mt-12 rounded-full blur-3xl group-hover:opacity-[0.08] transition-opacity" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter leading-none">{value}</h3>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-white/5 shadow-xl shadow-black/5 border border-black/[0.03] transition-transform duration-500 group-hover:rotate-6",
            color
          )}>
            <Icon size={24} strokeWidth={2.2} />
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <DashboardLayout
      title="Campagnes Email"
      subtitle="Marketing Relationnel & Communication"
      actions={
        <Button 
          onClick={openNew} 
          className="h-12 px-8 rounded-2xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-xl shadow-emerald-900/10 font-bold transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus size={18} className="mr-2" /> 
          Nouvelle campagne
        </Button>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total campagnes" value={stats.total}      icon={Mail}             color="text-gray-500"    variant="default" />
        <StatCard label="Envoyées"        value={stats.envoyees}  icon={CheckCircle2}     color="text-emerald-500" variant="emerald" />
        <StatCard label="Planifiées"      value={stats.planifiees}icon={Clock}            color="text-amber-500"   variant="amber" />
        <StatCard label="Taux ouverture"  value={`${stats.tauxOuv}%`} icon={BarChart2}   color="text-blue-500"    variant="blue" />
      </div>

      {/* Abonnés info banner */}
      <div className="relative overflow-hidden bg-[#0B1910] p-8 rounded-[2.5rem] border border-black/[0.03] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] mb-8 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900/20 rounded-full blur-[60px] -ml-24 -mb-24 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-900/40">
              <Users className="text-emerald-400" size={32} />
            </div>
            <div>
              <p className="text-emerald-500/60 font-black uppercase tracking-widest text-[10px] mb-1">Base de diffusion principale</p>
              <h2 className="text-3xl font-black text-white tracking-tighter leading-none">
                {N(nbAbonnes)} <span className="text-emerald-400/50">Abonnés Actifs</span>
              </h2>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-400 tracking-tight">Flux de synchronisation actif</span>
          </div>
        </div>
      </div>

      {/* Filters + list */}
      <div className="bg-white dark:bg-[#131d2e] rounded-[2.5rem] border border-black/[0.03] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-8 border-b border-black/[0.03] bg-gray-50/30 flex flex-col lg:flex-row items-center gap-6">
          <div className="relative w-full max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une campagne par titre ou objet…"
              className="pl-12 h-14 rounded-[1.25rem] bg-white border-black/[0.05] shadow-sm focus:ring-emerald-500/20 text-base font-medium" 
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-1 lg:flex-none items-center gap-2 bg-white p-1 rounded-2xl border border-black/[0.05] shadow-sm">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-transparent outline-none cursor-pointer hover:text-emerald-600 transition-colors">
                <option value="tous">Tous types</option>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="w-px h-6 bg-gray-100" />
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-transparent outline-none cursor-pointer hover:text-emerald-600 transition-colors">
                <option value="tous">Tous statuts</option>
                {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-500 font-bold px-4">
              <Activity size={16} className="text-emerald-500" />
              {filtered.length} résultats
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Synchronisation des campagnes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-24">
            <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Mail className="text-gray-300" size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Aucune campagne à afficher</h3>
            <p className="text-gray-500 max-w-xs mx-auto font-medium">Ajustez vos filtres ou lancez votre première offensive marketing digitale.</p>
            <Button onClick={openNew} variant="outline" className="mt-8 h-12 rounded-2xl border-gray-200 font-bold px-8 shadow-sm">
              <Plus size={18} className="mr-2" />
              Créer une campagne
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.02]">
            {filtered.map(c => {
              const ti = typeInfo(c.type);
              const si = statutInfo(c.statut);
              const tauxOuv = (c.nb_destinataires ?? 0) > 0
                ? Math.round(c.nb_ouverts / c.nb_destinataires! * 100) : null;
              
              return (
                <div key={c.id}
                  className="flex items-center gap-6 px-8 py-6 hover:bg-emerald-50/30 transition-all duration-300 group cursor-pointer"
                  onClick={() => setPreview(c)}>
                  
                  {/* Status Indicator */}
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-black/[0.03] transition-transform duration-500 group-hover:scale-110",
                    c.statut === "envoye" ? "bg-emerald-50 text-emerald-600" :
                    c.statut === "planifie" ? "bg-amber-50 text-amber-600" :
                    "bg-gray-50 text-gray-400"
                  )}>
                    {c.statut === "envoye" ? <Send size={20} /> : 
                     c.statut === "planifie" ? <Clock size={20} /> : 
                     <Pencil size={20} />}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <p className="font-black text-gray-900 text-lg tracking-tight truncate group-hover:text-emerald-700 transition-colors">
                        {c.titre}
                      </p>
                      <Badge variant="outline" className={cn("font-black text-[10px] uppercase tracking-widest py-0.5 px-3 rounded-full border-none shadow-sm", ti.color)}>
                        {ti.label}
                      </Badge>
                      <Badge variant="outline" className={cn("font-black text-[10px] uppercase tracking-widest py-0.5 px-3 rounded-full border-none shadow-sm", si.color)}>
                        {si.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                      Objet : {c.sujet}
                    </p>
                    {c.tags.length > 0 && (
                      <div className="flex gap-2 mt-2.5">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100/50 shadow-sm">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Analytics Overview */}
                  {c.statut === "envoye" && (
                    <div className="hidden lg:flex items-center gap-8 text-center shrink-0 pr-4">
                      <div className="space-y-1">
                        <p className="text-base font-black text-gray-900 leading-none">{N(c.nb_destinataires ?? 0)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Public</p>
                      </div>
                      <div className="space-y-1 border-l border-black/[0.05] pl-8">
                        <p className="text-base font-black text-emerald-600 leading-none">{tauxOuv !== null ? `${tauxOuv}%` : "—"}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Ouvertures</p>
                      </div>
                      <div className="space-y-1 border-l border-black/[0.05] pl-8">
                        <p className="text-base font-black text-blue-600 leading-none">{N(c.nb_clics)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Clics</p>
                      </div>
                    </div>
                  )}

                  {/* Planning Info */}
                  {c.statut === "planifie" && c.date_envoi_prevu && (
                    <div className="hidden sm:block text-center shrink-0 px-6 border-l border-black/[0.05]">
                      <p className="text-sm font-black text-amber-700 tracking-tight">
                        {format(new Date(c.date_envoi_prevu), "dd MMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Envoi prévu</p>
                    </div>
                  )}

                  {/* Date Meta */}
                  {c.statut === "brouillon" && (
                    <div className="hidden sm:block text-right shrink-0 px-6 border-l border-black/[0.05]">
                      <p className="text-sm font-black text-gray-400 tracking-tight">
                        {format(new Date(c.updated_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Dernière édit.</p>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex items-center bg-white p-1.5 rounded-xl border border-black/[0.03] shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                    {c.statut !== "envoye" && c.statut !== "archive" && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Marquer envoyé"
                        onClick={() => markSent(c)}>
                        <Send size={16} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier" onClick={() => openEdit(c)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer"
                      onClick={() => handleDelete(c)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PreviewModal campagne={preview} onClose={() => setPreview(null)} />
    </DashboardLayout>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // EDITOR VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title={editingId ? `Édition — ${form.titre || "…"}` : "Nouvelle Offensive Marketing"}
      subtitle="Concevez un message percutant pour votre audience"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setView("list")} className="rounded-xl font-bold text-gray-500 hover:text-gray-900">
            Annuler
          </Button>
          <div className="w-px h-8 bg-black/[0.05] mx-1" />
          {form.statut === "brouillon" && (
            <Button variant="outline" className="h-11 rounded-xl font-bold border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => handleSave({ statut: "planifie" })} disabled={saving}>
              <Clock size={16} className="mr-2" /> 
              Programmer
            </Button>
          )}
          <Button onClick={() => handleSave()} disabled={saving} 
            className="h-11 px-8 rounded-xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-xl shadow-emerald-900/10 font-bold transition-all hover:scale-[1.02] active:scale-95">
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Enregistrer les modifications
          </Button>
        </div>
      }
    >
      <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Section */}
          <div className="bg-white rounded-[2.5rem] border border-black/[0.03] shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Pencil size={20} />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Configuration de l'email</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Titre de la campagne (interne) *</Label>
                  <Input 
                    placeholder="Ex : Newsletter Saisonnière - Mai 2026" 
                    value={form.titre}
                    onChange={e => sf("titre", e.target.value)} 
                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/20 transition-all font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Objet de l'email (public) *</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Ex : 🌿 Les récoltes de Casamance sont là !" 
                      value={form.sujet}
                      onChange={e => sf("sujet", e.target.value)} 
                      className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/20 transition-all font-bold pr-16" 
                    />
                    <span className={cn(
                      "absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase px-2 py-1 rounded-lg",
                      form.sujet.length > 60 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {form.sujet.length}/60
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Catégorie de communication</Label>
                  <select value={form.type} onChange={e => sf("type", e.target.value)}
                    className="w-full h-12 rounded-2xl bg-gray-50 border-transparent px-4 font-bold text-sm outline-none focus:bg-white focus:border-emerald-500/20 transition-all appearance-none cursor-pointer">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Audience cible</Label>
                  <div className="relative">
                    <select value={form.destinataires} onChange={e => sf("destinataires", e.target.value)}
                      className="w-full h-12 rounded-2xl bg-gray-50 border-transparent px-4 font-bold text-sm outline-none focus:bg-white focus:border-emerald-500/20 transition-all appearance-none cursor-pointer">
                      {DESTINATAIRES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <Badge className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-500 text-white border-none text-[9px] font-black py-1 px-2">
                      {N(nbAbonnes)} abonnés
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tags d'organisation</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-emerald-500/20 transition-all">
                  {form.tags.map((t, i) => (
                    <Badge key={i} className="bg-white text-blue-600 border border-blue-100 shadow-sm font-bold text-[10px] py-1 px-3 flex items-center gap-2 rounded-xl group/tag">
                      {t}
                      <button onClick={() => sf("tags", form.tags.filter((_, j) => j !== i))} className="hover:text-red-500 transition-colors">
                        <X size={12} strokeWidth={3} />
                      </button>
                    </Badge>
                  ))}
                  <input 
                    value={tagInput} 
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                    onBlur={addTag}
                    placeholder={form.tags.length === 0 ? "Ajouter un tag et appuyer sur Entrée..." : "Suivant..."}
                    className="flex-1 min-w-[150px] text-sm bg-transparent outline-none placeholder:text-gray-400 font-bold" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content Editor Section */}
          <div className="bg-white rounded-[2.5rem] border border-black/[0.03] shadow-sm p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Mail size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Corps du message</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-black uppercase bg-gray-50 text-gray-400 border-none">
                {form.contenu.length} caractères
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Salutation", text: "Bonjour {prénom},\n\n", icon: Users },
                { label: "CTA Boutique", text: "\n\n👉 Découvrez notre boutique : https://coopzig.com/prix\n", icon: MousePointerClick },
                { label: "Signature",  text: "\n\nCordialement,\nL'équipe CoopZig / Casamance\nwww.coopzig.com", icon: CheckCircle2 },
              ].map(t => (
                <button key={t.label}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-black/[0.03] rounded-xl px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100 transition-all bg-gray-50/50 shadow-sm"
                  onClick={() => sf("contenu", form.contenu + t.text)}>
                  <t.icon size={12} />
                  {t.label}
                </button>
              ))}
            </div>

            <Textarea
              value={form.contenu}
              onChange={e => sf("contenu", e.target.value)}
              placeholder="Rédigez votre message ici. Vous pouvez utiliser des balises dynamiques comme {prénom}."
              className="min-h-[400px] rounded-3xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/20 transition-all font-medium leading-relaxed p-6 text-base"
            />
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-8">
          {/* Scheduling Card */}
          <div className="bg-white rounded-[2.5rem] border border-black/[0.03] shadow-sm p-8 space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Planification
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date d'envoi programmée</Label>
                <Input type="datetime-local"
                  value={form.date_envoi_prevu ? form.date_envoi_prevu.slice(0,16) : ""}
                  onChange={e => sf("date_envoi_prevu", e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/20 transition-all font-bold" 
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed italic">
                L'envoi sera déclenché automatiquement à la date indiquée si le statut est mis sur "Planifié".
              </p>
            </div>
          </div>

          {/* Performance Card (if sent) */}
          {editingId && form.statut === "envoye" && (
            <div className="bg-[#0B1910] rounded-[2.5rem] border border-black/[0.03] shadow-xl p-8 space-y-6">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 size={16} />
                Métriques de performance
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Destinataires réels", field: "nb_destinataires", icon: Users },
                  { label: "Ouvertures cumulées", field: "nb_ouverts",       icon: Eye },
                  { label: "Clics enregistrés",    field: "nb_clics",         icon: MousePointerClick },
                ].map(({ label, field, icon: Icon }) => (
                  <div key={field} className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                      <Icon size={12} />
                      {label}
                    </Label>
                    <Input type="number" min={0} value={(form as any)[field] ?? ""}
                      onChange={e => sf(field, Number(e.target.value))}
                      className="h-12 rounded-2xl bg-white/5 border-white/10 text-white font-black text-lg focus:bg-white/10 transition-all" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="bg-gray-50/50 rounded-[2.5rem] border border-black/[0.03] p-8 space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Archive size={14} />
              Notes de suivi internes
            </h3>
            <Textarea 
              value={form.notes ?? ""}
              onChange={e => sf("notes", e.target.value || null)}
              placeholder="Observation sur cette campagne..."
              className="min-h-[120px] rounded-2xl bg-white border-black/[0.05] text-sm font-medium p-4" 
            />
          </div>

          {/* Destructive Action */}
          {editingId && (
            <div className="pt-4 px-4">
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl text-red-400 hover:text-red-500 hover:bg-red-50 font-bold transition-all border border-transparent hover:border-red-100"
                onClick={() => handleDelete(campagnes.find(c => c.id === editingId)!)}>
                <Trash2 size={18} className="mr-2" /> 
                Supprimer la campagne
              </Button>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
