import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export function useUserNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<UserNotification[]>({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (ids: string[] | "all") => {
      if (ids === "all") {
        await supabase
          .from("user_notifications" as any)
          .update({ is_read: true })
          .eq("user_id", user!.id)
          .eq("is_read", false);
      } else {
        await supabase
          .from("user_notifications" as any)
          .update({ is_read: true })
          .in("id", ids);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  return { notifications, unreadCount, markAsRead };
}
