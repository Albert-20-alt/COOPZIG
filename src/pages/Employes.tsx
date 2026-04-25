import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Users, Plus, Search, X, Edit2, Trash2, Phone, Mail,
  Building2, UserCheck, UserX, Calendar, Coins,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type Employe = {
  id: string;
  prenom: string;
  nom: string;
  poste: string | null;
  departement: string | null;
  producteur_id: string | null;
  date_embauche: string | null;
  salaire: number | null;
  statut: string;
  telephone: string | null;
  email_contact: string | null;
  notes: string | null;
  created_at: string;
};

type Producteur = { id: string; nom: string };

const STATUTS = [
  { id: "actif",    label: "Actif",    color: "text-emerald-700 bg-emerald-100" },
  { id: "conge",    label: "En congé", color: "text-amber-700 bg-amber-100" },
  { id: "inactif",  label: "Inactif",  color: "text-gray-600 bg-gray-100" },
];

const DEPARTEMENTS = ["Direction", "Production", "Commerce", "Finance", "Logistique", "Technique", "Autre"];

const EMPTY_FORM: Partial<Employe> = {
  prenom: "", nom: "", poste: "", departement: "", statut: "actif",
  telephone: "", email_contact: "", notes: "", salaire: undefined,
  date_embauche: "", producteur_id: "",
};

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUTS.find((x) => x.id === statut) ?? STATUTS[2];
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
  );
}

