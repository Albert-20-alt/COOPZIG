import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { User, Mail, Phone, Building, MapPin, ShieldCheck, Save, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useActivityLog } from "@/hooks/useActivityLog";

export default function Profil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logActivity = useActivityLog();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    entreprise: "",
    address: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r: any) => r.role);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        entreprise: profile.entreprise || "",
        address: profile.address || "",
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Profil mis à jour avec succès" });
      logActivity.mutate({
        action: "profile_update",
        module: "profil",
        label: "Mise à jour des informations personnelles",
        notify: true,
      });
    },
    onError: (e: any) => {
      toast({
        title: "Erreur de mise à jour",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Email de réinitialisation envoyé", description: "Veuillez vérifier votre boîte de réception." });
      logActivity.mutate({
        action: "password_change",
        module: "profil",
        label: "Demande de réinitialisation du mot de passe",
        notify: true,
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mon Profil" subtitle="Gérez vos informations personnelles et préférences">
      <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="w-24 h-24 rounded-[1.5rem] bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner shrink-0 text-3xl font-black uppercase">
            {profile?.full_name?.[0] || user?.email?.[0] || "?"}
          </div>
          
          <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{profile?.full_name || "Utilisateur"}</h1>
            <p className="text-sm font-medium text-gray-500 mt-1 flex items-center justify-center md:justify-start gap-1">
              <Mail size={14} /> {user?.email}
            </p>
            
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
              {roles?.length ? roles.map((r: string) => (
                <Badge key={r} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-3 uppercase tracking-widest text-[10px]">
                  <ShieldCheck size={12} /> {r}
                </Badge>
              )) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-500 gap-1.5 px-3 uppercase tracking-widest text-[10px]">
                  Utilisateur standard
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Info Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Informations Personnelles</h2>
                <p className="text-sm text-gray-500">Mettez à jour vos coordonnées applicatives</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                      <User size={12} /> Nom Complet
                    </Label>
                    <Input 
                      value={form.full_name} 
                      onChange={e => setForm({...form, full_name: e.target.value})}
                      placeholder="Jean Dupont"
                      className="h-12 border-gray-100 bg-gray-50 shadow-none font-medium rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                      <Phone size={12} /> Téléphone
                    </Label>
                    <Input 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})}
                      placeholder="+221 xx xxx xx xx"
                      className="h-12 border-gray-100 bg-gray-50 shadow-none font-medium rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                      <Building size={12} /> Structure / Entreprise
                    </Label>
                    <Input 
                      value={form.entreprise} 
                      onChange={e => setForm({...form, entreprise: e.target.value})}
                      placeholder="Coopérative Agricole X"
                      className="h-12 border-gray-100 bg-gray-50 shadow-none font-medium rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                      <MapPin size={12} /> Adresse
                    </Label>
                    <Input 
                      value={form.address} 
                      onChange={e => setForm({...form, address: e.target.value})}
                      placeholder="Quartier, Ville"
                      className="h-12 border-gray-100 bg-gray-50 shadow-none font-medium rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-12 font-black shadow-lg shadow-emerald-900/10 gap-2"
                  >
                    {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Sécurité</h3>
                  <p className="text-xs text-gray-500">Gérez vos accès</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-sm font-medium text-gray-900 mb-1">Mot de passe</p>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">Envoyez-vous un lien sécurisé pour réinitialiser ou changer votre mot de passe actuel.</p>
                  <Button 
                    variant="outline" 
                    onClick={handleResetPassword}
                    className="w-full rounded-xl text-xs font-bold transition-all hover:bg-[#1A2E1C] hover:text-white"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
