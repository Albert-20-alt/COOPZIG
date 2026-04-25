import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Upload, X, ImageIcon, Loader2, Search,
  Zap, Sprout, Droplets, Users, Globe, TrendingUp, Leaf, Building, Star,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  category: string;
  status: "en_cours" | "termine" | "planifie";
  period: string | null;
  budget: string | null;
  beneficiaires: string | null;
  tags: string[];
  icon_name: string;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

type ProjectForm = {
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  category: string;
  status: "en_cours" | "termine" | "planifie";
  period: string;
  budget: string;
  beneficiaires: string;
  tags: string;       // comma-separated for the input
  icon_name: string;
  image_url: string;
};

const EMPTY_FORM: ProjectForm = {
  title: "", title_en: "", description: "", description_en: "", category: "Infrastructure",
  status: "planifie", period: "", budget: "", beneficiaires: "",
  tags: "", icon_name: "TrendingUp", image_url: "",
};

const CATEGORIES = [
  "Infrastructure", "Agriculture durable", "Eau & Irrigation",
  "Formation", "Commerce international", "Valorisation", "Autre",
];

const STATUS_OPTIONS = [
  { value: "en_cours",  label: "En cours" },
  { value: "planifie",  label: "Planifié" },
  { value: "termine",   label: "Terminé" },
] as const;