function EmployeCard({ emp, canEdit, producteurs, onEdit, onDelete, onView }: {
  emp: Employe; canEdit: boolean; producteurs: Producteur[];
  onEdit: () => void; onDelete: () => void; onView: () => void;
}) {
  const prod = producteurs.find((p) => p.id === emp.producteur_id);
  const initials = `${emp.prenom[0]}${emp.nom[0]}`.toUpperCase();
  return (
    <div
      onClick={onView}
      className="group bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-4 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {emp.prenom} {emp.nom}
              </p>
              {emp.poste && (
                <p className="text-xs text-gray-500 mt-0.5">{emp.poste}</p>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                  <Edit2 size={13} />
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatutBadge statut={emp.statut} />
            {emp.departement && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Building2 size={11} />
                {emp.departement}
              </span>
            )}
            {prod && (
              <span className="text-[11px] text-gray-500 truncate">Producteur: {prod.nom}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
            {emp.telephone && (
              <a href={`tel:${emp.telephone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600">
                <Phone size={11} />
                {emp.telephone}
              </a>
            )}
            {emp.email_contact && (
              <a href={`mailto:${emp.email_contact}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 truncate">
                <Mail size={11} />
                {emp.email_contact}
              </a>
            )}
            {emp.date_embauche && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar size={11} />
                {format(parseISO(emp.date_embauche), "d MMM yyyy", { locale: fr })}
              </span>
            )}
            {emp.salaire != null && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Coins size={11} />
                {emp.salaire.toLocaleString("fr-FR")} FCFA
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeDetail({ emp, canEdit, producteurs, onClose, onEdit, onDelete }: {
  emp: Employe; canEdit: boolean; producteurs: Producteur[];
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const prod = producteurs.find((p) => p.id === emp.producteur_id);
  const initials = `${emp.prenom[0]}${emp.nom[0]}`.toUpperCase();
  const statut = STATUTS.find((s) => s.id === emp.statut) ?? STATUTS[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#0d1525] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b border-gray-100 dark:border-[#1e2d45]">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-black flex items-center justify-center text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {emp.prenom} {emp.nom}
                </h2>
                {emp.poste && <p className="text-sm text-gray-500 mt-0.5">{emp.poste}</p>}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] ml-2 shrink-0">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statut.color}`}>
                {statut.label}
              </span>
              {emp.departement && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  <Building2 size={10} /> {emp.departement}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {emp.telephone && (
              <a href={`tel:${emp.telephone}`} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] hover:bg-emerald-50 transition-colors">
                <Phone size={14} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Téléphone</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{emp.telephone}</p>
                </div>
              </a>
            )}
            {emp.email_contact && (
              <a href={`mailto:${emp.email_contact}`} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] hover:bg-blue-50 transition-colors col-span-2">
                <Mail size={14} className="text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{emp.email_contact}</p>
                </div>
              </a>
            )}
            {emp.date_embauche && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04]">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Embauche</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {format(parseISO(emp.date_embauche), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
            )}
            {emp.salaire != null && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04]">
                <Coins size={14} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Salaire</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {emp.salaire.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
              </div>
            )}
            {prod && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] col-span-2">
                <Users size={14} className="text-purple-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Producteur affilié</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{prod.nom}</p>
                </div>
              </div>
            )}
          </div>
          {emp.notes && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04]">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{emp.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#1e2d45]">
          {canEdit && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#1e2d45] text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50">
            Fermer
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90"
            >
              <Edit2 size={14} /> Modifier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Employes() {
  const { user } = useAuth();
  const { canWrite } = useMyPermissions();
  const canEdit = canWrite("employes");
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterDept, setFilterDept] = useState("tous");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employe | null>(null);
  const [form, setForm] = useState<Partial<Employe>>(EMPTY_FORM);
  const [viewingEmp, setViewingEmp] = useState<Employe | null>(null);

  const { data: employes = [], isLoading } = useQuery<Employe[]>({
    queryKey: ["employes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employes" as any)
        .select("*")
        .order("nom", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const { data: producteurs = [] } = useQuery<Producteur[]>({
    queryKey: ["producteurs-for-employes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("producteurs").select("id, nom").order("nom");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let list = employes;
    if (filterStatut !== "tous") list = list.filter((e) => e.statut === filterStatut);
    if (filterDept !== "tous") list = list.filter((e) => e.departement === filterDept);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
          (e.poste ?? "").toLowerCase().includes(q) ||
          (e.departement ?? "").toLowerCase().includes(q) ||
          (e.telephone ?? "").includes(q) ||
          (e.email_contact ?? "").toLowerCase().includes(q) ||
          (e.notes ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [employes, filterStatut, filterDept, search]);

  const stats = useMemo(() => ({
    total: employes.length,
    actifs: employes.filter((e) => e.statut === "actif").length,
    conge: employes.filter((e) => e.statut === "conge").length,
    inactifs: employes.filter((e) => e.statut === "inactif").length,
  }), [employes]);

  const save = useMutation({
    mutationFn: async (data: Partial<Employe>) => {
      const payload = {
        ...data,
        salaire: data.salaire ? Number(data.salaire) : null,
        producteur_id: data.producteur_id || null,
        date_embauche: data.date_embauche || null,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from("employes" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employes" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employes"] });
      toast.success(editing ? "Employé modifié" : "Employé ajouté");
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employes"] });
      toast.success("Employé supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (emp: Employe) => {
    setEditing(emp);
    setForm({ ...emp });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom?.trim() || !form.nom?.trim()) {
      toast.error("Prénom et nom sont requis");
      return;
    }
    save.mutate(form);
  };

  return (
    <DashboardLayout title="Gestion RH / Employés">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users size={24} className="text-emerald-600" />
              Gestion RH / Employés
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Personnel de la coopérative</p>
          </div>
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 transition-colors"
            >
              <Plus size={16} />
              Ajouter un employé
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Actifs", value: stats.actifs, icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
            { label: "En congé", value: stats.conge, icon: Calendar, color: "text-amber-600 bg-amber-50" },
            { label: "Inactifs", value: stats.inactifs, icon: UserX, color: "text-gray-600 bg-gray-100" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#0d1525] border border-gray-200 dark:border-[#1e2d45] flex-1 min-w-[180px]">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un employé…"
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#0d1525] text-gray-700 dark:text-gray-300"
            >
              <option value="tous">Tous les statuts</option>
              {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#0d1525] text-gray-700 dark:text-gray-300"
            >
              <option value="tous">Tous les départements</option>
              {DEPARTEMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Users size={40} className="opacity-20 mb-3" />
            <p className="text-sm font-medium">Aucun employé trouvé</p>
            {canEdit && (
              <button
                onClick={openCreate}
                className="mt-4 text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Ajouter le premier employé
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((emp) => (
              <EmployeCard
                key={emp.id}
                emp={emp}
                canEdit={canEdit}
                producteurs={producteurs}
                onView={() => setViewingEmp(emp)}
                onEdit={() => openEdit(emp)}
                onDelete={() => del.mutate(emp.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewingEmp && (
        <EmployeDetail
          emp={viewingEmp}
          canEdit={canEdit}
          producteurs={producteurs}
          onClose={() => setViewingEmp(null)}
          onEdit={() => { setViewingEmp(null); openEdit(viewingEmp); }}
          onDelete={() => { del.mutate(viewingEmp.id); setViewingEmp(null); }}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-[#0d1525] rounded-2xl shadow-2xl overflow-hidden my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1e2d45]">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {editing ? "Modifier l'employé" : "Ajouter un employé"}
              </p>
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Prénom *</label>
                  <input
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.prenom ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Nom *</label>
                  <input
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.nom ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Poste</label>
                  <input
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.poste ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, poste: e.target.value }))}
                    placeholder="Ex: Agent terrain"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Département</label>
                  <select
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.departement ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, departement: e.target.value }))}
                  >
                    <option value="">— Sélectionner —</option>
                    {DEPARTEMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Statut</label>
                  <select
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.statut ?? "actif"}
                    onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  >
                    {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Date d'embauche</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.date_embauche ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, date_embauche: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Téléphone</label>
                  <input
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.telephone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                    placeholder="+221 77 000 00 00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.email_contact ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, email_contact: e.target.value }))}
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Salaire (FCFA)</label>
                  <input
                    type="number"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.salaire ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, salaire: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Producteur affilié</label>
                  <select
                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.producteur_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, producteur_id: e.target.value }))}
                  >
                    <option value="">Aucun</option>
                    {producteurs.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Notes</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Remarques optionnelles…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-[#1e2d45] text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 disabled:opacity-50"
                >
                  {save.isPending ? "…" : editing ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
