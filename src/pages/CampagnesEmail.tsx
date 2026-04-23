import { useState } from "react";
import {
  Mail, Plus, Send, Archive, Pencil, Trash2, Loader2,
  Eye, Users, MousePointerClick, BarChart2, Clock,
  CheckCircle2, Search, X, ChevronDown,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 dark:bg-[#0d1525] dark:border-[#1e2d45]">
        <div className="bg-[#1A2E1C] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ti.color}`}>{ti.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${si.color}`}>{si.label}</span>
            </div>
            <p className="font-bold text-sm">{campagne.titre}</p>
            <p className="text-xs opacity-70 mt-0.5">Objet : {campagne.sujet}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white ml-4 mt-0.5"><X size={18} /></button>
        </div>

        {/* Stats */}
        {campagne.statut === "envoye" && (
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-[#1e2d45] border-b border-gray-100 dark:border-[#1e2d45]">
            {[
              { icon: Users,             label: "Destinataires", value: N(campagne.nb_destinataires ?? 0) },
              { icon: Eye,               label: "Ouvertures",    value: `${N(campagne.nb_ouverts)} (${campagne.nb_destinataires ? Math.round(campagne.nb_ouverts / campagne.nb_destinataires * 100) : 0}%)` },
              { icon: MousePointerClick, label: "Clics",         value: `${N(campagne.nb_clics)} (${campagne.nb_ouverts ? Math.round(campagne.nb_clics / campagne.nb_ouverts * 100) : 0}%)` },
            ].map(s => (
              <div key={s.label} className="p-4 flex flex-col items-center gap-1">
                <s.icon size={16} className="text-emerald-600" />
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content preview */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-[#1e2d45] rounded-xl p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Contenu de l'email</p>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {campagne.contenu || <span className="text-gray-400 italic">Aucun contenu rédigé.</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Destinataires", DESTINATAIRES.find(d => d.value === campagne.destinataires)?.label ?? campagne.destinataires],
              ["Créée le",      format(new Date(campagne.created_at), "dd MMM yyyy", { locale: fr })],
              ...(campagne.date_envoi_prevu ? [["Envoi prévu", format(new Date(campagne.date_envoi_prevu), "dd MMM yyyy HH:mm", { locale: fr })]] : []),
              ...(campagne.date_envoi_reel  ? [["Envoyée le",  format(new Date(campagne.date_envoi_reel),  "dd MMM yyyy HH:mm", { locale: fr })]] : []),
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2 border border-gray-100 dark:border-[#1e2d45]">
                <p className="text-gray-400 mb-0.5">{k}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{v}</p>
              </div>
            ))}
          </div>

          {campagne.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {campagne.tags.map(t => (
                <span key={t} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">{t}</span>
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

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <DashboardLayout
      title="Campagnes Email"
      subtitle="Gérez vos campagnes de marketing digital et newsletters"
      actions={
        <Button onClick={openNew} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
          <Plus size={15} className="mr-1.5" /> Nouvelle campagne
        </Button>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total campagnes", value: stats.total,     icon: Mail,             color: "text-gray-700",    bg: "bg-gray-50" },
          { label: "Envoyées",        value: stats.envoyees,  icon: CheckCircle2,     color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Planifiées",      value: stats.planifiees,icon: Clock,            color: "text-amber-700",   bg: "bg-amber-50" },
          { label: "Taux ouverture",  value: `${stats.tauxOuv}%`, icon: BarChart2,   color: "text-blue-700",    bg: "bg-blue-50" },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
              <k.icon size={18} className={k.color} />
            </div>
            <div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Abonnés info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl px-5 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            <span className="text-lg font-bold">{N(nbAbonnes)}</span> abonnés newsletter actifs
          </p>
        </div>
        <span className="text-xs text-blue-500 dark:text-blue-400">Base de diffusion principale</span>
      </div>

      {/* Filters + list */}
      <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-[#1e2d45] flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <Search size={15} className="text-gray-400 shrink-0" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0 h-auto" />
          </div>
          <div className="flex items-center gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-gray-200 dark:border-[#1e2d45] rounded-lg px-3 py-1.5 bg-white dark:bg-[#131d2e] text-gray-700 dark:text-gray-300">
              <option value="tous">Tous types</option>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              className="text-xs border border-gray-200 dark:border-[#1e2d45] rounded-lg px-3 py-1.5 bg-white dark:bg-[#131d2e] text-gray-700 dark:text-gray-300">
              <option value="tous">Tous statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Mail size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune campagne</p>
            <p className="text-sm mt-1">Créez votre première campagne email</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
            {filtered.map(c => {
              const ti = typeInfo(c.type);
              const si = statutInfo(c.statut);
              const tauxOuv = (c.nb_destinataires ?? 0) > 0
                ? Math.round(c.nb_ouverts / c.nb_destinataires! * 100) : null;
              return (
                <div key={c.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer group"
                  onClick={() => setPreview(c)}>
                  {/* Type icon */}
                  <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-[#1e2d45] flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-gray-500 dark:text-gray-400" />
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{c.titre}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ti.color}`}>{ti.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${si.color}`}>{si.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Objet : {c.sujet}</p>
                    {c.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {c.statut === "envoye" && (
                    <div className="hidden sm:flex items-center gap-5 text-center shrink-0">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{N(c.nb_destinataires ?? 0)}</p>
                        <p className="text-[10px] text-gray-400">Dest.</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600">{tauxOuv !== null ? `${tauxOuv}%` : "—"}</p>
                        <p className="text-[10px] text-gray-400">Ouv.</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-600">{N(c.nb_clics)}</p>
                        <p className="text-[10px] text-gray-400">Clics</p>
                      </div>
                    </div>
                  )}
                  {c.statut === "planifie" && c.date_envoi_prevu && (
                    <div className="hidden sm:block text-center shrink-0">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {format(new Date(c.date_envoi_prevu), "dd MMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-[10px] text-gray-400">Envoi prévu</p>
                    </div>
                  )}
                  {c.statut === "brouillon" && (
                    <p className="hidden sm:block text-xs text-gray-400 shrink-0">
                      {format(new Date(c.updated_at), "dd MMM yyyy", { locale: fr })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {c.statut !== "envoye" && c.statut !== "archive" && (
                      <Button variant="outline" size="icon" className="h-7 w-7" title="Marquer comme envoyée"
                        onClick={() => markSent(c)}>
                        <Send size={12} />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-7 w-7" title="Modifier" onClick={() => openEdit(c)}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" title="Supprimer"
                      onClick={() => handleDelete(c)}>
                      <Trash2 size={12} />
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
      title={editingId ? `Campagne — ${form.titre || "…"}` : "Nouvelle Campagne Email"}
      subtitle="Rédigez et planifiez votre message marketing"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("list")}>Retour</Button>
          {form.statut === "brouillon" && (
            <Button variant="outline" size="sm" className="text-amber-700 border-amber-200"
              onClick={() => handleSave({ statut: "planifie" })} disabled={saving}>
              <Clock size={14} className="mr-1" /> Planifier
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200"
            onClick={() => handleSave({ statut: "envoye", date_envoi_reel: new Date().toISOString() })}
            disabled={saving || form.statut === "envoye"}>
            <Send size={14} className="mr-1" /> Marquer envoyée
          </Button>
          <Button onClick={() => handleSave()} disabled={saving} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-5">

        {/* Identity */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Identité de la campagne</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre interne *</Label>
              <Input placeholder="Ex : Newsletter Avril 2026" value={form.titre}
                onChange={e => sf("titre", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Objet de l'email *</Label>
              <Input placeholder="Ex : 🌿 Nos mangues Kent arrivent !" value={form.sujet}
                onChange={e => sf("sujet", e.target.value)} className="h-9 text-sm" />
              <p className="text-[10px] text-gray-400">{form.sujet.length}/60 caractères recommandés</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Type */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</Label>
              <select value={form.type} onChange={e => sf("type", e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-lg px-3 bg-white dark:bg-[#131d2e] text-gray-800 dark:text-gray-200">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {/* Destinataires */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destinataires</Label>
              <select value={form.destinataires} onChange={e => sf("destinataires", e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-lg px-3 bg-white dark:bg-[#131d2e] text-gray-800 dark:text-gray-200">
                {DESTINATAIRES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{N(nbAbonnes)} abonnés disponibles</p>
            </div>
            {/* Date envoi prévu */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date d'envoi prévue</Label>
              <Input type="datetime-local"
                value={form.date_envoi_prevu ? form.date_envoi_prevu.slice(0,16) : ""}
                onChange={e => sf("date_envoi_prevu", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="h-9 text-sm" />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</Label>
            <div className="flex flex-wrap gap-1.5 items-center border border-input rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#131d2e] min-h-[36px]">
              {form.tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => sf("tags", form.tags.filter((_, j) => j !== i))} className="hover:text-red-500"><X size={10} /></button>
                </span>
              ))}
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                onBlur={addTag}
                placeholder={form.tags.length === 0 ? "Ajouter un tag…" : ""}
                className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-gray-400 py-0.5" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contenu de l'email</p>
            <span className="text-[10px] text-gray-400">{form.contenu.length} caractères</span>
          </div>

          {/* Quick-insert templates */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Salutation", text: "Bonjour {prénom},\n\n" },
              { label: "CTA Boutique", text: "\n\n👉 Découvrez notre boutique : https://coopzig.com/prix\n" },
              { label: "Clôture",  text: "\n\nCordialement,\nL'équipe CoopZig / ETAAM\nwww.coopzig.com" },
            ].map(t => (
              <button key={t.label}
                className="text-[10px] font-medium border border-gray-200 dark:border-[#1e2d45] rounded-lg px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-400 transition-colors"
                onClick={() => sf("contenu", form.contenu + t.text)}>
                + {t.label}
              </button>
            ))}
          </div>

          <Textarea
            value={form.contenu}
            onChange={e => sf("contenu", e.target.value)}
            placeholder="Rédigez le contenu de votre email ici…&#10;&#10;Vous pouvez utiliser des variables comme {prénom}, {ville}…"
            className="min-h-[280px] text-sm font-mono leading-relaxed"
          />

          {/* Live preview snippet */}
          {form.contenu && (
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-[#1e2d45] rounded-lg p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-2">Aperçu</p>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto">
                {form.contenu}
              </div>
            </div>
          )}
        </div>

        {/* Stats (edit mode for sent campaigns) */}
        {editingId && form.statut === "envoye" && (
          <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-5 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Statistiques de performance</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Destinataires", field: "nb_destinataires", icon: Users },
                { label: "Ouvertures",    field: "nb_ouverts",       icon: Eye },
                { label: "Clics",         field: "nb_clics",         icon: MousePointerClick },
              ].map(({ label, field, icon: Icon }) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs text-gray-500 flex items-center gap-1"><Icon size={11} />{label}</Label>
                  <Input type="number" min={0} value={(form as any)[field] ?? ""}
                    onChange={e => sf(field, Number(e.target.value))}
                    className="h-9 text-sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-5 space-y-2">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notes internes</Label>
          <Textarea value={form.notes ?? ""}
            onChange={e => sf("notes", e.target.value || null)}
            placeholder="Notes visibles uniquement en interne…"
            className="min-h-[60px] text-sm" />
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pb-8">
          <Button variant="outline" onClick={() => setView("list")}>Retour à la liste</Button>
          <div className="flex gap-2">
            {editingId && (
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => handleDelete(campagnes.find(c => c.id === editingId)!)}>
                <Trash2 size={14} className="mr-1" /> Supprimer
              </Button>
            )}
            <Button onClick={() => handleSave()} disabled={saving} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 px-8">
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
