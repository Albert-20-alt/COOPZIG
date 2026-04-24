import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSearchParams } from "react-router-dom";
import {
  Activity, Users, Filter, RefreshCw, Download,
  ShieldCheck, Clock, Layers, ChevronDown, Bell,
  MonitorCheck, LogIn, LogOut, Timer,
} from "lucide-react";
import {
  useActivityLogs, useActiveUsers, useUserSessions,
  useAdminNotifications, ActivityLogEntry, UserSession,
} from "@/hooks/useActivityLog";
import { ALL_MODULES } from "@/hooks/usePermissions";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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
  <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
          {initials(log.user_name, log.user_email)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{log.user_name || log.user_email || "—"}</p>
          <p className="text-[10px] text-gray-400 truncate">{log.user_email}</p>
        </div>
      </div>
    </td>
    <td className="px-4 py-3">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACTION_STYLES[log.action] || "bg-gray-100 text-gray-600"}`}>
        {ACTION_LABELS[log.action] || log.action}
      </span>
    </td>
    <td className="px-4 py-3">
      <span className="text-xs text-gray-700">{MODULE_LABEL[log.module] || log.module}</span>
    </td>
    <td className="px-4 py-3 max-w-[280px]">
      <p className="text-xs text-gray-800 truncate">{log.label || "—"}</p>
      {log.entity_type && log.entity_id && (
        <p className="text-[10px] text-gray-400">{log.entity_type} #{log.entity_id}</p>
      )}
    </td>
    <td className="px-4 py-3 whitespace-nowrap">
      <p className="text-xs text-gray-500">{fmtDate(log.created_at)}</p>
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
    <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{session.user_name || session.user_email || "—"}</p>
            <p className="text-[10px] text-gray-400 truncate">{session.user_email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          {isActive ? <><MonitorCheck size={9} /> En ligne</> : <><LogOut size={9} /> Déconnecté</>}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-gray-700">
          <LogIn size={11} className="text-emerald-500 shrink-0" />
          {fmtDate(session.logged_in_at)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Timer size={11} className="shrink-0" />
          {fmtDuration(dur)}
        </div>
      </td>
      <td className="px-4 py-3">
        {isActive ? (
          <span className="text-[10px] text-emerald-600 font-medium">Active • {timeAgo(session.last_seen_at)}</span>
        ) : (
          <span className="text-[10px] text-gray-400">{fmtDate(session.logged_out_at!)}</span>
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

  const today = new Date().toISOString().slice(0, 10);
  const logsToday     = logs.filter((l) => l.created_at.startsWith(today)).length;
  const uniqueUsers   = new Set(logs.map((l) => l.user_id).filter(Boolean)).size;
  const activeSessions= sessions.filter((s) => !s.logged_out_at).length;

  const applyFilters = () => setApplied({ ...filters });

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
        {activeTab === "logs" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={13} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filtres</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="relative lg:col-span-2">
                  <select value={filters.userId} onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20">
                    <option value="">Tous les utilisateurs</option>
                    {activeUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id ?? ""}>{u.user_name || u.user_email}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={filters.module} onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20">
                    <option value="all">Tous les modules</option>
                    {ALL_MODULES.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20">
                    <option value="all">Toutes les actions</option>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20" />
                <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20" />
              </div>
              <div className="flex justify-end mt-3">
                <button onClick={applyFilters} className="px-4 py-2 bg-[#1A2E1C] text-white text-sm rounded-xl hover:bg-[#1A2E1C]/90 transition-colors">
                  Appliquer
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Journal d'activité <span className="text-xs font-normal text-gray-400">({logs.length} entrées)</span>
                </h2>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw size={20} className="animate-spin text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500">Chargement...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Activity size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">Aucune activité trouvée</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-2 font-medium">Utilisateur</th>
                        <th className="px-4 py-2 font-medium">Action</th>
                        <th className="px-4 py-2 font-medium">Module</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                        <th className="px-4 py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (<LogRow key={log.id} log={log} />))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Sessions Tab ── */}
        {activeTab === "sessions" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">
                Sessions utilisateurs <span className="text-xs font-normal text-gray-400">({sessions.length} sessions)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Qui s'est connecté, pendant combien de temps et quand</p>
            </div>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <MonitorCheck size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Aucune session enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-2 font-medium">Utilisateur</th>
                      <th className="px-4 py-2 font-medium">Statut</th>
                      <th className="px-4 py-2 font-medium">Connexion</th>
                      <th className="px-4 py-2 font-medium">Durée</th>
                      <th className="px-4 py-2 font-medium">Dernière activité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (<SessionRow key={s.id} session={s} />))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Notifications Tab ── */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Notifications <span className="text-xs font-normal text-gray-400">({notifications.length} total)</span>
              </h2>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead.mutate("all")}
                  className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <ShieldCheck size={12} /> Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Bell size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : notifications.map((n) => {
                const isNew = !n.is_read;
                return (
                  <div
                    key={n.id}
                    onClick={() => isNew && markAsRead.mutate([n.id])}
                    className={`flex gap-4 px-5 py-4 transition-colors cursor-pointer ${isNew ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-gray-50"}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isNew ? "bg-emerald-500" : "bg-gray-200"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isNew ? "text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full h-fit font-semibold shrink-0 ${isNew ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {n.type.replace("_", " ")}
                    </span>
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
