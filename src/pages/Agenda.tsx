import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  CalendarDays, Plus, MapPin, Clock, X, Edit2, Trash2,
  ChevronLeft, ChevronRight, Users, Mic, Briefcase, CalendarClock,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, addMonths, subMonths, parseISO, isToday,
} from "date-fns";
import { fr } from "date-fns/locale";

type Evenement = {
  id: string;
  title: string;
  description: string | null;
  date_debut: string;
  date_fin: string | null;
  lieu: string | null;
  type: string;
  all_day: boolean;
  created_by: string | null;
  created_at: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  reunion:      { label: "Réunion",       color: "text-blue-700",   bg: "bg-blue-100",   icon: Users },
  formation:    { label: "Formation",     color: "text-purple-700", bg: "bg-purple-100", icon: Mic },
  echeance:     { label: "Échéance",      color: "text-red-700",    bg: "bg-red-100",    icon: CalendarClock },
  autre:        { label: "Autre",         color: "text-gray-700",   bg: "bg-gray-100",   icon: Briefcase },
};

const TYPES = Object.entries(TYPE_CONFIG).map(([id, cfg]) => ({ id, ...cfg }));

const EMPTY: Partial<Evenement> = { title: "", description: "", lieu: "", type: "reunion", all_day: false };

function EventBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.autre;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function EventCard({ ev, canEdit, onEdit, onDelete }: {
  ev: Evenement; canEdit: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.autre;
  const Icon = cfg.icon;
  return (
    <div className="group flex gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{ev.title}</p>
          {canEdit && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={onEdit} className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                <Edit2 size={13} />
              </button>
              <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          <EventBadge type={ev.type} />
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} />
            {ev.all_day
              ? format(parseISO(ev.date_debut), "d MMM yyyy", { locale: fr })
              : format(parseISO(ev.date_debut), "d MMM yyyy · HH:mm", { locale: fr })}
            {ev.date_fin && !ev.all_day && (
              <> — {format(parseISO(ev.date_fin), "HH:mm", { locale: fr })}</>
            )}
          </span>
          {ev.lieu && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={11} />
              {ev.lieu}
            </span>
          )}
        </div>
        {ev.description && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{ev.description}</p>
        )}
      </div>
    </div>
  );
}

export default function Agenda() {
  const { user } = useAuth();
  const { roles } = useMyPermissions();
  const qc = useQueryClient();
  const canEdit = (roles?.includes("admin") || roles?.includes("superadmin")) ?? false;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Evenement | null>(null);
  const [form, setForm] = useState<Partial<Evenement>>(EMPTY);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: events = [], isLoading } = useQuery<Evenement[]>({
    queryKey: ["agenda-evenements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_evenements" as any)
        .select("*")
        .order("date_debut", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.date_debut), day));

  const eventsForSelected = selectedDay ? eventsForDay(selectedDay) : [];
  const upcomingEvents = events.filter((e) => parseISO(e.date_debut) >= new Date());

  const save = useMutation({
    mutationFn: async (data: Partial<Evenement>) => {
      if (editing) {
        const { error } = await supabase
          .from("agenda_evenements" as any)
          .update(data)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agenda_evenements" as any)
          .insert({ ...data, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-evenements"] });
      toast.success(editing ? "Événement modifié" : "Événement créé");
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agenda_evenements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-evenements"] });
      toast.success("Événement supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = (day?: Date) => {
    setEditing(null);
    setForm({
      ...EMPTY,
      date_debut: day
        ? format(day, "yyyy-MM-dd") + "T09:00"
        : format(new Date(), "yyyy-MM-dd") + "T09:00",
    });
    setShowForm(true);
  };

  const openEdit = (ev: Evenement) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      date_debut: ev.date_debut.slice(0, 16),
      date_fin: ev.date_fin ? ev.date_fin.slice(0, 16) : "",
      lieu: ev.lieu ?? "",
      type: ev.type,
      all_day: ev.all_day,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.date_debut) {
      toast.error("Titre et date obligatoires");
      return;
    }
    save.mutate(form);
  };

  return (
    <DashboardLayout title="Agenda coopératif">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalendarDays size={24} className="text-emerald-600" />
              Agenda coopératif
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Planning partagé de la coopérative</p>
          </div>
          {canEdit && (
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 transition-colors"
            >
              <Plus size={16} />
              Nouvel événement
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden">
            {/* Nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1e2d45]">
              <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </span>
              <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                <ChevronRight size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#1e2d45]">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {/* Leading empty cells */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50 dark:border-[#1e2d45]/50" />
              ))}
              {days.map((day) => {
                const dayEvs = eventsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const inMonth = isSameMonth(day, currentMonth);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`h-16 p-1.5 border-b border-r border-gray-50 dark:border-[#1e2d45]/50 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    } ${!inMonth ? "opacity-30" : ""}`}
                  >
                    <p className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday(day) ? "bg-emerald-600 text-white" : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {format(day, "d")}
                    </p>
                    {dayEvs.slice(0, 2).map((e) => {
                      const cfg = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.autre;
                      return (
                        <div key={e.id} className={`text-[9px] font-medium truncate px-1 rounded mt-0.5 ${cfg.bg} ${cfg.color}`}>
                          {e.title}
                        </div>
                      );
                    })}
                    {dayEvs.length > 2 && (
                      <p className="text-[9px] text-gray-400 mt-0.5">+{dayEvs.length - 2}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1e2d45]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">
                    {format(selectedDay, "EEEE d MMMM", { locale: fr })}
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => openCreate(selectedDay)}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Ajouter
                    </button>
                  )}
                </div>
                {eventsForSelected.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun événement ce jour</p>
                ) : (
                  <div className="space-y-2">
                    {eventsForSelected.map((ev) => (
                      <EventCard
                        key={ev.id}
                        ev={ev}
                        canEdit={canEdit}
                        onEdit={() => openEdit(ev)}
                        onDelete={() => del.mutate(ev.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1e2d45]">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Prochains événements</p>
              </div>
              <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {isLoading ? (
                  <p className="text-xs text-gray-400 p-2">Chargement…</p>
                ) : upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-gray-400">
                    <CalendarDays size={24} className="opacity-30 mb-2" />
                    <p className="text-xs">Aucun événement à venir</p>
                  </div>
                ) : (
                  upcomingEvents.slice(0, 20).map((ev) => (
                    <EventCard
                      key={ev.id}
                      ev={ev}
                      canEdit={canEdit}
                      onEdit={() => openEdit(ev)}
                      onDelete={() => del.mutate(ev.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0d1525] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1e2d45]">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {editing ? "Modifier l'événement" : "Nouvel événement"}
              </p>
              <button
                onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Titre *</label>
                <input
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.title ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Titre de l'événement"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Début *</label>
                  <input
                    type={form.all_day ? "date" : "datetime-local"}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.date_debut ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Fin</label>
                  <input
                    type={form.all_day ? "date" : "datetime-local"}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.date_fin ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Type</label>
                  <select
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.type ?? "reunion"}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Lieu</label>
                  <input
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.lieu ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))}
                    placeholder="Salle, adresse…"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={form.all_day ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="all_day" className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Toute la journée
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Description</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Détails optionnels…"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-[#1e2d45] text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 disabled:opacity-50"
                >
                  {save.isPending ? "…" : editing ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
