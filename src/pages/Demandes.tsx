import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import EntityNotes from "@/components/EntityNotes";
import {
  Building2, Phone, Mail, MapPin, Package,
  CheckCircle2, Clock, XCircle, Inbox, Search, Trash2, UserPlus, Loader2,
  ChevronLeft, ChevronRight, MessageSquare, Calendar, Tag, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/ConfirmDialog";

type Demande = {
  id: string; nom_complet: string; entreprise: string | null;
  email: string; telephone: string; localisation: string | null;
  produit: string; quantite: number; unite: string;
  message: string | null; statut: string; created_at: string;
};

const statutConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  Nouvelle:   { label: "Nouveau Lead",  bg: "bg-blue-50",    text: "text-blue-700",    icon: Inbox },
  "En cours": { label: "Qualification", bg: "bg-amber-50",   text: "text-amber-700",   icon: Clock },
  Traitée:    { label: "Converti",      bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  Annulée:    { label: "Perdu",         bg: "bg-rose-50",    text: "text-rose-700",    icon: XCircle },
};

const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "p-2.5 rounded-lg",
        variant === "green" ? "bg-emerald-50 text-emerald-600" :
        variant === "amber" ? "bg-amber-50 text-amber-600" :
        variant === "blue"  ? "bg-blue-50  text-blue-600"  :
        "bg-gray-50 text-gray-600"
      )}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm font-medium text-gray-500">{title}</p>
  </div>
);

