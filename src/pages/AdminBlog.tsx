import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Star, StarOff,
  Upload, X, ImageIcon, Loader2, Search, ChevronDown,
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
interface Article {
  id: string;
  title: string;
  title_en: string | null;
  excerpt: string | null;
  excerpt_en: string | null;
  content: string | null;
  content_en: string | null;
  category: string;
  image_url: string | null;
  status: "draft" | "published";
  featured: boolean;
  read_time: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

type ArticleForm = {
  title: string;
  title_en: string;
  excerpt: string;
  excerpt_en: string;
  content: string;
  content_en: string;
  category: string;
  read_time: string;
  featured: boolean;
  status: "draft" | "published";
  image_url: string;
};

const EMPTY_FORM: ArticleForm = {
  title: "", title_en: "", excerpt: "", excerpt_en: "", content: "", content_en: "", category: "Actualités",
  read_time: "5 min", featured: false, status: "draft", image_url: "",
};

const CATEGORIES = ["Actualités", "Agriculture", "Marchés", "Vie coopérative"];
const STATUS_FILTER = ["tous", "published", "draft"] as const;

// ─── Image upload helper ──────────────────────────────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("content-images").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("content-images").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminBlog = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTER[number]>("tous");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // ── Queries ──
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-blog-articles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  // ── Mutations ──
  const upsertMutation = useMutation({
    mutationFn: async (payload: ArticleForm & { id?: string }) => {
      const { id, ...fields } = payload;
      const now = new Date().toISOString();
      const row = {
        ...fields,
        updated_at: now,
        published_at: fields.status === "published" ? now : null,
      };
      if (id) {
        const { error } = await (supabase as any).from("blog_articles").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("blog_articles").insert({ ...row, created_at: now });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] });
      toast({ title: editId ? "Article mis à jour" : "Article créé" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      const row = {
        status,
        updated_at: new Date().toISOString(),
        published_at: status === "published" ? new Date().toISOString() : null,
      };
      const { error } = await (supabase as any).from("blog_articles").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] }),
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await (supabase as any)
        .from("blog_articles")
        .update({ featured, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("blog_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] });
      toast({ title: "Article supprimé de l'index" });
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

  const openEdit = (article: Article) => {
    setEditId(article.id);
    setForm({
      title: article.title,
      title_en: article.title_en ?? "",
      excerpt: article.excerpt ?? "",
      excerpt_en: article.excerpt_en ?? "",
      content: article.content ?? "",
      content_en: article.content_en ?? "",
      category: article.category,
      read_time: article.read_time,
      featured: article.featured,
      status: article.status,
      image_url: article.image_url ?? "",
    });
    setImagePreview(article.image_url ?? "");
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
  const filtered = articles.filter((a) => {
    const matchStatus = statusFilter === "tous" || a.status === statusFilter;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
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

  const handleStatusFilterChange = (val: typeof STATUS_FILTER[number]) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const counts = {
    total: articles.length,
    published: articles.filter((a) => a.status === "published").length,
    draft: articles.filter((a) => a.status === "draft").length,
    featured: articles.filter((a) => a.featured).length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header - Premium Institutional Style */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Blog & Archives</h1>
            <p className="text-sm font-medium text-gray-500 mt-0.5">Gérez la ligne éditoriale et les communications publiques.</p>
          </div>
          <Button onClick={openCreate} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-6 h-11 font-bold shadow-lg shadow-emerald-900/10 gap-2">
            <Plus size={18} /> Nouvel Article
          </Button>
        </div>

        {/* Stats - Premium Styling */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Articles Total", value: counts.total, icon: Search, color: "text-gray-600", border: "" },
            { label: "Phase Publiée", value: counts.published, icon: Eye, color: "text-emerald-600", border: "border-emerald-100" },
            { label: "Brouillons", value: counts.draft, icon: EyeOff, color: "text-amber-600", border: "border-amber-100" },
            { label: "Mises en Avant", value: counts.featured, icon: Star, color: "text-blue-600", border: "border-blue-100" },
          ].map((s) => (
            <div key={s.label} className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 transition-all hover:shadow-md group", s.border)}>
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                <s.icon size={18} />
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
              placeholder="Rechercher par titre ou thématique…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
            {STATUS_FILTER.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusFilterChange(s)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === s
                    ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white"
                }`}
              >
                {{ tous: "Tous", published: "Publiés", draft: "Brouillons" }[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Table - Premium Registry Style */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">Aucun article trouvé.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Article</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Statut</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">À la une</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((article) => (
                  <tr key={article.id} className="hover:bg-emerald-50/30 transition-all group cursor-default">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {article.image_url ? (
                          <img src={article.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <ImageIcon size={16} className="text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate max-w-[200px] lg:max-w-xs">{article.title}</p>
                            {!article.title_en && (
                              <span className="shrink-0 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">EN manquant</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{article.read_time} de lecture</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{article.category}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: article.id, status: article.status === "published" ? "draft" : "published" })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          article.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {article.status === "published" ? <Eye size={11} /> : <EyeOff size={11} />}
                        {article.status === "published" ? "Publié" : "Brouillon"}
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <button
                        onClick={() => toggleFeaturedMutation.mutate({ id: article.id, featured: !article.featured })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          article.featured ? "text-amber-500 hover:bg-amber-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                        }`}
                        title={article.featured ? "Retirer de la une" : "Mettre à la une"}
                      >
                        {article.featured ? <Star size={15} fill="currentColor" /> : <StarOff size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(article)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => confirm({
                            title: "Supprimer l'article",
                            description: `Voulez-vous supprimer définitivement "${article.title}" ? Cette action est irréversible.`,
                            confirmLabel: "Supprimer",
                            variant: "danger",
                            onConfirm: () => deleteMutation.mutate(article.id)
                          })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">
              Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} articles
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
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                {editId ? <Pencil className="text-emerald-400" size={22} /> : <Plus className="text-emerald-400" size={22} />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white tracking-tight">
                  {editId ? "Modifier l'article" : "Nouvelle Publication"}
                </DialogTitle>
                <p className="text-sm text-white/40 mt-0.5 font-medium">Rédaction et gestion du contenu éditorial public</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {/* Image */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Image de couverture</Label>
              <div
                className={`relative group rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
                  imagePreview ? "border-gray-200" : "border-gray-300 hover:border-gray-400"
                }`}
                style={{ minHeight: "180px" }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleImageFile(f);
                }}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="" className="w-full h-44 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <span className="text-white text-sm font-medium">Changer l'image</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImagePreview(""); setForm((f) => ({ ...f, image_url: "" })); }}
                        className="p-1 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-44 text-gray-400 gap-2">
                    {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                    <p className="text-sm">{uploading ? "Upload en cours…" : "Cliquez ou déposez une image"}</p>
                    <p className="text-xs">JPG, PNG, WebP</p>
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
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ou coller une URL institutionnelle :</p>
              <Input
                placeholder="https://content.crpaz.com/images/..."
                value={form.image_url}
                onChange={(e) => { setForm((f) => ({ ...f, image_url: e.target.value })); setImagePreview(e.target.value); }}
                className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Tabs for Language */}
            <Tabs defaultValue="fr" className="w-full">
              <TabsList className="mb-6 p-1 bg-gray-100/50 rounded-xl grid grid-cols-2">
                <TabsTrigger value="fr" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">🇫🇷 Version Française</TabsTrigger>
                <TabsTrigger value="en" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  🇬🇧 English Version
                  {!form.title_en && <span className="text-[8px] bg-amber-400 text-white rounded-full px-1.5 py-0.5 font-bold">!</span>}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="fr" className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Titre Institutionnel <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Titre de l'article"
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-bold"
                  />
                </div>

                {/* Excerpt */}
                <div className="space-y-1.5">
                  <Label>Extrait / Résumé</Label>
                  <Textarea
                    value={form.excerpt}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                    placeholder="Court résumé affiché sur la liste des articles…"
                    rows={3}
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <Label>Contenu complet</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="Contenu détaillé de l'article…"
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                {!form.title_en && (
                  <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                    <span className="font-medium">⚠ Traduction anglaise manquante — le site affiche le français aux visiteurs anglophones.</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, title_en: f.title, excerpt_en: f.excerpt, content_en: f.content }))}
                      className="shrink-0 text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                    >
                      Copier depuis le français
                    </button>
                  </div>
                )}

                {/* Title EN */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Title (English)</Label>
                    {!form.title_en && form.title && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, title_en: f.title }))} className="text-xs text-blue-600 hover:underline">Copier le titre FR</button>
                    )}
                  </div>
                  <Input
                    value={form.title_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                    placeholder="Article title in English"
                  />
                </div>

                {/* Excerpt EN */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Excerpt (English)</Label>
                    {!form.excerpt_en && form.excerpt && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, excerpt_en: f.excerpt }))} className="text-xs text-blue-600 hover:underline">Copier l'extrait FR</button>
                    )}
                  </div>
                  <Textarea
                    value={form.excerpt_en}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt_en: e.target.value }))}
                    placeholder="Short summary in English…"
                    rows={3}
                  />
                </div>

                {/* Content EN */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Content (English)</Label>
                    {!form.content_en && form.content && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, content_en: f.content }))} className="text-xs text-blue-600 hover:underline">Copier le contenu FR</button>
                    )}
                  </div>
                  <Textarea
                    value={form.content_en}
                    onChange={(e) => setForm((f) => ({ ...f, content_en: e.target.value }))}
                    placeholder="Full article content in English…"
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>
            </Tabs>

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
                <Label>Temps de lecture</Label>
                <Input
                  value={form.read_time}
                  onChange={(e) => setForm((f) => ({ ...f, read_time: e.target.value }))}
                  placeholder="ex: 5 min"
                />
              </div>
            </div>

            {/* Status + Featured */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v: "draft" | "published") => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mise en avant</Label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.featured
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {form.featured ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
                  {form.featured ? "Article à la une" : "Standard"}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={closeForm} className="rounded-xl px-6 h-11 font-bold text-gray-500">Annuler</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending || uploading} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-black shadow-lg shadow-emerald-900/10">
              {upsertMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              {editId ? "Publier les modifications" : "Lancer la publication"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </DashboardLayout>
  );
};

export default AdminBlog;
