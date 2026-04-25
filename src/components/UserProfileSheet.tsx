import { useState } from "react";
import {
  X, User, Mail, Phone, Building, MapPin, Shield, ShieldCheck, UserX,
  Activity, Clock, MonitorCheck, LogIn, LogOut, Timer, Lock,
  ChevronRight, ExternalLink, Layers,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogs, useUserSessions } from "@/hooks/useActivityLog";
import { ALL_MODULES } from "@/hooks/usePermissions";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type UserRole = Tables<"user_roles">;

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  try { return format(parseISO(iso), "dd MMM yyyy HH:mm", { locale: fr }); }
  catch { return iso; }
};
const timeAgo = (iso: string) => {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr }); }
  catch { return iso; }
};
const fmtDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-rose-100 text-rose-700 border-rose-200",
  admin:      "bg-blue-100 text-blue-700 border-blue-200",
  commercial: "bg-emerald-100 text-emerald-700 border-emerald-200",
  marketing:  "bg-purple-100 text-purple-700 border-purple-200",
  technique:  "bg-orange-100 text-orange-700 border-orange-200",
  producteur: "bg-lime-100 text-lime-700 border-lime-200",
  acheteur:   "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const ACTION_COLORS: Record<string, string> = {
  create:         "bg-emerald-100 text-emerald-700",
  update:         "bg-blue-100 text-blue-700",
  delete:         "bg-red-100 text-red-700",
  login:          "bg-yellow-100 text-yellow-700",
  logout:         "bg-orange-100 text-orange-700",
  profile_update: "bg-blue-100 text-blue-700",
  password_change:"bg-amber-100 text-amber-700",
  user_deleted:   "bg-red-100 text-red-700",
};

const ACTION_LABELS: Record<string, string> = {
  create:         "Création",
  update:         "Modification",
  delete:         "Suppression",
  login:          "Connexion",
  logout:         "Déconnexion",
  profile_update: "Màj profil",
  password_change:"Mot de passe",
  user_deleted:   "Utilisateur supprimé",
  view:           "Consultation",
  export:         "Export",
};

const MODULE_LABEL = Object.fromEntries(ALL_MODULES.map((m) => [m.key, m.label]));

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 font-medium mt-0.5 break-all">{value}</p>
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-[#1A2E1C] text-white" : "bg-gray-200 text-gray-600"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  profile: (Profile & { email?: string }) | null;
  roles: UserRole[];
  hasDelete: boolean;
  isViewerSuperAdmin?: boolean;
  onClose: () => void;
  onDelete?: (id: string, email: string) => void;
  onToggleDelete?: (id: string, grant: boolean) => void;
}

