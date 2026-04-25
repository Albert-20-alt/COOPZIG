import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, LayoutGrid, List, Calendar,
  CheckSquare, CalendarClock, MapPin as MapPinIcon,
  ClipboardList, BarChart2, BookOpen, Zap, CalendarDays,
  Clock, AlertCircle, ChevronLeft, ChevronRight,
  Trash2, Edit3, X, CheckCircle2, Circle, Flag,
  Tag, Users, Bell, StickyNote,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tache = Tables<"taches">;

// ── Config par type ───────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string; dot: string }> = {
  tache:             { label: "Tâche",              icon: CheckSquare,  color: "text-gray-700",    bg: "bg-gray-100",    border: "border-gray-200",   dot: "#6B7280" },
  note:              { label: "Note",               icon: StickyNote,   color: "text-yellow-700",  bg: "bg-yellow-50",   border: "border-yellow-200", dot: "#F59E0B" },
  rdv:               { label: "Rendez-vous",        icon: CalendarClock,color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",   dot: "#3B82F6" },
  visite_terrain:    { label: "Visite terrain",     icon: MapPinIcon,   color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200",dot: "#10B981" },
  enquete:           { label: "Enquête",            icon: ClipboardList,color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200", dot: "#8B5CF6" },
  suivi_evaluation:  { label: "Suivi & Évaluation", icon: BarChart2,    color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200", dot: "#F97316" },
  etude:             { label: "Étude",              icon: BookOpen,     color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200", dot: "#6366F1" },
  activite:          { label: "Activité",           icon: Zap,          color: "text-pink-700",    bg: "bg-pink-50",     border: "border-pink-200",   dot: "#EC4899" },
  planning:          { label: "Planning",           icon: CalendarDays, color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-200",   dot: "#14B8A6" },
};

const PRIORITE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  basse:   { label: "Basse",   color: "text-gray-500",  bg: "bg-gray-100" },
  normale: { label: "Normale", color: "text-blue-600",  bg: "bg-blue-50" },
  haute:   { label: "Haute",   color: "text-amber-600", bg: "bg-amber-50" },
  urgente: { label: "Urgente", color: "text-red-600",   bg: "bg-red-50" },
};

const STATUTS = [
  { id: "a_faire",  label: "À faire",   color: "bg-gray-100 text-gray-700",    header: "bg-gray-50 border-gray-200" },
  { id: "en_cours", label: "En cours",  color: "bg-blue-100 text-blue-700",    header: "bg-blue-50 border-blue-200" },
  { id: "termine",  label: "Terminé",   color: "bg-emerald-100 text-emerald-700", header: "bg-emerald-50 border-emerald-200" },
  { id: "annule",   label: "Annulé",    color: "bg-red-100 text-red-700",      header: "bg-red-50 border-red-200" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string | null) => {
  if (!d) return null;
  try {
    const date = parseISO(d);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    return format(date, "dd MMM", { locale: fr });
  } catch { return d; }
};

const defaultForm = () => ({
  titre: "", description: "", type: "tache", statut: "a_faire", priorite: "normale",
  date_debut: "", date_fin: "", date_echeance: "", lieu: "", participants: "", tags: "",
  is_all_day: false, rappel_minutes: "",
});

// ── Form dialog ───────────────────────────────────────────────────────────────
const TacheForm = ({
  open, onClose, editing, userId,
}: {
  open: boolean; onClose: () => void; editing: Tache | null; userId: string;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(editing ? {
    titre: editing.titre,
    description: editing.description ?? "",
    type: editing.type,
    statut: editing.statut,
    priorite: editing.priorite,
    date_debut: editing.date_debut ? editing.date_debut.slice(0, 16) : "",
    date_fin: editing.date_fin ? editing.date_fin.slice(0, 16) : "",
    date_echeance: editing.date_echeance ?? "",
    lieu: editing.lieu ?? "",
    participants: (editing.participants ?? []).join(", "),
    tags: (editing.tags ?? []).join(", "),
    is_all_day: editing.is_all_day ?? false,
    rappel_minutes: editing.rappel_minutes ? String(editing.rappel_minutes) : "",
  } : defaultForm());

  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: userId,
        titre: form.titre,
        description: form.description || null,
        type: form.type,
        statut: form.statut,
        priorite: form.priorite,
        date_debut: form.date_debut ? new Date(form.date_debut).toISOString() : null,
        date_fin: form.date_fin ? new Date(form.date_fin).toISOString() : null,
        date_echeance: form.date_echeance || null,
        lieu: form.lieu || null,
        participants: form.participants ? form.participants.split(",").map(s => s.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        is_all_day: form.is_all_day,
        rappel_minutes: form.rappel_minutes ? Number(form.rappel_minutes) : null,
        couleur: TYPE_CFG[form.type]?.dot ?? "#10B981",
      };
      if (editing) {
        const { error } = await supabase.from("taches").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("taches").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taches"] });
      toast.success(editing ? "Tâche mise à jour" : "Tâche créée");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const TypeIcon = TYPE_CFG[form.type]?.icon ?? CheckSquare;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
        {/* Header */}
        <div className="relative bg-[#0B1910] px-8 py-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", TYPE_CFG[form.type]?.bg ?? "bg-gray-100")}>
              <TypeIcon size={20} className={TYPE_CFG[form.type]?.color ?? "text-gray-600"} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{editing ? "Modifier" : "Nouvelle tâche"}</h2>
              <p className="text-xs text-white/50 mt-0.5">Espace personnel — visible uniquement par vous</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="p-7 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Type + Titre */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Titre *</Label>
            <Input required value={form.titre} onChange={e => f("titre", e.target.value)} placeholder="Nom de la tâche…" className="h-11 rounded-xl" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type *</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CFG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2"><v.icon size={14} className={v.color} /> {v.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Priorité</Label>
              <Select value={form.priorite} onValueChange={v => f("priorite", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITE_CFG).map(([k, v]) => (
                    <SelectItem key={k} value={k}><span className={v.color}>{v.label}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statut</Label>
              <Select value={form.statut} onValueChange={v => f("statut", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description / Notes</Label>
            <Textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3} placeholder="Détails, observations…" className="rounded-xl resize-none" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Début</Label>
              <Input type="datetime-local" value={form.date_debut} onChange={e => f("date_debut", e.target.value)} className="h-10 rounded-xl text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fin</Label>
              <Input type="datetime-local" value={form.date_fin} onChange={e => f("date_fin", e.target.value)} className="h-10 rounded-xl text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Échéance</Label>
              <Input type="date" value={form.date_echeance} onChange={e => f("date_echeance", e.target.value)} className="h-10 rounded-xl text-xs" />
            </div>
          </div>

          {/* Lieu + Participants */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider"><MapPinIcon size={11} className="inline mr-1" />Lieu</Label>
              <Input value={form.lieu} onChange={e => f("lieu", e.target.value)} placeholder="Village, terrain, bureau…" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider"><Users size={11} className="inline mr-1" />Participants</Label>
              <Input value={form.participants} onChange={e => f("participants", e.target.value)} placeholder="Noms séparés par virgule" className="h-10 rounded-xl" />
            </div>
          </div>

          {/* Tags + Rappel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider"><Tag size={11} className="inline mr-1" />Tags</Label>
              <Input value={form.tags} onChange={e => f("tags", e.target.value)} placeholder="terrain, urgent, rapport…" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider"><Bell size={11} className="inline mr-1" />Rappel (minutes avant)</Label>
              <Input type="number" value={form.rappel_minutes} onChange={e => f("rappel_minutes", e.target.value)} placeholder="ex : 30" className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Annuler</Button>
            <Button type="submit" disabled={save.isPending} className="bg-[#1A2E1C] text-white hover:bg-emerald-800 rounded-xl px-6 font-bold">
              {save.isPending ? "Enregistrement…" : editing ? "Mettre à jour" : "Créer la tâche"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Tâche detail modal ────────────────────────────────────────────────────────
const TacheDetail = ({ tache, onClose, onEdit, onDelete }: {
  tache: Tache; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) => {
  const tcfg = TYPE_CFG[tache.type] ?? TYPE_CFG.tache;
  const pcfg = PRIORITE_CFG[tache.priorite] ?? PRIORITE_CFG.normale;
  const scfg = STATUTS.find(s => s.id === tache.statut) ?? STATUTS[0];
  const Icon = tcfg.icon;
  const isDone = tache.statut === "termine";
  const isOverdue = tache.date_echeance && isPast(parseISO(tache.date_echeance)) && !isDone;

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 rounded-[2rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
        {/* Header */}
        <div className="relative bg-[#0B1910] px-7 py-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tcfg.bg)}>
                <Icon size={18} className={tcfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={cn("text-base font-bold text-white leading-snug", isDone && "line-through opacity-70")}>
                  {tache.titre}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md border", tcfg.bg, tcfg.color, tcfg.border)}>
                    {tcfg.label}
                  </span>
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md", pcfg.bg, pcfg.color)}>
                    <Flag size={9} className="inline mr-0.5" />{pcfg.label}
                  </span>
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md", scfg.color)}>
                    {scfg.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {tache.description && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{tache.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {tache.date_echeance && (
              <div className={cn("flex items-center gap-2 p-3 rounded-xl", isOverdue ? "bg-red-50" : "bg-gray-50")}>
                <Clock size={14} className={isOverdue ? "text-red-500" : "text-gray-400"} />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Échéance</p>
                  <p className={cn("text-sm font-semibold", isOverdue ? "text-red-600" : "text-gray-800")}>
                    {format(parseISO(tache.date_echeance), "d MMM yyyy", { locale: fr })}
                    {isOverdue && " · En retard"}
                  </p>
                </div>
              </div>
            )}
            {tache.date_debut && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <CalendarClock size={14} className="text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Début</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {format(parseISO(tache.date_debut), "d MMM · HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            )}
            {tache.date_fin && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <CalendarClock size={14} className="text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fin</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {format(parseISO(tache.date_fin), "d MMM · HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            )}
            {tache.lieu && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <MapPinIcon size={14} className="text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Lieu</p>
                  <p className="text-sm font-semibold text-gray-800">{tache.lieu}</p>
                </div>
              </div>
            )}
            {tache.rappel_minutes != null && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <Bell size={14} className="text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rappel</p>
                  <p className="text-sm font-semibold text-gray-800">{tache.rappel_minutes} min avant</p>
                </div>
              </div>
            )}
          </div>

          {(tache.participants ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users size={11} /> Participants
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tache.participants!.map(p => (
                  <span key={p} className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-700">{p}</span>
                ))}
              </div>
            </div>
          )}

          {(tache.tags ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag size={11} /> Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tache.tags!.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded bg-gray-100 text-[11px] font-bold text-gray-500">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-300">
            Créée le {format(parseISO(tache.created_at), "d MMMM yyyy", { locale: fr })}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
            <Trash2 size={14} className="mr-1.5" /> Supprimer
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="rounded-xl">Fermer</Button>
          <Button onClick={onEdit} className="bg-[#1A2E1C] text-white hover:bg-emerald-800 rounded-xl px-5 font-bold">
            <Edit3 size={14} className="mr-1.5" /> Modifier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Kanban card ───────────────────────────────────────────────────────────────
const KanbanCard = ({ tache, onEdit, onDelete, onStatut, onDragStart, onView }: {
  tache: Tache;
  onEdit: () => void;
  onDelete: () => void;
  onStatut: (s: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onView: () => void;
}) => {
  const tcfg = TYPE_CFG[tache.type] ?? TYPE_CFG.tache;
  const pcfg = PRIORITE_CFG[tache.priorite] ?? PRIORITE_CFG.normale;
  const Icon = tcfg.icon;
  const isDone = tache.statut === "termine";
  const isOverdue = tache.date_echeance && isPast(parseISO(tache.date_echeance)) && !isDone;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onView}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 group hover:shadow-md hover:border-gray-200 transition-all cursor-pointer active:opacity-50 active:scale-[0.98]"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={e => { e.stopPropagation(); onStatut(isDone ? "a_faire" : "termine"); }}
            className="flex-shrink-0 text-gray-300 hover:text-emerald-500 transition-colors"
          >
            {isDone
              ? <CheckCircle2 size={18} className="text-emerald-500" />
              : <Circle size={18} />}
          </button>
          <span className={cn("text-sm font-semibold leading-tight truncate", isDone && "line-through text-gray-400")}>
            {tache.titre}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <Edit3 size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Description excerpt */}
      {tache.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 ml-6">{tache.description}</p>
      )}

      {/* Footer chips */}
      <div className="flex items-center gap-1.5 flex-wrap ml-6">
        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", tcfg.bg, tcfg.color, tcfg.border)}>
          <Icon size={10} /> {tcfg.label}
        </span>

        {tache.priorite !== "normale" && (
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold", pcfg.bg, pcfg.color)}>
            <Flag size={9} /> {pcfg.label}
          </span>
        )}

        {tache.date_echeance && (
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold",
            isOverdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500")}>
            <Clock size={9} /> {fmtDate(tache.date_echeance)}
          </span>
        )}

        {tache.lieu && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-50 text-gray-500 max-w-[120px] truncate">
            <MapPinIcon size={9} /> {tache.lieu}
          </span>
        )}

        {(tache.tags ?? []).slice(0, 2).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500">#{tag}</span>
        ))}
      </div>
    </div>
  );
};

// ── Agenda day view ───────────────────────────────────────────────────────────
const AgendaView = ({ taches, onEdit }: { taches: Tache[]; onEdit: (t: Tache) => void }) => {
  const [month, setMonth] = useState(new Date());

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const byDay = useMemo(() => {
    const map = new Map<string, Tache[]>();
    taches.forEach(t => {
      const key = t.date_echeance ?? (t.date_debut ? t.date_debut.slice(0, 10) : null);
      if (key) {
        const list = map.get(key) ?? [];
        list.push(t);
        map.set(key, list);
      }
    });
    return map;
  }, [taches]);

  const firstDow = (days[0]?.getDay() + 6) % 7; // Mon=0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-base font-bold text-gray-900 capitalize">
          {format(month, "MMMM yyyy", { locale: fr })}
        </h3>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
            const items = byDay.get(key) ?? [];
            const isT = isToday(day);
            const isCurMonth = isThisMonth(day);
            return (
              <div key={key} className={cn(
                "min-h-[80px] rounded-xl p-1.5 border transition-colors",
                isT ? "bg-emerald-50 border-emerald-200" : "border-transparent hover:bg-gray-50",
                !isCurMonth && "opacity-40"
              )}>
                <p className={cn(
                  "text-xs font-bold text-center mb-1",
                  isT ? "text-emerald-700 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[10px]" : "text-gray-500"
                )}>{format(day, "d")}</p>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map(t => {
                    const tc = TYPE_CFG[t.type] ?? TYPE_CFG.tache;
                    return (
                      <button key={t.id} onClick={() => onEdit(t)}
                        className={cn("w-full text-left text-[9px] font-bold px-1.5 py-0.5 rounded truncate border", tc.bg, tc.color, tc.border)}>
                        {t.titre}
                      </button>
                    );
                  })}
                  {items.length > 3 && (
                    <p className="text-[9px] text-gray-400 text-center">+{items.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const Taches = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "liste" | "agenda">("kanban");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("tous");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tache | null>(null);
  const [viewingTache, setViewingTache] = useState<Tache | null>(null);

  const { data: taches = [], isLoading } = useQuery<Tache[]>({
    queryKey: ["taches", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tache[];
    },
    enabled: !!user?.id,
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("taches").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taches"] }),
  });

  const deleteTache = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("taches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["taches"] }); toast.success("Supprimée"); },
  });

  const filtered = useMemo(() => taches.filter(t => {
    const matchType = typeFilter === "tous" || t.type === typeFilter;
    const matchSearch = !search || t.titre.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.lieu ?? "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  }), [taches, typeFilter, search]);

  // KPIs
  const kpi = useMemo(() => ({
    total: taches.length,
    aFaire: taches.filter(t => t.statut === "a_faire").length,
    enCours: taches.filter(t => t.statut === "en_cours").length,
    termine: taches.filter(t => t.statut === "termine").length,
    urgentes: taches.filter(t => t.priorite === "urgente" && t.statut !== "termine").length,
    enRetard: taches.filter(t => t.date_echeance && isPast(parseISO(t.date_echeance)) && t.statut !== "termine").length,
  }), [taches]);

  const openEdit = (t: Tache) => { setViewingTache(null); setEditing(t); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };
  const openView = (t: Tache) => setViewingTache(t);

  return (
    <DashboardLayout title="Mes Tâches" subtitle="Agenda personnel, notes, visites et suivis">
      <div className="space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Espace de travail</h1>
            <p className="text-sm text-gray-500 mt-0.5">Vos tâches, notes et activités — visibles uniquement par vous</p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="bg-[#1A2E1C] text-white hover:bg-emerald-800 rounded-xl font-bold h-11 px-5 shadow-lg shadow-emerald-900/10">
            <Plus size={16} className="mr-2" /> Nouvelle tâche
          </Button>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: kpi.total, cls: "text-gray-900", bg: "" },
            { label: "À faire", value: kpi.aFaire, cls: "text-gray-600", bg: "" },
            { label: "En cours", value: kpi.enCours, cls: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
            { label: "Terminées", value: kpi.termine, cls: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Urgentes", value: kpi.urgentes, cls: "text-amber-600", bg: kpi.urgentes > 0 ? "bg-amber-50 border-amber-100" : "" },
            { label: "En retard", value: kpi.enRetard, cls: "text-red-600", bg: kpi.enRetard > 0 ? "bg-red-50 border-red-100" : "" },
          ].map(k => (
            <div key={k.label} className={cn("bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center", k.bg)}>
              <p className={cn("text-2xl font-black", k.cls)}>{k.value}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans vos tâches…"
              className="pl-10 rounded-xl h-10 border-gray-100" />
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto flex-shrink-0">
            <button onClick={() => setTypeFilter("tous")}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all",
                typeFilter === "tous" ? "bg-[#1A2E1C] text-white shadow" : "text-gray-400 hover:text-gray-700")}>
              Tous
            </button>
            {Object.entries(TYPE_CFG).map(([k, v]) => (
              <button key={k} onClick={() => setTypeFilter(k)}
                className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all flex items-center gap-1",
                  typeFilter === k ? `${v.bg} ${v.color} shadow` : "text-gray-400 hover:text-gray-700")}>
                <v.icon size={11} /> {v.label}
              </button>
            ))}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 flex-shrink-0">
            {([["kanban", LayoutGrid], ["liste", List], ["agenda", Calendar]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-3 py-1.5 rounded-lg transition-all", view === v ? "bg-white shadow text-gray-900" : "text-gray-400 hover:text-gray-700")}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Views ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-20 text-gray-400">Chargement…</div>
        ) : (

          /* KANBAN */
          view === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {STATUTS.map(col => {
                const cards = filtered.filter(t => t.statut === col.id);
                const isOver = dragOverCol === col.id;
                return (
                  <div
                    key={col.id}
                    className="flex flex-col gap-3"
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("tache_id");
                      if (id) updateStatut.mutate({ id, statut: col.id });
                      setDragOverCol(null);
                    }}
                  >
                    {/* Column header */}
                    <div className={cn("flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all", col.header, isOver && "ring-2 ring-emerald-400 ring-offset-1")}>
                      <span className={cn("text-[11px] font-black uppercase tracking-widest", col.color.split(" ")[1])}>{col.label}</span>
                      <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-md", col.color)}>{cards.length}</span>
                    </div>
                    {/* Cards drop zone */}
                    <div className={cn("space-y-2.5 min-h-[80px] rounded-xl transition-all", isOver && "bg-emerald-50/60 ring-1 ring-emerald-200 ring-dashed p-1")}>
                      {cards.length === 0 ? (
                        <div className={cn("text-center py-8 text-gray-300 text-xs font-medium border border-dashed border-gray-200 rounded-xl transition-all", isOver && "border-emerald-300 text-emerald-400 bg-emerald-50")}>
                          {isOver ? "Déposer ici" : "Aucune tâche"}
                        </div>
                      ) : cards.map(t => (
                        <KanbanCard key={t.id} tache={t}
                          onEdit={() => openEdit(t)}
                          onDelete={() => deleteTache.mutate(t.id)}
                          onStatut={s => updateStatut.mutate({ id: t.id, statut: s })}
                          onDragStart={e => { e.dataTransfer.setData("tache_id", t.id); e.dataTransfer.effectAllowed = "move"; }}
                          onView={() => openView(t)} />
                      ))}
                    </div>
                    {/* Quick add */}
                    <button onClick={() => { setEditing(null); setFormOpen(true); }}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all border border-dashed border-gray-200">
                      <Plus size={13} /> Ajouter une tâche
                    </button>
                  </div>
                );
              })}
            </div>

          /* LISTE */
          ) : view === "liste" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <CheckSquare size={36} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucune tâche trouvée</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map(t => {
                    const tcfg = TYPE_CFG[t.type] ?? TYPE_CFG.tache;
                    const pcfg = PRIORITE_CFG[t.priorite] ?? PRIORITE_CFG.normale;
                    const Icon = tcfg.icon;
                    const isDone = t.statut === "termine";
                    const isOverdue = t.date_echeance && isPast(parseISO(t.date_echeance)) && !isDone;
                    return (
                      <div key={t.id} onClick={() => openView(t)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 group transition-colors cursor-pointer">
                        {/* Checkbox */}
                        <button onClick={e => { e.stopPropagation(); updateStatut.mutate({ id: t.id, statut: isDone ? "a_faire" : "termine" }); }}
                          className="flex-shrink-0 text-gray-300 hover:text-emerald-500 transition-colors">
                          {isDone ? <CheckCircle2 size={19} className="text-emerald-500" /> : <Circle size={19} />}
                        </button>

                        {/* Type icon */}
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", tcfg.bg)}>
                          <Icon size={14} className={tcfg.color} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold text-gray-900 truncate", isDone && "line-through text-gray-400")}>{t.titre}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                            {t.lieu && <span className="flex items-center gap-1"><MapPinIcon size={10} /> {t.lieu}</span>}
                            {t.date_echeance && (
                              <span className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-bold")}>
                                <Clock size={10} /> {fmtDate(t.date_echeance)}
                                {isOverdue && <AlertCircle size={10} />}
                              </span>
                            )}
                            {(t.participants ?? []).length > 0 && (
                              <span className="flex items-center gap-1"><Users size={10} /> {t.participants!.length}</span>
                            )}
                          </div>
                        </div>

                        {/* Right badges */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", pcfg.bg, pcfg.color)}>{pcfg.label}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); openEdit(t); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                              <Edit3 size={13} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); deleteTache.mutate(t.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          /* AGENDA */
          ) : (
            <AgendaView taches={filtered} onEdit={openEdit} />
          )
        )}
      </div>

      {/* Detail modal */}
      {viewingTache && (
        <TacheDetail
          tache={viewingTache}
          onClose={() => setViewingTache(null)}
          onEdit={() => openEdit(viewingTache)}
          onDelete={() => { deleteTache.mutate(viewingTache.id); setViewingTache(null); }}
        />
      )}

      {/* Form dialog */}
      {formOpen && user && (
        <TacheForm open={formOpen} onClose={closeForm} editing={editing} userId={user.id} />
      )}
    </DashboardLayout>
  );
};

export default Taches;
