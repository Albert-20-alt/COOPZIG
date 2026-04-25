import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users, Shield, Tractor, Plus, Trash2, Loader2, UserPlus, Mail, Phone,
  Search, ShieldAlert, ShoppingBag, Pencil, ChevronLeft, ChevronRight,
  Briefcase, Megaphone, Wrench, Lock, Eye, Activity, UserX, ShieldCheck, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { ALL_MODULES, ROLE_DEFAULT_PERMISSIONS, useSaveUserPermissions, useUserPermissions } from "@/hooks/usePermissions";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Link } from "react-router-dom";
import UserProfileSheet from "@/components/UserProfileSheet";

type Profile = Tables<"profiles">;
type UserRole = Tables<"user_roles">;
type AppRole = "admin" | "producteur" | "acheteur" | "commercial" | "marketing" | "technique";

// ─── Role metadata ────────────────────────────────────────────────────────────
const roleConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; border: string; description: string }> = {
  superadmin: { label: "Super Admin",  icon: <Shield size={13} />,    bg: "bg-rose-50 text-rose-700",    border: "border-rose-200",    description: "Accès total au système" },
  admin:      { label: "Admin",        icon: <Shield size={13} />,    bg: "bg-blue-50 text-blue-700",    border: "border-blue-200",    description: "Gestion complète" },
  commercial: { label: "Commercial",   icon: <Briefcase size={13} />, bg: "bg-emerald-50 text-emerald-700", border: "border-emerald-200", description: "Commandes et ventes" },
  marketing:  { label: "Marketing",    icon: <Megaphone size={13} />, bg: "bg-purple-50 text-purple-700", border: "border-purple-200", description: "Marchés et tendances" },
  technique:  { label: "Technique",    icon: <Wrench size={13} />,    bg: "bg-orange-50 text-orange-700", border: "border-orange-200", description: "Production et vergers" },
  producteur: { label: "Producteur",   icon: <Tractor size={13} />,   bg: "bg-amber-50 text-amber-700",  border: "border-amber-200",  description: "Gestion de production" },
  acheteur:   { label: "Acheteur",     icon: <ShoppingBag size={13}/>,bg: "bg-cyan-50 text-cyan-700",    border: "border-cyan-200",   description: "Achats et commandes" },
};

const OPERATIONAL_ROLES: AppRole[] = ["commercial", "marketing", "technique"];
const ALL_ROLES: AppRole[] = ["admin", "commercial", "marketing", "technique", "producteur", "acheteur"];

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => {
  const variants: any = {
    green:  "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-100/50",
    amber:  "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-100/50",
    blue:   "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-100/50",
    purple: "from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-100/50",
    orange: "from-orange-500/10 to-orange-500/5 text-orange-600 border-orange-100/50",
    default: "from-gray-500/10 to-gray-500/5 text-gray-600 border-gray-100/50",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/5 group bg-white",
      variants[variant] || variants.default
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.04] -mr-12 -mt-12 rounded-full blur-3xl group-hover:opacity-[0.08] transition-opacity" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{value}</h3>
          </div>
        </div>
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center bg-white shadow-xl shadow-black/5 border border-black/[0.03] transition-transform duration-500 group-hover:rotate-6",
          variant === "green" ? "text-emerald-600" :
          variant === "amber" ? "text-amber-600" :
          variant === "blue" ? "text-blue-600" :
          variant === "purple" ? "text-purple-600" :
          variant === "orange" ? "text-orange-600" :
          "text-gray-600"
        )}>
          <Icon size={28} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
};

