import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users, Shield, Tractor, Plus, Trash2, Loader2, UserPlus, Mail, Phone,
  Search, ShieldAlert, ShoppingBag, Pencil, ChevronLeft, ChevronRight,
  Briefcase, Megaphone, Wrench, Lock, Eye, Activity, UserX, ShieldCheck,
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

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-hidden relative">
    <div className={cn(
      "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
      variant === "green"  ? "bg-emerald-50 text-emerald-600" :
      variant === "amber"  ? "bg-amber-50 text-amber-600" :
      variant === "blue"   ? "bg-blue-50 text-blue-600" :
      variant === "purple" ? "bg-purple-50 text-purple-600" :
      variant === "orange" ? "bg-orange-50 text-orange-600" :
      "bg-gray-50 text-gray-600"
    )}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{value}</h3>
    <p className="text-xs font-medium text-gray-500">{title}</p>
  </div>
);

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
    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
      {groups.map(group => {
        const groupMods = ALL_MODULES.filter(m => m.group === group);
        const allSelected = groupMods.every(m => selectedModules.includes(m.key));
        const someSelected = groupMods.some(m => selectedModules.includes(m.key));
        return (
          <div key={group} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                allSelected ? "bg-[#1A2E1C] border-[#1A2E1C]" :
                someSelected ? "bg-[#1A2E1C]/30 border-[#1A2E1C]/50" :
                "border-gray-300 bg-white"
              )}>
                {(allSelected || someSelected) && <div className="w-2 h-2 bg-white rounded-sm" />}
              </div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group}</span>
              <span className="ml-auto text-xs text-gray-400">
                {groupMods.filter(m => selectedModules.includes(m.key)).length}/{groupMods.length}
              </span>
            </button>
            <div className="grid grid-cols-2 gap-px bg-gray-100 border-t border-gray-100">
              {groupMods.map(mod => (
                <label
                  key={mod.key}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer bg-white hover:bg-gray-50 transition-colors",
                    selectedModules.includes(mod.key) && "bg-emerald-50/50"
                  )}
                >
                  <Checkbox
                    checked={selectedModules.includes(mod.key)}
                    onCheckedChange={() => toggle(mod.key)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-gray-700">{mod.label}</span>
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

        <div className="p-8 space-y-6">
          {isPrivileged && (
            <div className="flex gap-3 text-sm text-amber-600 bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4">
              <ShieldAlert className="shrink-0 mt-0.5" size={16} />
              <p>
                Ce rôle (<strong>{currentRole}</strong>) a un accès complet par défaut. Les permissions définies ici ne s'appliqueront que si vous rétrogradez le rôle.
              </p>
            </div>
          )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{selected.length}</span> module(s) autorisé(s) sur {ALL_MODULES.length}
            </p>
            <div className="flex gap-2">
              {OPERATIONAL_ROLES.map(r => (
                <Button key={r} variant="outline" size="sm" className="text-xs h-7"
                  onClick={() => setSelected(ROLE_DEFAULT_PERMISSIONS[r] || [])}>
                  Défaut {r}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => setSelected(ALL_MODULES.map(m => m.key))}>
                Tout
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => setSelected([])}>
                Aucun
              </Button>
            </div>
          </div>

          <PermissionsSelector selectedModules={selected} onChange={setSelected} />

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
            <Button onClick={handleSave} disabled={savePerms.isPending}
              className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
              {savePerms.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Lock size={14} className="mr-2" />}
              Appliquer les droits
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
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 15;

  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<Profile | null>(null);
  const [openPermissions, setOpenPermissions] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState<{ userId: string; userName: string; role: string } | null>(null);

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
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: params.userId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      return { ...data, userEmail: params.userEmail };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
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
      let q = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (searchQuery) q = q.or(`full_name.ilike.%${searchQuery}%,entreprise.ilike.%${searchQuery}%`);
      const from = page * PAGE_SIZE;
      const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { profiles: data as Profile[], total: count || 0 };
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
      const { error } = await supabase.from("profiles").update({
        full_name: editProfileData.full_name,
        phone: editProfileData.phone,
        entreprise: editProfileData.entreprise,
        address: editProfileData.address,
      }).eq("id", editProfileData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("Profil mis à jour");
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

  const filteredProfiles = profilesData?.profiles || [];
  const totalItems = profilesData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Annuaire des Utilisateurs</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gérez les comptes, rôles et droits d'accès.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="text-sm">
              <Link to="/supervision"><Activity size={14} className="mr-1.5" /> Supervision</Link>
            </Button>
            <Button onClick={() => setOpenCreateUser(true)} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
              <UserPlus className="mr-2" size={16} /> Nouvel Utilisateur
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

        {/* ── Users table ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Rechercher par nom, entreprise..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9 h-10 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingProfiles ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center p-12 text-gray-500">Aucun utilisateur trouvé.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Utilisateur</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Rôles</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProfiles.map((profile) => {
                    const roles = userRoles?.filter(r => r.user_id === profile.user_id) || [];
                    const primaryRole = roles[0]?.role || "acheteur";
                    return (
                      <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900">{profile.full_name || "Sans nom"}</p>
                          {profile.entreprise && <p className="text-xs text-gray-500 mt-0.5">{profile.entreprise}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-xs space-y-0.5">
                          <p className="flex items-center gap-1"><Mail size={11} /> {(profile as any).email || "—"}</p>
                          {profile.phone && <p className="flex items-center gap-1"><Phone size={11} /> {profile.phone}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {roles.map((role) => {
                              const cfg = roleConfig[role.role] || { label: role.role, icon: null, bg: "bg-gray-100 text-gray-700", border: "border-gray-200" };
                              return (
                                <Badge key={role.id} variant="outline" className={cn("font-medium gap-1 pr-1 text-xs transition-all", cfg.bg, cfg.border)}>
                                  {cfg.icon} {cfg.label}
                                  <button onClick={() => {
                                    confirm({
                                      title: "Retirer le rôle",
                                      description: `Voulez-vous retirer le rôle "${cfg.label}" de ${profile.full_name || "cet utilisateur"} ?`,
                                      confirmLabel: "Retirer",
                                      variant: "danger",
                                      onConfirm: () => removeRole.mutate(role.id),
                                    });
                                  }} className="ml-1 opacity-40 hover:opacity-100 p-0.5 rounded hover:bg-black/5" aria-label="Retirer">
                                    <Plus className="rotate-45" size={10} />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {quickRoleUserId === profile.user_id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <Select value={quickRole} onValueChange={(v) => setQuickRole(v as AppRole)}>
                                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ALL_ROLES.map(r => (
                                    <SelectItem key={r} value={r}>
                                      {roleConfig[r]?.label || r}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="icon" className="h-8 w-8 bg-[#1A2E1C] hover:bg-[#1A2E1C]/90"
                                onClick={() => addRole.mutate({ userId: profile.user_id, role: quickRole })}
                                disabled={addRole.isPending}>
                                {addRole.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500"
                                onClick={() => setQuickRoleUserId(null)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 justify-end">
                              <Button variant="outline" size="sm" className="h-8 text-xs"
                                onClick={() => { setQuickRoleUserId(profile.user_id); setQuickRole("commercial"); }}>
                                + Rôle
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-gray-600"
                                onClick={() => {
                                  setPermissionsTarget({ userId: profile.user_id, userName: profile.full_name || "cet utilisateur", role: primaryRole });
                                  setOpenPermissions(true);
                                }} title="Gérer les permissions">
                                <Lock size={14} />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-gray-600"
                                onClick={() => { setEditProfileData(profile); setOpenEditProfile(true); }} title="Modifier le profil">
                                <Pencil size={14} />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-gray-600" title="Voir activité" asChild>
                                <Link to={`/supervision?user=${profile.user_id}`}><Eye size={14} /></Link>
                              </Button>

                              {/* ── Superadmin-only: grant delete rights ── */}
                              {isSuperAdmin && !roles.some(r => r.role === "superadmin") && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 transition-colors",
                                    hasDeletePermission(profile.user_id)
                                      ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                      : "text-gray-400 hover:text-amber-600 hover:border-amber-300"
                                  )}
                                  title={hasDeletePermission(profile.user_id) ? "Révoquer droit de suppression" : "Accorder droit de suppression"}
                                  onClick={() =>
                                    toggleDeletePermission.mutate({
                                      userId: profile.user_id,
                                      grant: !hasDeletePermission(profile.user_id),
                                    })
                                  }
                                  disabled={toggleDeletePermission.isPending}
                                >
                                  <ShieldCheck size={14} />
                                </Button>
                              )}

                              {/* ── Delete user button (superadmin OR can_delete_users) ── */}
                              {!roles.some(r => r.role === "superadmin") && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                                  title="Supprimer l'utilisateur"
                                  onClick={() =>
                                    confirm({
                                      title: "Supprimer l'utilisateur",
                                      description: `Voulez-vous définitivement supprimer le compte de ${profile.full_name || profile.user_id} ? Cette action est irréversible.`,
                                      confirmLabel: "Supprimer",
                                      variant: "danger",
                                      onConfirm: () => deleteUser.mutate({ userId: profile.user_id, userEmail: profile.user_id }),
                                    })
                                  }
                                  disabled={deleteUser.isPending}
                                >
                                  <UserX size={14} />
                                </Button>
                              )}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm text-gray-500">Page {page + 1} sur {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Préc.</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Suiv.</Button>
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
          <DialogContent className="max-w-md p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-blue-900/20 rounded-full blur-[60px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                   <Pencil className="text-blue-400" size={20} />
                 </div>
                 <DialogTitle className="text-xl font-bold text-white">Édition du Profil</DialogTitle>
               </div>
             </div>

            {editProfileData && (
              <div className="p-8 space-y-4">
                {(["full_name", "phone", "entreprise", "address"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      {{ full_name: "Nom Complet", phone: "Téléphone", entreprise: "Entreprise", address: "Adresse" }[field]}
                    </Label>
                    <Input
                      value={(editProfileData as any)[field] || ""}
                      onChange={(e) => setEditProfileData({ ...editProfileData, [field]: e.target.value })}
                      className="h-11 rounded-xl bg-gray-50 border-gray-100"
                    />
                  </div>
                ))}
                <div className="pt-6 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setOpenEditProfile(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
                    className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10">
                    {updateProfile.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                    Enregistrer
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
      </div>
    </DashboardLayout>
  );
};

export default GestionUtilisateurs;
