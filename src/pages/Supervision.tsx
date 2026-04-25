import { useState } from "react";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";
import { useSearchParams } from "react-router-dom";
import {
  Activity, Users, Filter, RefreshCw, Download,
  ShieldCheck, Clock, Layers, ChevronDown, Bell,
  MonitorCheck, LogIn, LogOut, Timer,
  UserX, UserPlus, Mail, ArrowRight, Trash2,
  ChevronLeft, ChevronRight
} from "lucide-react";
import {
  useActivityLogs, useActiveUsers, useUserSessions,
  useAdminNotifications, ActivityLogEntry, UserSession,
  useClearActivityLogs
} from "@/hooks/useActivityLog";
import { ALL_MODULES, useMyPermissions } from "@/hooks/usePermissions";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useConfirm } from "@/components/ConfirmDialog";

// ─── Action badge colours ─────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, string> = {
  create:         "bg-emerald-100 text-emerald-700",
  update:         "bg-blue-100 text-blue-700",
  delete:         "bg-red-100 text-red-700",
  reply:          "bg-purple-100 text-purple-700",
  view:           "bg-gray-100 text-gray-600",
  login:          "bg-yellow-100 text-yellow-700",
  logout:         "bg-orange-100 text-orange-700",
  status_change:  "bg-orange-100 text-orange-700",
  export:         "bg-teal-100 text-teal-700",
  profile_update: "bg-blue-100 text-blue-700",
  password_change:"bg-amber-100 text-amber-700",
  user_deleted:   "bg-red-100 text-red-700",
};

const ACTION_LABELS: Record<string, string> = {
  create:         "Création",
  update:         "Modification",
  delete:         "Suppression",
  reply:          "Réponse",
  view:           "Consultation",
  login:          "Connexion",
  logout:         "Déconnexion",
  status_change:  "Changement statut",
  export:         "Export",
  profile_update: "Màj profil",
  password_change:"Mot de passe",
  user_deleted:   "Utilisateur supprimé",
};

const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.label])
);

const fmtDate = (iso: string) => {
  try { return format(parseISO(iso), "dd MMM yyyy HH:mm", { locale: fr }); }
  catch { return iso; }
};

const timeAgo = (iso: string) => {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr }); }
  catch { return iso; }
};

const initials = (name: string | null, email: string | null) => {
  const src = name || email || "?";
  return src.slice(0, 2).toUpperCase();
};

// ─── Duration helper ─────────────────────────────────────────────────────────
function fmtDuration(seconds: number | null) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

// ─── Log row ──────────────────────────────────────────────────────────────────
const LogRow = ({ log }: { log: ActivityLogEntry }) => (
  <tr className="group border-b border-gray-50 dark:border-white/[0.02] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-300">
    <td className="px-6 py-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-inner overflow-hidden transition-transform group-hover:scale-105">
          {initials(log.user_name, log.user_email)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate tracking-tight">{log.user_name || "Utilisateur"}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider truncate mt-0.5">{log.user_email}</p>
        </div>
      </div>
    </td>
    <td className="px-6 py-5">
      <div className="flex flex-col gap-1.5">
        <span className={cn(
          "inline-flex items-center w-fit px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
          ACTION_STYLES[log.action]?.replace("bg-", "bg-opacity-10 ") || "bg-gray-100 text-gray-600 border-transparent"
        )}>
          {ACTION_LABELS[log.action] || log.action}
        </span>
        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em] ml-1">
          {MODULE_LABEL[log.module] || log.module}
        </span>
      </div>
    </td>
    <td className="px-6 py-5 max-w-[320px]">
      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{log.label || "Aucun détail supplémentaire"}</p>
      {log.entity_type && log.entity_id && (
        <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-md">
          <Layers size={10} className="text-gray-400" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{log.entity_type} ID: {log.entity_id}</p>
        </div>
      )}
    </td>
    <td className="px-6 py-5 whitespace-nowrap">
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 font-bold">
        <Clock size={12} />
        <span className="text-[11px]">{fmtDate(log.created_at)}</span>
      </div>
    </td>
  </tr>
);

