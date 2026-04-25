import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Module registry ──────────────────────────────────────────────────────────
export const ALL_MODULES = [
  { key: "dashboard",         label: "Tableau de bord",      group: "Général" },
  { key: "producteurs",       label: "Producteurs",           group: "Production" },
  { key: "vergers",           label: "Vergers",               group: "Production" },
  { key: "recoltes",          label: "Récoltes",              group: "Production" },
  { key: "stocks",            label: "Stocks",                group: "Production" },
  { key: "intelligence",      label: "Intelligence IA",       group: "Production" },
  { key: "marketplace",       label: "Marketplace",           group: "Commerce" },
  { key: "commandes",         label: "Commandes",             group: "Commerce" },
  { key: "precommandes",      label: "Précommandes",          group: "Commerce" },
  { key: "demandes",          label: "Demandes publiques",    group: "Commerce" },
  { key: "logistique",        label: "Logistique",            group: "Commerce" },
  { key: "clients",           label: "CRM Clients",           group: "Commerce" },
  { key: "performances",      label: "Performances ventes",   group: "Commerce" },
  { key: "finances",          label: "Finances",              group: "Finances" },
  { key: "journal_comptable", label: "Journal comptable",     group: "Finances" },
  { key: "cotisations",       label: "Cotisations",           group: "Finances" },
  { key: "tresorerie",        label: "Trésorerie",            group: "Finances" },
  { key: "facturation",       label: "Facturation",           group: "Finances" },
  { key: "tendances",         label: "Tendances marché",      group: "Analyse" },
  { key: "pertes",            label: "Pertes post-récolte",   group: "Analyse" },
  { key: "prix_marche",       label: "Prix du marché",        group: "Analyse" },
  { key: "messages",          label: "Messages & Contact",    group: "Communication" },
  { key: "blog",              label: "Blog / Contenu",        group: "Communication" },
  { key: "projets",           label: "Projets",               group: "Communication" },
  { key: "campagnes_email",   label: "Campagnes Email",       group: "Communication" },
  { key: "taches",                  label: "Mes Tâches",                  group: "Personnel" },
  { key: "mon_espace",              label: "Mon Espace Membre",           group: "Personnel" },
  { key: "messages_internes",       label: "Messagerie interne",          group: "Personnel" },
  { key: "agenda",                  label: "Agenda coopératif",           group: "Personnel" },
  { key: "employes",                label: "Gestion RH / Employés",       group: "RH" },
  { key: "producteurs_ecriture",    label: "Producteurs — Écriture",      group: "Droits d'écriture" },
  { key: "vergers_ecriture",        label: "Vergers — Écriture",          group: "Droits d'écriture" },
  { key: "employes_ecriture",       label: "Employés — Écriture",         group: "Droits d'écriture" },
];

// Default module access per role
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  commercial: ["dashboard", "marketplace", "commandes", "precommandes", "demandes", "logistique", "messages", "clients", "performances", "taches", "messages_internes", "agenda"],
  marketing:  ["dashboard", "tendances", "prix_marche", "messages", "demandes", "performances", "blog", "projets", "campagnes_email", "taches", "messages_internes", "agenda"],
  technique:  ["dashboard", "producteurs", "vergers", "recoltes", "stocks", "intelligence", "pertes", "taches", "messages_internes", "agenda"],
  admin:      ALL_MODULES.filter(m => m.group !== "Droits d'écriture").map(m => m.key),
  superadmin: ALL_MODULES.map(m => m.key),
  producteur: ["dashboard", "mon_espace", "taches", "messages_internes", "agenda"],
  acheteur:   ["dashboard", "marketplace", "commandes", "taches", "messages_internes", "agenda"],
};

export type Permission = { id: string; user_id: string; module: string; can_access: boolean };

// ─── Fetch permissions for a specific user (for superadmin management) ────────
export const useUserPermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return [] as Permission[];
      const { data } = await supabase
        .from("user_permissions" as any)
        .select("*")
        .eq("user_id", userId);
      return (data || []) as unknown as Permission[];
    },
    enabled: !!userId,
  });
};

// ─── Fetch current user's own permissions ─────────────────────────────────────
export const useMyPermissions = () => {
  const { user } = useAuth();

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data || []).map((r: any) => r.role as string);
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isPrivileged = roles?.some(r => r === "admin" || r === "superadmin" || r === "producteur" || r === "acheteur");
  const isSuperAdmin = roles?.includes("superadmin") ?? false;

  const { data: permissions } = useQuery({
    queryKey: ["my-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [] as Permission[];
      const { data } = await supabase
        .from("user_permissions" as any)
        .select("*")
        .eq("user_id", user.id);
      return (data || []) as unknown as Permission[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const hasAccess = (module: string): boolean => {
    if (isPrivileged) return true;
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === module);
    return perm ? perm.can_access : false;
  };

  // Séparé de hasAccess : seul le superadmin OU permission explicite accordée
  const canWrite = (module: string): boolean => {
    if (isSuperAdmin) return true;
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === `${module}_ecriture`);
    return perm ? perm.can_access : false;
  };

  const allowedModules = isPrivileged
    ? ALL_MODULES.map(m => m.key)
    : (permissions || []).filter(p => p.can_access).map(p => p.module);

  return { hasAccess, canWrite, allowedModules, roles, isPrivileged, isSuperAdmin };
};

// ─── Save permissions for a user ─────────────────────────────────────────────
export const useSaveUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, modules }: { userId: string; modules: string[] }) => {
      // Delete existing permissions for this user
      await supabase.from("user_permissions" as any).delete().eq("user_id", userId);

      if (modules.length === 0) return;

      // Insert new permissions
      const rows = modules.map(module => ({
        user_id: userId,
        module,
        can_access: true,
      }));
      const { error } = await supabase.from("user_permissions" as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
      queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });
};
