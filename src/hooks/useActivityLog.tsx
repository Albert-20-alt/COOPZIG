import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LogAction = "create" | "update" | "delete" | "reply" | "view" | "login" | "status_change" | "export";

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
  details: Record<string, any>;
  created_at: string;
};

// ─── Hook to log an activity ──────────────────────────────────────────────────
export const useActivityLog = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: {
      action: LogAction;
      module: string;
      label: string;
      entity_type?: string;
      entity_id?: string;
      details?: Record<string, any>;
    }) => {
      if (!user) return;
      const { error } = await supabase.from("activity_logs" as any).insert({
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email,
        action: entry.action,
        module: entry.module,
        label: entry.label,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id || null,
        details: entry.details || {},
      });
      if (error) console.warn("Activity log error:", error.message);
    },
  });
};

// ─── Hook to fetch activity logs (superadmin/admin only) ─────────────────────
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
      let q = (supabase.from("activity_logs" as any) as any)
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

// ─── Hook to get distinct users who logged activities ─────────────────────────
export const useActiveUsers = () => {
  return useQuery({
    queryKey: ["activity-logs-users"],
    queryFn: async () => {
      const { data } = await (supabase.from("activity_logs" as any) as any)
        .select("user_id, user_email, user_name")
        .order("created_at", { ascending: false })
        .limit(500);

      // Deduplicate by user_id
      const seen = new Set<string>();
      return ((data || []) as ActivityLogEntry[]).filter(row => {
        if (!row.user_id || seen.has(row.user_id)) return false;
        seen.add(row.user_id);
        return true;
      });
    },
  });
};
