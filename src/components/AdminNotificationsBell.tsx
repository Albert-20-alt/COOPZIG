import { useState } from "react";
import { Bell, Check, CheckCheck, X, ShieldAlert, KeyRound, UserX, LogIn, User } from "lucide-react";
import { useAdminNotifications, AdminNotification } from "@/hooks/useActivityLog";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  login:          { icon: LogIn,      color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-100" },
  profile_update: { icon: User,       color: "text-blue-600",    bg: "bg-blue-50",     border: "border-blue-100" },
  password_change:{ icon: KeyRound,   color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-100" },
  user_deleted:   { icon: UserX,      color: "text-red-600",     bg: "bg-red-50",      border: "border-red-100" },
  default:        { icon: ShieldAlert,color: "text-gray-600",    bg: "bg-gray-50",     border: "border-gray-100" },
};

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr });
  } catch {
    return iso;
  }
}

function NotifItem({ notif, onRead }: { notif: AdminNotification; onRead: (id: string) => void }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
  const Icon = cfg.icon;
  return (
    <div
      className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-sm ${
        notif.is_read ? "border-gray-100 bg-white" : `${cfg.border} ${cfg.bg}`
      }`}
      onClick={() => !notif.is_read && onRead(notif.id)}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon size={15} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-tight truncate ${notif.is_read ? "text-gray-600" : "text-gray-900"}`}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.is_read && (
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
      )}
    </div>
  );
}

export default function AdminNotificationsBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useAdminNotifications();

  const handleRead = (id: string) => markAsRead.mutate([id]);
  const handleReadAll = () => markAsRead.mutate("all");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200 transition-all"
      >
        <div className="relative">
          <Bell size={16} className="text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="flex-1 text-left">Notifications</span>
        {unreadCount > 0 && (
          <span className="text-[10px] font-bold text-red-500">{unreadCount} nouv.</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-gray-600" />
                <span className="text-sm font-bold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleReadAll}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <CheckCheck size={11} />
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Bell size={24} className="opacity-30 mb-2" />
                  <p className="text-xs">Aucune notification</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotifItem key={n.id} notif={n} onRead={handleRead} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