const Demandes = () => {
  const queryClient = useQueryClient();
  const logActivity = useActivityLog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const confirm = useConfirm();

  const { data: statsData } = useQuery({
    queryKey: ["demandes-stats"],
    queryFn: async () => {
      const getC = async (st?: string) => {
        let q = supabase.from("demandes").select("*", { count: "exact", head: true });
        if (st) q = q.eq("statut", st);
        const { count } = await q;
        return count || 0;
      };
      const [t, n, p, c, lost] = await Promise.all([getC(), getC("Nouvelle"), getC("En cours"), getC("Traitée"), getC("Annulée")]);
      return { total: t, new: n, process: p, converted: c, lost };
    },
  });

  const { data: demandesData, isLoading } = useQuery({
    queryKey: ["demandes", page, filter, search],
    queryFn: async () => {
      let q = supabase.from("demandes").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (filter !== "Toutes") q = q.eq("statut", filter);
      if (search) q = q.or(`nom_complet.ilike.%${search}%,entreprise.ilike.%${search}%,produit.ilike.%${search}%,email.ilike.%${search}%`);
      const from = page * PAGE_SIZE;
      const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { demandes: data as Demande[], total: count || 0 };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("demandes").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demandes"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-stats"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-new-count"] });
      toast.success("Statut mis à jour");
      setSelectedDemande((prev) => prev ? { ...prev, statut: variables.statut } : null);
      logActivity.mutate({ action: "status_change", module: "demandes", entity_type: "demande", entity_id: variables.id, label: `Demande → ${variables.statut}` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demandes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-stats"] });
      toast.success("Demande supprimée");
      setSelectedDemande(null);
    },
  });

  const demandes = demandesData?.demandes || [];
  const totalItems = demandesData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const stats = statsData || { total: 0, new: 0, process: 0, converted: 0, lost: 0 };
  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;
  const qualifRate     = stats.total > 0 ? Math.round(((stats.process + stats.converted) / stats.total) * 100) : 0;

  return (
    <DashboardLayout title="Demandes Entrantes" subtitle="Gestion des leads commerciaux externes">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Leads"       value={stats.total}     icon={Inbox}        variant="blue" />
          <StatCard title="Nouveaux"           value={stats.new}       icon={UserPlus}     variant="amber" />
          <StatCard title="En qualification"   value={stats.process}   icon={Clock} />
          <StatCard title="Convertis"          value={stats.converted} icon={CheckCircle2} variant="green" />
        </div>

        {/* Conversion funnel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-gray-800">Entonnoir de conversion</span>
            <span className="ml-auto text-xs text-gray-400">Taux global : <span className="font-bold text-emerald-600">{conversionRate}%</span></span>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto">
            {[
              { label: "Leads reçus", value: stats.total,                        pct: 100,            color: "bg-blue-500" },
              { label: "Qualifiés",   value: stats.process + stats.converted,    pct: qualifRate,     color: "bg-purple-500" },
              { label: "Convertis",   value: stats.converted,                    pct: conversionRate, color: "bg-emerald-500" },
              { label: "Perdus",      value: stats.lost, pct: stats.total > 0 ? Math.round((stats.lost / stats.total) * 100) : 0, color: "bg-red-400" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-0 flex-1 min-w-0">
                {i > 0 && <div className="w-0 h-0 border-t-[22px] border-b-[22px] border-l-[14px] border-t-transparent border-b-transparent border-l-gray-200 shrink-0" />}
                <div className={`flex-1 min-w-0 ${step.color} text-white text-center py-2 px-3 ${i === 0 ? "rounded-l-lg" : ""} ${i === 3 ? "rounded-r-lg" : ""}`}>
                  <p className="text-lg font-bold leading-tight">{step.value}</p>
                  <p className="text-[10px] opacity-80 truncate">{step.label}</p>
                  <p className="text-[10px] font-semibold">{step.pct}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Rechercher nom, entreprise, produit, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 h-10 bg-white"
              />
            </div>
            <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0">
              {["Toutes", "Nouvelle", "En cours", "Traitée", "Annulée"].map(f => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => { setFilter(f); setPage(0); }}
                  className={cn("h-10 text-xs px-3 whitespace-nowrap", filter === f ? "bg-gray-900 border-gray-900 text-white hover:bg-gray-800" : "bg-white text-gray-600")}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Client / Entreprise</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Produit / Quantité</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={24} /> Chargement...
                  </td></tr>
                ) : demandes.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <Inbox className="mx-auto mb-3 text-gray-300" size={32} />
                    <p className="text-gray-500 font-medium">Aucune demande trouvée.</p>
                  </td></tr>
                ) : demandes.map((d) => {
                  const cfg = statutConfig[d.statut] || statutConfig["Nouvelle"];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDemande(d)}
                      className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{d.nom_complet}</p>
                        {d.entreprise && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Building2 size={11} /> {d.entreprise}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-700 flex items-center gap-2 mb-1"><Mail size={11} className="text-gray-400 shrink-0" /> {d.email}</p>
                        <p className="text-xs text-gray-700 flex items-center gap-2"><Phone size={11} className="text-gray-400 shrink-0" /> {d.telephone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{d.produit}</p>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">{d.quantite} {d.unite}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-600">{format(new Date(d.created_at), "dd MMM yyyy", { locale: fr })}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{format(new Date(d.created_at), "HH:mm", { locale: fr })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn("font-semibold border-transparent gap-1.5", cfg.bg, cfg.text)}>
                          <StatusIcon size={11} /> {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => setSelectedDemande(d)}
                            className="h-8 w-8 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Voir détails"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => confirm({
                              title: "Supprimer la demande",
                              description: `Supprimer la demande de "${d.nom_complet}" ? Cette action est irréversible.`,
                              confirmLabel: "Oui, supprimer",
                              variant: "danger",
                              onConfirm: () => deleteMutation.mutate(d.id),
                            })}
                            className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination — always visible when there's data */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm text-gray-500">
                {totalItems === 0 ? "Aucun résultat" : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalItems)} sur ${totalItems} demande${totalItems > 1 ? "s" : ""}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="bg-white border-gray-200"
                >
                  <ChevronLeft size={15} className="mr-1" /> Précédent
                </Button>
                <span className="text-sm font-medium text-gray-600 px-2 tabular-nums">
                  {page + 1} / {Math.max(1, totalPages)}
                </span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="bg-white border-gray-200"
                >
                  Suivant <ChevronRight size={15} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail / Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={!!selectedDemande} onOpenChange={v => !v && setSelectedDemande(null)}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl overflow-hidden border border-black/[0.06] shadow-2xl">
          {/* Header */}
          <div className="relative bg-[#0B1910] px-8 py-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-bold text-white leading-tight">
                    {selectedDemande?.nom_complet}
                  </DialogTitle>
                  {selectedDemande?.entreprise && (
                    <p className="text-white/50 text-sm mt-1 flex items-center gap-1.5">
                      <Building2 size={12} /> {selectedDemande.entreprise}
                    </p>
                  )}
                </div>
                {selectedDemande && (
                  <Badge className={cn("shrink-0 font-semibold border-transparent mt-1", statutConfig[selectedDemande.statut]?.bg, statutConfig[selectedDemande.statut]?.text)}>
                    {statutConfig[selectedDemande.statut]?.label}
                  </Badge>
                )}
              </div>
              <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5">
                <Calendar size={11} />
                {selectedDemande ? format(new Date(selectedDemande.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : ""}
                &nbsp;·&nbsp; Réf: {selectedDemande?.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 bg-white max-h-[70vh] overflow-y-auto">
            {/* Contact info */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informations de contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{selectedDemande?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Téléphone</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedDemande?.telephone}</p>
                  </div>
                </div>
                {selectedDemande?.localisation && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Localisation</p>
                      <p className="text-sm font-semibold text-gray-800">{selectedDemande.localisation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order details */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Détails de la demande</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Package size={14} className="text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Produit</p>
                    <p className="text-sm font-bold text-emerald-900">{selectedDemande?.produit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Tag size={14} className="text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Quantité</p>
                    <p className="text-sm font-bold text-emerald-900">{selectedDemande?.quantite} {selectedDemande?.unite}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            {selectedDemande?.message && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Message du client</p>
                <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <MessageSquare size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedDemande.message}</p>
                </div>
              </div>
            )}

            {/* Notes internes */}
            <EntityNotes entityType="demande" entityId={selectedDemande?.id || ""} />

            {/* Status update */}
            <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-1.5 w-full sm:w-auto">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mettre à jour le statut</Label>
                <Select
                  value={selectedDemande?.statut}
                  onValueChange={(val) => {
                    if (selectedDemande) updateMutation.mutate({ id: selectedDemande.id, statut: val });
                  }}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="h-10 w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nouvelle">Nouveau Lead</SelectItem>
                    <SelectItem value="En cours">En cours (Qualification)</SelectItem>
                    <SelectItem value="Traitée">Traitée (Convertie)</SelectItem>
                    <SelectItem value="Annulée">Annulée (Perdue)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-10 px-4 self-end sm:self-auto"
                onClick={() => {
                  if (!selectedDemande) return;
                  confirm({
                    title: "Supprimer la demande",
                    description: `Supprimer la demande de "${selectedDemande.nom_complet}" ? Cette action est irréversible.`,
                    confirmLabel: "Oui, supprimer",
                    variant: "danger",
                    onConfirm: () => deleteMutation.mutate(selectedDemande.id),
                  });
                }}
              >
                <Trash2 size={14} className="mr-2" /> Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Demandes;