// ─── Permissions selector sub-component ──────────────────────────────────────
const PermissionsSelector = ({
  selectedModules,
  onChange,
}: {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
}) => {
  const groups = [...new Set(ALL_MODULES.map(m => m.group))];
  const toggle = (key: string) => {
    onChange(selectedModules.includes(key)
      ? selectedModules.filter(k => k !== key)
      : [...selectedModules, key]);
  };
  const toggleGroup = (group: string) => {
    const groupKeys = ALL_MODULES.filter(m => m.group === group).map(m => m.key);
    const allSelected = groupKeys.every(k => selectedModules.includes(k));
    onChange(allSelected
      ? selectedModules.filter(k => !groupKeys.includes(k))
      : [...new Set([...selectedModules, ...groupKeys])]);
  };

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {groups.map(group => {
        const groupMods = ALL_MODULES.filter(m => m.group === group);
        const allSelected = groupMods.every(m => selectedModules.includes(m.key));
        const someSelected = groupMods.some(m => selectedModules.includes(m.key));
        return (
          <div key={group} className="rounded-2xl border border-black/[0.03] overflow-hidden bg-white shadow-sm transition-all hover:border-emerald-100">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50/50 hover:bg-emerald-50/30 transition-colors text-left"
            >
              <div className={cn(
                "w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all",
                allSelected ? "bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-600/20" :
                someSelected ? "bg-emerald-600/20 border-emerald-600/40" :
                "border-gray-200 bg-white"
              )}>
                {allSelected && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                {!allSelected && someSelected && <div className="w-2 h-0.5 bg-emerald-600 rounded-full" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">{group}</span>
              <Badge variant="outline" className="ml-auto text-[9px] font-black px-1.5 h-4 border-black/[0.05] bg-white text-gray-400">
                {groupMods.filter(m => selectedModules.includes(m.key)).length} / {groupMods.length}
              </Badge>
            </button>
            <div className="grid grid-cols-2 gap-px bg-black/[0.02]">
              {groupMods.map(mod => (
                <label
                  key={mod.key}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer bg-white hover:bg-emerald-50/30 transition-colors group/mod",
                    selectedModules.includes(mod.key) && "bg-emerald-50/10"
                  )}
                >
                  <Checkbox
                    checked={selectedModules.includes(mod.key)}
                    onCheckedChange={() => toggle(mod.key)}
                    className="h-4 w-4 rounded-md border-2 border-gray-200 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <span className={cn(
                    "text-xs font-bold transition-colors",
                    selectedModules.includes(mod.key) ? "text-emerald-900" : "text-gray-600 group-hover/mod:text-gray-900"
                  )}>{mod.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Edit permissions dialog ──────────────────────────────────────────────────
const EditPermissionsDialog = ({
  open, onOpenChange, userId, userName, currentRole,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  userId: string; userName: string; currentRole: string;
}) => {
  const { data: existing } = useUserPermissions(open ? userId : null);
  const savePerms = useSaveUserPermissions();
  const [selected, setSelected] = useState<string[]>([]);

  const isPrivileged = ["admin", "superadmin", "producteur", "acheteur"].includes(currentRole);

  // Init from existing permissions or role defaults
  useState(() => {
    if (existing && existing.length > 0) {
      setSelected(existing.filter(p => p.can_access).map(p => p.module));
    } else {
      setSelected(ROLE_DEFAULT_PERMISSIONS[currentRole] || []);
    }
  });

  const handleSave = async () => {
    await savePerms.mutateAsync({ userId, modules: selected });
    toast.success("Permissions enregistrées");
    onOpenChange(false);
  };

  // Reset when dialog opens
  const handleOpen = (v: boolean) => {
    if (v && existing) {
      setSelected(existing.length > 0
        ? existing.filter(p => p.can_access).map(p => p.module)
        : ROLE_DEFAULT_PERMISSIONS[currentRole] || []);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
        <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Lock className="text-emerald-400" size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Permissions de {userName}</DialogTitle>
              <p className="text-sm text-white/50 mt-0.5">Configuration fine des accès applicatifs</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {isPrivileged && (
            <div className="flex gap-4 p-5 rounded-3xl bg-amber-50/50 border border-amber-100/50 shadow-sm shadow-amber-900/5">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-amber-100 shrink-0">
                <ShieldAlert className="text-amber-500" size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700">Rôle Privilégié Détecté</p>
                <p className="text-sm text-amber-900/60 leading-relaxed font-medium">
                  Le rôle <strong className="text-amber-900">{currentRole}</strong> dispose d'un accès total par défaut. 
                  Ces restrictions ne s'appliqueront qu'en cas de changement de rôle.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                <span className="text-gray-900">{selected.length}</span> / {ALL_MODULES.length} modules autorisés
              </p>
              <div className="flex flex-wrap gap-2">
                {OPERATIONAL_ROLES.map(r => (
                  <Button key={r} variant="outline" size="sm" className="text-[9px] h-8 font-black uppercase tracking-widest rounded-xl px-3 border-gray-100 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => setSelected(ROLE_DEFAULT_PERMISSIONS[r] || [])}>
                    {r}
                  </Button>
                ))}
                <div className="w-px h-8 bg-gray-100 mx-1" />
                <Button variant="outline" size="sm" className="text-[9px] h-8 font-black uppercase tracking-widest rounded-xl px-3 border-gray-100 hover:bg-gray-50 text-gray-400"
                  onClick={() => setSelected(ALL_MODULES.map(m => m.key))}>
                  Tout
                </Button>
                <Button variant="outline" size="sm" className="text-[9px] h-8 font-black uppercase tracking-widest rounded-xl px-3 border-gray-100 hover:bg-gray-50 text-gray-400"
                  onClick={() => setSelected([])}>
                  Aucun
                </Button>
              </div>
            </div>

            <PermissionsSelector selectedModules={selected} onChange={setSelected} />

            <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.03]">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl px-6 h-12 text-gray-400 font-bold hover:text-gray-900 transition-all">
                Fermer
              </Button>
              <Button onClick={handleSave} disabled={savePerms.isPending}
                className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-2xl px-10 h-12 font-bold shadow-xl shadow-emerald-900/10 transition-all hover:scale-[1.02] active:scale-95">
                {savePerms.isPending ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                Sauvegarder les droits
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const GestionUtilisateurs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserEntreprise, setNewUserEntreprise] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("commercial");
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>(ROLE_DEFAULT_PERMISSIONS["commercial"]);
  const [newUserCanDelete, setNewUserCanDelete] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [quickRoleUserId, setQuickRoleUserId] = useState<string | null>(null);
  const [quickRole, setQuickRole] = useState<AppRole>("commercial");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;

  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<Profile | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("commercial");
  const [editCanDelete, setEditCanDelete] = useState(false);
  const [openPermissions, setOpenPermissions] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState<{ userId: string; userName: string; role: string } | null>(null);

  // Profile sheet
  const [openProfileSheet, setOpenProfileSheet] = useState(false);
  const [profileSheetTarget, setProfileSheetTarget] = useState<{ profile: Profile; roles: UserRole[] } | null>(null);

  const savePermsMutation = useSaveUserPermissions();

  // ─── Special permissions (can_delete_users) ───────────────────────────────
  const { data: specialPerms, refetch: refetchSpecialPerms } = useQuery({
    queryKey: ["special-perms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_special_permissions" as any)
        .select("user_id, permission");
      return (data || []) as { user_id: string; permission: string }[];
    },
    enabled: true,
  });

  const hasDeletePermission = (userId: string) =>
    specialPerms?.some(p => p.user_id === userId && p.permission === "can_delete_users") ?? false;

  const toggleDeletePermission = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase
          .from("user_special_permissions" as any)
          .insert({ user_id: userId, permission: "can_delete_users", granted_by: user?.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_special_permissions" as any)
          .delete()
          .eq("user_id", userId)
          .eq("permission", "can_delete_users");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchSpecialPerms();
      toast.success("Permission de suppression mise à jour");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const logActivity = useActivityLog();

  const deleteUser = useMutation({
    mutationFn: async (params: { userId: string; userEmail?: string }) => {
      // Use the unified create-user edge function with action: "delete"
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "delete", userId: params.userId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      return { success: true, userId: params.userId, userEmail: params.userEmail };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      setOpenEditProfile(false);
      setOpenProfileSheet(false);
      toast.success("Utilisateur supprimé");
      logActivity.mutate({
        action: "user_deleted",
        module: "gestion_utilisateurs",
        label: `Suppression de l'utilisateur ${data?.userEmail || data?.userId || ""}`,
        entity_type: "user",
        entity_id: data?.userId,
        notify: true,
        notifyTarget: { email: data?.userEmail },
        details: { deleted_email: data?.userEmail },
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: isSuperAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["isSuperAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" });
      return data ?? false;
    },
    enabled: !!user,
  });

  const { data: profilesData, isLoading: loadingProfiles } = useQuery({
    queryKey: ["all-profiles", page, searchQuery],
    queryFn: async () => {
      let q = supabase.from("profiles_with_email").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (searchQuery) q = q.or(`full_name.ilike.%${searchQuery}%,entreprise.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      const from = page * PAGE_SIZE;
      const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { profiles: data as any[], total: count || 0 };
    },
    enabled: isSuperAdmin === true,
  });

  const { data: userRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: isSuperAdmin === true,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!editProfileData) return;
      // 1. Update profile table
      const { error: profErr } = await supabase.from("profiles").update({
        full_name: editProfileData.full_name,
        phone: editProfileData.phone,
        entreprise: editProfileData.entreprise,
        address: editProfileData.address,
      }).eq("id", editProfileData.id);
      if (profErr) throw profErr;

      // 2. Update email via edge function if changed
      if (editEmail && editProfileData.user_id) {
        const { data, error: emailErr } = await supabase.functions.invoke("create-user", {
          body: { action: "update-email", userId: editProfileData.user_id, email: editEmail },
        });
        // Non-blocking — log warning but don't fail the whole save
        if (emailErr || data?.error) console.warn("Email update:", emailErr?.message || data?.error);
      }

      // 3. Sync primary role: remove old, add new
      if (editProfileData.user_id) {
        const existingRoles = userRoles?.filter(r => r.user_id === editProfileData.user_id) || [];
        const hasRole = existingRoles.some(r => r.role === editRole);
        if (!hasRole) {
          // Remove all existing roles then assign the selected one
          for (const r of existingRoles) {
            await supabase.from("user_roles").delete().eq("id", r.id);
          }
          await supabase.from("user_roles").insert({ user_id: editProfileData.user_id, role: editRole });
        }

        // 4. Sync can_delete_users special permission
        const currentlyHasDelete = hasDeletePermission(editProfileData.user_id);
        if (editCanDelete && !currentlyHasDelete) {
          await supabase.from("user_special_permissions" as any)
            .insert({ user_id: editProfileData.user_id, permission: "can_delete_users", granted_by: user?.id });
        } else if (!editCanDelete && currentlyHasDelete) {
          await supabase.from("user_special_permissions" as any)
            .delete().eq("user_id", editProfileData.user_id).eq("permission", "can_delete_users");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["special-perms"] });
      toast.success("Compte mis à jour avec succès");
      setOpenEditProfile(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("Rôle ajouté");
      setQuickRoleUserId(null);
    },
    onError: (error: any) => toast.error(
      error.message.includes("duplicate") ? "L'utilisateur possède déjà ce rôle" : error.message
    ),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("Rôle retiré");
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return toast.error("Veuillez remplir les champs obligatoires");
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: newUserEmail, password: newUserPassword,
          fullName: newUserFullName, phone: newUserPhone,
          entreprise: newUserEntreprise, role: newUserRole,
        },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      // Save permissions if user was created (get userId from data)
      if (data?.userId && newUserPermissions.length > 0) {
        await savePermsMutation.mutateAsync({ userId: data.userId, modules: newUserPermissions });
      }

      // Grant special delete permission if checked
      if (data?.userId && newUserCanDelete) {
        await supabase
          .from("user_special_permissions" as any)
          .insert({ user_id: data.userId, permission: "can_delete_users", granted_by: user?.id });
      }

      toast.success(`Utilisateur créé : ${newUserEmail}`);
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["special-perms"] });
      setOpenCreateUser(false);
      setNewUserEmail(""); setNewUserPassword(""); setNewUserFullName("");
      setNewUserPhone(""); setNewUserEntreprise(""); setNewUserCanDelete(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    const all = profilesData?.profiles || [];
    if (roleFilter === "all") return all;
    const usersWithRole = new Set(
      (userRoles || []).filter(r => r.role === roleFilter).map(r => r.user_id)
    );
    return all.filter(p => usersWithRole.has(p.user_id));
  }, [profilesData, userRoles, roleFilter]);

  const totalItems = roleFilter === "all" ? (profilesData?.total || 0) : filteredProfiles.length;
  const totalPages = Math.ceil((profilesData?.total || 0) / PAGE_SIZE);

  const stats = {
    total:      totalItems,
    commercial: userRoles?.filter(r => r.role === "commercial").length || 0,
    marketing:  userRoles?.filter(r => r.role === "marketing").length || 0,
    technique:  userRoles?.filter(r => r.role === "technique").length || 0,
    admins:     userRoles?.filter(r => r.role === "admin").length || 0,
  };

  if (checkingRole) return (
    <DashboardLayout title="Gestion des Utilisateurs">
      <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
    </DashboardLayout>
  );

  if (!isSuperAdmin) return (
    <DashboardLayout title="Gestion des Utilisateurs">
      <div className="bg-white p-8 text-center rounded-xl border border-gray-100 shadow-sm max-w-lg mx-auto mt-12">
        <ShieldAlert className="text-amber-500 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Accès Non Autorisé</h2>
        <p className="text-gray-500">Cette page est réservée aux superadmins.</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Gestion des Utilisateurs" subtitle="Administration des accès, rôles et permissions">
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-white dark:bg-[#131d2e] p-8 rounded-[2.5rem] border border-black/[0.03] dark:border-[#1e2d45] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-[#1A2E1C] flex items-center justify-center shadow-2xl shadow-emerald-900/20">
              <Users className="text-emerald-400" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none">Annuaire des Utilisateurs</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-1.5 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                Gérez les comptes, rôles et privilèges institutionnels
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Button variant="outline" asChild className="h-12 px-6 rounded-2xl border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 font-bold shadow-sm transition-all active:scale-95">
              <Link to="/supervision">
                <Activity size={18} className="mr-2" />
                Supervision
              </Link>
            </Button>
            <Button 
              onClick={() => setOpenCreateUser(true)} 
              className="h-12 px-8 rounded-2xl bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 shadow-xl shadow-emerald-900/10 font-bold transition-all hover:scale-[1.02] active:scale-95"
            >
              <UserPlus className="mr-2" size={18} />
              Nouvel Utilisateur
            </Button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total"       value={stats.total}      icon={Users}     />
          <StatCard title="Commerciaux" value={stats.commercial} icon={Briefcase} variant="green" />
          <StatCard title="Marketing"   value={stats.marketing}  icon={Megaphone} variant="purple" />
          <StatCard title="Technique"   value={stats.technique}  icon={Wrench}    variant="orange" />
          <StatCard title="Admins"      value={stats.admins}     icon={Shield}    variant="blue" />
        </div>

        {/* ── Toolbar - Quantum Standard ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
           <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <Input 
                placeholder="Rechercher par nom, entreprise, email..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-12 text-base"
              />
           </div>
           
           <div className="flex flex-wrap items-center gap-2 p-1">
              <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto max-w-[800px]">
                {[
                  { id: "all", label: "Tous" },
                  ...Object.keys(roleConfig).map(r => ({ id: r, label: roleConfig[r].label }))
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setRoleFilter(s.id); setPage(0); }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      roleFilter === s.id
                        ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                        : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* ── Users table ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden flex flex-col">

          <div className="overflow-x-auto">
            {loadingProfiles ? (
              <div className="flex flex-col items-center justify-center p-24 gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Synchronisation des profils...</p>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center p-24">
                <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <UserX className="text-gray-300" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Ajustez vos critères de recherche ou créez un nouveau compte.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-black/[0.03] dark:border-white/5">
                  <tr>
                    <th className="px-8 py-5">Utilisateur</th>
                    <th className="px-8 py-5">Identité & Contact</th>
                    <th className="px-8 py-5">Rôles & Permissions</th>
                    <th className="px-8 py-5 text-right">Actions de contrôle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02] dark:divide-white/5">
                  {filteredProfiles.map((profile) => {
                    const roles = userRoles?.filter(r => r.user_id === profile.user_id) || [];
                    const primaryRole = roles[0]?.role || "acheteur";
                    const isUserSuperAdmin = roles.some(r => r.role === "superadmin");

                    return (
                      <tr key={profile.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/[0.02] transition-all duration-300 group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 font-black text-lg shadow-sm border border-black/[0.03] dark:border-white/5 group-hover:scale-105 transition-transform">
                              {profile.full_name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 dark:text-gray-100 text-base tracking-tight">{profile.full_name || "Sans nom"}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="bg-white text-[10px] font-black uppercase tracking-tighter py-0 px-2 rounded-lg border-black/[0.06]">
                                  ID: {profile.user_id?.slice(0, 8)}
                                </Badge>
                                {isUserSuperAdmin && (
                                  <Badge className="bg-rose-500 text-white border-none text-[9px] font-black uppercase px-2 h-4 rounded-full">
                                    System Root
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1.5">
                            <p className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                              <Mail size={14} className="text-gray-400" />
                              {(profile as any).email || "—"}
                            </p>
                            <p className="flex items-center gap-2 text-gray-400 font-medium text-xs">
                              {profile.entreprise ? (
                                <>
                                  <Briefcase size={12} />
                                  {profile.entreprise}
                                </>
                              ) : (
                                <>
                                  <Activity size={12} />
                                  Indépendant
                                </>
                              )}
                              {profile.phone && (
                                <span className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                                  <Phone size={12} />
                                  {profile.phone}
                                </span>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-wrap gap-2">
                            {roles.map((role) => {
                              const cfg = roleConfig[role.role] || { label: role.role, icon: null, bg: "bg-gray-100 text-gray-700", border: "border-gray-200" };
                              return (
                                <Badge 
                                  key={role.id} 
                                  variant="outline" 
                                  className={cn(
                                    "font-black text-[10px] uppercase tracking-widest gap-2 pl-2 pr-1.5 py-1 rounded-[0.75rem] shadow-sm border-none transition-all hover:scale-105", 
                                    cfg.bg
                                  )}
                                >
                                  {cfg.icon} 
                                  {cfg.label}
                                  {!isUserSuperAdmin && (
                                    <button 
                                      onClick={() => {
                                        confirm({
                                          title: "Retirer le rôle",
                                          description: `Voulez-vous retirer le rôle "${cfg.label}" de ${profile.full_name || "cet utilisateur"} ?`,
                                          confirmLabel: "Retirer le rôle",
                                          variant: "danger",
                                          onConfirm: () => removeRole.mutate(role.id),
                                        });
                                      }} 
                                      className="ml-1 p-1 rounded-full hover:bg-black/10 transition-colors"
                                    >
                                      <Plus className="rotate-45" size={10} />
                                    </button>
                                  )}
                                </Badge>
                              );
                            })}
                            {!isUserSuperAdmin && roles.length === 0 && (
                              <span className="text-xs text-gray-400 italic">Aucun rôle assigné</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {quickRoleUserId === profile.user_id ? (
                            <div className="flex items-center gap-2 justify-end animate-in fade-in slide-in-from-right-4 duration-300">
                              <Select value={quickRole} onValueChange={(v) => setQuickRole(v as AppRole)}>
                                <SelectTrigger className="w-40 h-10 rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50/50"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-black/[0.06]">
                                  {ALL_ROLES.map(r => (
                                    <SelectItem key={r} value={r} className="rounded-lg font-medium">
                                      {roleConfig[r]?.label || r}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="icon" className="h-10 w-10 bg-[#1A2E1C] hover:bg-[#1A2E1C]/90 rounded-xl shadow-lg shadow-emerald-900/10"
                                onClick={() => addRole.mutate({ userId: profile.user_id, role: quickRole })}
                                disabled={addRole.isPending}>
                                {addRole.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                onClick={() => setQuickRoleUserId(null)}>
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              {!isUserSuperAdmin && (
                                <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 shadow-sm"
                                  onClick={() => { setQuickRoleUserId(profile.user_id); setQuickRole("commercial"); }}>
                                  + Rôle
                                </Button>
                              )}
                              
                              <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-black/[0.03]">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-white transition-all"
                                  onClick={() => {
                                    setPermissionsTarget({ userId: profile.user_id, userName: profile.full_name || "cet utilisateur", role: primaryRole });
                                    setOpenPermissions(true);
                                  }} title="Permissions">
                                  <Lock size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all"
                                  onClick={() => {
                                    const primaryR = (userRoles?.filter(r => r.user_id === profile.user_id)?.[0]?.role || "commercial") as AppRole;
                                    setEditProfileData(profile);
                                    setEditEmail("");
                                    setEditRole(primaryR);
                                    setEditCanDelete(hasDeletePermission(profile.user_id));
                                    setOpenEditProfile(true);
                                  }} title="Modifier">
                                  <Pencil size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-white transition-all"
                                  onClick={() => {
                                    setProfileSheetTarget({ profile, roles });
                                    setOpenProfileSheet(true);
                                  }} title="Profil">
                                  <Eye size={16} />
                                </Button>
                                
                                {isSuperAdmin && !isUserSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-8 w-8 rounded-lg transition-all",
                                      hasDeletePermission(profile.user_id)
                                        ? "text-amber-600 bg-white shadow-sm"
                                        : "text-gray-400 hover:text-amber-600 hover:bg-white"
                                    )}
                                    title="Droit de suppression"
                                    onClick={() =>
                                      toggleDeletePermission.mutate({
                                        userId: profile.user_id,
                                        grant: !hasDeletePermission(profile.user_id),
                                      })
                                    }
                                    disabled={toggleDeletePermission.isPending}
                                  >
                                    <ShieldCheck size={16} />
                                  </Button>
                                )}

                                {!isUserSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-all"
                                    title="Supprimer"
                                    onClick={() =>
                                      confirm({
                                        title: "Supprimer l'utilisateur",
                                        description: `Voulez-vous définitivement supprimer le compte de ${profile.full_name || profile.user_id} ? Cette action est irréversible.`,
                                        confirmLabel: "Supprimer maintenant",
                                        variant: "danger",
                                        onConfirm: () => deleteUser.mutate({ userId: profile.user_id, userEmail: (profile as any).email || profile.user_id }),
                                      })
                                    }
                                    disabled={deleteUser.isPending}
                                  >
                                    <UserX size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Premium Pagination - Quantum Standard */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/30 dark:bg-white/5 gap-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                Affichage de {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, totalItems)} sur {totalItems} utilisateurs
              </div>
              
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setPage(Math.max(0, page - 1))} 
                  disabled={page === 0} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                >
                  <ChevronLeft size={14} />
                </Button>

                <div className="flex items-center gap-1.5 mx-2">
                  {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                        page === p
                          ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10" 
                          : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                      )}
                    >
                      {p + 1}
                    </button>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))} 
                  disabled={page >= totalPages - 1} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

      {/* ── Create User Dialog ───────────────────────────────────────────── */}
        <Dialog open={openCreateUser} onOpenChange={setOpenCreateUser}>
          <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <UserPlus className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Nouvel Utilisateur</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Enregistrement d'un nouveau membre institutionnel</p>
                 </div>
               </div>
             </div>

             <form onSubmit={handleCreateUser} className="p-8">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="mb-6 bg-gray-50 border border-gray-100 p-1 h-11 rounded-xl">
                  <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 font-bold">Informations générales</TabsTrigger>
                  <TabsTrigger value="perms" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 font-bold">Privilèges d'accès</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 outline-none">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Email professionnel *</Label>
                      <Input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@crpaz.org" className="h-11 rounded-xl bg-gray-50 border-gray-100" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Mot de passe temporaire *</Label>
                      <Input type="password" required minLength={6} value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="••••••••" className="h-11 rounded-xl bg-gray-50 border-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Nom & Prénom</Label>
                      <Input value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} placeholder="Ex: Moussa Diop" className="h-11 rounded-xl bg-gray-50 border-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Téléphone</Label>
                      <Input value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} placeholder="+221..." className="h-11 rounded-xl bg-gray-50 border-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Coopérative / Entreprise</Label>
                      <Input value={newUserEntreprise} onChange={(e) => setNewUserEntreprise(e.target.value)} placeholder="Structure source" className="h-11 rounded-xl bg-gray-50 border-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Rôle Principal</Label>
                      <Select value={newUserRole} onValueChange={(v) => {
                        setNewUserRole(v as AppRole);
                        setNewUserPermissions(ROLE_DEFAULT_PERMISSIONS[v] || []);
                      }}>
                        <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {ALL_ROLES.map(r => (
                            <SelectItem key={r} value={r} className="rounded-lg">
                              <span className="flex items-center gap-2">
                                {roleConfig[r]?.label || r}
                                <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">({roleConfig[r]?.description})</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="perms" className="space-y-4 outline-none">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                     <Lock size={16} className="text-emerald-600 mt-0.5 shadow-emerald-900/20" />
                     <div className="text-xs text-emerald-900/70 font-medium">
                        Profil d'accès segmenté. <span className="text-emerald-900/40">Modifiez les accès par module pour personnaliser la visibilité sur la plateforme.</span>
                     </div>
                  </div>
                  <PermissionsSelector
                    selectedModules={newUserPermissions}
                    onChange={setNewUserPermissions}
                  />

                  {/* ── Permission spéciale : suppression ── */}
                  <div className="mt-2 rounded-2xl border border-gray-100 bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Permissions Administratives Spéciales</p>
                    </div>
                    <div className="px-5 py-4">
                      <label className="flex items-center justify-between gap-4 cursor-pointer group">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                            <UserX size={16} className="text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Droit de suppression d'utilisateurs</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Permet à cet utilisateur de supprimer d'autres comptes sur la plateforme
                              <span className="font-semibold text-amber-600"> (excepté le superadmin)</span>.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewUserCanDelete((v) => !v)}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                            newUserCanDelete ? "bg-red-500" : "bg-gray-200"
                          }`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            newUserCanDelete ? "translate-x-5" : "translate-x-0.5"
                          }`} />
                        </button>
                      </label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="pt-8 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpenCreateUser(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                <Button type="submit" disabled={isCreatingUser} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {isCreatingUser ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus className="mr-2" size={16} />}
                  Générer le compte
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
        {/* ── Edit Profile Dialog ──────────────────────────────────────────── */}
        <Dialog open={openEditProfile} onOpenChange={setOpenEditProfile}>
          <DialogContent className="max-w-lg p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
            {/* Header */}
            <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-900/20 rounded-full blur-[60px] pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Pencil className="text-blue-400" size={20} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Modification du Compte</DialogTitle>
                  <p className="text-sm text-blue-300/70 mt-0.5">{editProfileData?.full_name || "Utilisateur"}</p>
                </div>
              </div>
            </div>

            {editProfileData && (
              <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Mail size={11} /> Adresse Email
                  </Label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    className="h-11 rounded-xl bg-gray-50 border-gray-100"
                  />
                  <p className="text-[10px] text-gray-400">Laissez vide pour conserver l'email actuel.</p>
                </div>

                {/* Name + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Nom Complet</Label>
                    <Input
                      value={editProfileData.full_name || ""}
                      onChange={(e) => setEditProfileData({ ...editProfileData, full_name: e.target.value })}
                      placeholder="Jean Dupont"
                      className="h-11 rounded-xl bg-gray-50 border-gray-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Téléphone</Label>
                    <Input
                      value={editProfileData.phone || ""}
                      onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                      placeholder="+221 xx xxx xx xx"
                      className="h-11 rounded-xl bg-gray-50 border-gray-100"
                    />
                  </div>
                </div>

                {/* Entreprise + Adresse */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Entreprise / Structure</Label>
                    <Input
                      value={editProfileData.entreprise || ""}
                      onChange={(e) => setEditProfileData({ ...editProfileData, entreprise: e.target.value })}
                      placeholder="Coopérative X"
                      className="h-11 rounded-xl bg-gray-50 border-gray-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Adresse</Label>
                    <Input
                      value={editProfileData.address || ""}
                      onChange={(e) => setEditProfileData({ ...editProfileData, address: e.target.value })}
                      placeholder="Quartier, Ville"
                      className="h-11 rounded-xl bg-gray-50 border-gray-100"
                    />
                  </div>
                </div>

                {/* Rôle principal */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Shield size={11} /> Rôle Principal
                  </Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                    <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="rounded-lg">
                          <span className="flex items-center gap-2">
                            {roleConfig[r]?.label || r}
                            <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">({roleConfig[r]?.description})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Permission spéciale suppression */}
                {!userRoles?.some(r => r.user_id === editProfileData.user_id && r.role === "superadmin") && (
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Permission Administrative Spéciale</p>
                    </div>
                    <div className="px-4 py-4">
                      <label className="flex items-center justify-between gap-4 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <UserX size={14} className="text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Droit de suppression d'utilisateurs</p>
                            <p className="text-xs text-gray-500 mt-0.5">Permet de supprimer d'autres comptes <span className="text-amber-600 font-semibold">(sauf superadmin)</span>.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditCanDelete((v) => !v)}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${editCanDelete ? "bg-red-500" : "bg-gray-200"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editCanDelete ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                    </div>
                  </div>
                )}

                {/* Zone de danger : Suppression */}
                {editProfileData && userRoles?.find(r => r.user_id === editProfileData.user_id)?.role !== "superadmin" && (
                  <div className="pt-6 border-t border-red-50 mt-4 bg-red-50/30 -mx-8 px-8 pb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">Zone de danger</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-12 rounded-xl flex items-center gap-2 font-bold"
                      onClick={() =>
                        confirm({
                          title: "Supprimer ce compte ?",
                          description: `Cette action supprimera définitivement l'utilisateur ${editProfileData.full_name || editProfileData.user_id}.`,
                          confirmLabel: "Supprimer maintenant",
                          variant: "danger",
                          onConfirm: () => deleteUser.mutate({ userId: editProfileData.user_id, userEmail: editProfileData.email || editProfileData.user_id }),
                        })
                      }
                      disabled={deleteUser.isPending}
                    >
                      <UserX size={18} />
                      Supprimer le compte
                    </Button>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setOpenEditProfile(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
                    className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                    {updateProfile.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                    Enregistrer les modifications
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Permissions Dialog ───────────────────────────────────────────── */}
        {permissionsTarget && (
          <EditPermissionsDialog
            open={openPermissions}
            onOpenChange={setOpenPermissions}
            userId={permissionsTarget.userId}
            userName={permissionsTarget.userName}
            currentRole={permissionsTarget.role}
          />
        )}

        {/* ── User Profile Sheet ─────────────────────────────────────────── */}
        <UserProfileSheet
          open={openProfileSheet}
          profile={profileSheetTarget?.profile || null}
          roles={profileSheetTarget?.roles || []}
          hasDelete={profileSheetTarget ? hasDeletePermission(profileSheetTarget.profile.user_id) : false}
          isViewerSuperAdmin={isSuperAdmin}
          onClose={() => setOpenProfileSheet(false)}
          onDelete={(id, email) =>
            confirm({
              title: "Supprimer l'utilisateur",
              description: `Voulez-vous supprimer le compte de ${email} ?`,
              confirmLabel: "Supprimer",
              variant: "danger",
              onConfirm: () => deleteUser.mutate({ userId: id, userEmail: email }),
            })
          }
          onToggleDelete={(id, grant) => toggleDeletePermission.mutate({ userId: id, grant })}
        />
      </div>
    </DashboardLayout>
  );
};

export default GestionUtilisateurs;
