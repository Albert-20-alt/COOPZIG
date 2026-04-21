import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSearchParams } from "react-router-dom";
import {
  Activity, Users, Filter, RefreshCw, Download,
  ShieldCheck, Clock, Layers, ChevronDown,
} from "lucide-react";
import { useActivityLogs, useActiveUsers, ActivityLogEntry } from "@/hooks/useActivityLog";
import { ALL_MODULES } from "@/hooks/usePermissions";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Action badge colours ─────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, string> = {
  create:        "bg-emerald-100 text-emerald-700",
  update:        "bg-blue-100 text-blue-700",
  delete:        "bg-red-100 text-red-700",
  reply:         "bg-purple-100 text-purple-700",
  view:          "bg-gray-100 text-gray-600",
  login:         "bg-yellow-100 text-yellow-700",
  status_change: "bg-orange-100 text-orange-700",
  export:        "bg-teal-100 text-teal-700",
};

const ACTION_LABELS: Record<string, string> = {
  create:        "Création",
  update:        "Modification",
  delete:        "Suppression",
  reply:         "Réponse",
  view:          "Consultation",
  login:         "Connexion",
  status_change: "Changement statut",
  export:        "Export",
};

const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_MODULES.map(m => [m.key, m.label])
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  try {
    return format(parseISO(iso), "dd MMM yyyy HH:mm", { locale: fr });
  } catch {
    return iso;
  }
};

const initials = (name: string | null, email: string | null) => {
  const src = name || email || "?";
  return src.slice(0, 2).toUpperCase();
};

// ─── Log row ──────────────────────────────────────────────────────────────────
const LogRow = ({ log }: { log: ActivityLogEntry }) => (
  <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
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

// ─── Main page ────────────────────────────────────────────────────────────────
const Supervision = () => {
  const [searchParams] = useSearchParams();
  const preUser = searchParams.get("user") || "";

  const [filters, setFilters] = useState({
    userId:   preUser,
    module:   "all",
    action:   "all",
    dateFrom: "",
    dateTo:   "",
  });
  const [applied, setApplied] = useState({ ...filters, userId: preUser });

  const { data: logs = [], isLoading, refetch } = useActivityLogs({
    userId:   applied.userId || undefined,
    module:   applied.module,
    action:   applied.action,
    dateFrom: applied.dateFrom || undefined,
    dateTo:   applied.dateTo   || undefined,
    limit:    500,
  });

  const { data: activeUsers = [] } = useActiveUsers();

  // Derived stats
  const today = new Date().toISOString().slice(0, 10);
  const logsToday      = logs.filter(l => l.created_at.startsWith(today)).length;
  const uniqueUsers    = new Set(logs.map(l => l.user_id).filter(Boolean)).size;
  const createCount    = logs.filter(l => l.action === "create").length;
  const statusChanges  = logs.filter(l => l.action === "status_change").length;

  const applyFilters = () => setApplied({ ...filters });

  const exportCsv = () => {
    const header = ["Date", "Utilisateur", "Email", "Action", "Module", "Description", "Entité"].join(",");
    const rows = logs.map(l => [
      fmtDate(l.created_at),
      `"${l.user_name || ""}"`,
      l.user_email || "",
      l.action,
      l.module,
      `"${(l.label || "").replace(/"/g, '""')}"`,
      l.entity_type ? `${l.entity_type}#${l.entity_id}` : "",
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supervision_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Supervision" subtitle="Journal d'activité et logs de communication">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity size={22} className="text-[#1A2E1C]" />
              Supervision
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Journal d'activité et logs de communication</p>
          </div>
          <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1A2E1C] text-white rounded-lg hover:bg-[#1A2E1C]/90 transition-colors"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Actions aujourd'hui", value: logsToday,     icon: Clock,      color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Utilisateurs actifs", value: uniqueUsers,   icon: Users,      color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Créations",           value: createCount,   icon: Layers,     color: "text-purple-600",  bg: "bg-purple-50" },
          { label: "Changements statut",  value: statusChanges, icon: ShieldCheck,color: "text-orange-600",  bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtres</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* User filter */}
          <div className="relative lg:col-span-2">
            <select
              value={filters.userId}
              onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20"
            >
              <option value="">Tous les utilisateurs</option>
              {activeUsers.map(u => (
                <option key={u.user_id} value={u.user_id ?? ""}>
                  {u.user_name || u.user_email}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Module filter */}
          <div className="relative">
            <select
              value={filters.module}
              onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20"
            >
              <option value="all">Tous les modules</option>
              {ALL_MODULES.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Action filter */}
          <div className="relative">
            <select
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20"
            >
              <option value="all">Toutes les actions</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Date from */}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20"
          />

          {/* Date to */}
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20"
          />
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-[#1A2E1C] text-white text-sm rounded-lg hover:bg-[#1A2E1C]/90 transition-colors"
          >
            Appliquer
          </button>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Journal d'activité
            <span className="ml-2 text-xs font-normal text-gray-400">({logs.length} entrées)</span>
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
                {logs.map(log => (
                  <LogRow key={log.id} log={log} />
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

export default Supervision;