export default function UserProfileSheet({ 
  open, profile, roles, hasDelete, isViewerSuperAdmin, onClose, onDelete, onToggleDelete 
}: Props) {
  const [tab, setTab] = useState<"profil" | "activite" | "sessions" | "permissions">("profil");

  // Permissions
  const { data: permsData } = useQuery({
    queryKey: ["user-perms-sheet", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data } = await supabase
        .from("user_permissions" as any)
        .select("module_key")
        .eq("user_id", profile.user_id);
      return ((data || []) as any[]).map((p) => p.module_key as string);
    },
    enabled: !!profile?.user_id && open,
  });

  const { data: logs = [], isLoading: loadingLogs } = useActivityLogs({
    userId: profile?.user_id || undefined,
    limit: 50,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useUserSessions({
    userId: profile?.user_id || undefined,
  });

  if (!open || !profile) return null;

  const isSuperAdmin = roles.some((r) => r.role === "superadmin");
  const latestSession = sessions[0];
  const isOnline = latestSession && !latestSession.logged_out_at;

  // Group modules by category
  const modulesByCat = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-[#0B1910] to-[#1A2E1C] px-6 pt-6 pb-5 shrink-0">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #4ade80 0%, transparent 50%)" }} />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X size={15} />
          </button>

          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg">
              {(profile.full_name || profile.user_id || "?").slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{profile.full_name || "Sans nom"}</h2>
              <p className="text-sm text-white/60 truncate">{profile.entreprise || "—"}</p>
              {/* Status */}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${isOnline ? "text-emerald-400" : "text-white/40"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                  {isOnline ? "En ligne" : latestSession ? timeAgo(latestSession.last_seen_at) : "Jamais connecté"}
                </span>
                {hasDelete && !isSuperAdmin && (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    <UserX size={9} /> Droit suppression
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="relative flex flex-wrap gap-1.5 mt-4">
            {isSuperAdmin && (
              <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-1 rounded-full font-bold">
                <Shield size={9} /> Super Admin
              </span>
            )}
            {roles.filter((r) => r.role !== "superadmin").map((r) => (
              <span key={r.id} className="text-[10px] bg-white/10 text-white/70 border border-white/10 px-2 py-1 rounded-full font-semibold capitalize">
                {r.role}
              </span>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 p-1 mx-4 my-3 rounded-xl shrink-0">
          <Tab active={tab === "profil"} onClick={() => setTab("profil")} label="Profil" />
          <Tab active={tab === "permissions"} onClick={() => setTab("permissions")} label="Permissions" count={permsData?.length} />
          <Tab active={tab === "sessions"} onClick={() => setTab("sessions")} label="Sessions" count={sessions.length} />
          <Tab active={tab === "activite"} onClick={() => setTab("activite")} label="Activité" count={logs.length} />
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">

          {/* ── PROFIL TAB ── */}
          {tab === "profil" && (
            <div className="space-y-4">
              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sessions", value: sessions.length, icon: MonitorCheck },
                  { label: "Actions", value: logs.length, icon: Activity },
                  { label: "Permissions", value: permsData?.length || 0, icon: Lock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                    <Icon size={16} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xl font-black text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Info section */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Informations personnelles</p>
                <InfoRow icon={User}     label="Nom complet"     value={profile.full_name} />
                <InfoRow icon={Mail}     label="Adresse Email"   value={profile.email} />
                <InfoRow icon={Phone}    label="Téléphone"        value={profile.phone} />
                <InfoRow icon={Building} label="Entreprise"       value={profile.entreprise} />
                <InfoRow icon={MapPin}   label="Adresse"          value={profile.address} />
                <InfoRow icon={Mail}     label="ID utilisateur"   value={profile.user_id} />
              </div>

              {/* Last session */}
              {latestSession && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dernière session</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOnline ? "bg-emerald-50" : "bg-gray-50"}`}>
                      {isOnline ? <MonitorCheck size={14} className="text-emerald-600" /> : <LogOut size={14} className="text-gray-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {isOnline ? "Actuellement en ligne" : "Déconnecté"}
                      </p>
                      <p className="text-xs text-gray-500">Connecté le {fmtDate(latestSession.logged_in_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compte créé */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Compte créé</p>
                <p className="text-sm text-gray-700 font-medium">{fmtDate(profile.created_at)}</p>
              </div>

              {/* Delete action */}
              {!isSuperAdmin && onDelete && (
                <div className="pt-4 border-t border-red-50 mt-4">
                  <button
                    onClick={() => onDelete(profile.user_id!, profile.user_id!)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors border border-red-100"
                  >
                    <UserX size={18} />
                    Supprimer ce compte définitivement
                  </button>
                  <p className="text-[10px] text-center text-red-400 mt-2 italic px-4">
                    Cette action supprimera l'accès et toutes les données de profil de cet utilisateur.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PERMISSIONS TAB ── */}
          {tab === "permissions" && (
            <div className="space-y-4">
              {/* Special permissions */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Permissions spéciales</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${hasDelete ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                    <div className="flex items-center gap-3">
                      <UserX size={14} className={hasDelete ? "text-red-500" : "text-gray-300"} />
                      <span className={`text-sm font-semibold ${hasDelete ? "text-red-700" : "text-gray-400"}`}>
                        Droit de suppression d'utilisateurs
                      </span>
                    </div>
                    {onToggleDelete && isViewerSuperAdmin && !isSuperAdmin ? (
                      <button
                        onClick={() => onToggleDelete(profile.user_id!, !hasDelete)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${hasDelete ? "bg-red-500" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hasDelete ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasDelete ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                        {hasDelete ? "Accordé" : "Non accordé"}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${isSuperAdmin ? "bg-rose-50 border-rose-100" : "bg-gray-50 border-gray-100"}`}>
                    <Shield size={14} className={isSuperAdmin ? "text-rose-500" : "text-gray-300"} />
                    <span className={`text-sm font-semibold ${isSuperAdmin ? "text-rose-700" : "text-gray-400"}`}>
                      Super Administrateur
                    </span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isSuperAdmin ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-400"}`}>
                      {isSuperAdmin ? "Oui" : "Non"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Modules accessibles</p>
                  <span className="text-xs text-gray-500 font-medium">
                    {permsData?.length || 0} / {ALL_MODULES.length}
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  {Object.entries(modulesByCat).map(([group, mods]) => (
                    <div key={group}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-1.5">{group}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {mods.map((m) => {
                          const granted = permsData?.includes(m.key);
                          return (
                            <div
                              key={m.key}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                                granted
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                  : "bg-gray-50 border-gray-100 text-gray-400"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${granted ? "bg-emerald-500" : "bg-gray-300"}`} />
                              {m.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {tab === "sessions" && (
            <div className="space-y-2">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Chargement…</div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <MonitorCheck size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">Aucune session enregistrée</p>
                </div>
              ) : sessions.map((s) => {
                const active = !s.logged_out_at;
                const dur = s.logged_out_at
                  ? Math.round((new Date(s.logged_out_at).getTime() - new Date(s.logged_in_at).getTime()) / 1000)
                  : Math.round((Date.now() - new Date(s.logged_in_at).getTime()) / 1000);
                return (
                  <div key={s.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${active ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100"}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-emerald-100" : "bg-gray-100"}`}>
                      {active ? <MonitorCheck size={14} className="text-emerald-600" /> : <LogOut size={14} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${active ? "text-emerald-700" : "text-gray-700"}`}>
                          {active ? "Session active" : "Session terminée"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Timer size={10} />
                          {fmtDuration(dur)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <LogIn size={10} /> {fmtDate(s.logged_in_at)}
                      </p>
                      {s.logged_out_at && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <LogOut size={10} /> {fmtDate(s.logged_out_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ACTIVITE TAB ── */}
          {tab === "activite" && (
            <div className="space-y-2">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Chargement…</div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Activity size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">Aucune activité enregistrée</p>
                </div>
              ) : (
                <>
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 mt-0.5 ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{MODULE_LABEL[log.module] || log.module}</p>
                        {log.label && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{log.label}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(log.created_at)}</span>
                    </div>
                  ))}
                  <Link
                    to={`/supervision?user=${profile.user_id}`}
                    className="flex items-center justify-center gap-2 py-3 text-sm text-emerald-600 font-semibold hover:underline"
                  >
                    Voir tout dans Supervision <ExternalLink size={12} />
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
