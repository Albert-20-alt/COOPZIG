import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";

export type LogAction =
  | "create" | "update" | "delete" | "reply" | "view"
  | "login" | "logout" | "status_change" | "export"
  | "password_change" | "profile_update" | "user_deleted";

export type ActivityLogEntry = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  label: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  target_id: string | null;
  target_email: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  logged_in_at: string;
  last_seen_at: string;
  logged_out_at: string | null;
  duration_seconds: number | null;
};

// ─── Helper: create a notification for superadmins ────────────────────────────
async function createAdminNotification(params: {
  type: string;
  title: string;
  body?: string;
  actor_id: string;
  actor_email?: string;
  actor_name?: string;
  target_id?: string;
  target_email?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from("admin_notifications").insert({
    type: params.type,
    title: params.title,
    body: params.body || null,
    actor_id: params.actor_id,
    actor_email: params.actor_email || null,
    actor_name: params.actor_name || null,
    target_id: params.target_id || null,
    target_email: params.target_email || null,
    metadata: params.metadata || {},
  });
}

// ─── Hook: log an activity ────────────────────────────────────────────────────
export const useActivityLog = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: {
      action: LogAction;
      module: string;
      label: string;
      entity_type?: string;
      entity_id?: string;
      details?: Record<string, unknown>;
      notify?: boolean;
      notifyTarget?: { id?: string; email?: string };
    }) => {
      if (!user) return;
      const userName = user.user_metadata?.full_name || user.email;

      // 1. Insert activity log
      const { error } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        user_email: user.email,
        user_name: userName,
        action: entry.action,
        module: entry.module,
        label: entry.label,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id || null,
        details: entry.details || {},
      });
      if (error) console.warn("Activity log error:", error.message);

      // 2. Optionally create an admin notification
      if (entry.notify) {
        const notifMap: Record<string, { title: string; body: string }> = {
          profile_update: {
            title: "✏️ Mise à jour de profil",
            body: `${userName} a mis à jour ses informations de profil.`,
          },
          password_change: {
            title: "🔐 Changement de mot de passe",
            body: `${userName} a demandé une réinitialisation de son mot de passe.`,
          },
          user_deleted: {
            title: "🗑️ Suppression d'utilisateur",
            body: `${userName} a supprimé le compte ${entry.notifyTarget?.email || entry.notifyTarget?.id || "inconnu"}.`,
          },
        };

        const notif = notifMap[entry.action];
        if (notif) {
          await createAdminNotification({
            type: entry.action,
            title: notif.title,
            body: notif.body,
            actor_id: user.id,
            actor_email: user.email,
            actor_name: userName as string,
            target_id: entry.notifyTarget?.id,
            target_email: entry.notifyTarget?.email,
            metadata: entry.details || {},
          });
        }
      }
    },
  });
};

// ─── Hook: session tracking (auto heartbeat) ──────────────────────────────────
export const useSessionTracker = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const userName = user.user_metadata?.full_name || user.email;

    const startSession = async () => {
      const { data } = await supabase.from("user_sessions")
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_name: userName,
          user_agent: navigator.userAgent,
        })
        .select("id")
        .single();
      if (data?.id) {
        sessionIdRef.current = data.id;
        await createAdminNotification({
          type: "login",
          title: "🟢 Nouvelle connexion",
          body: `${userName} s'est connecté à la plateforme.`,
          actor_id: user.id,
          actor_email: user.email,
          actor_name: userName as string,
          metadata: { user_agent: navigator.userAgent },
        });
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          user_email: user.email,
          user_name: userName,
          action: "login",
          module: "auth",
          label: "Connexion à la plateforme",
          details: {},
        });
      }
    };

    startSession();

    heartbeatRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return;
      await supabase.from("user_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current);
    }, 2 * 60 * 1000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (!sessionIdRef.current) return;
      const loggedOutAt = new Date().toISOString();
      supabase.from("user_sessions")
        .update({ logged_out_at: loggedOutAt })
        .eq("id", sessionIdRef.current)
        .then(() => {});
    };
  }, [user?.id]);
};

// ─── Hook: fetch activity logs ────────────────────────────────────────────────
export const useActivityLogs = (filters?: {
  userId?: string;
  module?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["activity-logs", filters],
    queryFn: async () => {
      let q = supabase.from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit || 200);

      if (filters?.userId)   q = q.eq("user_id", filters.userId);
      if (filters?.module && filters.module !== "all")  q = q.eq("module", filters.module);
      if (filters?.action && filters.action !== "all")  q = q.eq("action", filters.action);
      if (filters?.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters?.dateTo)   q = q.lte("created_at", filters.dateTo + "T23:59:59");

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ActivityLogEntry[];
    },
    refetchInterval: 30_000,
  });
};

// ─── Hook: fetch user sessions (superadmin) ───────────────────────────────────
export const useUserSessions = (filters?: { userId?: string; activeOnly?: boolean }) => {
  return useQuery({
    queryKey: ["user-sessions", filters],
    queryFn: async () => {
      let q = supabase.from("user_sessions")
        .select("*")
        .order("logged_in_at", { ascending: false })
        .limit(200);

      if (filters?.userId) q = q.eq("user_id", filters.userId);
      if (filters?.activeOnly) q = q.is("logged_out_at", null);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as UserSession[];
    },
    refetchInterval: 60_000,
  });
};

// ─── Hook: fetch admin notifications ─────────────────────────────────────────
export const useAdminNotifications = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AdminNotification[];
    },
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (ids: string[] | "all") => {
      const q = supabase.from("admin_notifications").update({ is_read: true });
      if (ids === "all") {
        await q.eq("is_read", false);
      } else {
        await q.in("id", ids);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  return { notifications, unreadCount, isLoading, markAsRead };
};

// ─── Hook: distinct users who have activity logs ──────────────────────────────
export const useActiveUsers = () => {
  return useQuery({
    queryKey: ["activity-logs-users"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_logs")
        .select("user_id, user_email, user_name")
        .order("created_at", { ascending: false })
        .limit(500);

      const seen = new Set<string>();
      return ((data || []) as ActivityLogEntry[]).filter((row) => {
        if (!row.user_id || seen.has(row.user_id)) return false;
        seen.add(row.user_id);
        return true;
      });
    },
  });
};

// ─── Hook: clear all activity logs (superadmin) ──────────────────────────────
export const useClearActivityLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activity_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs-users"] });
    },
  });
};