// ─── Session row ─────────────────────────────────────────────────────────────
const SessionRow = ({ session }: { session: UserSession }) => {
  const isActive = !session.logged_out_at;
  const dur = session.logged_out_at
    ? Math.round((new Date(session.logged_out_at).getTime() - new Date(session.logged_in_at).getTime()) / 1000)
    : Math.round((Date.now() - new Date(session.logged_in_at).getTime()) / 1000);

  return (
    <tr className="group border-b border-gray-50 dark:border-white/[0.02] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-300">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden transition-transform group-hover:scale-105",
              isActive ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-gray-400 to-gray-500"
            )}>
              {session.user_name?.substring(0, 1).toUpperCase() || session.user_email?.substring(0, 1).toUpperCase() || "?"}
              {/* Shine effect */}
              <div className="absolute inset-0 bg-white/20 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
            {isActive && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-[#0c1220] rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate tracking-tight">{session.user_name || "Utilisateur Anonyme"}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider truncate mt-0.5">{session.user_email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
          isActive 
            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" 
            : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 border border-transparent"
        )}>
          {isActive ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> En ligne</> : <><LogOut size={10} /> Déconnecté</>}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
            <LogIn size={12} className="text-emerald-500" />
            {format(new Date(session.logged_in_at), "d MMM yyyy", { locale: fr })}
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-4.5 font-medium">
            à {format(new Date(session.logged_in_at), "HH:mm")}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.03] w-fit px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/[0.05]">
          <Timer size={14} className="text-gray-400" />
          <span className="text-xs font-black text-gray-700 dark:text-gray-200">{fmtDuration(dur)}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        {isActive ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold">
              <Activity size={10} className="animate-spin-slow" /> ACTIVE
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium italic">Il y a {timeAgo(session.last_seen_at).replace("il y a ", "")}</span>
          </div>
        ) : (
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
             Fermée le {fmtDate(session.logged_out_at!)}
          </div>
        )}
      </td>
    </tr>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Supervision = () => {
  const [searchParams] = useSearchParams();
  const preUser = searchParams.get("user") || "";
  const [activeTab, setActiveTab] = useState<"logs" | "sessions" | "notifications">("logs");

  const [filters, setFilters] = useState({
    userId: preUser, module: "all", action: "all", dateFrom: "", dateTo: "",
  });
  const [applied, setApplied] = useState({ ...filters, userId: preUser });
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { data: logs = [], isLoading, refetch } = useActivityLogs({
    userId: applied.userId || undefined,
    module: applied.module,
    action: applied.action,
    dateFrom: applied.dateFrom || undefined,
    dateTo: applied.dateTo || undefined,
    limit: 500,
  });

  const { data: activeUsers = [] } = useActiveUsers();
  const { data: sessions = [] } = useUserSessions();
  const { notifications, unreadCount, markAsRead } = useAdminNotifications();
  const { roles } = useMyPermissions();
  const isSuperAdmin = roles?.includes("superadmin");
  const confirm = useConfirm();
  const clearLogs = useClearActivityLogs();

  const handleClearLogs = () => {
    confirm({
      title: "Vider le journal d'activité ?",
      description: "Cette action est irréversible et supprimera tout l'historique des actions enregistrées sur la plateforme.",
      confirmLabel: "Tout effacer",
      cancelLabel: "Garder les logs",
      variant: "danger",
      onConfirm: () => clearLogs.mutate(),
    });
  };

  const today = new Date().toISOString().slice(0, 10);
  const logsToday     = logs.filter((l) => l.created_at.startsWith(today)).length;
  const uniqueUsers   = new Set(logs.map((l) => l.user_id).filter(Boolean)).size;
  const activeSessions= sessions.filter((s) => !s.logged_out_at).length;

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const currentLogs = logs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalSessionPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const currentSessions = sessions.slice(
    (sessionPage - 1) * ITEMS_PER_PAGE,
    sessionPage * ITEMS_PER_PAGE
  );

  const applyFilters = () => {
    setApplied({ ...filters });
    setCurrentPage(1);
  };

  const exportCsv = () => {
    const header = ["Date", "Utilisateur", "Email", "Action", "Module", "Description"].join(",");
    const rows = logs.map((l) => [
      fmtDate(l.created_at),
      `"${l.user_name || ""}"`,
      l.user_email || "",
      l.action,
      l.module,
      `"${(l.label || "").replace(/"/g, '""')}"`,
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `supervision_${today}.csv`;
    a.click();
  };

  return (
    <DashboardLayout title="Supervision" subtitle="Activité, sessions et alertes en temps réel">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-emerald-600" /> Supervision Plateforme
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Toute l'activité de vos utilisateurs, de A à Z</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600">
              <RefreshCw size={13} /> Actualiser
            </button>
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1A2E1C] text-white rounded-xl hover:bg-[#1A2E1C]/90 transition-colors">
              <Download size={13} /> Exporter CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Actions aujourd'hui", value: logsToday,      icon: Clock,       color: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Utilisateurs actifs",  value: uniqueUsers,    icon: Users,       color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Sessions en cours",    value: activeSessions, icon: MonitorCheck,color: "text-purple-600",  bg: "bg-purple-50"  },
            { label: "Notifications",        value: unreadCount,    icon: Bell,        color: "text-orange-600",  bg: "bg-orange-50"  },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
          {([
            { key: "logs",          label: "Journal d'activité", icon: Activity      },
            { key: "sessions",      label: "Sessions utilisateurs", icon: MonitorCheck },
            { key: "notifications", label: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ""}`, icon: Bell },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Activity Logs Tab ── */}
        {/* ── Activity Logs Tab ── */}
        {activeTab === "logs" && (
          <>
            {/* Enhanced Filters */}
            <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2rem] border border-gray-100 dark:border-white/[0.05] p-6 shadow-xl shadow-gray-200/40 dark:shadow-none">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Filter size={16} />
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100 tracking-tight">Filtres Avancés</span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Ciblez précisément l'activité</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="relative lg:col-span-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Utilisateur</label>
                  <select value={filters.userId} onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                    className="w-full appearance-none bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
                    <option value="">Tous les utilisateurs</option>
                    {activeUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id ?? ""}>{u.user_name || u.user_email}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-3 text-gray-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
                </div>
                
                <div className="relative group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Module</label>
                  <select value={filters.module} onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
                    className="w-full appearance-none bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
                    <option value="all">Tous les modules</option>
                    {ALL_MODULES.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-3 text-gray-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
                </div>

                <div className="relative group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Action</label>
                  <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                    className="w-full appearance-none bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
                    <option value="all">Toutes les actions</option>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-3 text-gray-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Du</label>
                  <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className="w-full bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Au</label>
                  <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className="w-full bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={applyFilters} className="flex items-center gap-2 px-8 py-2.5 bg-[#1A2E1C] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1A2E1C]/90 hover:scale-105 transition-all shadow-lg shadow-black/10">
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  Appliquer les filtres
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-gray-100 dark:border-white/[0.05] shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.01]">
                <div>
                  <h2 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                    Journal d'activité
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter mt-0.5">{logs.length} événements enregistrés</p>
                </div>
                {isSuperAdmin && logs.length > 0 && (
                  <button 
                    onClick={handleClearLogs}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-100 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all shadow-sm"
                  >
                    <Trash2 size={12} />
                    Nettoyer le journal
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400 animate-pulse">
                  <RefreshCw size={32} className="mb-4 animate-spin" />
                  <p className="text-sm font-black uppercase tracking-widest">Chargement sécurisé des données...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <Activity size={40} className="mb-4 opacity-20" />
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">Aucune activité</p>
                  <p className="text-sm text-gray-400 mt-1">Modifiez vos filtres pour voir plus de résultats.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/30 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/[0.05]">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Acteur</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Action & Module</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Détails de l'événement</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Horodatage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
                      {currentLogs.map((log) => (<LogRow key={log.id} log={log} />))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Logs Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/[0.01] p-4 border-t border-gray-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                    Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, logs.length)} sur {logs.length} événements
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-all disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex items-center gap-1.5 mx-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={cn(
                            "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                            currentPage === p
                              ? "bg-[#1A2E1C] text-white shadow-lg"
                              : "text-gray-400 hover:bg-white dark:hover:bg-white/5"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-all disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Sessions Tab ── */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#1A2E1C] dark:text-white tracking-tight">Sessions Actives</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Surveillance des connexions et temps d'utilisation en temps réel</p>
              </div>
              <div className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 flex items-center gap-2">
                <MonitorCheck size={14} className="text-emerald-500" />
                <span className="text-xs font-black dark:text-gray-200">{sessions.length} SESSIONS</span>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-gray-100 dark:border-white/[0.05] p-24 flex flex-col items-center justify-center text-gray-400">
                <MonitorCheck size={40} className="mb-4 opacity-20" />
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">Aucune session active</p>
                <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">Le journal des sessions se remplira dès que les utilisateurs se connecteront.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-gray-100 dark:border-white/[0.05] shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/[0.05]">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Utilisateur</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Statut</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Connexion</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Durée Totale</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Dernière activité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
                      {currentSessions.map((s) => (<SessionRow key={s.id} session={s} />))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sessions Pagination */}
            {totalSessionPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-4 rounded-[2rem] border border-gray-100 dark:border-white/[0.05] shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                  Affichage de {(sessionPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(sessionPage * ITEMS_PER_PAGE, sessions.length)} sur {sessions.length} sessions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSessionPage(prev => Math.max(1, prev - 1))}
                    disabled={sessionPage === 1}
                    className="p-2 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex items-center gap-1.5 mx-2">
                    {Array.from({ length: totalSessionPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSessionPage(p)}
                        className={cn(
                          "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                          sessionPage === p
                            ? "bg-[#1A2E1C] text-white shadow-lg"
                            : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setSessionPage(prev => Math.min(totalSessionPages, prev + 1))}
                    disabled={sessionPage === totalSessionPages}
                    className="p-2 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Notifications Tab ── */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#1A2E1C] tracking-tight">Centre de Notifications</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{unreadCount} non lues • {notifications.length} au total</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead.mutate("all")}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-xl shadow-emerald-900/10"
                >
                  <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" /> 
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="grid gap-3">
              {notifications.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400 shadow-xl shadow-gray-200/40">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Bell size={32} className="opacity-20" />
                  </div>
                  <p className="text-lg font-bold text-gray-800">C'est très calme ici...</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-xs text-center">Toutes vos notifications importantes apparaîtront ici en temps réel.</p>
                </div>
              ) : notifications.map((n) => {
                const isNew = !n.is_read;
                
                let icon = <Bell size={20} />;
                let iconColor = "text-blue-600";
                let iconBg = "bg-blue-50";
                let typeLabel = n.type;
                
                if (n.type === "login") {
                  icon = <LogIn size={20} />;
                  iconColor = "text-emerald-600";
                  iconBg = "bg-emerald-50";
                  typeLabel = "Connexion";
                } else if (n.type.includes("deleted")) {
                  icon = <UserX size={20} />;
                  iconColor = "text-rose-600";
                  iconBg = "bg-rose-50";
                  typeLabel = "Suppression";
                } else if (n.type.includes("created")) {
                  icon = <UserPlus size={20} />;
                  iconColor = "text-indigo-600";
                  iconBg = "bg-indigo-50";
                  typeLabel = "Création";
                } else if (n.type.includes("email")) {
                  icon = <Mail size={20} />;
                  iconColor = "text-amber-600";
                  iconBg = "bg-amber-50";
                  typeLabel = "Modification";
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => isNew && markAsRead.mutate([n.id])}
                    className={cn(
                      "group relative flex gap-6 p-6 rounded-[2rem] border transition-all cursor-pointer items-center overflow-hidden",
                      isNew 
                        ? "bg-white border-emerald-100 shadow-lg shadow-emerald-900/5 ring-1 ring-emerald-50 hover:shadow-emerald-900/10" 
                        : "bg-gray-50/40 border-transparent hover:bg-white hover:border-gray-100 hover:shadow-xl hover:shadow-gray-200/40"
                    )}
                  >
                    {/* Glass Overlay for New Items */}
                    {isNew && (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-transparent pointer-events-none" />
                    )}

                    {/* Icon Container */}
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-500 group-hover:rounded-[1.5rem] group-hover:rotate-3",
                      isNew ? iconBg : "bg-white"
                    )}>
                      <div className={cn("transition-colors duration-500", isNew ? iconColor : "text-gray-300")}>
                        {icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 relative">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg",
                          isNew ? "bg-[#1A2E1C] text-white" : "bg-gray-200 text-gray-500"
                        )}>
                          {typeLabel}
                        </span>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 font-black">
                          <Clock size={11} /> {timeAgo(n.created_at)}
                        </p>
                      </div>
                      
                      <p className={cn(
                        "text-base font-black tracking-tight mb-0.5",
                        isNew ? "text-gray-900" : "text-gray-500"
                      )}>
                        {n.title}
                      </p>
                      
                      {n.body && (
                        <p className={cn(
                          "text-sm leading-relaxed max-w-3xl",
                          isNew ? "text-gray-600 font-medium" : "text-gray-400"
                        )}>
                          {n.body}
                        </p>
                      )}
                    </div>

                    {/* Action Arrow */}
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 border border-gray-100">
                      <ArrowRight size={18} className="text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Supervision;