const STATUS_CONFIG: Record<Project["status"], { label: string; color: string }> = {
  en_cours: { label: "En cours",  color: "bg-blue-50 text-blue-700 border-blue-100" },
  termine:  { label: "Terminé",   color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  planifie: { label: "Planifié",  color: "bg-amber-50 text-amber-700 border-amber-100" },
};

const ICONS: { name: string; icon: React.ElementType }[] = [
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Sprout",     icon: Sprout },
  { name: "Droplets",   icon: Droplets },
  { name: "Users",      icon: Users },
  { name: "Globe",      icon: Globe },
  { name: "Zap",        icon: Zap },
  { name: "Leaf",       icon: Leaf },
  { name: "Building",   icon: Building },
];

const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(ICONS.map(({ name, icon }) => [name, icon]));

// ─── Image upload helper ──────────────────────────────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("content-images").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("content-images").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminProjets = () => {
  const confirm = useConfirm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | Project["status"]>("tous");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // ── Query ──
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Project[];
    },
  });

  // ── Mutations ──
  const upsertMutation = useMutation({
    mutationFn: async (payload: ProjectForm & { id?: string }) => {
      const { id, tags: tagsRaw, ...fields } = payload;
      const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
      const now = new Date().toISOString();
      const row = { ...fields, tags, updated_at: now };
      if (id) {
        const { error } = await (supabase as any).from("projects").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("projects").insert({ ...row, created_at: now });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: editId ? "Projet mis à jour" : "Projet créé" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Project["status"] }) => {
      const { error } = await (supabase as any)
        .from("projects")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] }),
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: "Projet retiré du registre" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Helpers ──
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setImagePreview("");
    setFormOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      title_en: p.title_en ?? "",
      description: p.description ?? "",
      description_en: p.description_en ?? "",
      category: p.category,
      status: p.status,
      period: p.period ?? "",
      budget: p.budget ?? "",
      beneficiaires: p.beneficiaires ?? "",
      tags: (p.tags ?? []).join(", "),
      icon_name: p.icon_name,
      image_url: p.image_url ?? "",
    });
    setImagePreview(p.image_url ?? "");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setImagePreview("");
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier invalide", description: "Veuillez choisir une image.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      setImagePreview(url);
      toast({ title: "Image uploadée" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }
    upsertMutation.mutate(editId ? { ...form, id: editId } : form);
  };

  // ── Filtered list ──
  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === "tous" || p.status === statusFilter;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: "tous" | Project["status"]) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const counts = {
    total: projects.length,
    en_cours: projects.filter((p) => p.status === "en_cours").length,
    planifie: projects.filter((p) => p.status === "planifie").length,
    termine: projects.filter((p) => p.status === "termine").length,
  };

  const StatusBadge = ({ status, id }: { status: Project["status"]; id: string }) => {
    const cfg = STATUS_CONFIG[status];
    return (
      <div className="relative group">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
          {cfg.label}
        </span>
        {/* Quick status change dropdown */}
        <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-10 py-1 hidden group-hover:block w-32">
          {STATUS_OPTIONS.filter((o) => o.value !== status).map((o) => (
            <button
              key={o.value}
              onClick={() => updateStatusMutation.mutate({ id, status: o.value })}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header - Premium Institutional Style */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Registre des Programmes</h1>
            <p className="text-sm font-medium text-gray-500 mt-0.5">Gérez les déploiements d'infrastructures et d'initiatives stratégiques.</p>
          </div>
          <Button onClick={openCreate} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-2xl px-6 h-11 font-bold shadow-lg shadow-emerald-900/10 gap-2">
            <Plus size={18} /> Nouveau Projet
          </Button>
        </div>

        {/* Stats - Premium Styling */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Unités Totales", value: counts.total, icon: Building, color: "text-gray-600", bg: "bg-gray-50" },
            { label: "En Déploiement", value: counts.en_cours, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Phase Étude", value: counts.planifie, icon: Search, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Livrées", value: counts.termine, icon: Star, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 transition-all hover:shadow-md group">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", s.bg)}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className={cn("text-xl font-black tracking-tight", s.color)}>{s.value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters - Quantum Refinement */}
        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher par identité de programme…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl overflow-x-auto">
            {[{ key: "tous", label: "Tous" }, ...STATUS_OPTIONS.map((o) => ({ key: o.value, label: o.label }))].map((f) => (
              <button
                key={f.key}
                onClick={() => handleStatusFilterChange(f.key as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === f.key
                    ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">Aucun projet trouvé.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map((project) => {
              const Icon = ICON_MAP[project.icon_name] ?? TrendingUp;
              const cfg = STATUS_CONFIG[project.status];
              return (
                <div
                  key={project.id}
                  className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all relative"
                >
                  {/* Image or placeholder */}
                  <div className="aspect-[16/9] overflow-hidden relative">
                    {project.image_url ? (
                      <img src={project.image_url} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-200">
                        <Icon size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 left-4">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-lg", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEdit(project)}
                        className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-xl hover:bg-white transition-all"
                        title="Modifier"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => confirm({
                          title: "Retirer l'initiative",
                          description: `Voulez-vous supprimer "${project.title}" du registre institutionnel ?`,
                          confirmLabel: "Supprimer",
                          variant: "danger",
                          onConfirm: () => deleteMutation.mutate(project.id)
                        })}
                        className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-red-600 shadow-xl hover:bg-red-50 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 mb-2 block">{project.category}</span>
                    <h3 className="font-black text-gray-900 leading-tight mb-2 text-lg tracking-tight group-hover:text-emerald-700 transition-colors line-clamp-1">{project.title}</h3>

                    {project.description && (
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4 font-medium">{project.description}</p>
                    )}

                    {/* Meta Grid */}
                    <div className="grid grid-cols-3 gap-2 py-4 border-t border-gray-50 mb-1">
                      {[
                        { label: "Période", value: project.period || "—" },
                        { label: "Budget", value: project.budget || "—" },
                        { label: "Impact", value: project.beneficiaires || "—" },
                      ].map((m) => (
                        <div key={m.label} className="text-left">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">{m.label}</p>
                          <p className="text-xs font-black text-gray-900 truncate">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    {project.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-50">
                        {project.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-gray-50 text-gray-500 border border-black/[0.03]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">
              Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} programmes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-2xl border-gray-100 hover:bg-gray-50 h-10 w-10"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "h-10 w-10 rounded-2xl text-xs font-black transition-all duration-300",
                      currentPage === p
                        ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10"
                        : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-2xl border-gray-100 hover:bg-gray-50 h-10 w-10"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog - Premium Quantum Design */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden flex flex-col">
          <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                {editId ? <Pencil size={22} /> : <Plus size={22} />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white tracking-tight">
                  {editId ? "Modifier l'Initiative" : "Nouveau Déploiement"}
                </DialogTitle>
                <p className="text-sm text-white/40 mt-0.5 font-medium">Indexation et configuration des programmes stratégiques</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {/* Image */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center block">Identité visuelle du programme</Label>
              <div
                className={`relative group rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                  imagePreview ? "border-gray-100 shadow-sm" : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                }`}
                style={{ minHeight: "200px" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="" className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <Upload size={20} />
                      </div>
                      <p className="text-white text-xs font-black uppercase tracking-[0.2em]">Remplacer le visuel</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center aspect-video text-emerald-600 gap-3">
                    {uploading ? (
                      <Loader2 size={32} className="animate-spin" />
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-3xl bg-white shadow-sm flex items-center justify-center border border-emerald-100">
                          <ImageIcon size={28} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black uppercase tracking-widest mb-1">Téléverser les Plans</p>
                          <p className="text-[10px] font-bold text-emerald-600/50 tracking-tight">JPG, PNG ou WEBP • MAX 5MB</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
              />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Ou indexer une URL institutionnelle :</p>
              <Input
                placeholder="https://content.crpaz.com/assets/..."
                value={form.image_url}
                onChange={(e) => { setForm((f) => ({ ...f, image_url: e.target.value })); setImagePreview(e.target.value); }}
                className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-medium"
              />
            </div>

            {/* Tabs for Language */}
            <Tabs defaultValue="fr" className="w-full">
              <TabsList className="mb-6 p-1 bg-gray-100/50 rounded-2xl grid grid-cols-2">
                <TabsTrigger value="fr" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">Version Française</TabsTrigger>
                <TabsTrigger value="en" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">English Version</TabsTrigger>
              </TabsList>

              <TabsContent value="fr" className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Intitulé du Programme <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Nom officiel de l'unité"
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-bold"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Décrivez l'objectif et le contenu du projet…"
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                {/* Title EN */}
                <div className="space-y-1.5">
                  <Label>Title (English)</Label>
                  <Input
                    value={form.title_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                    placeholder="Project name in English"
                  />
                </div>

                {/* Description EN */}
                <div className="space-y-1.5">
                  <Label>Description (English)</Label>
                  <Textarea
                    value={form.description_en}
                    onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                    placeholder="Describe the objective and content of the project in English…"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Category + Status */}

            {/* Category + Status */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v: Project["status"]) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Period + Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Période</Label>
                <Input
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  placeholder="ex: 2024 – 2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Budget</Label>
                <Input
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  placeholder="ex: 45M FCFA"
                />
              </div>
            </div>

            {/* Beneficiaires + Icon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bénéficiaires</Label>
                <Input
                  value={form.beneficiaires}
                  onChange={(e) => setForm((f) => ({ ...f, beneficiaires: e.target.value }))}
                  placeholder="ex: 120 producteurs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Icône</Label>
                <Select value={form.icon_name} onValueChange={(v) => setForm((f) => ({ ...f, icon_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICONS.map(({ name, icon: Icon }) => (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2"><Icon size={14} /> {name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags <span className="text-gray-400 font-normal">(séparés par des virgules)</span></Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="ex: Bio, Export, Certification"
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={closeForm} className="rounded-xl px-6 h-11 font-bold text-gray-500">Annuler</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending || uploading} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-black shadow-lg shadow-emerald-900/10">
              {upsertMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              {editId ? "Enregistrer les Index" : "Initier la Publication"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </DashboardLayout>
  );
};

export default AdminProjets;
